/**
 * 拍照组件 - 优化版
 * 支持即时拍照和从相册选择
 */

import {Button, Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {showLoading, hideLoading, showToast} from '@/utils/taroCompat'
import type React from 'react'
import {useEffect, useState} from 'react'

interface PhotoCaptureProps {
  title: string // 标题
  description?: string // 描述文字
  tips?: string[] // 拍照提示
  value?: string // 当前图片路径
  onChange?: (imagePath: string) => void // 图片变化回调
  disabled?: boolean // 是否禁用
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({title, description, tips, value, onChange, disabled = false}) => {
  const [imagePath, setImagePath] = useState<string>(value || '')

  // 同步外部value变化
  useEffect(() => {
    setImagePath(value || '')
  }, [value])

  // 选择图片来源
  const handleChooseImage = async (sourceType: 'camera' | 'album') => {
    try {
      // 显示加载提示
      showLoading({
        title: '处理中...',
        mask: true
      })

      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: [sourceType]
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        let path = res.tempFilePaths[0]

        // 压缩图片并自动旋转（修复方向问题）
        try {
          const compressRes = await Taro.compressImage({
            src: path,
            quality: 90 // 保持较高质量
          })
          path = compressRes.tempFilePath
        } catch (_compressError) {
          // 压缩失败时继续使用原图
        }

        setImagePath(path)
        onChange?.(path)

        // 隐藏加载提示
        hideLoading()
      } else {
        hideLoading()
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      hideLoading()
      showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  }

  // 拍照
  const handleTakePhoto = () => {
    handleChooseImage('camera')
  }

  // 从相册选择
  const handleChooseFromAlbum = () => {
    handleChooseImage('album')
  }

  // 预览图片
  const handlePreviewImage = () => {
    if (imagePath) {
      Taro.previewImage({
        urls: [imagePath],
        current: imagePath
      })
    }
  }

  // 重新拍摄
  const handleRetake = () => {
    setImagePath('')
    onChange?.('')
  }

  return (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
      {/* 标题 */}
      <View className="mb-4">
        <View className="flex items-center mb-1">
          <View className="i-mdi-camera-outline text-xl text-blue-600 mr-2"></View>
          <Text className="text-lg font-bold text-gray-800">{title}</Text>
        </View>
        {description && <Text className="text-sm text-gray-500 ml-7">{description}</Text>}
      </View>

      {/* 图片预览区域 */}
      {imagePath ? (
        <View className="mb-3">
          <View
            className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-inner active:scale-98 transition-all"
            onClick={disabled ? undefined : handlePreviewImage}>
            <Image src={imagePath} mode="widthFix" className="w-full" />
            {/* 预览提示 */}
            <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <View className="flex items-center justify-center">
                <View className="i-mdi-eye text-white text-base mr-1"></View>
                <Text className="text-white text-xs">点击查看大图</Text>
              </View>
            </View>
          </View>
          {!disabled && (
            <View className="flex justify-center mt-4">
              <Button
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2.5 px-8 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                size="default"
                onClick={handleRetake}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-refresh text-base mr-1"></View>
                  <Text className="font-medium">重新拍摄</Text>
                </View>
              </Button>
            </View>
          )}
        </View>
      ) : (
        <View>
          {/* 取景框 */}
          <View className="w-full h-56 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-4 border-2 border-dashed border-blue-300 shadow-inner">
            <View className="text-center">
              <View className="bg-white rounded-full p-4 mb-3 shadow-md">
                <View className="i-mdi-camera-plus text-5xl text-blue-600"></View>
              </View>
              <Text className="text-sm text-blue-700 font-medium">请拍摄或选择照片</Text>
            </View>
          </View>

          {/* 拍照提示 */}
          {tips && tips.length > 0 && (
            <View className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 mb-4 border-l-4 border-amber-500">
              <View className="flex items-center mb-2">
                <View className="i-mdi-lightbulb text-lg text-amber-600 mr-2"></View>
                <Text className="text-sm font-bold text-amber-800">拍照提示</Text>
              </View>
              {tips.map((tip, index) => (
                <View key={index} className="flex items-start mb-1.5 last:mb-0">
                  <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2"></View>
                  <Text className="text-sm text-amber-700 flex-1">{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 操作按钮 */}
          {!disabled && (
            <View className="flex gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                size="default"
                onClick={handleTakePhoto}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-camera text-xl mr-2"></View>
                  <Text className="font-medium">拍照</Text>
                </View>
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
                size="default"
                onClick={handleChooseFromAlbum}>
                <View className="flex items-center justify-center">
                  <View className="i-mdi-image-multiple text-xl mr-2"></View>
                  <Text className="font-medium">相册</Text>
                </View>
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default PhotoCapture
