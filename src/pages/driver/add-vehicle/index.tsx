/**
 * 添加车辆页面 - 优化版
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

  // 照片数据 - 更新为新的7个角度
  const [photos, setPhotos] = useState({
    driving_license: '', // 行驶证
    left_front: '', // 左前
    right_front: '', // 右前
    left_rear: '', // 左后
    right_rear: '', // 右后
    dashboard: '', // 仪表盘
    rear_door: '', // 后门
    cargo_box: '' // 货箱
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
  const _updateDriverField = (field: string, value: string) => {
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
          vehicle_type: result.vehicle_type || prev.vehicle_type,
          owner_name: result.owner_name || prev.owner_name,
          use_character: result.use_character || prev.use_character,
          brand: result.brand || prev.brand,
          model: result.model || prev.model,
          vin: result.vin || prev.vin,
          register_date: result.register_date || prev.register_date,
          issue_date: result.issue_date || prev.issue_date
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      }
    } catch (error) {
      console.error('识别失败:', error)
      Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
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
          id_card_number: result.id_card_number || prev.id_card_number,
          id_card_name: result.name || prev.id_card_name,
          id_card_address: result.address || prev.id_card_address,
          id_card_birth_date: result.birth_date || prev.id_card_birth_date
        }))
        Taro.showToast({title: '识别成功', icon: 'success'})
      }
    } catch (error) {
      console.error('识别失败:', error)
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
      const result = await recognizeDriverLicense(driverPhotos.driver_license, (msg) => {
        Taro.showLoading({title: msg})
      })

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
      }
    } catch (error) {
      console.error('识别失败:', error)
      Taro.showToast({title: '识别失败，请手动填写', icon: 'none'})
    } finally {
      Taro.hideLoading()
    }
  }

  // 验证当前步骤
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // 基本信息
        if (!formData.plate_number || !formData.brand || !formData.model) {
          Taro.showToast({title: '请填写必填项', icon: 'none'})
          return false
        }
        return true
      case 1: // 行驶证
        if (!photos.driving_license) {
          Taro.showToast({title: '请拍摄行驶证', icon: 'none'})
          return false
        }
        return true
      case 2: // 车辆照片 - 验证所有7个角度的照片
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
      case 3: // 驾驶员证件
        if (!driverPhotos.id_card_front || !driverPhotos.id_card_back || !driverPhotos.driver_license) {
          Taro.showToast({title: '请拍摄所有证件照片', icon: 'none'})
          return false
        }
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
    if (!validateStep(currentStep)) {
      return
    }

    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    setSubmitting(true)
    Taro.showLoading({title: '提交中...'})

    try {
      // 上传所有照片
      const uploadedPhotos: Record<string, string> = {}

      // 上传车辆照片
      for (const [key, path] of Object.entries(photos)) {
        if (path) {
          const fileName = generateUniqueFileName(`vehicle_${key}`, 'jpg')
          const uploadedPath = await uploadImageToStorage(BUCKET_NAME, path, fileName)
          uploadedPhotos[key] = uploadedPath
        }
      }

      // 上传驾驶员证件照片
      const uploadedDriverPhotos: Record<string, string> = {}
      for (const [key, path] of Object.entries(driverPhotos)) {
        if (path) {
          const fileName = generateUniqueFileName(`driver_${key}`, 'jpg')
          const uploadedPath = await uploadImageToStorage(BUCKET_NAME, path, fileName)
          uploadedDriverPhotos[key] = uploadedPath
        }
      }

      // 插入车辆信息
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
        left_front_photo: uploadedPhotos.left_front,
        right_front_photo: uploadedPhotos.right_front,
        left_rear_photo: uploadedPhotos.left_rear,
        right_rear_photo: uploadedPhotos.right_rear,
        dashboard_photo: uploadedPhotos.dashboard,
        rear_door_photo: uploadedPhotos.rear_door,
        cargo_box_photo: uploadedPhotos.cargo_box,
        driving_license_photo: uploadedPhotos.driving_license,
        status: 'active'
      }

      await insertVehicle(vehicleData)

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

        await upsertDriverLicense(driverLicenseInput)
      }

      Taro.hideLoading()
      Taro.showToast({title: '添加成功', icon: 'success'})

      // 延迟返回
      setTimeout(() => {
        Taro.switchTab({url: '/pages/driver/vehicle-list/index'})
      }, 1500)
    } catch (error) {
      console.error('提交失败:', error)
      Taro.hideLoading()
      Taro.showToast({title: '提交失败，请重试', icon: 'none'})
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

          {/* 步骤1: 基本信息 */}
          {currentStep === 0 && (
            <View>
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-car-info text-2xl text-blue-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">车辆基本信息</Text>
                </View>

                <View className="space-y-4">
                  <FormField
                    label="车牌号"
                    required
                    value={formData.plate_number || ''}
                    placeholder="请输入车牌号"
                    onChange={(value) => updateField('plate_number', value)}
                  />
                  <FormField
                    label="品牌"
                    required
                    value={formData.brand || ''}
                    placeholder="请输入品牌"
                    onChange={(value) => updateField('brand', value)}
                  />
                  <FormField
                    label="型号"
                    required
                    value={formData.model || ''}
                    placeholder="请输入型号"
                    onChange={(value) => updateField('model', value)}
                  />
                  <FormField
                    label="颜色"
                    value={formData.color || ''}
                    placeholder="请输入颜色"
                    onChange={(value) => updateField('color', value)}
                  />
                  <FormField
                    label="车辆类型"
                    value={formData.vehicle_type || ''}
                    placeholder="请输入车辆类型"
                    onChange={(value) => updateField('vehicle_type', value)}
                  />
                </View>
              </View>
            </View>
          )}

          {/* 步骤2: 行驶证识别 */}
          {currentStep === 1 && (
            <View>
              <PhotoCapture
                title="行驶证照片"
                description="请拍摄行驶证主页"
                tips={['确保照片清晰', '避免反光', '包含所有信息']}
                value={photos.driving_license}
                onChange={(path) => setPhotos((prev) => ({...prev, driving_license: path}))}
              />

              {photos.driving_license && (
                <View className="mb-4">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg"
                    size="default"
                    onClick={handleRecognizeDrivingLicense}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-text-recognition text-xl mr-2"></View>
                      <Text className="font-medium">识别行驶证</Text>
                    </View>
                  </Button>
                </View>
              )}

              {/* 识别结果 */}
              {(formData.vin || formData.owner_name) && (
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
                  <View className="flex items-center mb-4">
                    <View className="i-mdi-check-circle text-2xl text-green-600 mr-2"></View>
                    <Text className="text-lg font-bold text-gray-800">识别结果</Text>
                  </View>
                  <View className="space-y-3">
                    {formData.vin && <InfoDisplay label="车辆识别代号" value={formData.vin} />}
                    {formData.owner_name && <InfoDisplay label="所有人" value={formData.owner_name} />}
                    {formData.use_character && <InfoDisplay label="使用性质" value={formData.use_character} />}
                    {formData.register_date && (
                      <InfoDisplay
                        label="注册日期"
                        value={new Date(formData.register_date).toLocaleDateString('zh-CN')}
                      />
                    )}
                    {formData.issue_date && (
                      <InfoDisplay label="发证日期" value={new Date(formData.issue_date).toLocaleDateString('zh-CN')} />
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 步骤3: 车辆照片 - 7个角度 */}
          {currentStep === 2 && (
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
            </View>
          )}

          {/* 步骤4: 驾驶员证件 */}
          {currentStep === 3 && (
            <View>
              <PhotoCapture
                title="身份证正面"
                description="请拍摄身份证正面"
                tips={['确保照片清晰', '避免反光', '包含所有信息']}
                value={driverPhotos.id_card_front}
                onChange={(path) => setDriverPhotos((prev) => ({...prev, id_card_front: path}))}
              />

              {driverPhotos.id_card_front && (
                <View className="mb-4">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg"
                    size="default"
                    onClick={handleRecognizeIdCardFront}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-text-recognition text-xl mr-2"></View>
                      <Text className="font-medium">识别身份证</Text>
                    </View>
                  </Button>
                </View>
              )}

              <PhotoCapture
                title="身份证反面"
                description="请拍摄身份证反面"
                tips={['确保照片清晰', '避免反光', '包含所有信息']}
                value={driverPhotos.id_card_back}
                onChange={(path) => setDriverPhotos((prev) => ({...prev, id_card_back: path}))}
              />

              <PhotoCapture
                title="驾驶证"
                description="请拍摄驾驶证主页"
                tips={['确保照片清晰', '避免反光', '包含所有信息']}
                value={driverPhotos.driver_license}
                onChange={(path) => setDriverPhotos((prev) => ({...prev, driver_license: path}))}
              />

              {driverPhotos.driver_license && (
                <View className="mb-4">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg"
                    size="default"
                    onClick={handleRecognizeDriverLicense}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-text-recognition text-xl mr-2"></View>
                      <Text className="font-medium">识别驾驶证</Text>
                    </View>
                  </Button>
                </View>
              )}

              {/* 识别结果 */}
              {(driverLicenseData.id_card_number || driverLicenseData.license_number) && (
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
                  <View className="flex items-center mb-4">
                    <View className="i-mdi-check-circle text-2xl text-green-600 mr-2"></View>
                    <Text className="text-lg font-bold text-gray-800">识别结果</Text>
                  </View>
                  <View className="space-y-3">
                    {driverLicenseData.id_card_name && (
                      <InfoDisplay label="姓名" value={driverLicenseData.id_card_name} />
                    )}
                    {driverLicenseData.id_card_number && (
                      <InfoDisplay label="身份证号" value={driverLicenseData.id_card_number} />
                    )}
                    {driverLicenseData.license_number && (
                      <InfoDisplay label="驾驶证号" value={driverLicenseData.license_number} />
                    )}
                    {driverLicenseData.license_class && (
                      <InfoDisplay label="准驾车型" value={driverLicenseData.license_class} />
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 操作按钮 */}
          <View className="flex gap-3 mt-6 mb-4">
            {currentStep > 0 && (
              <Button
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3.5 rounded-xl break-keep text-base shadow-lg"
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
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg"
                size="default"
                onClick={handleNext}>
                <View className="flex items-center justify-center">
                  <Text className="font-medium">下一步</Text>
                  <View className="i-mdi-arrow-right text-xl ml-2"></View>
                </View>
              </Button>
            ) : (
              <Button
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg"
                size="default"
                onClick={handleSubmit}
                disabled={submitting}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-check-circle text-xl mr-2"></View>
                  <Text className="font-medium">{submitting ? '提交中...' : '完成'}</Text>
                </View>
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// 表单字段组件
interface FormFieldProps {
  label: string
  required?: boolean
  value: string
  placeholder: string
  onChange: (value: string) => void
}

const FormField: React.FC<FormFieldProps> = ({label, required, value, placeholder, onChange}) => (
  <View className="mb-4">
    <View className="flex items-center mb-2">
      <Text className="text-sm font-medium text-gray-700">
        {label}
        {required && <Text className="text-red-500 ml-1">*</Text>}
      </Text>
    </View>
    <View style={{overflow: 'hidden'}}>
      <Input
        className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg border border-gray-200 w-full"
        value={value}
        placeholder={placeholder}
        onInput={(e) => onChange(e.detail.value)}
      />
    </View>
  </View>
)

// 信息显示组件
interface InfoDisplayProps {
  label: string
  value: string
}

const InfoDisplay: React.FC<InfoDisplayProps> = ({label, value}) => (
  <View className="flex items-center py-2 border-b border-gray-100 last:border-0">
    <View className="flex-1">
      <Text className="text-sm text-gray-500 block mb-0.5">{label}</Text>
      <Text className="text-base text-gray-800 font-medium">{value}</Text>
    </View>
  </View>
)

export default AddVehicle
