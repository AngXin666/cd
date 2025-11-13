/**
 * 驾驶证拍照识别页面
 * 支持拍照和相册选择，识别身份证和驾驶证信息
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import {upsertDriverLicense} from '@/db/api'
import type {DriverLicenseInput} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {recognizeDriverLicense, recognizeIdCardBack, recognizeIdCardFront} from '@/utils/ocrUtils'

const BUCKET_NAME = 'app-7cdqf07mbu9t_vehicles'

/**
 * 计算驾龄（以年为单位）
 */
const calculateDrivingYears = (validFrom: string | undefined): number => {
  if (!validFrom) return 0
  try {
    const issueDate = new Date(validFrom)
    const today = new Date()
    const years = today.getFullYear() - issueDate.getFullYear()
    const monthDiff = today.getMonth() - issueDate.getMonth()
    const dayDiff = today.getDate() - issueDate.getDate()

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      return Math.max(0, years - 1)
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
      Taro.showLoading({title: '识别中...'})

      try {
        // 根据当前步骤识别不同的证件
        let ocrResult: any = null

        if (currentStep === 0) {
          // 识别身份证正面
          ocrResult = await recognizeIdCardFront(tempPath)
          setPhotos((prev) => ({...prev, idCardFront: tempPath}))
          setOcrData((prev) => ({...prev, idCardFront: ocrResult}))
        } else if (currentStep === 1) {
          // 识别身份证背面
          ocrResult = await recognizeIdCardBack(tempPath)
          setPhotos((prev) => ({...prev, idCardBack: tempPath}))
          setOcrData((prev) => ({...prev, idCardBack: ocrResult}))
        } else if (currentStep === 2) {
          // 识别驾驶证
          ocrResult = await recognizeDriverLicense(tempPath)
          setPhotos((prev) => ({...prev, driverLicense: tempPath}))
          setOcrData((prev) => ({...prev, driverLicense: ocrResult}))
        }

        Taro.hideLoading()
        Taro.showToast({
          title: '识别成功，请确认信息',
          icon: 'success',
          duration: 2000
        })
      } catch (error) {
        Taro.hideLoading()
        console.error('识别失败:', error)
        Taro.showModal({
          title: '识别失败',
          content: error instanceof Error ? error.message : '请重新拍摄清晰的证件照片',
          showCancel: false
        })
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      Taro.showToast({
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
      Taro.showToast({
        title: '请完成所有证件拍摄',
        icon: 'none'
      })
      return
    }

    setSubmitting(true)
    Taro.showLoading({title: '保存中...'})

    try {
      // 上传照片到存储桶
      const idCardFrontPath = await uploadImageToStorage(
        BUCKET_NAME,
        photos.idCardFront,
        generateUniqueFileName('id_card_front', 'jpg')
      )

      const idCardBackPath = await uploadImageToStorage(
        BUCKET_NAME,
        photos.idCardBack,
        generateUniqueFileName('id_card_back', 'jpg')
      )

      const driverLicensePath = await uploadImageToStorage(
        BUCKET_NAME,
        photos.driverLicense,
        generateUniqueFileName('driver_license', 'jpg')
      )

      // 准备驾驶证数据
      const driverLicenseInput: DriverLicenseInput = {
        driver_id: user.id,
        id_card_name: ocrData.idCardFront?.name || '',
        id_card_number: ocrData.idCardFront?.id_number || '',
        id_card_address: ocrData.idCardFront?.address || '',
        id_card_photo_front: idCardFrontPath,
        id_card_photo_back: idCardBackPath,
        license_number: ocrData.driverLicense?.license_number || '',
        license_class: ocrData.driverLicense?.license_class || '',
        valid_from: ocrData.driverLicense?.valid_from || '',
        valid_to: ocrData.driverLicense?.valid_until || '',
        issue_authority: ocrData.driverLicense?.issue_authority || '',
        driving_license_photo: driverLicensePath
      }

      // 保存到数据库
      await upsertDriverLicense(driverLicenseInput)

      Taro.hideLoading()
      Taro.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000
      })

      // 延迟返回
      setTimeout(() => {
        Taro.navigateBack()
      }, 2000)
    } catch (error) {
      Taro.hideLoading()
      console.error('保存失败:', error)
      Taro.showToast({
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
                          <Text className="text-sm text-gray-700 block">姓名：{getCurrentOcrData().name}</Text>
                          <Text className="text-sm text-gray-700 block">身份证号：{getCurrentOcrData().id_number}</Text>
                        </>
                      )}
                      {currentStep === 1 && (
                        <>
                          <Text className="text-sm text-gray-700 block">
                            签发机关：{getCurrentOcrData().issue_authority}
                          </Text>
                          <Text className="text-sm text-gray-700 block">
                            有效期：{getCurrentOcrData().valid_from} 至 {getCurrentOcrData().valid_until}
                          </Text>
                        </>
                      )}
                      {currentStep === 2 && (
                        <>
                          <Text className="text-sm text-gray-700 block">
                            驾驶证号：{getCurrentOcrData().license_number}
                          </Text>
                          <Text className="text-sm text-gray-700 block">
                            准驾车型：{getCurrentOcrData().license_class}
                          </Text>
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
