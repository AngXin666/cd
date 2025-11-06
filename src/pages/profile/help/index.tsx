import {ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const HelpPage: React.FC = () => {
  useAuth({guard: true})
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  useDidShow(() => {
    loadProfile()
  })

  // 根据角色定义不同的FAQ列表
  const getDriverFAQ = () => [
    {
      question: '如何进行考勤打卡？',
      answer:
        '进入司机工作台，点击"考勤打卡"按钮，选择仓库后点击打卡即可。系统会自动记录打卡时间，如果迟到会有相应标记。'
    },
    {
      question: '如何录入计件记录？',
      answer:
        '点击"计件录入"按钮，选择仓库和品类，输入件数和相关费用（如上楼费、分拣费等），点击提交即可。录入后可以在"数据统计"中查看。'
    },
    {
      question: '如何申请请假？',
      answer: '点击"请假申请"按钮，选择请假类型（快捷请假/补请假/离职申请），填写请假信息后提交。管理员审批通过后生效。'
    },
    {
      question: '如何查看我的收入？',
      answer: '点击"数据统计"按钮，可以查看个人的计件记录和收入统计。支持按日期和仓库筛选查看。'
    }
  ]

  const getManagerFAQ = () => [
    {
      question: '如何查看司机数据？',
      answer: '在管理员工作台点击"件数报表"，可以查看管辖仓库所有司机的计件和考勤数据。支持按日期和司机筛选。'
    },
    {
      question: '如何审批请假申请？',
      answer: '点击"请假审批"按钮，可以查看待审批的请假申请。点击申请详情，选择同意或拒绝，并填写审批意见。'
    },
    {
      question: '如何管理司机信息？',
      answer: '在管理员工作台可以查看所有司机列表，点击司机可以查看详细信息。如需修改司机角色，请联系超级管理员。'
    }
  ]

  const getSuperAdminFAQ = () => [
    {
      question: '如何管理仓库？',
      answer: '在超级管理员控制台点击"仓库管理"，可以添加、编辑、删除仓库，设置考勤规则。'
    },
    {
      question: '如何分配司机到仓库？',
      answer: '点击"司机分配"按钮，选择司机和仓库，点击分配即可。一个司机可以分配到多个仓库。'
    },
    {
      question: '如何管理用户角色？',
      answer: '点击"用户管理"按钮，可以查看所有用户，修改用户角色（司机/管理员/超级管理员）。'
    },
    {
      question: '如何管理计件品类？',
      answer: '点击"计件品类"按钮，可以添加、编辑、删除计件品类，设置单价和附加费用。'
    }
  ]

  const getCommonFAQ = () => [
    {
      question: '忘记密码怎么办？',
      answer: '请联系管理员重置密码。登录后可以在"设置-修改密码"中修改密码。'
    },
    {
      question: '如何修改个人信息？',
      answer: '进入"我的"页面，点击"编辑资料"，可以修改头像、姓名、昵称、邮箱、居住地址和紧急联系人等信息。'
    },
    {
      question: '如何联系管理员？',
      answer: '可以通过"帮助与反馈"页面提交意见反馈，管理员会及时查看并处理。'
    },
    {
      question: '数据统计不准确怎么办？',
      answer: '请检查是否正确录入了数据。如果数据仍然不准确，请联系管理员核实。'
    }
  ]

  // 根据角色获取FAQ列表
  const getFAQList = () => {
    let roleFAQ: Array<{question: string; answer: string}> = []
    if (profile?.role === 'driver') {
      roleFAQ = getDriverFAQ()
    } else if (profile?.role === 'manager') {
      roleFAQ = getManagerFAQ()
    } else if (profile?.role === 'super_admin') {
      roleFAQ = getSuperAdminFAQ()
    }
    return [...roleFAQ, ...getCommonFAQ()]
  }

  const faqList = getFAQList()

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 快速入口 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">快速入口</Text>
            <View className="grid grid-cols-2 gap-3">
              <View
                className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl active:scale-95 transition-all"
                onClick={() => navigateTo({url: '/pages/profile/feedback/index'})}>
                <View className="i-mdi-message-text text-4xl text-blue-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">意见反馈</Text>
              </View>
              <View className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl active:scale-95 transition-all">
                <View className="i-mdi-phone text-4xl text-green-600 mb-2" />
                <Text className="text-sm font-medium text-gray-800">联系客服</Text>
              </View>
            </View>
          </View>

          {/* 使用说明 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">使用说明</Text>

            <View className="mb-4">
              {profile?.role === 'driver' && (
                <View className="flex items-start mb-3">
                  <View className="i-mdi-numeric-1-circle text-2xl text-blue-900 mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800 block mb-1">司机端功能</Text>
                    <Text className="text-xs text-gray-600 block">
                      司机可以进行考勤打卡、计件录入、请假申请和数据统计查看。每天上班时需要打卡，完成配送后录入计件记录。
                    </Text>
                  </View>
                </View>
              )}

              {profile?.role === 'manager' && (
                <View className="flex items-start mb-3">
                  <View className="i-mdi-numeric-1-circle text-2xl text-blue-900 mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800 block mb-1">管理员功能</Text>
                    <Text className="text-xs text-gray-600 block">
                      管理员可以查看管辖仓库的数据统计，审批司机的请假申请，管理司机信息。
                    </Text>
                  </View>
                </View>
              )}

              {profile?.role === 'super_admin' && (
                <View className="flex items-start">
                  <View className="i-mdi-numeric-1-circle text-2xl text-blue-900 mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800 block mb-1">超级管理员功能</Text>
                    <Text className="text-xs text-gray-600 block">
                      超级管理员拥有系统最高权限，可以管理仓库信息、分配司机和管理员、管理计件品类、查看所有数据统计。
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 常见问题 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">常见问题</Text>

            {faqList.map((faq, index) => (
              <View key={index} className="mb-3 last:mb-0">
                <View
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-all"
                  onClick={() => toggleExpand(index)}>
                  <View className="flex items-center flex-1">
                    <View className="i-mdi-help-circle text-lg text-blue-900 mr-2" />
                    <Text className="text-sm text-gray-800 flex-1">{faq.question}</Text>
                  </View>
                  <View
                    className={`i-mdi-chevron-${expandedIndex === index ? 'up' : 'down'} text-lg text-gray-400 transition-all`}
                  />
                </View>
                {expandedIndex === index && (
                  <View className="p-3 bg-blue-50 rounded-b-lg mt-1">
                    <Text className="text-xs text-gray-700">{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* 联系方式 */}
          <View className="bg-white rounded-xl p-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">联系我们</Text>
            <View className="space-y-3">
              <View className="flex items-center">
                <View className="i-mdi-email text-xl text-blue-900 mr-3" />
                <View>
                  <Text className="text-xs text-gray-500 block">邮箱</Text>
                  <Text className="text-sm text-gray-800">support@fleet-manager.com</Text>
                </View>
              </View>
              <View className="flex items-center">
                <View className="i-mdi-phone text-xl text-blue-900 mr-3" />
                <View>
                  <Text className="text-xs text-gray-500 block">客服电话</Text>
                  <Text className="text-sm text-gray-800">400-123-4567</Text>
                </View>
              </View>
              <View className="flex items-center">
                <View className="i-mdi-clock text-xl text-blue-900 mr-3" />
                <View>
                  <Text className="text-xs text-gray-500 block">服务时间</Text>
                  <Text className="text-sm text-gray-800">周一至周五 9:00-18:00</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default HelpPage
