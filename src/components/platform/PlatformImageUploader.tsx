/**
 * 平台适配的图片上传组件
 * 统一处理微信小程序、H5、安卓APP的图片上传差异
 */

import React, { useState } from 'react'
import { View, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { platform } from '@/utils/platform'
import { capacitorCamera } from '@/utils/capacitor'

interface PlatformImageUploaderProps {
  maxCount?: number
  value?: string[]
  onChange?: (images: string[]) => void
  onUpload?: (file: File | string) => Promise<string>
  disabled?: boolean
  className?: string
}

export const PlatformImageUploader: React.FC<PlatformImageUploaderProps> = ({
  maxCount = 9,
  value = [],
  onChange,
  onUpload,
  disabled = false,
  className = ''
}) => {
  const [images, setImages] = useState<string[]>(value)
  const [uploading, setUploading] = useState(false)

  /**
   * 微信小程序选择图片
   */
  const chooseImageWeapp = async () => {
    try {
      const res = await Taro.chooseImage({
        count: maxCount - images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      return res.tempFilePaths
    } catch (error) {
      console.error('选择图片失败:', error)
      Taro.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
      return []
    }
  }

  /**
   * 安卓APP选择图片
   */
  const chooseImageAndroid = async () => {
    try {
      // 显示选择来源
      const res = await Taro.showActionSheet({
        itemList: ['拍照', '从相册选择']
      })

      if (res.tapIndex === 0) {
        // 拍照
        const photo = await capacitorCamera.takePicture({
          quality: 90,
          source: 'camera',
          resultType: 'uri'
        })
        return [photo.webPath]
      } else {
        // 从相册选择
        const photos = await capacitorCamera.pickImages({
          quality: 90,
          limit: maxCount - images.length
        })
        return photos.map(p => p.webPath)
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      Taro.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
      return []
    }
  }

  /**
   * H5选择图片
   */
  const chooseImageH5 = async (): Promise<string[]> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files || []) as File[]
        const limitedFiles = files.slice(0, maxCount - images.length)
        
        // 转换为base64
        const promises = limitedFiles.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve(e.target?.result as string)
            }
            reader.readAsDataURL(file)
          })
        })
        
        Promise.all(promises).then(resolve)
      }
      
      input.click()
    })
  }

  /**
   * 选择图片
   */
  const handleChooseImage = async () => {
    if (disabled || uploading || images.length >= maxCount) {
      return
    }

    setUploading(true)

    try {
      let tempPaths: string[] = []

      // 根据平台选择图片
      if (platform.isWeapp()) {
        tempPaths = await chooseImageWeapp()
      } else if (platform.isAndroid()) {
        tempPaths = await chooseImageAndroid()
      } else {
        tempPaths = await chooseImageH5()
      }

      if (tempPaths.length === 0) {
        setUploading(false)
        return
      }

      // 如果提供了上传函数，则上传图片
      if (onUpload) {
        const uploadPromises = tempPaths.map(path => onUpload(path))
        const uploadedUrls = await Promise.all(uploadPromises)
        const newImages = [...images, ...uploadedUrls]
        setImages(newImages)
        onChange?.(newImages)
      } else {
        // 否则直接使用本地路径
        const newImages = [...images, ...tempPaths]
        setImages(newImages)
        onChange?.(newImages)
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      Taro.showToast({
        title: '上传失败',
        icon: 'none'
      })
    } finally {
      setUploading(false)
    }
  }

  /**
   * 删除图片
   */
  const handleDeleteImage = (index: number) => {
    if (disabled) {
      return
    }

    Taro.showModal({
      title: '提示',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const newImages = images.filter((_, i) => i !== index)
          setImages(newImages)
          onChange?.(newImages)
        }
      }
    })
  }

  /**
   * 预览图片
   */
  const handlePreviewImage = (index: number) => {
    Taro.previewImage({
      urls: images,
      current: images[index]
    })
  }

  return (
    <View className={`platform-image-uploader ${className}`}>
      <View className="image-list">
        {images.map((image, index) => (
          <View key={index} className="image-item">
            <Image
              src={image}
              mode="aspectFill"
              className="image"
              onClick={() => handlePreviewImage(index)}
            />
            {!disabled && (
              <View
                className="delete-btn"
                onClick={() => handleDeleteImage(index)}
              >
                ×
              </View>
            )}
          </View>
        ))}
        
        {images.length < maxCount && !disabled && (
          <View
            className={`upload-btn ${uploading ? 'uploading' : ''}`}
            onClick={handleChooseImage}
          >
            {uploading ? (
              <View className="loading">上传中...</View>
            ) : (
              <View className="add-icon">+</View>
            )}
          </View>
        )}
      </View>
      
      <View className="upload-tip">
        已上传 {images.length}/{maxCount} 张
      </View>
    </View>
  )
}

export default PlatformImageUploader