/**
 * 添加车辆页面 - 优化版
 * 三步骤流程：行驶证识别 -> 车辆照片 -> 驾驶员证件
 */

import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import PhotoCapture from '@/components/PhotoCapture'
import StepIndicator from '@/components/StepIndicator'
import {insertVehicle, upsertDriverLicense} from '@/db/api'
import type {DriverLicenseInput, VehicleInput} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {recognizeDriverLicense, recognizeIdCardFront} from '@/utils/ocrUtils'

const BUCKET_NAME = 'app-7cdqf07mbu9t_vehicles'

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
        Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none'})
      }
    } catch (error) {
      console.error('识别失败:', error)
      Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none'})
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
        Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none'})
      }
    } catch (error) {
      console.error('识别失败:', error)
      Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none'})
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
          inspection_date: result.inspection_date || prev.inspection_date
        }))
        Taro.showToast({title: '副页背页识别成功', icon: 'success'})
      } else {
        Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none'})
      }
    } catch (error) {
      console.error('识别失败:', error)
      Taro.showToast({title: '识别失败，请重新拍摄', icon: 'none'})
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
          id_card_name: result.name || prev.id_card_name, // 驾驶证上的姓名
          id_card_address: result.address || prev.id_card_address, // 驾驶证上的住址
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
        engine_number: formData.engine_number,
        register_date: formData.register_date,
        issue_date: formData.issue_date,
        // 副页字段 - 只在有值时传入
        archive_number: formData.archive_number,
        total_mass: formData.total_mass || null,
        approved_passengers: formData.approved_passengers || null,
        curb_weight: formData.curb_weight || null,
        approved_load: formData.approved_load || null,
        overall_dimension_length: formData.overall_dimension_length || null,
        overall_dimension_width: formData.overall_dimension_width || null,
        overall_dimension_height: formData.overall_dimension_height || null,
        inspection_valid_until: formData.inspection_valid_until,
        // 副页背页字段
        inspection_date: formData.inspection_date,
        mandatory_scrap_date: formData.mandatory_scrap_date,
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
        status: 'active'
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
      Taro.showToast({title: '添加成功', icon: 'success'})

      // 延迟返回
      setTimeout(() => {
        Taro.switchTab({url: '/pages/driver/vehicle-list/index'})
      }, 1500)
    } catch (error) {
      console.error('提交失败详情:', error)
      Taro.hideLoading()

      // 显示更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '提交失败，请重试'
      Taro.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
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
              {/* 行驶证主页 */}
              <View className="mb-6">
                <PhotoCapture
                  title="行驶证主页"
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
              </View>

              {/* 行驶证副页 */}
              <View className="mb-6">
                <PhotoCapture
                  title="行驶证副页"
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
              </View>

              {/* 行驶证副页背页 */}
              <View className="mb-6">
                <PhotoCapture
                  title="行驶证副页背页"
                  description="请拍摄行驶证副页背页，包含年检记录和强制报废期"
                  tips={['确保照片清晰', '包含年检记录', '包含强制报废期信息']}
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
              </View>

              {/* 识别结果展示 */}
              {formData.plate_number && (
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
                  <View className="flex items-center mb-4">
                    <View className="i-mdi-check-circle text-2xl text-green-600 mr-2"></View>
                    <Text className="text-lg font-bold text-gray-800">识别结果</Text>
                  </View>
                  <View className="space-y-3">
                    {/* 主页信息 */}
                    <View className="mb-3">
                      <Text className="text-sm font-bold text-gray-600 mb-2">主页信息</Text>
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

                    {/* 副页信息 */}
                    {(formData.archive_number ||
                      formData.total_mass ||
                      formData.approved_passengers ||
                      formData.inspection_valid_until) && (
                      <View className="mb-3 pt-3 border-t border-gray-200">
                        <Text className="text-sm font-bold text-gray-600 mb-2">副页信息</Text>
                        <View className="space-y-2">
                          {formData.archive_number && <InfoDisplay label="档案编号" value={formData.archive_number} />}
                          {formData.total_mass && <InfoDisplay label="总质量" value={`${formData.total_mass} kg`} />}
                          {formData.approved_passengers && (
                            <InfoDisplay label="核定载人数" value={`${formData.approved_passengers} 人`} />
                          )}
                          {formData.curb_weight && (
                            <InfoDisplay label="整备质量" value={`${formData.curb_weight} kg`} />
                          )}
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

                    {/* 副页背页信息 */}
                    {(formData.mandatory_scrap_date || formData.inspection_date) && (
                      <View className="pt-3 border-t border-gray-200">
                        <Text className="text-sm font-bold text-gray-600 mb-2">副页背页信息</Text>
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
                    )}
                  </View>
                </View>
              )}

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
            </View>
          )}

          {/* 步骤3: 驾驶员证件 */}
          {currentStep === 2 && (
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
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
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
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
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
                    {/* 基本信息 */}
                    {driverLicenseData.id_card_name && (
                      <InfoDisplay label="姓名" value={driverLicenseData.id_card_name} highlight />
                    )}
                    {driverLicenseData.id_card_number && (
                      <InfoDisplay label="身份证号" value={driverLicenseData.id_card_number} />
                    )}
                    {driverLicenseData.id_card_address && (
                      <InfoDisplay label="住址" value={driverLicenseData.id_card_address} />
                    )}

                    {/* 驾驶证信息 */}
                    {driverLicenseData.license_number && (
                      <InfoDisplay label="驾驶证编号" value={driverLicenseData.license_number} />
                    )}
                    {driverLicenseData.license_class && (
                      <InfoDisplay label="准驾车型" value={driverLicenseData.license_class} />
                    )}
                    {driverLicenseData.valid_from && (
                      <InfoDisplay
                        label="领证时间"
                        value={new Date(driverLicenseData.valid_from).toLocaleDateString('zh-CN')}
                      />
                    )}
                    {driverLicenseData.valid_from && (
                      <InfoDisplay
                        label="驾龄"
                        value={`${calculateDrivingYears(driverLicenseData.valid_from)} 年`}
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
              <Button
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
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
