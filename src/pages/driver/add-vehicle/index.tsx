/**
 * 添加车辆页面
 * 多步骤流程：基本信息 -> 行驶证识别 -> 车辆照片 -> 驾驶员证件
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import PhotoCapture from '@/components/PhotoCapture'
import StepIndicator from '@/components/StepIndicator'
import {insertVehicle, upsertDriverLicense} from '@/db/api'
import type {DriverLicenseInput, VehicleInput} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {recognizeDriverLicense, recognizeDrivingLicense, recognizeIdCardFront} from '@/utils/ocrUtils'

const BUCKET_NAME = 'app-7cdqf07mbu9t_vehicles'

const AddVehicle: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // 步骤定义
  const steps = [
    {title: '基本信息', description: '填写车辆基本信息'},
    {title: '行驶证', description: 'OCR识别行驶证'},
    {title: '车辆照片', description: '拍摄车辆照片'},
    {title: '驾驶员证件', description: '识别证件信息'}
  ]

  // 表单数据
  const [formData, setFormData] = useState<Partial<VehicleInput>>({
    plate_number: '',
    brand: '',
    model: '',
    color: '',
    vehicle_type: '',
    owner_name: '',
    use_character: '',
    vin: '',
    register_date: '',
    issue_date: ''
  })

  // 照片数据
  const [photos, setPhotos] = useState({
    driving_license: '',
    front: '',
    back: '',
    left: '',
    right: '',
    tire: ''
  })

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

  // 更新表单字段
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({...prev, [field]: value}))
  }

  // 更新驾驶员证件字段
  const updateDriverField = (field: string, value: string) => {
    setDriverLicenseData((prev) => ({...prev, [field]: value}))
  }

  // 识别行驶证
  const handleRecognizeDrivingLicense = async () => {
    if (!photos.driving_license) {
      Taro.showToast({title: '请先拍摄行驶证', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const result = await recognizeDrivingLicense(photos.driving_license, (msg) => {
        Taro.showLoading({title: msg})
      })

      if (result) {
        setFormData((prev) => ({
          ...prev,
          plate_number: result.plate_number || prev.plate_number,
          brand: result.brand || prev.brand,
          model: result.model || prev.model,
          vehicle_type: result.vehicle_type || prev.vehicle_type,
          owner_name: result.owner_name || prev.owner_name,
          use_character: result.use_character || prev.use_character,
          vin: result.vin || prev.vin,
          register_date: result.register_date || prev.register_date,
          issue_date: result.issue_date || prev.issue_date
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
      }
    } catch (error) {
      console.error('识别行驶证失败:', error)
      Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
    } finally {
      Taro.hideLoading()
    }
  }

  // 识别身份证
  const handleRecognizeIdCard = async () => {
    if (!driverPhotos.id_card_front) {
      Taro.showToast({title: '请先拍摄身份证正面', icon: 'none'})
      return
    }

    Taro.showLoading({title: '识别中...'})
    try {
      const result = await recognizeIdCardFront(driverPhotos.id_card_front)

      if (result) {
        setDriverLicenseData((prev) => ({
          ...prev,
          id_card_number: result.id_card_number || prev.id_card_number,
          id_card_name: result.name || prev.id_card_name,
          id_card_address: result.address || prev.id_card_address,
          id_card_birth_date: result.birth_date || prev.id_card_birth_date
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
      }
    } catch (error) {
      console.error('识别身份证失败:', error)
      Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
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
      const result = await recognizeDriverLicense(driverPhotos.driver_license)

      if (result) {
        setDriverLicenseData((prev) => ({
          ...prev,
          license_number: result.license_number || prev.license_number,
          license_class: result.license_class || prev.license_class,
          valid_from: result.valid_from || prev.valid_from,
          valid_to: result.valid_to || prev.valid_to,
          issue_authority: result.issue_authority || prev.issue_authority
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
      }
    } catch (error) {
      console.error('识别驾驶证失败:', error)
      Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
    } finally {
      Taro.hideLoading()
    }
  }

  // 验证当前步骤
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.plate_number || !formData.brand || !formData.model) {
          Taro.showToast({title: '请填写必填项', icon: 'none'})
          return false
        }
        return true
      case 1:
        if (!photos.driving_license) {
          Taro.showToast({title: '请拍摄行驶证', icon: 'none'})
          return false
        }
        return true
      case 2:
        if (!photos.front || !photos.back || !photos.left || !photos.right) {
          Taro.showToast({title: '请完成所有车辆照片拍摄', icon: 'none'})
          return false
        }
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  // 下一步
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    }
  }

  // 上一步
  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!user) return

    if (!validateStep(currentStep)) return

    setSubmitting(true)
    Taro.showLoading({title: '提交中...'})

    try {
      // 1. 上传所有照片
      const uploadPromises: Promise<string | null>[] = []
      const photoKeys: string[] = []

      Object.entries(photos).forEach(([key, path]) => {
        if (path) {
          photoKeys.push(key)
          const fileName = generateUniqueFileName(`vehicle_${key}`)
          uploadPromises.push(uploadImageToStorage(path, BUCKET_NAME, fileName))
        }
      })

      Object.entries(driverPhotos).forEach(([key, path]) => {
        if (path) {
          photoKeys.push(`driver_${key}`)
          const fileName = generateUniqueFileName(`driver_${key}`)
          uploadPromises.push(uploadImageToStorage(path, BUCKET_NAME, fileName))
        }
      })

      const uploadedUrls = await Promise.all(uploadPromises)

      // 2. 构建车辆数据
      const photoUrls: Record<string, string> = {}
      uploadedUrls.forEach((url, index) => {
        if (url) {
          photoUrls[photoKeys[index]] = url
        }
      })

      const vehicleData: VehicleInput = {
        user_id: user.id,
        plate_number: formData.plate_number!,
        brand: formData.brand!,
        model: formData.model!,
        color: formData.color,
        vehicle_type: formData.vehicle_type,
        owner_name: formData.owner_name,
        use_character: formData.use_character,
        vin: formData.vin,
        register_date: formData.register_date,
        issue_date: formData.issue_date,
        driving_license_photo: photoUrls.driving_license,
        front_photo: photoUrls.front,
        back_photo: photoUrls.back,
        left_photo: photoUrls.left,
        right_photo: photoUrls.right,
        tire_photo: photoUrls.tire,
        status: 'active'
      }

      // 3. 插入车辆记录
      const vehicle = await insertVehicle(vehicleData)

      if (!vehicle) {
        throw new Error('添加车辆失败')
      }

      // 4. 保存驾驶员证件信息（如果有）
      if (driverPhotos.id_card_front || driverPhotos.driver_license) {
        const licenseData: DriverLicenseInput = {
          driver_id: user.id,
          ...driverLicenseData,
          id_card_photo_front: photoUrls.driver_id_card_front,
          id_card_photo_back: photoUrls.driver_id_card_back,
          driving_license_photo: photoUrls.driver_driver_license
        }

        await upsertDriverLicense(licenseData)
      }

      Taro.hideLoading()
      Taro.showToast({
        title: '添加成功',
        icon: 'success'
      })

      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('提交失败:', error)
      Taro.hideLoading()
      Taro.showToast({
        title: '提交失败，请重试',
        icon: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // 步骤1：基本信息
        return (
          <View className="space-y-4">
            <View className="bg-card rounded-lg p-4">
              <Text className="text-sm text-muted-foreground mb-2 block">车牌号 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入车牌号"
                  value={formData.plate_number}
                  onInput={(e) => updateField('plate_number', e.detail.value)}
                />
              </View>
            </View>

            <View className="bg-card rounded-lg p-4">
              <Text className="text-sm text-muted-foreground mb-2 block">品牌 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入品牌"
                  value={formData.brand}
                  onInput={(e) => updateField('brand', e.detail.value)}
                />
              </View>
            </View>

            <View className="bg-card rounded-lg p-4">
              <Text className="text-sm text-muted-foreground mb-2 block">型号 *</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入型号"
                  value={formData.model}
                  onInput={(e) => updateField('model', e.detail.value)}
                />
              </View>
            </View>

            <View className="bg-card rounded-lg p-4">
              <Text className="text-sm text-muted-foreground mb-2 block">颜色</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                  placeholder="请输入颜色"
                  value={formData.color}
                  onInput={(e) => updateField('color', e.detail.value)}
                />
              </View>
            </View>
          </View>
        )

      case 1:
        // 步骤2：行驶证识别
        return (
          <View>
            <PhotoCapture
              title="行驶证照片"
              description="请拍摄或选择行驶证照片"
              tips={['确保证件完整清晰', '避免反光和阴影', '保持水平拍摄']}
              value={photos.driving_license}
              onChange={(path) => setPhotos((prev) => ({...prev, driving_license: path}))}
            />

            {photos.driving_license && (
              <Button
                className="w-full bg-primary text-primary-foreground py-4 rounded break-keep text-base mb-4"
                size="default"
                onClick={handleRecognizeDrivingLicense}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-text-recognition text-xl mr-2"></View>
                  <Text>识别行驶证</Text>
                </View>
              </Button>
            )}

            {/* 识别结果展示 */}
            <View className="bg-card rounded-lg p-4 space-y-3">
              <Text className="text-lg font-medium text-foreground mb-2">识别结果（可编辑）</Text>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">车辆类型</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={formData.vehicle_type}
                    onInput={(e) => updateField('vehicle_type', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">所有人</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={formData.owner_name}
                    onInput={(e) => updateField('owner_name', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">使用性质</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={formData.use_character}
                    onInput={(e) => updateField('use_character', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">车辆识别代号</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={formData.vin}
                    onInput={(e) => updateField('vin', e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>
        )

      case 2:
        // 步骤3：车辆照片
        return (
          <View>
            <PhotoCapture
              title="车辆前方照片"
              tips={['完整拍摄车辆前部', '包含车牌号码', '光线充足']}
              value={photos.front}
              onChange={(path) => setPhotos((prev) => ({...prev, front: path}))}
            />
            <PhotoCapture
              title="车辆后方照片"
              tips={['完整拍摄车辆后部', '包含车牌号码']}
              value={photos.back}
              onChange={(path) => setPhotos((prev) => ({...prev, back: path}))}
            />
            <PhotoCapture
              title="车辆左侧照片"
              tips={['完整拍摄车辆左侧']}
              value={photos.left}
              onChange={(path) => setPhotos((prev) => ({...prev, left: path}))}
            />
            <PhotoCapture
              title="车辆右侧照片"
              tips={['完整拍摄车辆右侧']}
              value={photos.right}
              onChange={(path) => setPhotos((prev) => ({...prev, right: path}))}
            />
            <PhotoCapture
              title="轮胎特写照片"
              tips={['清晰拍摄轮胎花纹', '包含轮胎品牌']}
              value={photos.tire}
              onChange={(path) => setPhotos((prev) => ({...prev, tire: path}))}
            />
          </View>
        )

      case 3:
        // 步骤4：驾驶员证件
        return (
          <View>
            <PhotoCapture
              title="身份证正面"
              tips={['确保证件完整清晰', '避免反光']}
              value={driverPhotos.id_card_front}
              onChange={(path) => setDriverPhotos((prev) => ({...prev, id_card_front: path}))}
            />

            {driverPhotos.id_card_front && (
              <Button
                className="w-full bg-primary text-primary-foreground py-3 rounded break-keep text-base mb-4"
                size="default"
                onClick={handleRecognizeIdCard}>
                识别身份证
              </Button>
            )}

            <PhotoCapture
              title="身份证反面"
              value={driverPhotos.id_card_back}
              onChange={(path) => setDriverPhotos((prev) => ({...prev, id_card_back: path}))}
            />

            <PhotoCapture
              title="驾驶证"
              tips={['确保证件完整清晰', '避免反光']}
              value={driverPhotos.driver_license}
              onChange={(path) => setDriverPhotos((prev) => ({...prev, driver_license: path}))}
            />

            {driverPhotos.driver_license && (
              <Button
                className="w-full bg-primary text-primary-foreground py-3 rounded break-keep text-base mb-4"
                size="default"
                onClick={handleRecognizeDriverLicense}>
                识别驾驶证
              </Button>
            )}

            {/* 识别结果 */}
            <View className="bg-card rounded-lg p-4 space-y-3">
              <Text className="text-lg font-medium text-foreground mb-2">证件信息（可编辑）</Text>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">姓名</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={driverLicenseData.id_card_name}
                    onInput={(e) => updateDriverField('id_card_name', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">身份证号</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={driverLicenseData.id_card_number}
                    onInput={(e) => updateDriverField('id_card_number', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">驾驶证号</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={driverLicenseData.license_number}
                    onInput={(e) => updateDriverField('license_number', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-muted-foreground mb-1 block">准驾车型</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-input text-foreground px-3 py-1 rounded border border-border w-full"
                    value={driverLicenseData.license_class}
                    onInput={(e) => updateDriverField('license_class', e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 步骤指示器 */}
          <StepIndicator steps={steps} currentStep={currentStep} />

          {/* 步骤内容 */}
          <View className="mb-20">{renderStepContent()}</View>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-3">
        {currentStep > 0 && (
          <Button
            className="flex-1 bg-muted text-foreground py-3 rounded break-keep text-base"
            size="default"
            onClick={handlePrev}
            disabled={submitting}>
            上一步
          </Button>
        )}
        {currentStep < steps.length - 1 ? (
          <Button
            className="flex-1 bg-primary text-primary-foreground py-3 rounded break-keep text-base"
            size="default"
            onClick={handleNext}
            disabled={submitting}>
            下一步
          </Button>
        ) : (
          <Button
            className="flex-1 bg-primary text-primary-foreground py-3 rounded break-keep text-base"
            size="default"
            onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? '提交中...' : '完成'}
          </Button>
        )}
      </View>
    </View>
  )
}

export default AddVehicle
