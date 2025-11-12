/**
 * 图片处理工具函数
 * 支持图片压缩、Base64转换、上传到Supabase Storage
 */

import Taro from '@tarojs/taro'
import {supabase} from '@/db/supabase'

/**
 * 将图片路径转换为Base64格式
 * @param imagePath 图片路径
 * @returns Base64字符串
 */
export const imageToBase64 = async (imagePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        // 小程序环境
        const fs = Taro.getFileSystemManager()
        fs.readFile({
          filePath: imagePath,
          encoding: 'base64',
          success: (res) => {
            const extension = imagePath.split('.').pop()?.toLowerCase()
            const mimeTypeMap: Record<string, string> = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              bmp: 'image/bmp'
            }
            const mimeType = mimeTypeMap[extension || 'jpeg'] || 'image/jpeg'
            const base64String = `data:${mimeType};base64,${res.data}`
            resolve(base64String)
          },
          fail: (error) => {
            console.error('读取图片文件失败:', error)
            reject(new Error('图片转换失败'))
          }
        })
      } else {
        // H5环境
        if (imagePath.startsWith('data:')) {
          // 已经是base64格式
          resolve(imagePath)
          return
        }
        const img = new Image()
        img.crossOrigin = 'anonymous' // 处理跨域问题
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('无法创建Canvas上下文'))
              return
            }
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            const base64String = canvas.toDataURL('image/jpeg', 0.8)
            resolve(base64String)
          } catch (error) {
            console.error('Canvas转换失败:', error)
            reject(new Error('图片处理失败'))
          }
        }
        img.onerror = () => {
          reject(new Error('图片加载失败'))
        }
        img.src = imagePath
      }
    } catch (error) {
      console.error('图片转base64出错:', error)
      reject(new Error('图片处理失败'))
    }
  })
}

/**
 * 压缩图片
 * @param imagePath 图片路径
 * @param quality 压缩质量 0-1
 * @returns 压缩后的图片路径
 */
export function compressImage(imagePath: string, quality = 0.8): Promise<string> {
  return new Promise((resolve, _reject) => {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
      // H5环境直接返回原图
      resolve(imagePath)
    } else {
      // 小程序环境
      Taro.compressImage({
        src: imagePath,
        quality: quality * 100, // 0-100
        success: (res) => {
          resolve(res.tempFilePath)
        },
        fail: (error) => {
          console.warn('图片压缩失败，使用原图:', error)
          resolve(imagePath)
        }
      })
    }
  })
}

/**
 * 上传图片到Supabase Storage
 * @param imagePath 图片路径
 * @param bucketName 存储桶名称
 * @param fileName 文件名
 * @returns 图片的公开URL
 */
export async function uploadImageToStorage(
  imagePath: string,
  bucketName: string,
  fileName: string
): Promise<string | null> {
  try {
    // 1. 压缩图片
    const compressedPath = await compressImage(imagePath, 0.8)

    // 2. 转换为Base64
    const base64Image = await imageToBase64(compressedPath)

    // 3. 将Base64转换为Blob
    const base64Data = base64Image.split(',')[1]
    const mimeType = base64Image.match(/data:(.*?);/)?.[1] || 'image/jpeg'

    // 在小程序环境中，直接使用base64数据
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      // 小程序环境：使用文件路径
      const {data, error} = await supabase.storage.from(bucketName).upload(fileName, {
        uri: compressedPath
      } as any)

      if (error) {
        console.error('上传图片失败:', error)
        return null
      }

      // 获取公开URL
      const {data: urlData} = supabase.storage.from(bucketName).getPublicUrl(data.path)
      return urlData.publicUrl
    } else {
      // H5环境：转换为Blob
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], {type: mimeType})

      const {data, error} = await supabase.storage.from(bucketName).upload(fileName, blob)

      if (error) {
        console.error('上传图片失败:', error)
        return null
      }

      // 获取公开URL
      const {data: urlData} = supabase.storage.from(bucketName).getPublicUrl(data.path)
      return urlData.publicUrl
    }
  } catch (error) {
    console.error('上传图片异常:', error)
    return null
  }
}

/**
 * 生成唯一的文件名
 * @param prefix 文件名前缀
 * @param extension 文件扩展名
 * @returns 唯一文件名
 */
export function generateUniqueFileName(prefix: string, extension: string = 'jpg'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}.${extension}`
}

/**
 * 选择图片（拍照或从相册选择）
 * @param count 最多选择的图片数量
 * @param sourceType 图片来源类型
 * @returns 图片路径数组
 */
export async function chooseImage(
  count: number = 1,
  sourceType: Array<'album' | 'camera'> = ['album', 'camera']
): Promise<string[]> {
  try {
    const res = await Taro.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType
    })
    return res.tempFilePaths
  } catch (error) {
    console.error('选择图片失败:', error)
    return []
  }
}

/**
 * 批量上传图片
 * @param imagePaths 图片路径数组
 * @param bucketName 存储桶名称
 * @param filePrefix 文件名前缀
 * @returns 上传成功的图片URL数组
 */
export async function uploadMultipleImages(
  imagePaths: string[],
  bucketName: string,
  filePrefix: string
): Promise<string[]> {
  const uploadPromises = imagePaths.map((path, index) => {
    const fileName = generateUniqueFileName(`${filePrefix}_${index}`)
    return uploadImageToStorage(path, bucketName, fileName)
  })

  const results = await Promise.all(uploadPromises)
  return results.filter((url) => url !== null) as string[]
}
