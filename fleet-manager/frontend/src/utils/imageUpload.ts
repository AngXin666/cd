/**
 * 图片上传工具模块
 * 提供图片压缩、上传等功能
 * 参考主项目 src/utils/imageUtils.ts
 */

import { getApiBaseUrl } from '@/api';

/**
 * 生成唯一文件名
 * @param prefix - 文件名前缀
 * @param extension - 文件扩展名
 * @returns 唯一文件名
 */
export function generateUniqueFileName(prefix: string, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * 压缩图片
 * @param filePath - 原始图片路径
 * @param quality - 压缩质量（0-100）
 * @returns 压缩后的图片路径
 */
export async function compressImage(
  filePath: string,
  quality: number = 80
): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // H5 环境使用 canvas 压缩
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 计算压缩后的尺寸（最大宽度 1920）
      let width = img.width;
      let height = img.height;
      const maxWidth = 1920;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      // 转换为 blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedUrl = URL.createObjectURL(blob);
            resolve(compressedUrl);
          } else {
            resolve(filePath); // 压缩失败，返回原图
          }
        },
        'image/jpeg',
        quality / 100
      );
    };
    img.onerror = () => {
      resolve(filePath); // 加载失败，返回原图
    };
    img.src = filePath;
    // #endif
    
    // #ifndef H5
    // 非 H5 环境使用 uni.compressImage
    uni.compressImage({
      src: filePath,
      quality: quality,
      success: (res) => {
        resolve(res.tempFilePath);
      },
      fail: () => {
        resolve(filePath); // 压缩失败，返回原图
      }
    });
    // #endif
  });
}

/**
 * 上传图片到服务器
 * @param filePath - 本地图片路径
 * @param fileName - 文件名（可选）
 * @param compress - 是否压缩（默认 true）
 * @returns 上传后的图片 URL
 */
export async function uploadImage(
  filePath: string,
  fileName?: string,
  compress: boolean = true
): Promise<string> {
  try {
    // 压缩图片
    let uploadPath = filePath;
    if (compress) {
      uploadPath = await compressImage(filePath, 80);
    }
    
    // 生成文件名
    const finalFileName = fileName || generateUniqueFileName('upload');
    
    // 获取 API 基础 URL
    const baseUrl = getApiBaseUrl();
    const uploadUrl = `${baseUrl}/api/upload/image`;
    
    // 获取 token
    const token = uni.getStorageSync('token');
    
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: uploadUrl,
        filePath: uploadPath,
        name: 'file',
        formData: {
          filename: finalFileName
        },
        header: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data);
              if (data.url) {
                resolve(data.url);
              } else {
                reject(new Error('上传响应缺少 URL'));
              }
            } catch (e) {
              reject(new Error('解析上传响应失败'));
            }
          } else {
            reject(new Error(`上传失败: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          console.error('[ImageUpload] 上传失败:', error);
          reject(new Error('上传失败，请检查网络连接'));
        }
      });
    });
  } catch (error) {
    console.error('[ImageUpload] 上传图片失败:', error);
    throw error;
  }
}

/**
 * 批量上传图片
 * @param filePaths - 本地图片路径数组
 * @param prefix - 文件名前缀
 * @param onProgress - 进度回调
 * @returns 上传后的图片 URL 数组
 */
export async function uploadImages(
  filePaths: string[],
  prefix: string = 'batch',
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const total = filePaths.length;
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fileName = generateUniqueFileName(`${prefix}_${i}`);
    
    try {
      const url = await uploadImage(filePath, fileName);
      results.push(url);
      
      // 回调进度
      if (onProgress) {
        onProgress(i + 1, total);
      }
    } catch (error) {
      console.error(`[ImageUpload] 上传第 ${i + 1} 张图片失败:`, error);
      // 继续上传其他图片，失败的用空字符串占位
      results.push('');
    }
  }
  
  return results;
}

/**
 * 读取图片为 Base64
 * @param filePath - 图片路径
 * @returns Base64 字符串（不含前缀）
 */
export function readImageAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // H5 环境使用 canvas 转换
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      // 移除 data:image/jpeg;base64, 前缀
      resolve(base64.split(',')[1]);
    };
    img.onerror = reject;
    img.src = filePath;
    // #endif
    
    // #ifndef H5
    // 非 H5 环境使用 plus API 或 uni API
    // @ts-ignore
    if (typeof plus !== 'undefined') {
      // App 环境使用 plus API
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(filePath, (entry: any) => {
        entry.file((file: any) => {
          // @ts-ignore
          const reader = new plus.io.FileReader();
          reader.onloadend = (e: any) => {
            const base64 = e.target.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }, reject);
      }, reject);
    } else {
      // 其他环境尝试使用 uni.getFileSystemManager
      const fs = uni.getFileSystemManager();
      fs.readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data as string);
        },
        fail: reject
      });
    }
    // #endif
  });
}

/**
 * 检查图片文件大小
 * @param filePath - 图片路径
 * @param maxSizeMB - 最大大小（MB）
 * @returns 是否在限制范围内
 */
export async function checkImageSize(
  filePath: string,
  maxSizeMB: number = 10
): Promise<boolean> {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath: filePath,
      success: (res) => {
        const sizeMB = res.size / (1024 * 1024);
        resolve(sizeMB <= maxSizeMB);
      },
      fail: () => {
        resolve(true); // 获取失败时默认通过
      }
    });
  });
}

/**
 * 获取图片信息
 * @param filePath - 图片路径
 * @returns 图片信息（宽度、高度、类型等）
 */
export async function getImageInfo(filePath: string): Promise<{
  width: number;
  height: number;
  type: string;
  path: string;
}> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: filePath,
      success: (res) => {
        resolve({
          width: res.width,
          height: res.height,
          type: res.type || 'unknown',
          path: res.path
        });
      },
      fail: reject
    });
  });
}
