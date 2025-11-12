/**
 * 图片处理工具函数
 * 支持图片压缩、Base64转换、上传到Supabase Storage、自动旋转
 */

import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

/**
 * 从Base64字符串中读取EXIF方向信息
 * @param base64 Base64图片字符串
 * @returns EXIF方向值 (1-8)
 */
function getExifOrientation(base64: string): number {
  try {
    // 移除data URL前缀
    const base64Data = base64.split(',')[1]
    const binaryString = atob(base64Data)

    // 检查是否是JPEG格式（以0xFFD8开头）
    if (binaryString.charCodeAt(0) !== 0xff || binaryString.charCodeAt(1) !== 0xd8) {
      return 1 // 不是JPEG，返回默认方向
    }

    let offset = 2
    const length = binaryString.length

    // 查找EXIF标记
    while (offset < length) {
      if (binaryString.charCodeAt(offset) !== 0xff) break

      const marker = binaryString.charCodeAt(offset + 1)
      offset += 2

      // APP1标记（EXIF数据）
      if (marker === 0xe1) {
        const exifLength = binaryString.charCodeAt(offset) * 256 + binaryString.charCodeAt(offset + 1)
        const exifData = binaryString.substr(offset + 2, exifLength - 2)

        // 检查EXIF标识符
        if (exifData.substr(0, 4) !== 'Exif') {
          return 1
        }

        // 读取字节序
        const tiffOffset = 6
        const littleEndian = exifData.charCodeAt(tiffOffset) === 0x49

        // 读取IFD偏移
        const ifdOffset =
          tiffOffset +
          4 +
          (littleEndian
            ? exifData.charCodeAt(tiffOffset + 4) + exifData.charCodeAt(tiffOffset + 5) * 256
            : exifData.charCodeAt(tiffOffset + 4) * 256 + exifData.charCodeAt(tiffOffset + 5))

        // 读取IFD条目数量
        const numEntries = littleEndian
          ? exifData.charCodeAt(ifdOffset) + exifData.charCodeAt(ifdOffset + 1) * 256
          : exifData.charCodeAt(ifdOffset) * 256 + exifData.charCodeAt(ifdOffset + 1)

        // 查找方向标签（0x0112）
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifdOffset + 2 + i * 12
          const tag = littleEndian
            ? exifData.charCodeAt(entryOffset) + exifData.charCodeAt(entryOffset + 1) * 256
            : exifData.charCodeAt(entryOffset) * 256 + exifData.charCodeAt(entryOffset + 1)

          if (tag === 0x0112) {
            // 找到方向标签
            const orientation = littleEndian
              ? exifData.charCodeAt(entryOffset + 8) + exifData.charCodeAt(entryOffset + 9) * 256
              : exifData.charCodeAt(entryOffset + 8) * 256 + exifData.charCodeAt(entryOffset + 9)
            return orientation
          }
        }
      } else {
        // 跳过其他标记
        const blockLength = binaryString.charCodeAt(offset) * 256 + binaryString.charCodeAt(offset + 1)
        offset += blockLength
      }
    }
  } catch (error) {
    console.warn('读取EXIF信息失败:', error)
  }
  return 1 // 默认方向
}

/**
 * 根据EXIF方向旋转图片
 * @param base64 Base64图片字符串
 * @param orientation EXIF方向值
 * @returns 旋转后的Base64字符串
 */
async function rotateImageByOrientation(base64: string, orientation: number): Promise<string> {
  // 方向值为1表示正常，不需要旋转
  if (orientation === 1) {
    return base64
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'))
          return
        }

        const width = img.width
        const height = img.height

        // 根据方向值设置canvas尺寸和变换
        switch (orientation) {
          case 2:
            // 水平翻转
            canvas.width = width
            canvas.height = height
            ctx.transform(-1, 0, 0, 1, width, 0)
            break
          case 3:
            // 旋转180度
            canvas.width = width
            canvas.height = height
            ctx.transform(-1, 0, 0, -1, width, height)
            break
          case 4:
            // 垂直翻转
            canvas.width = width
            canvas.height = height
            ctx.transform(1, 0, 0, -1, 0, height)
            break
          case 5:
            // 顺时针旋转90度 + 水平翻转
            canvas.width = height
            canvas.height = width
            ctx.transform(0, 1, 1, 0, 0, 0)
            break
          case 6:
            // 顺时针旋转90度
            canvas.width = height
            canvas.height = width
            ctx.transform(0, 1, -1, 0, height, 0)
            break
          case 7:
            // 顺时针旋转270度 + 水平翻转
            canvas.width = height
            canvas.height = width
            ctx.transform(0, -1, -1, 0, height, width)
            break
          case 8:
            // 顺时针旋转270度
            canvas.width = height
            canvas.height = width
            ctx.transform(0, -1, 1, 0, 0, width)
            break
          default:
            canvas.width = width
            canvas.height = height
        }

        ctx.drawImage(img, 0, 0)

        // 转换为Base64
        const mimeType = base64.match(/data:(.*?);/)?.[1] || 'image/jpeg'
        const rotatedBase64 = canvas.toDataURL(mimeType, 0.95)
        resolve(rotatedBase64)
      } catch (error) {
        console.error('旋转图片失败:', error)
        reject(error)
      }
    }
    img.onerror = () => {
      reject(new Error('加载图片失败'))
    }
    img.src = base64
  })
}

/**
 * 自动修正图片方向
 * @param imagePath 图片路径
 * @returns 修正后的图片路径（H5环境返回Base64，小程序环境返回原路径）
 */
export async function autoRotateImage(imagePath: string): Promise<string> {
  try {
    // 小程序环境暂不支持EXIF读取，直接返回原路径
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      return imagePath
    }

    // H5环境：读取EXIF并旋转
    const base64 = await imageToBase64(imagePath)
    const orientation = getExifOrientation(base64)

    if (orientation === 1) {
      // 不需要旋转
      return imagePath
    }

    // 需要旋转
    const rotatedBase64 = await rotateImageByOrientation(base64, orientation)
    return rotatedBase64
  } catch (error) {
    console.warn('自动旋转图片失败，使用原图:', error)
    return imagePath
  }
}

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

        // 检查是否是blob URL
        if (imagePath.startsWith('blob:')) {
          // 使用fetch获取blob数据
          fetch(imagePath)
            .then((response) => response.blob())
            .then((blob) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                resolve(reader.result as string)
              }
              reader.onerror = () => {
                reject(new Error('读取Blob失败'))
              }
              reader.readAsDataURL(blob)
            })
            .catch((error) => {
              console.error('获取Blob失败:', error)
              reject(new Error('图片加载失败'))
            })
          return
        }

        // 普通URL，使用Image加载
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
        img.onerror = (error) => {
          console.error('图片加载失败:', error, '路径:', imagePath)
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
    // 1. 自动旋转图片（修正方向）
    const rotatedPath = await autoRotateImage(imagePath)

    // 2. 压缩图片
    const compressedPath = await compressImage(rotatedPath, 0.8)

    // 3. 转换为Base64
    const base64Image = await imageToBase64(compressedPath)

    // 4. 将Base64转换为Blob
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
