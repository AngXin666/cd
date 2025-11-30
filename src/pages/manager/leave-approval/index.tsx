import {Button, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import * as AttendanceAPI from '@/db/api/attendance'
import * as LeaveAPI from '@/db/api/leave'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import {createNotification} from '@/db/notificationApi'
import {supabase} from '@/db/supabase'
import type {AttendanceRecord, LeaveApplication, Profile, ResignationApplication, Warehouse} from '@/db/types'
import {useRealtimeNotifications} from '@/hooks'
import {formatLeaveDateRangeDisplay} from '@/utils/date'

// 司机统计数据类型
interface DriverStats {
  driverId: string
  driverName: string
  driverPhone: string | null
  licensePlate: string | null
  driverType: 'pure' | 'with_vehicle' // 司机类型：纯司机或带车司机
  warehouseIds: string[]
  warehouseNames: string[]
  leaveDays: number // 已批准的请假天数
  pendingLeaveCount: number // 待审核请假数量
  leaveCount: number
  attendanceCount: number
  lateCount: number // 迟到次数
  workDays: number // 应出勤天数
  actualAttendanceDays: number
  joinDate: string | null
  workingDays: number
  todayStatus: 'working' | 'late' | 'on_leave' | 'not_checked_in' // 今日状态
}

const ManagerLeaveApproval: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [resignationApplications, setResignationApplications] = useState<ResignationApplication[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [managerWarehouses, setManagerWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'pending' | 'stats'>('stats')
  const [urlWarehouseId, setUrlWarehouseId] = useState<string | null>(null)

  // 从URL参数读取初始标签和仓库ID
  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.tab === 'pending') {
      setActiveTab('pending')
    }
    if (params?.warehouseId) {
      setUrlWarehouseId(params.warehouseId)
    }
  }, [])

  // 初始化当前月份
  const initCurrentMonth = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  const [filterMonth] = useState<string>(initCurrentMonth())

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user) return

    showLoading({title: '加载中...'})

    try {
      // 获取所有仓库信息
      const allWarehouses = await WarehousesAPI.getAllWarehouses()
      setWarehouses(allWarehouses)

      // 获取所有用户信息
      const allProfiles = await UsersAPI.getAllProfiles()
      setProfiles(allProfiles)

      // 获取所有请假申请（包括历史数据）
      const allLeaveApps = await LeaveAPI.getAllLeaveApplications()
      setLeaveApplications(allLeaveApps)

      // 获取所有离职申请（包括历史数据）
      const allResignationApps = await LeaveAPI.getAllResignationApplications()
      setResignationApplications(allResignationApps)

      // 获取管理员管辖的仓库
      const managedWarehouses = await WarehousesAPI.getManagerWarehouses(user.id)
      setManagerWarehouses(managedWarehouses)

      // 始终加载打卡记录（进入页面时加载全部数据）
      const currentMonth = filterMonth || initCurrentMonth()
      const [year, month] = currentMonth.split('-').map(Number)
      const records = await AttendanceAPI.getAllAttendanceRecords(year, month)

      // 过滤管理员管辖的仓库的记录
      const managedWarehouseIds = managedWarehouses.map((w) => w.id)
      const filteredRecords = records.filter((r) => managedWarehouseIds.includes(r.warehouse_id))
      setAttendanceRecords(filteredRecords)
    } finally {
      Taro.hideLoading()
    }
  }, [user, filterMonth, initCurrentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 根据URL参数切换到对应的仓库
  useEffect(() => {
    if (urlWarehouseId && managerWarehouses.length > 0 && warehouses.length > 0) {
      // 计算可见仓库列表
      const managedWarehouseIds = managerWarehouses.map((w) => w.id)
      const managedWarehouses = warehouses.filter((w) => managedWarehouseIds.includes(w.id))

      // 过滤出有数据的仓库
      const warehousesWithData = managedWarehouses
        .map((warehouse) => {
          const leaveCount = leaveApplications.filter((app) => app.warehouse_id === warehouse.id).length
          const resignationCount = resignationApplications.filter((app) => app.warehouse_id === warehouse.id).length
          const attendanceCount = attendanceRecords.filter((record) => record.warehouse_id === warehouse.id).length
          const totalCount = leaveCount + resignationCount + attendanceCount
          return {warehouse, totalCount}
        })
        .filter((item) => item.totalCount > 0)
        .sort((a, b) => b.totalCount - a.totalCount)
        .map((item) => item.warehouse)

      // 如果没有数据，显示所有管理的仓库
      const visibleWarehouses = warehousesWithData.length > 0 ? warehousesWithData : managedWarehouses

      // 查找目标仓库的索引
      const targetIndex = visibleWarehouses.findIndex((w) => w.id === urlWarehouseId)
      if (targetIndex !== -1) {
        setCurrentWarehouseIndex(targetIndex)
      }
      // 清除URL参数，避免重复切换
      setUrlWarehouseId(null)
    }
  }, [urlWarehouseId, managerWarehouses, warehouses, leaveApplications, resignationApplications, attendanceRecords])

  useDidShow(() => {
    loadData()
  })

  // 启用实时通知
  useRealtimeNotifications({
    userId: user?.id || '',
    userRole: 'MANAGER',
    onLeaveApplicationChange: loadData,
    onResignationApplicationChange: loadData,
    onAttendanceChange: loadData
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await loadData()
    Taro.stopPullDownRefresh()
  })

  // 获取用户姓名
  const getUserName = useCallback(
    (userId: string) => {
      const profile = profiles.find((p) => p.id === userId)
      return profile?.name || profile?.phone || '未知'
    },
    [profiles]
  )

  // 获取仓库名称
  const getWarehouseName = useCallback(
    (warehouseId: string) => {
      const warehouse = warehouses.find((w) => w.id === warehouseId)
      return warehouse?.name || '未知仓库'
    },
    [warehouses]
  )

  // 计算请假天数
  const calculateLeaveDays = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }, [])

  // 计算待审核请假数量
  const calculatePendingLeaveCount = useCallback(
    (userId: string): number => {
      return leaveApplications.filter((leave) => leave.user_id === userId && leave.status === 'pending').length
    },
    [leaveApplications]
  )

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return dateStr.split('T')[0]
  }

  // 获取可见的仓库列表（只显示管理员管辖的且有数据的仓库）
  const getVisibleWarehouses = useCallback(() => {
    const managedWarehouseIds = managerWarehouses.map((w) => w.id)
    const managedWarehouses = warehouses.filter((w) => managedWarehouseIds.includes(w.id))

    // 过滤出有数据的仓库，并按数据量排序
    const warehousesWithData = managedWarehouses
      .map((warehouse) => {
        // 统计该仓库的数据量
        const leaveCount = leaveApplications.filter((app) => app.warehouse_id === warehouse.id).length
        const resignationCount = resignationApplications.filter((app) => app.warehouse_id === warehouse.id).length
        const attendanceCount = attendanceRecords.filter((record) => record.warehouse_id === warehouse.id).length
        const totalDataCount = leaveCount + resignationCount + attendanceCount

        return {
          warehouse,
          totalDataCount
        }
      })
      .filter((item) => item.totalDataCount > 0) // 只保留有数据的仓库
      .sort((a, b) => b.totalDataCount - a.totalDataCount) // 按数据量降序排序
      .map((item) => item.warehouse)

    return warehousesWithData
  }, [warehouses, leaveApplications, resignationApplications, attendanceRecords, managerWarehouses])

  // 获取当前仓库
  const getCurrentWarehouse = useCallback(() => {
    const warehousesWithData = getVisibleWarehouses()
    if (warehousesWithData.length === 0) return null
    return warehousesWithData[currentWarehouseIndex] || warehousesWithData[0]
  }, [currentWarehouseIndex, getVisibleWarehouses])

  // 获取当前仓库ID（用于筛选）
  const getCurrentWarehouseId = useCallback(() => {
    const currentWarehouse = getCurrentWarehouse()
    return currentWarehouse?.id || 'all'
  }, [getCurrentWarehouse])

  // 处理仓库切换
  const handleWarehouseChange = useCallback((e: any) => {
    const index = e.detail.current
    setCurrentWarehouseIndex(index)
  }, [])

  // 获取可见的申请数据（只显示管辖仓库的数据）
  const getVisibleApplications = useCallback(() => {
    const managedWarehouseIds = managerWarehouses.map((w) => w.id)
    let visibleLeave = leaveApplications.filter((app) => managedWarehouseIds.includes(app.warehouse_id))
    let visibleResignation = resignationApplications.filter((app) => managedWarehouseIds.includes(app.warehouse_id))

    // 按当前仓库筛选
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId !== 'all') {
      visibleLeave = visibleLeave.filter((app) => app.warehouse_id === currentWarehouseId)
      visibleResignation = visibleResignation.filter((app) => app.warehouse_id === currentWarehouseId)
    }

    return {visibleLeave, visibleResignation}
  }, [managerWarehouses, leaveApplications, resignationApplications, getCurrentWarehouseId])

  // 计算从指定月份1号到当前日期（或指定结束日期）的天数
  // yearMonth: 格式为 "YYYY-MM"
  // endDate: 可选，格式为 "YYYY-MM-DD"，默认为当前日期
  const calculateWorkDays = useCallback((yearMonth: string, endDate?: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    // 确定结束日期
    let lastDay: number
    if (endDate) {
      // 如果提供了结束日期，使用该日期
      const endDateObj = new Date(endDate)
      lastDay = endDateObj.getDate()
    } else if (year === currentYear && month === currentMonth) {
      // 如果是当前月份，使用当前日期
      lastDay = currentDay
    } else {
      // 如果是其他月份，使用该月的最后一天
      lastDay = new Date(year, month, 0).getDate()
    }

    // 计算天数（不排除周末，按自然天数计算）
    return lastDay
  }, [])

  // 计算整月的总天数（用于判断满勤）
  const calculateMonthTotalDays = useCallback((yearMonth: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    return new Date(year, month, 0).getDate()
  }, [])

  // 计算司机统计数据
  const calculateDriverStats = useMemo((): DriverStats[] => {
    const {visibleLeave, visibleResignation} = getVisibleApplications()

    // 获取所有司机（role为driver的用户）
    const drivers = profiles.filter((p) => p.role === 'DRIVER')

    // 计算当前月份
    const currentMonth = filterMonth || initCurrentMonth()
    const _monthTotalDays = calculateMonthTotalDays(currentMonth) // 整月总天数，用于判断满勤

    // 辅助函数：计算在职天数
    const calculateWorkingDays = (joinDate: string | null): number => {
      if (!joinDate) return 0
      // 将日期标准化到当天的00:00:00，避免时间部分影响天数计算
      const join = new Date(joinDate)
      join.setHours(0, 0, 0, 0)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const diffTime = now.getTime() - join.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 ? diffDays + 1 : 0 // 加1是因为要包含入职当天
    }

    // 辅助函数：计算司机在当前月份的应出勤天数
    const getDriverWorkDays = (driver: Profile): number => {
      const [year, month] = currentMonth.split('-').map(Number)
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth_num = now.getMonth() + 1

      // 如果司机有入职日期，且入职日期在当前月份内
      if (driver.join_date) {
        const joinDate = new Date(driver.join_date)
        const joinYear = joinDate.getFullYear()
        const joinMonth = joinDate.getMonth() + 1
        const joinDay = joinDate.getDate()

        // 如果入职月份就是当前筛选的月份
        if (joinYear === year && joinMonth === month) {
          // 如果是当前月份，计算从入职日期到今天的天数
          if (year === currentYear && month === currentMonth_num) {
            const today = now.getDate()
            return today - joinDay + 1
          } else {
            // 如果是历史月份，计算从入职日期到月底的天数
            const lastDayOfMonth = new Date(year, month, 0).getDate()
            return lastDayOfMonth - joinDay + 1
          }
        }
      }

      // 默认情况：从1号到当前日期（或整月）
      return calculateWorkDays(currentMonth)
    }

    const statsMap = new Map<string, DriverStats>()

    // 辅助函数：添加仓库信息到司机统计中
    const addWarehouseToStats = (stats: DriverStats, warehouseId: string) => {
      if (warehouseId && !stats.warehouseIds.includes(warehouseId)) {
        stats.warehouseIds.push(warehouseId)
        stats.warehouseNames.push(getWarehouseName(warehouseId))
      }
    }

    // 首先，为所有司机创建初始统计数据
    for (const driver of drivers) {
      // 计算待审核请假数量
      const pendingLeaveCount = calculatePendingLeaveCount(driver.id)

      // 判断司机类型：有车牌号的是带车司机，否则是纯司机
      const driverType: 'pure' | 'with_vehicle' = driver.vehicle_plate ? 'with_vehicle' : 'pure'

      statsMap.set(driver.id, {
        driverId: driver.id,
        driverName: getUserName(driver.id),
        driverPhone: driver.phone,
        licensePlate: driver.vehicle_plate,
        driverType,
        warehouseIds: [],
        warehouseNames: [],
        leaveDays: 0,
        pendingLeaveCount,
        leaveCount: 0,
        attendanceCount: 0,
        lateCount: 0,
        workDays: getDriverWorkDays(driver),
        actualAttendanceDays: 0,
        joinDate: driver.join_date,
        workingDays: calculateWorkingDays(driver.join_date),
        todayStatus: 'not_checked_in' // 默认未打卡
      })
    }

    // 处理请假申请
    for (const app of visibleLeave) {
      const stats = statsMap.get(app.user_id)
      if (!stats) continue

      addWarehouseToStats(stats, app.warehouse_id)
      stats.leaveCount++

      // 只统计已通过的请假天数
      if (app.status === 'approved') {
        const days = calculateLeaveDays(app.start_date, app.end_date)
        stats.leaveDays += days
      }
    }

    // 处理打卡记录
    let allAttendanceForStats = attendanceRecords
    const managerWarehouseIds = managerWarehouses.map((w) => w.id)
    allAttendanceForStats = attendanceRecords.filter((record) =>
      record.warehouse_id ? managerWarehouseIds.includes(record.warehouse_id) : false
    )

    // 按月份筛选打卡记录
    if (filterMonth) {
      allAttendanceForStats = allAttendanceForStats.filter((record) => {
        const recordDate = new Date(record.clock_in_time)
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`
        return recordMonth === filterMonth
      })
    }

    // 统计每个司机的打卡天数和迟到次数
    const attendanceDaysMap = new Map<string, Set<string>>()
    for (const record of allAttendanceForStats) {
      const stats = statsMap.get(record.user_id)
      if (!stats) continue

      addWarehouseToStats(stats, record.warehouse_id || '')
      stats.attendanceCount++

      // 统计迟到次数
      if (record.status === 'late') {
        stats.lateCount++
      }

      if (!attendanceDaysMap.has(record.user_id)) {
        attendanceDaysMap.set(record.user_id, new Set())
      }
      const checkInDate = new Date(record.clock_in_time).toISOString().split('T')[0]
      attendanceDaysMap.get(record.user_id)?.add(checkInDate)
    }

    // 计算实际出勤天数
    for (const [driverId, stats] of statsMap.entries()) {
      const attendanceDays = attendanceDaysMap.get(driverId)?.size || 0
      stats.actualAttendanceDays = attendanceDays
    }

    // 计算今日状态
    const today = new Date().toISOString().split('T')[0]
    for (const [driverId, stats] of statsMap.entries()) {
      // 1. 检查是否在休假中
      const onLeaveToday = visibleLeave.some((app) => {
        if (app.user_id !== driverId || app.status !== 'approved') return false
        const startDate = new Date(app.start_date).toISOString().split('T')[0]
        const endDate = new Date(app.end_date).toISOString().split('T')[0]
        return today >= startDate && today <= endDate
      })

      if (onLeaveToday) {
        stats.todayStatus = 'on_leave'
        continue
      }

      // 2. 检查今天是否有打卡记录
      const todayAttendance = allAttendanceForStats.find((record) => {
        const recordDate = new Date(record.clock_in_time).toISOString().split('T')[0]
        return record.user_id === driverId && recordDate === today
      })

      if (todayAttendance) {
        // 有打卡记录，判断是否迟到
        stats.todayStatus = todayAttendance.status === 'late' ? 'late' : 'working'
      } else {
        // 没有打卡记录
        stats.todayStatus = 'not_checked_in'
      }
    }

    // 按仓库筛选
    let statsArray = Array.from(statsMap.values())
    const currentWarehouseId = getCurrentWarehouseId()
    if (currentWarehouseId !== 'all') {
      statsArray = statsArray.filter((stats) => stats.warehouseIds.includes(currentWarehouseId))
    }

    return statsArray
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attendanceRecords,
    profiles,
    managerWarehouses,
    filterMonth,
    calculateLeaveDays,
    calculateMonthTotalDays,
    calculatePendingLeaveCount,
    calculateWorkDays,
    getCurrentWarehouseId,
    getUserName,
    getVisibleApplications,
    getWarehouseName,
    initCurrentMonth
  ])

  // 审批请假申请
  const handleReviewLeave = async (applicationId: string, approved: boolean) => {
    if (!user) return

    try {
      showLoading({title: approved ? '批准中...' : '拒绝中...'})

      // 1. 获取请假申请详情
      const application = leaveApplications.find((app) => app.id === applicationId)
      if (!application) {
        throw new Error('未找到请假申请')
      }

      // 2. 审批请假申请
      const success = await LeaveAPI.reviewLeaveApplication(applicationId, {
        status: approved ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })

      if (success) {
        // 3. 发送审批结果通知
        try {
          // 获取当前审批人信息
          const currentUserProfile = await UsersAPI.getCurrentUserWithRealName()

          // 构建审批人显示文本（用于通知其他人）
          let reviewerText = '车队长'
          if (currentUserProfile) {
            const reviewerRealName = currentUserProfile.real_name
            const reviewerUserName = currentUserProfile.name

            if (reviewerRealName) {
              reviewerText = `车队长【${reviewerRealName}】`
            } else if (reviewerUserName && reviewerUserName !== '车队长') {
              reviewerText = `车队长【${reviewerUserName}】`
            }
          }

          // 获取请假类型文本
          const leaveTypeText =
            {
              sick: '病假',
              personal: '事假',
              annual: '年假',
              other: '其他'
            }[application.leave_type] || '请假'

          // 格式化日期
          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr)
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          }

          const startDate = formatDate(application.start_date)
          const endDate = formatDate(application.end_date)

          // 构建通知消息
          const statusText = approved ? '通过' : '拒绝'
          const notificationType = approved ? 'leave_approved' : 'leave_rejected'
          const approvalStatus = approved ? 'approved' : 'rejected'

          // 🔄 更新原有通知状态（发送给老板和车队长的通知）
          // 只更新原始申请通知，不更新审批结果通知

          // 检查当前用户的认证状态
          const {
            data: {session}
          } = await supabase.auth.getSession()
          console.log('🔐 当前用户认证状态:', {
            hasSession: !!session,
            userId: session?.user?.id,
            currentUserId: user.id
          })

          const {data: existingNotifications} = await supabase
            .from('notifications')
            .select('*')
            .eq('related_id', applicationId)
            .eq('type', 'leave_application_submitted') // 只查询原始申请通知

          console.log(`🔍 查询到 ${existingNotifications?.length || 0} 条原始申请通知`)

          if (existingNotifications && existingNotifications.length > 0) {
            // 针对每个通知接收者单独更新
            for (const notification of existingNotifications) {
              // 判断接收者是否为审批人本人
              const isReviewer = notification.recipient_id === user.id
              const message = isReviewer
                ? `您${statusText}了司机的${leaveTypeText}申请（${startDate} 至 ${endDate}）`
                : `${reviewerText}${statusText}了司机的${leaveTypeText}申请（${startDate} 至 ${endDate}）`

              console.log(
                `📝 更新通知 ${notification.id}，接收者: ${notification.recipient_id}，是否为审批人: ${isReviewer}`
              )

              const {error: updateError} = await supabase
                .from('notifications')
                .update({
                  approval_status: approvalStatus,
                  is_read: false, // 重置为未读
                  title: '请假审批通知',
                  content: message,
                  updated_at: new Date().toISOString()
                })
                .eq('id', notification.id)

              if (updateError) {
                console.error(`❌ 更新通知 ${notification.id} 失败:`, updateError)
              } else {
                console.log(`✅ 成功更新通知 ${notification.id}`)
              }
            }

            console.log(`✅ 已更新 ${existingNotifications.length} 条请假审批通知状态`)
          } else {
            console.warn('⚠️ 未找到需要更新的原始申请通知')
          }

          // 🔔 创建新通知给司机（审批结果通知）
          const driverMessage = `${reviewerText}${statusText}了您的${leaveTypeText}申请（${startDate} 至 ${endDate}）`
          await createNotification(
            application.user_id, // 发送给申请人（司机）
            notificationType,
            `${leaveTypeText}申请已${statusText}`,
            driverMessage,
            applicationId // 关联请假申请ID
          )

          console.log(`✅ 已发送审批结果通知给司机: ${application.user_id}`)
        } catch (notificationError) {
          console.error('❌ 发送审批结果通知失败:', notificationError)
          // 通知发送失败不影响审批流程
        }

        showToast({
          title: approved ? '已批准' : '已拒绝',
          icon: 'success',
          duration: 1500
        })
        await loadData()
      } else {
        throw new Error('操作失败')
      }
    } catch (_error) {
      showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 审批离职申请
  const handleReviewResignation = async (applicationId: string, approved: boolean) => {
    if (!user) return

    try {
      showLoading({title: approved ? '批准中...' : '拒绝中...'})

      const success = await LeaveAPI.reviewResignationApplication(applicationId, {
        status: approved ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })

      if (success) {
        showToast({
          title: approved ? '已批准' : '已拒绝',
          icon: 'success',
          duration: 1500
        })
        await loadData()
      } else {
        throw new Error('操作失败')
      }
    } catch (_error) {
      showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 跳转到司机详情页
  const navigateToDriverDetail = (driverId: string) => {
    Taro.navigateTo({
      url: `/pages/manager/driver-leave-detail/index?driverId=${driverId}`
    })
  }

  // 按顺序处理待审核申请（跳转到第一个有待审核申请的司机）
  const handlePendingApplications = () => {
    // 获取所有有待审核申请的司机，按待审核数量降序排序
    const driversWithPending = driverStats
      .filter((stats) => stats.pendingLeaveCount > 0)
      .sort((a, b) => b.pendingLeaveCount - a.pendingLeaveCount)

    if (driversWithPending.length > 0) {
      // 跳转到第一个有待审核申请的司机
      navigateToDriverDetail(driversWithPending[0].driverId)
    } else {
      showToast({
        title: '暂无待审核申请',
        icon: 'none'
      })
    }
  }

  const driverStats = calculateDriverStats
  const {visibleLeave, visibleResignation} = getVisibleApplications()

  // 统计数据
  const totalDrivers = driverStats.length
  const pendingLeave = visibleLeave.filter((app) => app.status === 'pending')
  const pendingResignation = visibleResignation.filter((app) => app.status === 'pending')
  const totalPending = pendingLeave.length + pendingResignation.length

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 标题卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">考勤管理</Text>
            <Text className="text-blue-100 text-sm block">管理员工作台</Text>
          </View>

          {/* 统计卡片 */}
          <View className="grid grid-cols-2 gap-3 mb-4">
            <View className="bg-white rounded-lg p-4 shadow">
              <Text className="text-sm text-gray-600 block mb-2">司机总数</Text>
              <Text className="text-3xl font-bold text-blue-900 block">{totalDrivers}</Text>
            </View>
            <View
              className="bg-white rounded-lg p-4 shadow relative"
              onClick={() => {
                if (totalPending > 0) {
                  handlePendingApplications()
                }
              }}>
              <Text className="text-sm text-gray-600 block mb-2">待审批</Text>
              <Text className="text-3xl font-bold text-red-600 block">{totalPending}</Text>
              {totalPending > 0 && (
                <View className="absolute top-2 right-2">
                  <View className="i-mdi-chevron-right text-lg text-red-400" />
                </View>
              )}
            </View>
          </View>

          {/* 标签切换 */}
          <View className="flex gap-2 mb-4">
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'pending' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => setActiveTab('pending')}>
              <Text className={`text-xs font-bold ${activeTab === 'pending' ? 'text-white' : 'text-gray-600'}`}>
                待审批 ({totalPending})
              </Text>
            </View>
            <View
              className={`flex-1 text-center py-3 rounded-lg ${activeTab === 'stats' ? 'bg-blue-600' : 'bg-white'}`}
              onClick={() => setActiveTab('stats')}>
              <Text className={`text-xs font-bold ${activeTab === 'stats' ? 'text-white' : 'text-gray-600'}`}>
                司机统计
              </Text>
            </View>
          </View>

          {/* 仓库切换区域 */}
          <View className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
            <Swiper
              className="h-16"
              current={currentWarehouseIndex}
              onChange={handleWarehouseChange}
              indicatorDots
              indicatorColor="rgba(0, 0, 0, 0.2)"
              indicatorActiveColor="#1E3A8A">
              {getVisibleWarehouses().map((warehouse) => (
                <SwiperItem key={warehouse.id}>
                  <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
                    <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                    <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
          </View>

          {/* 待审批申请列表 */}
          {activeTab === 'pending' && (
            <View className="mb-4">
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-800">待审批申请</Text>
                <Text className="text-xs text-gray-500">
                  {pendingLeave.length + pendingResignation.length} 条待审批
                </Text>
              </View>

              {/* 请假申请 */}
              {pendingLeave.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-bold text-gray-700 block mb-2">请假申请</Text>
                  {pendingLeave.map((app) => (
                    <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                      {/* 申请人信息 */}
                      <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <View className="flex items-center">
                          <View className="i-mdi-account-circle text-3xl text-blue-900 mr-3" />
                          <View>
                            <Text className="text-base font-bold text-gray-800 block">{getUserName(app.user_id)}</Text>
                            <Text className="text-xs text-gray-500">{getWarehouseName(app.warehouse_id)}</Text>
                          </View>
                        </View>
                        <View className="bg-orange-50 px-3 py-1 rounded-full">
                          <Text className="text-xs text-orange-600 font-bold">待审批</Text>
                        </View>
                      </View>

                      {/* 请假信息 */}
                      <View className="space-y-2 mb-3">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar-range text-lg text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">
                            请假日期：{formatLeaveDateRangeDisplay(app.start_date, app.end_date)}
                          </Text>
                        </View>
                        <View className="flex items-center">
                          <View className="i-mdi-calendar-clock text-lg text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">
                            请假天数：{calculateLeaveDays(app.start_date, app.end_date)} 天
                          </Text>
                        </View>
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-lg text-gray-500 mr-2" />
                          <Text className="text-xs text-gray-500">
                            具体日期：{formatDate(app.start_date)} 至 {formatDate(app.end_date)}
                          </Text>
                        </View>
                        {app.reason && (
                          <View className="flex items-start">
                            <View className="i-mdi-text text-lg text-gray-500 mr-2 mt-0.5" />
                            <Text className="text-sm text-gray-700 flex-1">理由：{app.reason}</Text>
                          </View>
                        )}
                      </View>

                      {/* 操作按钮 */}
                      <View className="flex gap-2">
                        <Button
                          size="default"
                          className="flex-1 bg-green-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewLeave(app.id, true)}>
                          批准
                        </Button>
                        <Button
                          size="default"
                          className="flex-1 bg-red-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewLeave(app.id, false)}>
                          拒绝
                        </Button>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 离职申请 */}
              {pendingResignation.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-bold text-gray-700 block mb-2">离职申请</Text>
                  {pendingResignation.map((app) => (
                    <View key={app.id} className="bg-white rounded-lg p-4 mb-3 shadow">
                      {/* 申请人信息 */}
                      <View className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <View className="flex items-center">
                          <View className="i-mdi-account-circle text-3xl text-purple-900 mr-3" />
                          <View>
                            <Text className="text-base font-bold text-gray-800 block">{getUserName(app.user_id)}</Text>
                            <Text className="text-xs text-gray-500">{getWarehouseName(app.warehouse_id)}</Text>
                          </View>
                        </View>
                        <View className="bg-purple-50 px-3 py-1 rounded-full">
                          <Text className="text-xs text-purple-600 font-bold">离职申请</Text>
                        </View>
                      </View>

                      {/* 离职信息 */}
                      <View className="space-y-2 mb-3">
                        <View className="flex items-center">
                          <View className="i-mdi-calendar text-lg text-gray-500 mr-2" />
                          <Text className="text-sm text-gray-700">离职日期：{formatDate(app.resignation_date)}</Text>
                        </View>
                        {app.reason && (
                          <View className="flex items-start">
                            <View className="i-mdi-text text-lg text-gray-500 mr-2 mt-0.5" />
                            <Text className="text-sm text-gray-700 flex-1">理由：{app.reason}</Text>
                          </View>
                        )}
                      </View>

                      {/* 操作按钮 */}
                      <View className="flex gap-2">
                        <Button
                          size="default"
                          className="flex-1 bg-green-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewResignation(app.id, true)}>
                          批准
                        </Button>
                        <Button
                          size="default"
                          className="flex-1 bg-red-600 text-white text-sm font-bold break-keep"
                          onClick={() => handleReviewResignation(app.id, false)}>
                          拒绝
                        </Button>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 无待审批申请 */}
              {pendingLeave.length === 0 && pendingResignation.length === 0 && (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-check-circle text-6xl text-green-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无待审批申请</Text>
                </View>
              )}
            </View>
          )}

          {/* 司机统计列表 */}
          {activeTab === 'stats' && (
            <View className="mb-4">
              {/* 司机出勤列表 */}
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-800">司机统计</Text>
                <Text className="text-xs text-gray-500">{filterMonth || initCurrentMonth()} 月度数据</Text>
              </View>

              {driverStats.length === 0 ? (
                <View className="bg-white rounded-lg p-8 text-center shadow">
                  <View className="i-mdi-account-off text-6xl text-gray-300 mb-4 mx-auto" />
                  <Text className="text-gray-500 block">暂无司机数据</Text>
                </View>
              ) : (
                driverStats.map((stats) => (
                  <View
                    key={stats.driverId}
                    className="relative bg-white rounded-xl p-4 mb-3 shadow-md"
                    onClick={() => navigateToDriverDetail(stats.driverId)}>
                    {/* 司机信息头部 */}
                    <View className="flex items-center justify-between mb-4">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
                        <View className="flex-1">
                          <View className="flex items-center justify-between gap-2 mb-1">
                            <View className="flex items-center gap-2">
                              <Text className="text-base font-bold text-gray-800">{stats.driverName}</Text>
                              {/* 司机类型标签 */}
                              {stats.driverType === 'with_vehicle' ? (
                                <View className="bg-gradient-to-r from-purple-400 to-purple-500 px-2 py-0.5 rounded-full">
                                  <Text className="text-xs text-white font-bold">带车司机</Text>
                                </View>
                              ) : (
                                <View className="bg-gradient-to-r from-blue-400 to-blue-500 px-2 py-0.5 rounded-full">
                                  <Text className="text-xs text-white font-bold">纯司机</Text>
                                </View>
                              )}
                              {/* 新司机标签 */}
                              {stats.workingDays <= 7 && (
                                <View className="bg-gradient-to-r from-green-400 to-green-500 px-2 py-0.5 rounded-full">
                                  <Text className="text-xs text-white font-bold">新司机</Text>
                                </View>
                              )}
                            </View>
                            {/* 今日状态标签 - 放在最右边 */}
                            {stats.todayStatus === 'working' && (
                              <View className="bg-gradient-to-r from-green-500 to-green-600 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">上班中</Text>
                              </View>
                            )}
                            {stats.todayStatus === 'late' && (
                              <View className="bg-gradient-to-r from-orange-500 to-orange-600 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">迟到</Text>
                              </View>
                            )}
                            {stats.todayStatus === 'on_leave' && (
                              <View className="bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">休假</Text>
                              </View>
                            )}
                            {stats.todayStatus === 'not_checked_in' && (
                              <View className="bg-gradient-to-r from-red-500 to-red-600 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-white font-bold">未打卡</Text>
                              </View>
                            )}
                          </View>
                          {/* 手机号码 */}
                          {stats.driverPhone && (
                            <View className="flex items-center gap-1 mb-1">
                              <View className="i-mdi-phone text-xs text-gray-400" />
                              <Text className="text-xs text-gray-600">{stats.driverPhone}</Text>
                            </View>
                          )}
                          {/* 车牌号 */}
                          {stats.licensePlate && (
                            <View className="flex items-center gap-1 mb-1">
                              <View className="i-mdi-car text-xs text-gray-400" />
                              <Text className="text-xs text-gray-600">{stats.licensePlate}</Text>
                            </View>
                          )}
                          {/* 分配仓库 */}
                          <View className="flex items-center gap-1 mb-1">
                            <View className="i-mdi-warehouse text-xs text-gray-400" />
                            <Text className="text-xs text-gray-600">
                              {stats.warehouseNames.length > 0 ? stats.warehouseNames.join('、') : '未分配仓库'}
                            </Text>
                          </View>
                          {/* 入职时间和在职天数 */}
                          {stats.joinDate && (
                            <View className="flex items-center gap-2 mt-1">
                              <Text className="text-xs text-gray-400">
                                入职: {new Date(stats.joinDate).toLocaleDateString('zh-CN')}
                              </Text>
                              <Text className="text-xs text-gray-400">•</Text>
                              <Text className="text-xs text-gray-400">在职 {stats.workingDays} 天</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* 出勤统计 */}
                    <View className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                      <View className="flex-1">
                        <View className="flex items-center justify-between mb-2">
                          <Text className="text-sm text-gray-600">应出勤天数</Text>
                          <Text className="text-sm font-bold text-blue-600">{stats.workDays} 天</Text>
                        </View>
                        <View className="flex items-center justify-between">
                          <Text className="text-sm text-gray-600">实际出勤天数</Text>
                          <Text className="text-sm font-bold text-green-600">{stats.actualAttendanceDays} 天</Text>
                        </View>
                      </View>
                    </View>

                    {/* 其他统计数据 */}
                    <View className="grid grid-cols-3 gap-3">
                      <View
                        className={`text-center bg-orange-50 rounded-lg py-3 ${stats.pendingLeaveCount > 0 ? 'relative' : ''}`}
                        onClick={(e) => {
                          if (stats.pendingLeaveCount > 0) {
                            e.stopPropagation()
                            navigateToDriverDetail(stats.driverId)
                          }
                        }}>
                        <Text className="text-xs text-gray-600 block mb-2">
                          {stats.pendingLeaveCount > 0 ? '请假审核' : '请假天数'}
                        </Text>
                        <Text className="text-2xl font-bold text-orange-600 block">
                          {stats.pendingLeaveCount > 0 ? stats.pendingLeaveCount : stats.leaveDays}
                        </Text>
                        {stats.pendingLeaveCount > 0 && (
                          <View className="absolute top-1 right-1">
                            <View className="i-mdi-chevron-right text-sm text-orange-400" />
                          </View>
                        )}
                      </View>
                      <View className="text-center bg-blue-50 rounded-lg py-3">
                        <Text className="text-xs text-gray-600 block mb-2">出勤天数</Text>
                        <Text className="text-2xl font-bold text-blue-600 block">{stats.actualAttendanceDays}</Text>
                      </View>
                      <View className="text-center bg-red-50 rounded-lg py-3">
                        <Text className="text-xs text-gray-600 block mb-2">迟到次数</Text>
                        <Text className="text-2xl font-bold text-red-600 block">{stats.lateCount}</Text>
                      </View>
                    </View>

                    {/* 查看详情提示 */}
                    <View className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
                      <Text className="text-xs text-blue-600 mr-1">查看详细记录</Text>
                      <View className="i-mdi-chevron-right text-sm text-blue-600" />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerLeaveApproval
