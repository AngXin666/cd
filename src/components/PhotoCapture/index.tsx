/**
 * 拍照组件
 * 支持即时拍照和从相册选择
 */

import {Button, Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import type React from 'react'
import {useState} from 'react'

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

  // 选择图片来源
  const handleChooseImage = async (sourceType: 'camera' | 'album') => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: [sourceType]
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const path = res.tempFilePaths[0]
        setImagePath(path)
        onChange?.(path)
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      Taro.showToast({
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
    <View className="bg-card rounded-lg p-4 mb-4">
      {/* 标题 */}
      <View className="mb-3">
        <Text className="text-lg font-medium text-foreground">{title}</Text>
        {description && <Text className="text-sm text-muted-foreground mt-1 block">{description}</Text>}
      </View>

      {/* 图片预览区域 */}
      {imagePath ? (
        <View className="mb-3">
          <View
            className="relative w-full h-48 bg-muted rounded-lg overflow-hidden"
            onClick={disabled ? undefined : handlePreviewImage}
          >
            <Image src={imagePath} mode="aspectFit" className="w-full h-full" />
          </View>
          {!disabled && (
            <View className="flex justify-center mt-3">
              <Button
                className="bg-muted text-foreground py-2 px-6 rounded break-keep text-sm"
                size="default"
                onClick={handleRetake}
              >
                重新拍摄
              </Button>
            </View>
          )}
        </View>
      ) : (
        <View>
          {/* 取景框 */}
          <View className="w-full h-48 bg-muted rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-border">
            <View className="text-center">
              <View className="i-mdi-camera text-6xl text-muted-foreground mb-2"></View>
              <Text className="text-sm text-muted-foreground">请拍摄或选择照片</Text>
            </View>
          </View>

          {/* 拍照提示 */}
          {tips && tips.length > 0 && (
            <View className="bg-muted/50 rounded p-3 mb-3">
              <Text className="text-sm font-medium text-foreground mb-2 block">拍照提示：</Text>
              {tips.map((tip, index) => (
                <View key={index} className="flex items-start mb-1">
                  <Text className="text-primary mr-1">•</Text>
                  <Text className="text-sm text-muted-foreground flex-1">{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 操作按钮 */}
          {!disabled && (
            <View className="flex gap-3">
              <Button
                className="flex-1 bg-primary text-primary-foreground py-3 rounded break-keep text-base"
                size="default"
                onClick={handleTakePhoto}
              >
                <View className="flex items-center justify-center">
                  <View className="i-mdi-camera text-xl mr-1"></View>
                  <Text>拍照</Text>
                </View>
              </Button>
              <Button
                className="flex-1 bg-secondary text-secondary-foreground py-3 rounded break-keep text-base"
                size="default"
                onClick={handleChooseFromAlbum}
              >
                <View className="flex items-center justify-center">
                  <View className="i-mdi-image text-xl mr-1"></View>
                  <Text>相册</Text>
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
