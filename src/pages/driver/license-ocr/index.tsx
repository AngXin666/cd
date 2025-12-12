/**
 * 驾驶证拍照识别页面
 * 支持拍照和相册选择，识别身份证和驾驶证信息
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import * as VehiclesAPI from '@/db/api/vehicles'
import type {DriverLicenseInput} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {recognizeDriverLicense, recognizeIdCardBack, recognizeIdCardFront} from '@/utils/ocrUtils'
import {hideLoading, showLoading, showToast} from '@/utils/taroCompat'

const BUCKET_NAME = 'app-7cdqf07mbu9t_vehicles'

/**
 * 计算年龄（根据出生日期）
 */
const calculateAge = (birthDate: string | undefined): number => {
  if (!birthDate) return 0
  try {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    const dayDiff = today.getDate() - birth.getDate()

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--
    }
    return Math.max(0, age)
  } catch {
    return 0
  }
}

/**
 * 计算驾龄（根据初次领证日期）
 */
const calculateDrivingYears = (firstIssueDate: string | undefined): number => {
  if (!firstIssueDate) return 0
  try {
    const issueDate = new Date(firstIssueDate)
    const today = new Date()
    let years = today.getFullYear() - issueDate.getFullYear()
    const monthDiff = today.getMonth() - issueDate.getMonth()
    const dayDiff = today.getDate() - issueDate.getDate()

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--
    }
    return Math.max(0, years)
  } catch {
    return 0
  }
}

const LicenseOCR: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // 证件照片
  const [photos, setPhotos] = useState({
    idCardFront: '', // 身份证正面
    idCardBack: '', // 身份证背面
    driverLicense: '' // 驾驶证
  })

  // 识别结果
  const [ocrData, setOcrData] = useState({
    idCardFront: null as any,
    idCardBack: null as any,
    driverLicense: null as any
  })

  const steps = [
    {title: '身份证正面', icon: 'i-mdi-card-account-details'},
    {title: '身份证背面', icon: 'i-mdi-card-account-details-outline'},
    {title: '驾驶证', icon: 'i-mdi-card'}
  ]

  /**
   * 验证身份证正面识别结果
   */
  const validateIdCardFront = (result: any): boolean => {
    // 必须包含姓名和身份证号
    if (!result?.name || !result?.id_number) {
      return false
    }
    // 身份证号必须是18位
    if (result.id_number.length !== 18) {
      return false
    }
    return true
  }

  /**
   * 验证身份证背面识别结果
   */
  const validateIdCardBack = (result: any): boolean => {
    // 必须包含签发机关或有效期
    if (!result?.issuing_authority && !result?.valid_until) {
      return false
    }
    return true
  }

  /**
   * 验证驾驶证识别结果
   */
  const validateDriverLicense = (result: any): boolean => {
    // 必须包含驾驶证号或准驾车型（至少一个）
    if (!result?.license_number && !result?.license_class) {
      return false
    }
    // 如果有驾驶证号，检查长度（通常是18位，但也可能有其他格式）
    if (result.license_number && result.license_number.length < 15) {
      return false
    }
    return true
  }

  /**
   * 选择照片（支持相机和相册）
   */
  const handleChooseImage = async (type: 'camera' | 'album') => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: [type]
      })

      if (res.tempFilePaths.length === 0) return

      const tempPath = res.tempFilePaths[0]
      showLoading({title: '识别中...'})

      try {
        // 根据当前步骤识别不同的证件
        let ocrResult: any = null
        let isValid = false
        let errorMessage = ''

        if (currentStep === 0) {
          // 识别身份证正面
          ocrResult = await recognizeIdCardFront(tempPath)
          isValid = validateIdCardFront(ocrResult)
          errorMessage = '这不是有效的身份证正面照片，请确保拍摄的是身份证正面（有照片和姓名的一面）'
        } else if (currentStep === 1) {
          // 识别身份证背面
          ocrResult = await recognizeIdCardBack(tempPath)
          isValid = validateIdCardBack(ocrResult)
          errorMessage = '这不是有效的身份证背面照片，请确保拍摄的是身份证背面（有签发机关和有效期的一面）'
        } else if (currentStep === 2) {
          // 识别驾驶证
          ocrResult = await recognizeDriverLicense(tempPath)
          isValid = validateDriverLicense(ocrResult)
          errorMessage = '这不是有效的驾驶证照片，请确保拍摄的是驾驶证主页（有照片和驾驶证号的一面）'
        }

        hideLoading()

        // 验证识别结果
        if (!isValid) {
          Taro.showModal({
            title: '证件类型不匹配',
            content: errorMessage,
            showCancel: true,
            confirmText: '重新拍摄',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 用户选择重新拍摄
                handleChooseImage('camera')
              }
            }
          })
          return
        }

        // 验证通过，保存识别结果
        if (currentStep === 0) {
          setPhotos((prev) => ({...prev, idCardFront: tempPath}))
          setOcrData((prev) => ({...prev, idCardFront: ocrResult}))
        } else if (currentStep === 1) {
          setPhotos((prev) => ({...prev, idCardBack: tempPath}))
          setOcrData((prev) => ({...prev, idCardBack: ocrResult}))
        } else if (currentStep === 2) {
          setPhotos((prev) => ({...prev, driverLicense: tempPath}))
          setOcrData((prev) => ({...prev, driverLicense: ocrResult}))
        }

        showToast({
          title: '识别成功，请确认信息',
          icon: 'success',
          duration: 2000
        })
      } catch (error) {
        hideLoading()
        console.error('识别失败:', error)
        Taro.showModal({
          title: '识别失败',
          content: error instanceof Error ? error.message : '请重新拍摄清晰的证件照片',
          showCancel: false
        })
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  }

  /**
   * 重新拍摄当前步骤
   */
  const handleRetake = () => {
    if (currentStep === 0) {
      setPhotos((prev) => ({...prev, idCardFront: ''}))
      setOcrData((prev) => ({...prev, idCardFront: null}))
    } else if (currentStep === 1) {
      setPhotos((prev) => ({...prev, idCardBack: ''}))
      setOcrData((prev) => ({...prev, idCardBack: null}))
    } else if (currentStep === 2) {
      setPhotos((prev) => ({...prev, driverLicense: ''}))
      setOcrData((prev) => ({...prev, driverLicense: null}))
    }
  }

  /**
   * 提交保存
   */
  const handleSubmit = async () => {
    if (!user) return

    // 验证是否所有证件都已拍摄
    if (!photos.idCardFront || !photos.idCardBack || !photos.driverLicense) {
      showToast({
        title: '请完成所有证件拍摄',
        icon: 'none'
      })
      return
    }

    setSubmitting(true)
    showLoading({title: '保存中...'})

    try {
      // 上传照片到存储桶
      const idCardFrontPath = await uploadImageToStorage(
        photos.idCardFront,
        BUCKET_NAME,
        generateUniqueFileName('id_card_front', 'jpg')
      )

      const idCardBackPath = await uploadImageToStorage(
        photos.idCardBack,
        BUCKET_NAME,
        generateUniqueFileName('id_card_back', 'jpg')
      )

      const driverLicensePath = await uploadImageToStorage(
        photos.driverLicense,
        BUCKET_NAME,
        generateUniqueFileName('driver_license', 'jpg')
      )

      // 准备驾驶证数据
      const driverLicenseInput: DriverLicenseInput = {
        driver_id: user.id,
        license_number: ocrData.driverLicense?.license_number || '',
        license_type: 'C1', // 默认值
        issue_date: ocrData.driverLicense?.first_issue_date || new Date().toISOString().split('T')[0],
        expiry_date:
          ocrData.driverLicense?.valid_until ||
          new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        id_card_name: ocrData.idCardFront?.name || '',
        id_card_number: ocrData.idCardFront?.id_number || '',
        id_card_address: ocrData.idCardFront?.address || '',
        id_card_birth_date: ocrData.idCardFront?.birth_date || null,
        id_card_photo_front: idCardFrontPath,
        id_card_photo_back: idCardBackPath,
        license_class: ocrData.driverLicense?.license_class || '',
        first_issue_date: ocrData.driverLicense?.first_issue_date || null,
        valid_from: ocrData.driverLicense?.valid_from || '',
        valid_to: ocrData.driverLicense?.valid_until || '',
        issue_authority: ocrData.driverLicense?.issue_authority || '',
        driving_license_photo: driverLicensePath
      }

      // 保存到数据库
      await VehiclesAPI.upsertDriverLicense(driverLicenseInput)

      hideLoading()
      showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000
      })

      // 延迟返回
      setTimeout(() => {
        Taro.navigateBack()
      }, 2000)
    } catch (error) {
      hideLoading()
      console.error('保存失败:', error)
      showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 获取当前步骤的照片
   */
  const getCurrentPhoto = () => {
    if (currentStep === 0) return photos.idCardFront
    if (currentStep === 1) return photos.idCardBack
    return photos.driverLicense
  }

  /**
   * 获取当前步骤的识别结果
   */
  const getCurrentOcrData = () => {
    if (currentStep === 0) return ocrData.idCardFront
    if (currentStep === 1) return ocrData.idCardBack
    return ocrData.driverLicense
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4 pb-20">
          {/* 页面标题 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center">
              <View className="i-mdi-camera text-4xl text-blue-600 mr-3" />
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-800 block mb-1">证件拍照识别</Text>
                <Text className="text-sm text-gray-500 block">请依次拍摄身份证和驾驶证</Text>
              </View>
            </View>
          </View>

          {/* 步骤指示器 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center justify-between">
              {steps.map((step, index) => (
                <View key={index} className="flex-1 flex flex-col items-center">
                  <View
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      index === currentStep ? 'bg-blue-600' : index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                    <View
                      className={`${step.icon} text-2xl ${index <= currentStep ? 'text-white' : 'text-gray-400'}`}
                    />
                  </View>
                  <Text
                    className={`text-xs text-center ${
                      index === currentStep
                        ? 'text-blue-600 font-bold'
                        : index < currentStep
                          ? 'text-green-600'
                          : 'text-gray-400'
                    }`}>
                    {step.title}
                  </Text>
                  {index < steps.length - 1 && (
                    <View
                      className={`absolute top-6 left-1/2 w-full h-0.5 ${
                        index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{transform: 'translateX(50%)', zIndex: -1}}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* 拍照区域 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-image text-blue-600 text-xl mr-2" />
              <Text className="text-lg font-bold text-gray-800">{steps[currentStep].title}</Text>
            </View>

            {getCurrentPhoto() ? (
              <View>
                {/* 显示已拍摄的照片 */}
                <Image
                  src={getCurrentPhoto()}
                  mode="aspectFit"
                  className="w-full rounded-lg mb-4"
                  style={{height: '300px'}}
                />

                {/* 显示识别结果 */}
                {getCurrentOcrData() && (
                  <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <View className="flex items-center mb-2">
                      <View className="i-mdi-check-circle text-green-600 text-lg mr-2" />
                      <Text className="text-green-800 font-bold">识别成功</Text>
                    </View>
                    <View className="space-y-2">
                      {currentStep === 0 && (
                        <>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              姓名：{getCurrentOcrData().name || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              身份证号：{getCurrentOcrData().id_number || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              出生日期：{getCurrentOcrData().birth_date || '未识别'}
                            </Text>
                          </View>
                          {getCurrentOcrData().birth_date && (
                            <View>
                              <Text className="text-sm text-gray-700 block">
                                年龄：{calculateAge(getCurrentOcrData().birth_date)} 岁
                              </Text>
                            </View>
                          )}
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              地址：{getCurrentOcrData().address || '未识别'}
                            </Text>
                          </View>
                        </>
                      )}
                      {currentStep === 1 && (
                        <>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              签发机关：{getCurrentOcrData().issue_authority || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              有效期起：{getCurrentOcrData().valid_from || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              有效期止：{getCurrentOcrData().valid_until || '未识别'}
                            </Text>
                          </View>
                        </>
                      )}
                      {currentStep === 2 && (
                        <>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              驾驶证号：{getCurrentOcrData().license_number || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              准驾车型：{getCurrentOcrData().license_class || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              初次领证日期：{getCurrentOcrData().first_issue_date || '未识别'}
                            </Text>
                          </View>
                          {getCurrentOcrData().first_issue_date && (
                            <View>
                              <Text className="text-sm text-gray-700 block">
                                驾龄：{calculateDrivingYears(getCurrentOcrData().first_issue_date)} 年
                              </Text>
                            </View>
                          )}
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              有效期起：{getCurrentOcrData().valid_from || '未识别'}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-sm text-gray-700 block">
                              有效期止：{getCurrentOcrData().valid_until || '未识别'}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* 操作按钮 */}
                <View className="flex gap-3">
                  <Button
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg break-keep text-sm"
                    size="default"
                    onClick={handleRetake}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-refresh text-lg mr-2" />
                      <Text>重新拍摄</Text>
                    </View>
                  </Button>
                  {currentStep < 2 ? (
                    <Button
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg break-keep text-sm"
                      size="default"
                      onClick={() => setCurrentStep(currentStep + 1)}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-check-circle text-lg mr-2" />
                        <Text>确认并继续</Text>
                      </View>
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg break-keep text-sm"
                      size="default"
                      onClick={handleSubmit}
                      disabled={submitting}>
                      <View className="flex items-center justify-center">
                        <View className="i-mdi-check text-lg mr-2" />
                        <Text>确认并保存</Text>
                      </View>
                    </Button>
                  )}
                </View>
              </View>
            ) : (
              <View>
                {/* 拍照提示 */}
                <View className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-8 mb-4 text-center">
                  <View className="i-mdi-camera text-6xl text-blue-400 mb-4" />
                  <Text className="text-gray-600 text-sm block mb-2">请拍摄清晰的{steps[currentStep].title}照片</Text>
                  <Text className="text-gray-400 text-xs block">确保证件信息清晰可见</Text>
                </View>

                {/* 拍照按钮 */}
                <View className="space-y-3">
                  <Button
                    className="w-full bg-blue-600 text-white py-4 rounded-lg break-keep text-base"
                    size="default"
                    onClick={() => handleChooseImage('camera')}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-camera text-xl mr-2" />
                      <Text>拍照</Text>
                    </View>
                  </Button>
                  <Button
                    className="w-full bg-green-600 text-white py-4 rounded-lg break-keep text-base"
                    size="default"
                    onClick={() => handleChooseImage('album')}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-image text-xl mr-2" />
                      <Text>从相册选择</Text>
                    </View>
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* 提示信息 */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <View className="flex items-start">
              <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-blue-800 text-sm block mb-1 font-medium">拍摄提示</Text>
                <Text className="text-blue-700 text-xs block mb-1">• 请在光线充足的环境下拍摄</Text>
                <Text className="text-blue-700 text-xs block mb-1">• 确保证件信息清晰完整</Text>
                <Text className="text-blue-700 text-xs block">• 避免反光和模糊</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default LicenseOCR
