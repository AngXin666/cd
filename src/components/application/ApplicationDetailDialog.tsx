import {Text, View} from '@tarojs/components'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'

interface ApplicationDetailDialogProps {
  visible: boolean
  onClose: () => void
  applicationId: string
  applicationType: 'leave' | 'resignation'
}

interface ApplicationDetail {
  // 申请信息
  id: string
  user_id: string
  status: string
  created_at: string
  // 申请人信息
  applicant_name: string
  applicant_phone: string
  // 审批信息
  reviewed_by?: string
  reviewer_name?: string
  review_notes?: string
  reviewed_at?: string
  // 请假特有字段
  leave_type?: string
  start_date?: string
  end_date?: string
  reason?: string
  // 离职特有字段
  resignation_date?: string
  resignation_reason?: string
}

const ApplicationDetailDialog: React.FC<ApplicationDetailDialogProps> = ({
  visible,
  onClose,
  applicationId,
  applicationType
}) => {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ApplicationDetail | null>(null)

  const loadApplicationDetail = useCallback(async () => {
    try {
      setLoading(true)

      if (applicationType === 'leave') {
        // 获取请假申请详情
        const {data: application, error: appError} = await supabase
          .from('leave_applications')
          .select('*')
          .eq('id', applicationId)
          .maybeSingle()

        if (appError || !application) {
          console.error('获取请假申请失败:', appError)
          return
        }

        // 获取申请人信息（单用户架构：从 users 表查询）
        const {data: applicant} = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', application.user_id)
          .maybeSingle()

        // 获取审批人信息
        let reviewerName = ''
        if (application.reviewed_by) {
          const {data: reviewer} = await supabase
            .from('users')
            .select('name')
            .eq('id', application.reviewed_by)
            .maybeSingle()
          reviewerName = reviewer?.name || '管理员'
        }

        setDetail({
          id: application.id,
          user_id: application.user_id,
          status: application.status,
          created_at: application.created_at,
          applicant_name: applicant?.name || '未知',
          applicant_phone: applicant?.phone || '',
          leave_type: application.leave_type,
          start_date: application.start_date,
          end_date: application.end_date,
          reason: application.reason,
          reviewed_by: application.reviewed_by,
          reviewer_name: reviewerName,
          review_notes: application.review_notes,
          reviewed_at: application.reviewed_at
        })
      } else {
        // 获取离职申请详情
        const {data: application, error: appError} = await supabase
          .from('resignation_applications')
          .select('*')
          .eq('id', applicationId)
          .maybeSingle()

        if (appError || !application) {
          console.error('获取离职申请失败:', appError)
          return
        }

        // 获取申请人信息（单用户架构：从 users 表查询）
        const {data: applicant} = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', application.user_id)
          .maybeSingle()

        // 获取审批人信息
        let reviewerName = ''
        if (application.reviewed_by) {
          const {data: reviewer} = await supabase
            .from('users')
            .select('name')
            .eq('id', application.reviewed_by)
            .maybeSingle()
          reviewerName = reviewer?.name || '管理员'
        }

        setDetail({
          id: application.id,
          user_id: application.user_id,
          status: application.status,
          created_at: application.created_at,
          applicant_name: applicant?.name || '未知',
          applicant_phone: applicant?.phone || '',
          resignation_date: application.resignation_date,
          resignation_reason: application.reason,
          reviewed_by: application.reviewed_by,
          reviewer_name: reviewerName,
          review_notes: application.review_notes,
          reviewed_at: application.reviewed_at
        })
      }
    } catch (error) {
      console.error('加载申请详情失败:', error)
    } finally {
      setLoading(false)
    }
  }, [applicationId, applicationType])

  useEffect(() => {
    if (visible && applicationId) {
      loadApplicationDetail()
    }
  }, [visible, applicationId, loadApplicationDetail])

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      approved: '已同意',
      rejected: '已拒绝'
    }
    return statusMap[status] || status
  }

  const getLeaveTypeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      personal: '事假',
      sick: '病假',
      annual: '年假',
      other: '其他'
    }
    return type ? typeMap[type] || type : ''
  }

  if (!visible) return null

  return (
    <View className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <View
        className="bg-background rounded-lg w-11/12 max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <View className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-lg flex justify-between items-center">
          <Text className="text-lg font-semibold">{applicationType === 'leave' ? '请假申请详情' : '离职申请详情'}</Text>
          <View className="i-mdi-close text-2xl cursor-pointer" onClick={onClose} />
        </View>

        {/* 内容区域 */}
        <View className="p-6 space-y-6">
          {loading ? (
            <View className="text-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : detail ? (
            <>
              {/* 申请人信息 */}
              <View className="space-y-3">
                <Text className="text-base font-semibold text-foreground border-b border-border pb-2">申请人信息</Text>
                <View className="space-y-2 pl-4">
                  <View className="flex items-center">
                    <Text className="text-muted-foreground w-24">姓名：</Text>
                    <Text className="text-foreground">{detail.applicant_name}</Text>
                  </View>
                  {detail.applicant_phone && (
                    <View className="flex items-center">
                      <Text className="text-muted-foreground w-24">联系电话：</Text>
                      <Text className="text-foreground">{detail.applicant_phone}</Text>
                    </View>
                  )}
                  <View className="flex items-center">
                    <Text className="text-muted-foreground w-24">申请时间：</Text>
                    <Text className="text-foreground">{new Date(detail.created_at).toLocaleString('zh-CN')}</Text>
                  </View>
                </View>
              </View>

              {/* 申请详情 */}
              <View className="space-y-3">
                <Text className="text-base font-semibold text-foreground border-b border-border pb-2">申请详情</Text>
                <View className="space-y-2 pl-4">
                  {applicationType === 'leave' ? (
                    <>
                      <View className="flex items-center">
                        <Text className="text-muted-foreground w-24">请假类型：</Text>
                        <Text className="text-foreground">{getLeaveTypeText(detail.leave_type)}</Text>
                      </View>
                      <View className="flex items-center">
                        <Text className="text-muted-foreground w-24">开始日期：</Text>
                        <Text className="text-foreground">{detail.start_date}</Text>
                      </View>
                      <View className="flex items-center">
                        <Text className="text-muted-foreground w-24">结束日期：</Text>
                        <Text className="text-foreground">{detail.end_date}</Text>
                      </View>
                      {detail.reason && (
                        <View className="flex items-start">
                          <Text className="text-muted-foreground w-24">请假事由：</Text>
                          <Text className="text-foreground flex-1">{detail.reason}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View className="flex items-center">
                        <Text className="text-muted-foreground w-24">离职日期：</Text>
                        <Text className="text-foreground">{detail.resignation_date}</Text>
                      </View>
                      {detail.resignation_reason && (
                        <View className="flex items-start">
                          <Text className="text-muted-foreground w-24">离职原因：</Text>
                          <Text className="text-foreground flex-1">{detail.resignation_reason}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* 审批信息 */}
              <View className="space-y-3">
                <Text className="text-base font-semibold text-foreground border-b border-border pb-2">审批信息</Text>
                <View className="space-y-2 pl-4">
                  <View className="flex items-center">
                    <Text className="text-muted-foreground w-24">审批状态：</Text>
                    <Text
                      className={`font-medium ${
                        detail.status === 'approved'
                          ? 'text-green-600'
                          : detail.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                      }`}>
                      {getStatusText(detail.status)}
                    </Text>
                  </View>
                  {detail.reviewer_name && (
                    <View className="flex items-center">
                      <Text className="text-muted-foreground w-24">审批人：</Text>
                      <Text className="text-foreground">{detail.reviewer_name}</Text>
                    </View>
                  )}
                  {detail.reviewed_at && (
                    <View className="flex items-center">
                      <Text className="text-muted-foreground w-24">审批时间：</Text>
                      <Text className="text-foreground">{new Date(detail.reviewed_at).toLocaleString('zh-CN')}</Text>
                    </View>
                  )}
                  {detail.review_notes && (
                    <View className="flex items-start">
                      <Text className="text-muted-foreground w-24">审批意见：</Text>
                      <Text className="text-foreground flex-1">{detail.review_notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View className="text-center py-8">
              <Text className="text-muted-foreground">暂无数据</Text>
            </View>
          )}
        </View>

        {/* 底部按钮 */}
        <View className="sticky bottom-0 bg-muted px-6 py-4 rounded-b-lg flex justify-end">
          <View className="bg-primary text-primary-foreground px-6 py-2 rounded cursor-pointer" onClick={onClose}>
            <Text className="text-base">关闭</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ApplicationDetailDialog
