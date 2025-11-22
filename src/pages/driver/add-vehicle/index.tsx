/**
 * 添加车辆页面 - 优化版
 * 三步骤流程：行驶证识别 -> 车辆照片 -> 驾驶员证件
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import PhotoCapture from '@/components/PhotoCapture'
import StepIndicator from '@/components/StepIndicator'
import {insertVehicle, upsertDriverLicense} from '@/db/api'
import type {DriverLicenseInput, VehicleInput} from '@/db/types'
import {deleteDraft, getDraft, saveDraft, type VehicleDraft} from '@/utils/draftUtils'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {recognizeDriverLicense, recognizeIdCardFront} from '@/utils/ocrUtils'

const BUCKET_NAME = 'app-7cdqf07mbu9t_vehicles'

/**
 * 字段名到中文名称的映射
 */
const PHOTO_NAME_MAP: Record<string, string> = {
  driving_license_main: '行驶证主页',
  driving_license_sub: '行驶证副页',
  driving_license_sub_back: '行驶证副页背页',
  left_front: '左前45°',
  right_front: '右前45°',
  left_rear: '左后45°',
  right_rear: '右后45°',
  dashboard: '仪表盘',
  rear_door: '后门',
  cargo_box: '货箱',
  id_card_front: '身份证正面',
  driver_license_main: '驾驶证主页',
  driver_license_sub: '驾驶证副页'
}

/**
 * 显示OCR识别错误信息
 * @param error 错误对象
 */
const showOcrError = (error: unknown) => {
  console.error('识别失败:', error)
  const errorMessage = error instanceof Error ? error.message : '识别失败，请重新拍摄'
  Taro.showToast({
    title: errorMessage,
    icon: 'none',
    duration: 3000
  })
}

/**
 * 计算驾龄（以年为单位）
 * @param validFrom 领证时间 (YYYY-MM-DD)
 * @returns 驾龄（年）
 */
const calculateDrivingYears = (validFrom: string | undefined): number => {
  if (!validFrom) return 0
  try {
    const issueDate = new Date(validFrom)
    const today = new Date()
    const years = today.getFullYear() - issueDate.getFullYear()
    const monthDiff = today.getMonth() - issueDate.getMonth()
    const dayDiff = today.getDate() - issueDate.getDate()

    // 如果还没到生日月份，或者到了生日月份但还没到生日日期，年龄减1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      return Math.max(0, years - 1)
    }
    return Math.max(0, years)
  } catch {
    return 0
  }
}

const AddVehicle: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // 步骤定义 - 移除基本信息步骤
  const steps = [
    {title: '行驶证', description: 'OCR识别行驶证'},
    {title: '车辆照片', description: '拍摄车辆照片'},
    {title: '驾驶员证件', description: '识别证件信息'}
  ]

  // 表单数据 - 从行驶证OCR自动填充
  const [formData, setFormData] = useState<Partial<VehicleInput>>({
    plate_number: '',
    brand: '',
    model: '',
    color: '',
    vehicle_type: '',
    owner_name: '',
    use_character: '',
    vin: '',
    engine_number: '', // 新增发动机号码
    register_date: '',
    issue_date: '',
    // 副页字段
    archive_number: '',
    total_mass: 0,
    approved_passengers: 0,
    curb_weight: 0,
    approved_load: 0,
    overall_dimension_length: 0,
    overall_dimension_width: 0,
    overall_dimension_height: 0,
    inspection_valid_until: '',
    // 副页背页字段
    mandatory_scrap_date: ''
  })

  // 照片数据 - 行驶证3张 + 车辆7个角度
  const [photos, setPhotos] = useState({
    driving_license_main: '', // 行驶证主页
    driving_license_sub: '', // 行驶证副页
    driving_license_sub_back: '', // 行驶证副页背页
    left_front: '', // 左前
    right_front: '', // 右前
    left_rear: '', // 左后
    right_rear: '', // 右后
    dashboard: '', // 仪表盘
    rear_door: '', // 后门
    cargo_box: '' // 货箱
  })

  // 监控photos state变化
  useEffect(() => {
    console.log('photos state更新:', photos)
  }, [photos])

  // 驾驶员证件数据
  const [driverLicenseData, setDriverLicenseData] = useState<Partial<DriverLicenseInput>>({
    id_card_number: '',
    id_card_name: '',
    id_card_address: '',
    id_card_birth_date: '',
    license_number: '',
    license_class: '',
    valid_from: '',
    valid_to: '',
    issue_authority: ''
  })

  // 驾驶员证件照片
  const [driverPhotos, setDriverPhotos] = useState({
    id_card_front: '',
    id_card_back: '',
    driver_license: ''
  })

  // 车损特写照片（多张）
  const [damagePhotos, setDamagePhotos] = useState<{path: string; size: number}[]>([])

  // 恢复草稿
  useEffect(() => {
    if (!user?.id) return

    const loadDraft = async () => {
      try {
        const draft = await getDraft('add', user.id)
        if (draft) {
          // 询问用户是否恢复草稿
          Taro.showModal({
            title: '发现未完成的录入',
            content: `上次保存时间：${draft.saved_at ? new Date(draft.saved_at).toLocaleString('zh-CN') : '未知'}\n是否继续录入？`,
            confirmText: '继续录入',
            cancelText: '重新开始',
            success: (res) => {
              if (res.confirm) {
                // 恢复草稿数据
                if (draft.plate_number) {
                  setFormData((prev) => ({
                    ...prev,
                    plate_number: draft.plate_number,
                    brand: draft.brand,
                    model: draft.model,
                    color: draft.color,
                    vin: draft.vin,
                    engine_number: draft.engine_number,
                    register_date: draft.register_date
                  }))
                }

                // 恢复行驶证照片（过滤无效路径）
                if (draft.registration_front_photo || draft.registration_back_photo) {
                  setPhotos((prev) => ({
                    ...prev,
                    driving_license_main: draft.registration_front_photo || '',
                    driving_license_sub: draft.registration_back_photo || ''
                  }))
                }

                // 恢复车辆照片（过滤无效路径）
                if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
                  // 过滤掉 undefined 值
                  const validPhotos = draft.vehicle_photos.filter((p) => p)
                  setPhotos((prev) => ({
                    ...prev,
                    left_front: validPhotos[0] || '',
                    right_front: validPhotos[1] || '',
                    left_rear: validPhotos[2] || '',
                    right_rear: validPhotos[3] || '',
                    dashboard: validPhotos[4] || '',
                    rear_door: validPhotos[5] || '',
                    cargo_box: validPhotos[6] || ''
                  }))
                }

                // 恢复车损照片（过滤无效路径）
                if (draft.damage_photos && draft.damage_photos.length > 0) {
                  // 过滤掉 undefined 值
                  const validDamagePhotos = draft.damage_photos.filter((p) => p)
                  if (validDamagePhotos.length > 0) {
                    setDamagePhotos(validDamagePhotos.map((path) => ({path, size: 0})))
                  }
                }

                // 恢复驾驶员信息
                if (draft.driver_name) {
                  setDriverLicenseData((prev) => ({
                    ...prev,
                    id_card_name: draft.driver_name,
                    id_card_number: draft.driver_id_number,
                    license_number: draft.driver_license_number,
                    license_class: draft.driver_license_class,
                    valid_from: draft.driver_license_valid_from,
                    valid_to: draft.driver_license_valid_until
                  }))
                }

                // 恢复驾驶员证件照片（过滤无效路径）
                if (draft.id_card_front_photo || draft.driver_license_photo) {
                  setDriverPhotos((prev) => ({
                    ...prev,
                    id_card_front: draft.id_card_front_photo || '',
                    driver_license: draft.driver_license_photo || ''
                  }))
                }

                Taro.showToast({
                  title: '草稿已恢复',
                  icon: 'success'
                })
              } else {
                // 删除草稿
                deleteDraft('add', user.id)
              }
            }
          })
        }
      } catch (error) {
        console.error('恢复草稿失败:', error)
      }
    }

    loadDraft()
  }, [user?.id])

  // 自动保存草稿
  const saveCurrentDraft = useCallback(async () => {
    if (!user?.id) return

    const draft: VehicleDraft = {
      plate_number: formData.plate_number,
      brand: formData.brand,
      model: formData.model,
      color: formData.color,
      vin: formData.vin,
      engine_number: formData.engine_number,
      register_date: formData.register_date,
      registration_front_photo: photos.driving_license_main,
      registration_back_photo: photos.driving_license_sub,
      vehicle_photos: [
        photos.left_front,
        photos.right_front,
        photos.left_rear,
        photos.right_rear,
        photos.dashboard,
        photos.rear_door,
        photos.cargo_box
      ],
      damage_photos: damagePhotos.map((p) => p.path),
      driver_name: driverLicenseData.id_card_name,
      driver_id_number: driverLicenseData.id_card_number,
      driver_license_number: driverLicenseData.license_number,
      driver_license_class: driverLicenseData.license_class,
      driver_license_valid_from: driverLicenseData.valid_from,
      driver_license_valid_until: driverLicenseData.valid_to,
      id_card_front_photo: driverPhotos.id_card_front,
      driver_license_photo: driverPhotos.driver_license
    }

    await saveDraft('add', user.id, draft)
  }, [user?.id, formData, photos, damagePhotos, driverLicenseData, driverPhotos])

  // 监听数据变化，自动保存草稿
  useEffect(() => {
    // 防抖保存
    const timer = setTimeout(() => {
      saveCurrentDraft()
    }, 1000)

    return () => clearTimeout(timer)
  }, [saveCurrentDraft])

  // 识别行驶证主页
  const handleRecognizeDrivingLicenseMain = async () => {
    if (!photos.driving_license_main) {
      Taro.showToast({title: '请先拍摄行驶证主页', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const {recognizeDrivingLicenseMain} = await import('@/utils/ocrUtils')
      const result = await recognizeDrivingLicenseMain(photos.driving_license_main, (msg) => {
        Taro.showLoading({title: msg})
      })

      if (result) {
        setFormData((prev) => ({
          ...prev,
          plate_number: result.plate_number || prev.plate_number,
          vehicle_type: result.vehicle_type || prev.vehicle_type,
          owner_name: result.owner_name || prev.owner_name,
          use_character: result.use_character || prev.use_character,
          brand: result.brand || prev.brand,
          model: result.model || prev.model,
          vin: result.vin || prev.vin,
          engine_number: result.engine_number || prev.engine_number,
          register_date: result.register_date || prev.register_date,
          issue_date: result.issue_date || prev.issue_date
        }))
        Taro.showToast({title: '主页识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none', duration: 3000})
      }
    } catch (error) {
      showOcrError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  // 识别行驶证副页
  const handleRecognizeDrivingLicenseSub = async () => {
    if (!photos.driving_license_sub) {
      Taro.showToast({title: '请先拍摄行驶证副页', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const {recognizeDrivingLicenseSub} = await import('@/utils/ocrUtils')
      const result = await recognizeDrivingLicenseSub(photos.driving_license_sub, (msg) => {
        Taro.showLoading({title: msg})
      })

      if (result) {
        setFormData((prev) => ({
          ...prev,
          archive_number: result.archive_number || prev.archive_number,
          total_mass: result.total_mass || prev.total_mass,
          approved_passengers: result.approved_passengers || prev.approved_passengers,
          curb_weight: result.curb_weight || prev.curb_weight,
          approved_load: result.approved_load || prev.approved_load,
          overall_dimension_length: result.overall_dimension_length || prev.overall_dimension_length,
          overall_dimension_width: result.overall_dimension_width || prev.overall_dimension_width,
          overall_dimension_height: result.overall_dimension_height || prev.overall_dimension_height,
          inspection_valid_until: result.inspection_valid_until || prev.inspection_valid_until
        }))
        Taro.showToast({title: '副页识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none', duration: 3000})
      }
    } catch (error) {
      showOcrError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  // 识别行驶证副页背页
  const handleRecognizeDrivingLicenseSubBack = async () => {
    if (!photos.driving_license_sub_back) {
      Taro.showToast({title: '请先拍摄行驶证副页背页', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const {recognizeDrivingLicenseSubBack} = await import('@/utils/ocrUtils')
      const result = await recognizeDrivingLicenseSubBack(photos.driving_license_sub_back, (msg) => {
        Taro.showLoading({title: msg})
      })

      if (result) {
        setFormData((prev) => ({
          ...prev,
          mandatory_scrap_date: result.mandatory_scrap_date || prev.mandatory_scrap_date,
          inspection_date: result.inspection_date || prev.inspection_date,
          // 优先使用副页背面的检验有效期（因为它是最新的）
          inspection_valid_until: result.inspection_valid_until || prev.inspection_valid_until
        }))
        Taro.showToast({title: '副页背页识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none', duration: 3000})
      }
    } catch (error) {
      showOcrError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  // 识别身份证正面
  const handleRecognizeIdCardFront = async () => {
    if (!driverPhotos.id_card_front) {
      Taro.showToast({title: '请先拍摄身份证正面', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const result = await recognizeIdCardFront(driverPhotos.id_card_front, (msg) => {
        Taro.showLoading({title: msg})
      })

      if (result) {
        setDriverLicenseData((prev) => ({
          ...prev,
          id_card_number: result.id_number || prev.id_card_number,
          id_card_name: result.name || prev.id_card_name,
          id_card_address: result.address || prev.id_card_address,
          id_card_birth_date: result.birth_date || prev.id_card_birth_date
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      }
    } catch (error) {
      showOcrError(error)
      // 错误已通过showOcrError显示
    } finally {
      Taro.hideLoading()
    }
  }

  // 识别驾驶证
  const handleRecognizeDriverLicense = async () => {
    if (!driverPhotos.driver_license) {
      Taro.showToast({title: '请先拍摄驾驶证', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const result = await recognizeDriverLicense(driverPhotos.driver_license, (msg) => {
        Taro.showLoading({title: msg})
      })

      if (result) {
        setDriverLicenseData((prev) => ({
          ...prev,
          id_card_name: result.name || prev.id_card_name, // 驾驶证上的姓名
          id_card_address: result.address || prev.id_card_address, // 驾驶证上的住址
          license_number: result.license_number || prev.license_number,
          license_class: result.license_class || prev.license_class,
          valid_from: result.valid_from || prev.valid_from,
          valid_to: result.valid_until || prev.valid_to,
          issue_authority: result.issue_authority || prev.issue_authority
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      }
    } catch (error) {
      showOcrError(error)
      // 错误已通过showOcrError显示
    } finally {
      Taro.hideLoading()
    }
  }

  // 验证当前步骤
  /**
   * 检查驾驶员证件识别结果的完整性
   * @returns {missingFields: string[], isComplete: boolean}
   */
  const checkDriverLicenseRecognition = (): {missingFields: string[]; isComplete: boolean} => {
    const missingFields: string[] = []

    // 检查身份证识别结果
    if (!driverLicenseData.id_card_number) missingFields.push('身份证号码')
    if (!driverLicenseData.id_card_name) missingFields.push('姓名')

    // 检查驾驶证识别结果
    if (!driverLicenseData.license_number) missingFields.push('驾驶证号')
    if (!driverLicenseData.license_class) missingFields.push('准驾车型')
    if (!driverLicenseData.valid_from) missingFields.push('初次领证日期')
    if (!driverLicenseData.valid_to) missingFields.push('有效期至')

    return {
      missingFields,
      isComplete: missingFields.length === 0
    }
  }

  /**
   * 显示驾驶员证件识别失败对话框
   * @param missingFields 缺失的字段列表
   */
  const showDriverLicenseRecognitionFailureDialog = async (missingFields: string[]) => {
    const fieldList = missingFields.join('、')
    const message = `以下证件信息未能识别成功：\n\n${fieldList}\n\n请选择后续操作：`

    const res = await Taro.showModal({
      title: '证件识别失败',
      content: message,
      confirmText: '重新识别',
      cancelText: '重新拍摄',
      confirmColor: '#3b82f6',
      cancelColor: '#ef4444'
    })

    if (res.confirm) {
      // 用户选择重新识别
      await handleReRecognizeDriverLicense()
    } else if (res.cancel) {
      // 用户选择重新拍摄
      handleReImportDriverLicense()
    }
  }

  /**
   * 重新识别驾驶员证件：使用已上传的照片重新进行识别
   */
  const handleReRecognizeDriverLicense = async () => {
    Taro.showLoading({title: '重新识别中...'})
    try {
      // 重新识别身份证正面
      if (driverPhotos.id_card_front) {
        await handleRecognizeIdCardFront()
      }

      // 重新识别驾驶证
      if (driverPhotos.driver_license) {
        await handleRecognizeDriverLicense()
      }

      // 再次检查识别结果
      const {missingFields, isComplete} = checkDriverLicenseRecognition()
      if (isComplete) {
        Taro.showToast({
          title: '重新识别成功',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: `仍有${missingFields.length}个字段未识别`,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('重新识别失败:', error)
      Taro.showToast({
        title: '重新识别失败',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  /**
   * 重新拍摄驾驶员证件：清空照片，让用户重新拍摄
   */
  const handleReImportDriverLicense = () => {
    // 清空驾驶员证件照片
    setDriverPhotos({
      id_card_front: '',
      id_card_back: '',
      driver_license: ''
    })

    // 清空识别结果
    setDriverLicenseData({
      id_card_number: '',
      id_card_name: '',
      id_card_address: '',
      id_card_birth_date: '',
      license_number: '',
      license_class: '',
      valid_from: '',
      valid_to: '',
      issue_authority: ''
    })

    Taro.showToast({
      title: '已清空，请重新拍摄证件',
      icon: 'none',
      duration: 2000
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // 行驶证识别 - 需要三张照片
        if (!photos.driving_license_main) {
          Taro.showToast({title: '请拍摄行驶证主页', icon: 'none'})
          return false
        }
        if (!photos.driving_license_sub) {
          Taro.showToast({title: '请拍摄行驶证副页', icon: 'none'})
          return false
        }
        if (!photos.driving_license_sub_back) {
          Taro.showToast({title: '请拍摄行驶证副页背页', icon: 'none'})
          return false
        }
        // 验证是否已识别出必要信息
        if (!formData.plate_number || !formData.brand || !formData.model) {
          Taro.showToast({title: '请先识别行驶证主页，确保获取车牌号、品牌和型号', icon: 'none'})
          return false
        }
        return true
      case 1: // 车辆照片 - 验证所有7个角度的照片
        if (
          !photos.left_front ||
          !photos.right_front ||
          !photos.left_rear ||
          !photos.right_rear ||
          !photos.dashboard ||
          !photos.rear_door ||
          !photos.cargo_box
        ) {
          Taro.showToast({title: '请拍摄所有角度的车辆照片', icon: 'none'})
          return false
        }
        return true
      case 2: // 驾驶员证件
        if (!driverPhotos.id_card_front || !driverPhotos.id_card_back || !driverPhotos.driver_license) {
          Taro.showToast({title: '请拍摄所有证件照片', icon: 'none'})
          return false
        }
        return true
      default:
        return true
    }
  }

  /**
   * 检查行驶证识别结果的完整性
   * @returns {missingFields: string[], isComplete: boolean}
   */
  const checkRecognitionResult = (): {missingFields: string[]; isComplete: boolean} => {
    const missingFields: string[] = []

    // 检查主页必填字段
    if (!formData.plate_number) missingFields.push('车牌号码')
    if (!formData.brand) missingFields.push('品牌')
    if (!formData.model) missingFields.push('型号')
    if (!formData.vin) missingFields.push('车辆识别代号')
    if (!formData.vehicle_type) missingFields.push('车辆类型')
    if (!formData.owner_name) missingFields.push('所有人')

    // 检查副页必填字段
    if (!formData.archive_number) missingFields.push('档案编号')
    if (!formData.inspection_valid_until) missingFields.push('检验有效期')

    return {
      missingFields,
      isComplete: missingFields.length === 0
    }
  }

  /**
   * 显示识别失败对话框，提供重新识别或重新导入选项
   * @param missingFields 缺失的字段列表
   */
  const showRecognitionFailureDialog = async (missingFields: string[]) => {
    const fieldList = missingFields.join('、')
    const message = `以下信息未能识别成功：\n\n${fieldList}\n\n请选择后续操作：`

    const res = await Taro.showModal({
      title: '识别失败',
      content: message,
      confirmText: '重新识别',
      cancelText: '重新导入',
      confirmColor: '#3b82f6',
      cancelColor: '#ef4444'
    })

    if (res.confirm) {
      // 用户选择重新识别
      await handleReRecognize()
    } else if (res.cancel) {
      // 用户选择重新导入
      handleReImport()
    }
  }

  /**
   * 重新识别：使用已上传的照片重新进行识别
   */
  const handleReRecognize = async () => {
    Taro.showLoading({title: '重新识别中...'})
    try {
      // 重新识别主页
      if (photos.driving_license_main) {
        await handleRecognizeDrivingLicenseMain()
      }

      // 重新识别副页
      if (photos.driving_license_sub) {
        await handleRecognizeDrivingLicenseSub()
      }

      // 重新识别副页背页
      if (photos.driving_license_sub_back) {
        await handleRecognizeDrivingLicenseSubBack()
      }

      // 再次检查识别结果
      const {missingFields, isComplete} = checkRecognitionResult()
      if (isComplete) {
        Taro.showToast({
          title: '重新识别成功',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: `仍有${missingFields.length}个字段未识别`,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('重新识别失败:', error)
      Taro.showToast({
        title: '重新识别失败',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  /**
   * 重新导入：清空照片，让用户重新拍摄
   */
  const handleReImport = () => {
    // 清空行驶证照片
    setPhotos((prev) => ({
      ...prev,
      driving_license_main: '',
      driving_license_sub: '',
      driving_license_sub_back: ''
    }))

    // 清空识别结果
    setFormData((prev) => ({
      ...prev,
      plate_number: '',
      brand: '',
      model: '',
      vin: '',
      vehicle_type: '',
      owner_name: '',
      archive_number: '',
      inspection_valid_until: '',
      engine_number: '',
      register_date: '',
      issue_date: '',
      use_character: '',
      mandatory_scrap_date: '',
      inspection_date: ''
    }))

    Taro.showToast({
      title: '已清空，请重新拍摄',
      icon: 'none',
      duration: 2000
    })
  }

  // 下一步
  const handleNext = async () => {
    // 步骤0：行驶证识别 - 需要特殊处理
    if (currentStep === 0) {
      // 首先检查是否已拍摄所有照片
      if (!photos.driving_license_main) {
        Taro.showToast({title: '请拍摄行驶证主页', icon: 'none'})
        return
      }
      if (!photos.driving_license_sub) {
        Taro.showToast({title: '请拍摄行驶证副页', icon: 'none'})
        return
      }
      if (!photos.driving_license_sub_back) {
        Taro.showToast({title: '请拍摄行驶证副页背页', icon: 'none'})
        return
      }

      // 检查识别结果的完整性
      const {missingFields, isComplete} = checkRecognitionResult()

      if (!isComplete) {
        // 识别不完整，显示失败对话框
        await showRecognitionFailureDialog(missingFields)
        return
      }

      // 识别完整，继续下一步
      Taro.showToast({
        title: '识别完成，进入下一步',
        icon: 'success'
      })
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
      return
    }

    // 其他步骤使用原有的验证逻辑
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    }
  }

  // 选择车损特写照片
  const handleChooseDamagePhotos = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 9 - damagePhotos.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const newPhotos = res.tempFiles.map((file) => ({
        path: file.path,
        size: file.size || 0
      }))

      setDamagePhotos([...damagePhotos, ...newPhotos])
      console.log('选择车损照片', {count: newPhotos.length})
    } catch (error) {
      console.error('选择照片失败', error)
    }
  }

  // 删除车损照片
  const handleDeleteDamagePhoto = (index: number) => {
    const newPhotos = damagePhotos.filter((_, i) => i !== index)
    setDamagePhotos(newPhotos)
  }

  // 上一步
  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  /**
   * 车牌号格式验证
   * 支持新能源车牌（8位）和普通车牌（7位）
   */
  const isValidPlateNumber = (plate: string): boolean => {
    const pattern =
      /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/
    return pattern.test(plate)
  }

  /**
   * 完整的车辆数据验证
   * 在提交前验证所有必需字段和格式
   */
  const validateVehicleData = (): {isValid: boolean; errors: string[]} => {
    const errors: string[] = []

    // 验证必填字段
    if (!formData.plate_number) {
      errors.push('• 车牌号码')
    } else if (!isValidPlateNumber(formData.plate_number)) {
      errors.push('• 车牌号码格式不正确')
    }

    if (!formData.brand) errors.push('• 品牌')
    if (!formData.model) errors.push('• 型号')

    if (!formData.vin) {
      errors.push('• 车辆识别代号（VIN）')
    } else if (formData.vin.length !== 17) {
      errors.push('• 车辆识别代号（VIN）应为17位')
    }

    if (!formData.vehicle_type) errors.push('• 车辆类型')
    if (!formData.owner_name) errors.push('• 所有人')

    // 验证行驶证照片
    if (!photos.driving_license_main) errors.push('• 行驶证主页照片')
    if (!photos.driving_license_sub) errors.push('• 行驶证副页照片')
    if (!photos.driving_license_sub_back) errors.push('• 行驶证副页背页照片')

    // 验证车辆照片
    if (!photos.left_front) errors.push('• 左前45°照片')
    if (!photos.right_front) errors.push('• 右前45°照片')
    if (!photos.left_rear) errors.push('• 左后45°照片')
    if (!photos.right_rear) errors.push('• 右后45°照片')
    if (!photos.dashboard) errors.push('• 仪表盘照片')
    if (!photos.rear_door) errors.push('• 后门照片')
    if (!photos.cargo_box) errors.push('• 货箱照片')

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 提交表单
  const handleSubmit = async (submitForReview: boolean = false) => {
    // 1. 验证当前步骤的基本要求（照片是否已拍摄）
    if (!validateStep(currentStep)) {
      return
    }

    // 2. 验证驾驶员证件识别结果
    const {missingFields, isComplete} = checkDriverLicenseRecognition()
    if (!isComplete) {
      // 证件识别不完整，显示失败对话框
      await showDriverLicenseRecognitionFailureDialog(missingFields)
      return
    }

    // 3. 【新增】验证车辆数据完整性
    const vehicleValidation = validateVehicleData()
    if (!vehicleValidation.isValid) {
      await Taro.showModal({
        title: '信息不完整',
        content: `以下信息缺失或格式错误：\n\n${vehicleValidation.errors.join('\n')}\n\n请返回相应步骤补充完整信息。`,
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    setSubmitting(true)
    Taro.showLoading({title: submitForReview ? '提交审核中...' : '保存中...'})

    try {
      // 上传所有照片
      const uploadedPhotos: Record<string, string> = {}
      const uploadErrors: string[] = []

      // 上传车辆照片
      for (const [key, path] of Object.entries(photos)) {
        if (path) {
          const photoName = PHOTO_NAME_MAP[key] || key
          console.log(`📤 开始上传 ${photoName}...`)

          try {
            const fileName = generateUniqueFileName(`vehicle_${key}`, 'jpg')
            // 判断是否需要强制横向显示
            // 行驶证照片需要横向显示，其他照片保持原始方向
            const needLandscape = key.includes('driving_license')
            const uploadedPath = await uploadImageToStorage(path, BUCKET_NAME, fileName, needLandscape)
            console.log(`✅ ${photoName} 上传成功`)
            uploadedPhotos[key] = uploadedPath
          } catch (error) {
            console.error(`❌ ${photoName} 上传失败:`, error)
            uploadErrors.push(photoName)
          }
        }
      }

      // 检查车辆照片上传是否有失败
      if (uploadErrors.length > 0) {
        throw new Error(`以下照片上传失败：${uploadErrors.join('、')}。请检查网络连接后重试。`)
      }

      // 上传驾驶员证件照片
      const uploadedDriverPhotos: Record<string, string> = {}
      for (const [key, path] of Object.entries(driverPhotos)) {
        if (path) {
          const photoName = PHOTO_NAME_MAP[key] || key
          console.log(`📤 开始上传 ${photoName}...`)

          try {
            const fileName = generateUniqueFileName(`driver_${key}`, 'jpg')
            // 证件照片不需要强制横向显示，保持原始方向
            const uploadedPath = await uploadImageToStorage(path, BUCKET_NAME, fileName, false)
            console.log(`✅ ${photoName} 上传成功`)
            uploadedDriverPhotos[key] = uploadedPath
          } catch (error) {
            console.error(`❌ ${photoName} 上传失败:`, error)
            uploadErrors.push(photoName)
          }
        }
      }

      // 检查证件照片上传是否有失败
      if (uploadErrors.length > 0) {
        throw new Error(`以下照片上传失败：${uploadErrors.join('、')}。请检查网络连接后重试。`)
      }

      // 上传车损特写照片
      const uploadedDamagePhotos: string[] = []
      for (let i = 0; i < damagePhotos.length; i++) {
        const photo = damagePhotos[i]
        try {
          const fileName = generateUniqueFileName(`pickup_damage_${i}`, 'jpg')
          const uploadedPath = await uploadImageToStorage(photo.path, BUCKET_NAME, fileName, false)
          if (uploadedPath) {
            uploadedDamagePhotos.push(uploadedPath)
          }
        } catch (error) {
          console.error(`❌ 车损照片 ${i + 1} 上传失败:`, error)
          // 车损照片上传失败不影响整体流程，只记录日志
        }
      }

      console.log('车损照片上传成功', {count: uploadedDamagePhotos.length})

      // 插入车辆信息
      const vehicleData: VehicleInput = {
        user_id: user.id,
        warehouse_id: null, // 司机添加车辆时暂不分配仓库，由管理员后续分配
        plate_number: formData.plate_number!,
        brand: formData.brand!,
        model: formData.model!,
        color: formData.color || null,
        vehicle_type: formData.vehicle_type || null,
        owner_name: formData.owner_name || null,
        use_character: formData.use_character || null,
        vin: formData.vin || null,
        engine_number: formData.engine_number || null,
        register_date: formData.register_date || null,
        issue_date: formData.issue_date || null,
        // 副页字段 - 确保数值类型正确
        archive_number: formData.archive_number || null,
        total_mass: formData.total_mass ? Number(formData.total_mass) : null,
        approved_passengers: formData.approved_passengers ? Number(formData.approved_passengers) : null,
        curb_weight: formData.curb_weight ? Number(formData.curb_weight) : null,
        approved_load: formData.approved_load ? Number(formData.approved_load) : null,
        overall_dimension_length: formData.overall_dimension_length ? Number(formData.overall_dimension_length) : null,
        overall_dimension_width: formData.overall_dimension_width ? Number(formData.overall_dimension_width) : null,
        overall_dimension_height: formData.overall_dimension_height ? Number(formData.overall_dimension_height) : null,
        inspection_valid_until: formData.inspection_valid_until || null,
        // 副页背页字段
        inspection_date: formData.inspection_date || null,
        mandatory_scrap_date: formData.mandatory_scrap_date || null,
        // 车辆照片
        left_front_photo: uploadedPhotos.left_front,
        right_front_photo: uploadedPhotos.right_front,
        left_rear_photo: uploadedPhotos.left_rear,
        right_rear_photo: uploadedPhotos.right_rear,
        dashboard_photo: uploadedPhotos.dashboard,
        rear_door_photo: uploadedPhotos.rear_door,
        cargo_box_photo: uploadedPhotos.cargo_box,
        // 行驶证照片
        driving_license_main_photo: uploadedPhotos.driving_license_main,
        driving_license_sub_photo: uploadedPhotos.driving_license_sub,
        driving_license_sub_back_photo: uploadedPhotos.driving_license_sub_back,
        // 提车录入相关字段
        status: 'picked_up', // 默认状态为"已提车"
        pickup_time: new Date().toISOString(), // 记录提车时间
        // 提车照片（只包含车辆照片，不包含行驶证照片）
        pickup_photos: [
          uploadedPhotos.left_front,
          uploadedPhotos.right_front,
          uploadedPhotos.left_rear,
          uploadedPhotos.right_rear,
          uploadedPhotos.dashboard,
          uploadedPhotos.rear_door,
          uploadedPhotos.cargo_box
        ].filter(Boolean),
        // 行驶证照片（单独存储）
        registration_photos: [
          uploadedPhotos.driving_license_main,
          uploadedPhotos.driving_license_sub,
          uploadedPhotos.driving_license_sub_back
        ].filter(Boolean), // 行驶证照片
        // 车损特写照片
        damage_photos: uploadedDamagePhotos.length > 0 ? uploadedDamagePhotos : null,
        // 审核状态
        review_status: submitForReview ? 'pending_review' : 'drafting' // 根据参数设置审核状态
      }

      // 插入车辆信息
      console.log('准备插入车辆数据:', vehicleData)
      const insertedVehicle = await insertVehicle(vehicleData)

      if (!insertedVehicle) {
        throw new Error('车辆信息保存失败')
      }

      console.log('车辆信息保存成功:', insertedVehicle)

      // 插入驾驶员证件信息
      if (Object.keys(uploadedDriverPhotos).length > 0) {
        const driverLicenseInput: DriverLicenseInput = {
          driver_id: user.id,
          id_card_number: driverLicenseData.id_card_number,
          id_card_name: driverLicenseData.id_card_name,
          id_card_address: driverLicenseData.id_card_address,
          id_card_birth_date: driverLicenseData.id_card_birth_date,
          id_card_photo_front: uploadedDriverPhotos.id_card_front,
          id_card_photo_back: uploadedDriverPhotos.id_card_back,
          license_number: driverLicenseData.license_number,
          license_class: driverLicenseData.license_class,
          valid_from: driverLicenseData.valid_from,
          valid_to: driverLicenseData.valid_to,
          issue_authority: driverLicenseData.issue_authority,
          driving_license_photo: uploadedDriverPhotos.driver_license,
          status: 'active'
        }

        console.log('准备插入驾驶员证件数据:', driverLicenseInput)
        const insertedLicense = await upsertDriverLicense(driverLicenseInput)
        console.log('驾驶员证件保存结果:', insertedLicense)
      }

      Taro.hideLoading()
      Taro.showToast({
        title: submitForReview ? '提交审核成功' : '保存成功',
        icon: 'success'
      })

      // 删除草稿
      if (user?.id) {
        await deleteDraft('add', user.id)
      }

      // 延迟返回
      setTimeout(() => {
        Taro.switchTab({url: '/pages/driver/vehicle-list/index'})
      }, 1500)
    } catch (error) {
      console.error('提交失败详情:', error)
      Taro.hideLoading()

      // 解析错误信息，提供更明确的提示
      let errorMessage = '提交失败，请重试'
      let errorTitle = '提交失败'

      if (error instanceof Error) {
        const msg = error.message.toLowerCase()

        // 照片上传失败
        if (msg.includes('上传失败')) {
          errorTitle = '照片上传失败'
          errorMessage = error.message
        }
        // 数据验证失败
        else if (msg.includes('violates') || msg.includes('constraint')) {
          errorTitle = '数据验证失败'
          errorMessage = '输入的信息不符合要求，请检查后重试'
        }
        // 权限不足
        else if (msg.includes('permission') || msg.includes('policy')) {
          errorTitle = '权限不足'
          errorMessage = '您没有权限执行此操作，请联系管理员'
        }
        // 网络错误
        else if (msg.includes('network') || msg.includes('timeout')) {
          errorTitle = '网络错误'
          errorMessage = '网络连接失败，请检查网络后重试'
        }
        // 其他错误
        else {
          errorMessage = error.message
        }
      }

      // 使用 Modal 显示详细错误信息
      Taro.showModal({
        title: errorTitle,
        content: errorMessage,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#ef4444'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 步骤指示器 */}
          <StepIndicator steps={steps} currentStep={currentStep} />

          {/* 步骤1: 行驶证识别 */}
          {currentStep === 0 && (
            <View>
              {/* 行驶证主页 - 照片和信息一起 */}
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-file-document text-2xl text-blue-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">行驶证主页</Text>
                </View>

                <PhotoCapture
                  title=""
                  description="请拍摄行驶证主页，包含车辆基本信息"
                  tips={['确保照片清晰', '避免反光和阴影', '包含所有文字信息']}
                  value={photos.driving_license_main}
                  onChange={(path) => setPhotos((prev) => ({...prev, driving_license_main: path}))}
                />

                {photos.driving_license_main && (
                  <View className="mt-3">
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                      size="default"
                      onClick={handleRecognizeDrivingLicenseMain}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-text-recognition text-xl mr-2"></View>
                        <Text className="font-medium">识别主页</Text>
                      </View>
                    </Button>
                  </View>
                )}

                {/* 主页识别结果 */}
                {formData.plate_number && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-check-circle text-xl text-green-600 mr-2"></View>
                      <Text className="text-base font-semibold text-gray-700">识别结果</Text>
                    </View>
                    <View className="space-y-2">
                      <InfoDisplay label="车牌号" value={formData.plate_number} highlight />
                      {formData.brand && <InfoDisplay label="品牌" value={formData.brand} />}
                      {formData.model && <InfoDisplay label="型号" value={formData.model} />}
                      {formData.vehicle_type && <InfoDisplay label="车辆类型" value={formData.vehicle_type} />}
                      {formData.vin && <InfoDisplay label="车辆识别代号" value={formData.vin} />}
                      {formData.engine_number && <InfoDisplay label="发动机号码" value={formData.engine_number} />}
                      {formData.owner_name && <InfoDisplay label="所有人" value={formData.owner_name} />}
                      {formData.use_character && <InfoDisplay label="使用性质" value={formData.use_character} />}
                      {formData.register_date && (
                        <InfoDisplay
                          label="注册日期"
                          value={new Date(formData.register_date).toLocaleDateString('zh-CN')}
                        />
                      )}
                      {formData.issue_date && (
                        <InfoDisplay
                          label="发证日期"
                          value={new Date(formData.issue_date).toLocaleDateString('zh-CN')}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 行驶证副页 - 照片和信息一起 */}
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-file-document-outline text-2xl text-purple-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">行驶证副页</Text>
                </View>

                <PhotoCapture
                  title=""
                  description="请拍摄行驶证副页，包含检验记录等信息"
                  tips={['确保照片清晰', '包含档案编号、总质量等信息']}
                  value={photos.driving_license_sub}
                  onChange={(path) => setPhotos((prev) => ({...prev, driving_license_sub: path}))}
                />

                {photos.driving_license_sub && (
                  <View className="mt-3">
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                      size="default"
                      onClick={handleRecognizeDrivingLicenseSub}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-text-recognition text-xl mr-2"></View>
                        <Text className="font-medium">识别副页</Text>
                      </View>
                    </Button>
                  </View>
                )}

                {/* 副页识别结果 */}
                {(formData.archive_number ||
                  formData.total_mass ||
                  formData.approved_passengers ||
                  formData.inspection_valid_until) && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-check-circle text-xl text-green-600 mr-2"></View>
                      <Text className="text-base font-semibold text-gray-700">识别结果</Text>
                    </View>
                    <View className="space-y-2">
                      {formData.archive_number && <InfoDisplay label="档案编号" value={formData.archive_number} />}
                      {formData.total_mass && <InfoDisplay label="总质量" value={`${formData.total_mass} kg`} />}
                      {formData.approved_passengers && (
                        <InfoDisplay label="核定载人数" value={`${formData.approved_passengers} 人`} />
                      )}
                      {formData.curb_weight && <InfoDisplay label="整备质量" value={`${formData.curb_weight} kg`} />}
                      {formData.approved_load && (
                        <InfoDisplay label="核定载质量" value={`${formData.approved_load} kg`} />
                      )}
                      {(formData.overall_dimension_length ||
                        formData.overall_dimension_width ||
                        formData.overall_dimension_height) && (
                        <InfoDisplay
                          label="外廓尺寸"
                          value={`${formData.overall_dimension_length || 0} × ${formData.overall_dimension_width || 0} × ${formData.overall_dimension_height || 0} mm`}
                        />
                      )}
                      {formData.inspection_valid_until && (
                        <InfoDisplay
                          label="检验有效期"
                          value={new Date(formData.inspection_valid_until).toLocaleDateString('zh-CN')}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 行驶证副页背页 - 照片和信息一起 */}
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-file-document-multiple text-2xl text-green-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">行驶证副页背页</Text>
                </View>

                <PhotoCapture
                  title=""
                  description="请拍摄行驶证副页背页，包含最新的年检记录和检验有效期"
                  tips={[
                    '确保照片清晰',
                    '包含最新的年检记录',
                    '包含检验有效期至日期',
                    '包含强制报废期信息',
                    '如果副页正面的检验有效期已过期，背面会有新的有效期'
                  ]}
                  value={photos.driving_license_sub_back}
                  onChange={(path) => setPhotos((prev) => ({...prev, driving_license_sub_back: path}))}
                />

                {photos.driving_license_sub_back && (
                  <View className="mt-3">
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                      size="default"
                      onClick={handleRecognizeDrivingLicenseSubBack}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-text-recognition text-xl mr-2"></View>
                        <Text className="font-medium">识别副页背页</Text>
                      </View>
                    </Button>
                  </View>
                )}

                {/* 副页背页识别结果 */}
                {(formData.mandatory_scrap_date || formData.inspection_date) && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-check-circle text-xl text-green-600 mr-2"></View>
                      <Text className="text-base font-semibold text-gray-700">识别结果</Text>
                    </View>
                    <View className="space-y-2">
                      {formData.inspection_date && (
                        <>
                          <InfoDisplay
                            label="年检时间"
                            value={new Date(formData.inspection_date).toLocaleDateString('zh-CN')}
                          />
                          {formData.inspection_valid_until &&
                            (() => {
                              const _inspectionDate = new Date(formData.inspection_date)
                              const validUntil = new Date(formData.inspection_valid_until)
                              const today = new Date()
                              const daysRemaining = Math.ceil(
                                (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                              )
                              return (
                                <InfoDisplay
                                  label="剩余年检时间"
                                  value={daysRemaining > 0 ? `${daysRemaining}天` : '已过期'}
                                />
                              )
                            })()}
                        </>
                      )}
                      {formData.mandatory_scrap_date && (
                        <InfoDisplay
                          label="强制报废期"
                          value={new Date(formData.mandatory_scrap_date).toLocaleDateString('zh-CN')}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 提示信息 */}
              {(photos.driving_license_main || photos.driving_license_sub || photos.driving_license_sub_back) &&
                !formData.plate_number && (
                  <View className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 mb-4 border-l-4 border-amber-500">
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-information text-lg text-amber-600 mr-2"></View>
                      <Text className="text-sm font-bold text-amber-800">温馨提示</Text>
                    </View>
                    <Text className="text-sm text-amber-700">
                      请依次拍摄行驶证的三个部分，并点击对应的识别按钮，系统将自动识别车辆信息
                    </Text>
                  </View>
                )}
            </View>
          )}

          {/* 步骤2: 车辆照片 - 7个角度 */}
          {currentStep === 1 && (
            <View>
              <PhotoCapture
                title="左前照片"
                description="拍摄车辆左前方45度角"
                tips={['包含车头和左侧', '确保车牌清晰可见']}
                value={photos.left_front}
                onChange={(path) => setPhotos((prev) => ({...prev, left_front: path}))}
              />
              <PhotoCapture
                title="右前照片"
                description="拍摄车辆右前方45度角"
                tips={['包含车头和右侧', '确保车牌清晰可见']}
                value={photos.right_front}
                onChange={(path) => setPhotos((prev) => ({...prev, right_front: path}))}
              />
              <PhotoCapture
                title="左后照片"
                description="拍摄车辆左后方45度角"
                tips={['包含车尾和左侧', '确保车牌清晰可见']}
                value={photos.left_rear}
                onChange={(path) => setPhotos((prev) => ({...prev, left_rear: path}))}
              />
              <PhotoCapture
                title="右后照片"
                description="拍摄车辆右后方45度角"
                tips={['包含车尾和右侧', '确保车牌清晰可见']}
                value={photos.right_rear}
                onChange={(path) => setPhotos((prev) => ({...prev, right_rear: path}))}
              />
              <PhotoCapture
                title="仪表盘照片"
                description="拍摄车辆仪表盘"
                tips={['确保里程数清晰', '包含所有仪表信息']}
                value={photos.dashboard}
                onChange={(path) => setPhotos((prev) => ({...prev, dashboard: path}))}
              />
              <PhotoCapture
                title="后门照片"
                description="拍摄车辆后门"
                tips={['确保后门完整', '照片清晰']}
                value={photos.rear_door}
                onChange={(path) => setPhotos((prev) => ({...prev, rear_door: path}))}
              />
              <PhotoCapture
                title="货箱照片"
                description="拍摄车辆货箱"
                tips={['确保货箱完整', '照片清晰']}
                value={photos.cargo_box}
                onChange={(path) => setPhotos((prev) => ({...prev, cargo_box: path}))}
              />

              {/* 车损特写照片（多张，可选） */}
              <View className="bg-white rounded-2xl p-6 mt-6 shadow-md">
                <View className="flex items-center justify-between mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-image-multiple text-2xl text-red-600 mr-2"></View>
                    <Text className="text-lg font-bold text-gray-800">车损特写</Text>
                    <Text className="text-xs text-gray-500 ml-2">（可选）</Text>
                  </View>
                  <Text className="text-xs text-gray-500">{damagePhotos.length}/9</Text>
                </View>

                <View className="flex flex-wrap gap-3">
                  {damagePhotos.map((photo, index) => (
                    <View key={index} className="relative">
                      <Image
                        src={photo.path}
                        mode="aspectFill"
                        className="w-24 h-24 rounded-lg border-2 border-gray-200"
                      />
                      <View
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        onClick={() => handleDeleteDamagePhoto(index)}>
                        <View className="i-mdi-close text-white text-sm"></View>
                      </View>
                    </View>
                  ))}

                  {damagePhotos.length < 9 && (
                    <View
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                      onClick={handleChooseDamagePhotos}>
                      <View className="flex flex-col items-center">
                        <View className="i-mdi-plus text-3xl text-gray-400 mb-1"></View>
                        <Text className="text-xs text-gray-500">添加照片</Text>
                      </View>
                    </View>
                  )}
                </View>

                <Text className="text-xs text-gray-500 mt-3">提示：如有车辆损伤，请拍摄特写照片，最多上传9张</Text>
              </View>
            </View>
          )}

          {/* 步骤3: 驾驶员证件 */}
          {currentStep === 2 && (
            <View>
              {/* 用户引导提示 */}
              <View className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 mb-6 border-2 border-blue-200">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-information text-2xl text-blue-600 mr-2"></View>
                  <Text className="text-lg font-bold text-blue-800">证件识别要求</Text>
                </View>
                <View className="space-y-2">
                  <View className="flex items-start">
                    <View className="i-mdi-check-circle text-base text-green-600 mr-2 mt-0.5"></View>
                    <Text className="text-sm text-gray-700 flex-1">确保证件照片清晰完整，包含所有文字信息</Text>
                  </View>
                  <View className="flex items-start">
                    <View className="i-mdi-check-circle text-base text-green-600 mr-2 mt-0.5"></View>
                    <Text className="text-sm text-gray-700 flex-1">避免反光、阴影和模糊</Text>
                  </View>
                  <View className="flex items-start">
                    <View className="i-mdi-check-circle text-base text-green-600 mr-2 mt-0.5"></View>
                    <Text className="text-sm text-gray-700 flex-1">拍摄后请点击"识别"按钮，系统将自动提取证件信息</Text>
                  </View>
                  <View className="flex items-start">
                    <View className="i-mdi-alert-circle text-base text-orange-600 mr-2 mt-0.5"></View>
                    <Text className="text-sm text-orange-700 flex-1 font-medium">
                      只有成功识别所有必填信息后才能提交
                    </Text>
                  </View>
                </View>
              </View>

              {/* 身份证正面 */}
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-card-account-details text-2xl text-blue-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">身份证正面</Text>
                  <View className="ml-2 bg-red-100 px-2 py-0.5 rounded">
                    <Text className="text-xs text-red-600 font-medium">必填</Text>
                  </View>
                </View>

                <PhotoCapture
                  title=""
                  description="请拍摄身份证正面，包含姓名、身份证号等信息"
                  tips={['确保照片清晰', '避免反光和阴影', '包含所有文字信息']}
                  value={driverPhotos.id_card_front}
                  onChange={(path) => setDriverPhotos((prev) => ({...prev, id_card_front: path}))}
                />

                {driverPhotos.id_card_front && (
                  <View className="mt-3">
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                      size="default"
                      onClick={handleRecognizeIdCardFront}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-text-recognition text-xl mr-2"></View>
                        <Text className="font-medium">识别身份证</Text>
                      </View>
                    </Button>
                  </View>
                )}

                {/* 身份证识别结果 */}
                {driverLicenseData.id_card_number && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-check-circle text-xl text-green-600 mr-2"></View>
                      <Text className="text-base font-semibold text-gray-700">识别结果</Text>
                    </View>
                    <View className="space-y-2">
                      {driverLicenseData.id_card_name && (
                        <InfoDisplay label="姓名" value={driverLicenseData.id_card_name} highlight />
                      )}
                      {driverLicenseData.id_card_number && (
                        <InfoDisplay label="身份证号" value={driverLicenseData.id_card_number} />
                      )}
                      {driverLicenseData.id_card_address && (
                        <InfoDisplay label="住址" value={driverLicenseData.id_card_address} />
                      )}
                      {driverLicenseData.id_card_birth_date && (
                        <InfoDisplay
                          label="出生日期"
                          value={new Date(driverLicenseData.id_card_birth_date).toLocaleDateString('zh-CN')}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 身份证反面 */}
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-card-account-details-outline text-2xl text-purple-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">身份证反面</Text>
                  <View className="ml-2 bg-red-100 px-2 py-0.5 rounded">
                    <Text className="text-xs text-red-600 font-medium">必填</Text>
                  </View>
                </View>

                <PhotoCapture
                  title=""
                  description="请拍摄身份证反面，包含签发机关、有效期等信息"
                  tips={['确保照片清晰', '避免反光和阴影', '包含所有文字信息']}
                  value={driverPhotos.id_card_back}
                  onChange={(path) => setDriverPhotos((prev) => ({...prev, id_card_back: path}))}
                />
              </View>

              {/* 驾驶证 */}
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-car-key text-2xl text-green-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">驾驶证主页</Text>
                  <View className="ml-2 bg-red-100 px-2 py-0.5 rounded">
                    <Text className="text-xs text-red-600 font-medium">必填</Text>
                  </View>
                </View>

                <PhotoCapture
                  title=""
                  description="请拍摄驾驶证主页，包含驾驶证号、准驾车型等信息"
                  tips={['确保照片清晰', '避免反光和阴影', '包含所有文字信息']}
                  value={driverPhotos.driver_license}
                  onChange={(path) => setDriverPhotos((prev) => ({...prev, driver_license: path}))}
                />

                {driverPhotos.driver_license && (
                  <View className="mt-3">
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                      size="default"
                      onClick={handleRecognizeDriverLicense}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-text-recognition text-xl mr-2"></View>
                        <Text className="font-medium">识别驾驶证</Text>
                      </View>
                    </Button>
                  </View>
                )}

                {/* 驾驶证识别结果 */}
                {driverLicenseData.license_number && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-check-circle text-xl text-green-600 mr-2"></View>
                      <Text className="text-base font-semibold text-gray-700">识别结果</Text>
                    </View>
                    <View className="space-y-2">
                      {driverLicenseData.license_number && (
                        <InfoDisplay label="驾驶证编号" value={driverLicenseData.license_number} />
                      )}
                      {driverLicenseData.license_class && (
                        <InfoDisplay label="准驾车型" value={driverLicenseData.license_class} highlight />
                      )}
                      {driverLicenseData.first_issue_date && (
                        <InfoDisplay
                          label="初次领证日期"
                          value={new Date(driverLicenseData.first_issue_date).toLocaleDateString('zh-CN')}
                        />
                      )}
                      {driverLicenseData.first_issue_date && (
                        <InfoDisplay
                          label="驾龄"
                          value={`${calculateDrivingYears(driverLicenseData.first_issue_date)} 年`}
                          highlight
                        />
                      )}
                      {driverLicenseData.valid_to && (
                        <InfoDisplay
                          label="有效期至"
                          value={new Date(driverLicenseData.valid_to).toLocaleDateString('zh-CN')}
                        />
                      )}
                      {driverLicenseData.issue_authority && (
                        <InfoDisplay label="发证机关" value={driverLicenseData.issue_authority} />
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 识别状态提示 */}
              {(() => {
                const {missingFields, isComplete} = checkDriverLicenseRecognition()
                if (
                  driverPhotos.id_card_front &&
                  driverPhotos.id_card_back &&
                  driverPhotos.driver_license &&
                  !isComplete
                ) {
                  return (
                    <View className="bg-orange-50 rounded-2xl p-5 mb-6 border-2 border-orange-200">
                      <View className="flex items-center mb-3">
                        <View className="i-mdi-alert text-2xl text-orange-600 mr-2"></View>
                        <Text className="text-lg font-bold text-orange-800">识别未完成</Text>
                      </View>
                      <Text className="text-sm text-orange-700 mb-3">
                        以下信息尚未识别成功：{missingFields.join('、')}
                      </Text>
                      <Text className="text-sm text-orange-700">
                        请点击对应的"识别"按钮，或重新拍摄更清晰的证件照片
                      </Text>
                    </View>
                  )
                }
                if (isComplete) {
                  return (
                    <View className="bg-green-50 rounded-2xl p-5 mb-6 border-2 border-green-200">
                      <View className="flex items-center">
                        <View className="i-mdi-check-circle text-2xl text-green-600 mr-2"></View>
                        <Text className="text-lg font-bold text-green-800">识别完成</Text>
                      </View>
                      <Text className="text-sm text-green-700 mt-2">所有必填信息已成功识别，可以提交了</Text>
                    </View>
                  )
                }
                return null
              })()}
            </View>
          )}

          {/* 操作按钮 */}
          <View className="flex gap-3 mt-6 mb-4">
            {currentStep > 0 && (
              <Button
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                size="default"
                onClick={handlePrev}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-arrow-left text-xl mr-2"></View>
                  <Text className="font-medium">上一步</Text>
                </View>
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                size="default"
                onClick={handleNext}>
                <View className="flex items-center justify-center">
                  <Text className="font-medium">下一步</Text>
                  <View className="i-mdi-arrow-right text-xl ml-2"></View>
                </View>
              </Button>
            ) : (
              <>
                {/* 保存草稿按钮 */}
                <Button
                  className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                  size="default"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}>
                  <View className="flex items-center justify-center">
                    <View className="i-mdi-content-save text-xl mr-2"></View>
                    <Text className="font-medium">{submitting ? '保存中...' : '保存草稿'}</Text>
                  </View>
                </Button>
                {/* 提交审核按钮 */}
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                  size="default"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}>
                  <View className="flex items-center justify-center">
                    <View className="i-mdi-check-circle text-xl mr-2"></View>
                    <Text className="font-medium">{submitting ? '提交中...' : '提交审核'}</Text>
                  </View>
                </Button>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// 信息显示组件
interface InfoDisplayProps {
  label: string
  value: string
  highlight?: boolean
}

const InfoDisplay: React.FC<InfoDisplayProps> = ({label, value, highlight}) => (
  <View className="flex items-center py-2.5 border-b border-gray-100 last:border-0">
    <View className="flex-1">
      <Text className="text-sm text-gray-500 block mb-1">{label}</Text>
      <Text className={`text-base font-medium ${highlight ? 'text-blue-600 text-lg font-bold' : 'text-gray-800'}`}>
        {value}
      </Text>
    </View>
  </View>
)

export default AddVehicle
