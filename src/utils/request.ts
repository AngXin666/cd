/**
 * 平台适配的网络请求工具
 * 统一处理不同平台的网络请求差异
 */

import Taro from '@tarojs/taro'
import {platform, platformNetwork} from './platform'

// 请求配置接口
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  header?: Record<string, string>
  timeout?: number
  responseType?: 'text' | 'arraybuffer'
}

// 响应接口
interface RequestResponse<T = any> {
  data: T
  statusCode: number
  header: Record<string, string>
  cookies?: string[]
}

// 上传文件配置接口
interface UploadConfig {
  url: string
  filePath: string
  name: string
  formData?: Record<string, any>
  header?: Record<string, string>
  timeout?: number
}

/**
 * 统一的网络请求方法
 */
export const request = async <T = any>(config: RequestConfig): Promise<RequestResponse<T>> => {
  const {url, method = 'GET', data, header = {}, timeout, responseType = 'text'} = config

  // 设置平台特定的超时时间
  const requestTimeout = timeout || platformNetwork.getRequestTimeout()

  // 设置通用请求头
  const commonHeaders = {
    'Content-Type': 'application/json',
    ...header
  }

  // 平台特定的请求处理
  return platform.isWeapp()
    ? requestWeapp({url, method, data, header: commonHeaders, timeout: requestTimeout, responseType})
    : requestH5AndAndroid({url, method, data, header: commonHeaders, timeout: requestTimeout, responseType})
}

/**
 * 微信小程序请求
 */
const requestWeapp = async <T = any>(config: RequestConfig): Promise<RequestResponse<T>> => {
  return new Promise((resolve, reject) => {
    Taro.request({
      ...config,
      success: (res) => {
        resolve({
          data: res.data,
          statusCode: res.statusCode,
          header: res.header,
          cookies: res.cookies
        })
      },
      fail: (error) => {
        reject(new Error(`网络请求失败: ${error.errMsg || '未知错误'}`))
      }
    })
  })
}

/**
 * H5和安卓APP请求
 */
const requestH5AndAndroid = async <T = any>(config: RequestConfig): Promise<RequestResponse<T>> => {
  const {url, method, data, header, timeout} = config

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const fetchConfig: RequestInit = {
      method,
      headers: header,
      signal: controller.signal
    }

    if (data && method !== 'GET') {
      fetchConfig.body = typeof data === 'string' ? data : JSON.stringify(data)
    }

    const response = await fetch(url, fetchConfig)
    clearTimeout(timeoutId)

    const responseData = await response.json()

    return {
      data: responseData,
      statusCode: response.status,
      header: Object.fromEntries(Array.from(response.headers.entries()))
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时')
      }
      throw new Error(`网络请求失败: ${error.message}`)
    }
    throw new Error('网络请求失败: 未知错误')
  }
}

/**
 * GET 请求
 */
export const get = <T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
) => {
  let requestUrl = url
  if (params) {
    const searchParams = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, String(params[key]))
      }
    })
    requestUrl += `?${searchParams.toString()}`
  }

  return request<T>({
    url: requestUrl,
    method: 'GET',
    ...config
  })
}

/**
 * POST 请求
 */
export const post = <T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>) => {
  return request<T>({
    url,
    method: 'POST',
    data,
    ...config
  })
}

/**
 * PUT 请求
 */
export const put = <T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>) => {
  return request<T>({
    url,
    method: 'PUT',
    data,
    ...config
  })
}

/**
 * DELETE 请求
 */
export const del = <T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>) => {
  return request<T>({
    url,
    method: 'DELETE',
    ...config
  })
}

/**
 * 文件上传
 */
export const uploadFile = async (config: UploadConfig): Promise<RequestResponse> => {
  const {url, filePath, name, formData = {}, header = {}, timeout} = config

  // 设置平台特定的上传超时时间
  const uploadTimeout = timeout || platformNetwork.getUploadTimeout()

  // 平台特定的上传处理
  if (platform.isWeapp()) {
    return uploadFileWeapp({url, filePath, name, formData, header, timeout: uploadTimeout})
  } else {
    return uploadFileH5AndAndroid({url, filePath, name, formData, header, timeout: uploadTimeout})
  }
}

/**
 * 微信小程序文件上传
 */
const uploadFileWeapp = async (config: UploadConfig): Promise<RequestResponse> => {
  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      ...config,
      success: (res) => {
        resolve({
          data: res.data,
          statusCode: res.statusCode,
          header: res.header || {}
        })
      },
      fail: (error) => {
        reject(new Error(`文件上传失败: ${error.errMsg || '未知错误'}`))
      }
    })
  })
}

/**
 * H5和安卓APP文件上传
 */
const uploadFileH5AndAndroid = async (config: UploadConfig): Promise<RequestResponse> => {
  const {url, filePath, name, formData, header, timeout} = config

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 创建FormData
    const form = new FormData()

    // 添加文件
    if (platform.isAndroid()) {
      // 安卓APP中处理文件路径
      const response = await fetch(filePath)
      const blob = await response.blob()
      form.append(name, blob)
    } else {
      // H5中处理文件
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      // 这里需要根据实际情况处理文件选择
    }

    // 添加其他表单数据
    Object.keys(formData).forEach((key) => {
      form.append(key, formData[key])
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: header,
      body: form,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseData = await response.text()

    return {
      data: responseData,
      statusCode: response.status,
      header: Object.fromEntries(Array.from(response.headers.entries()))
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('上传超时')
      }
      throw new Error(`文件上传失败: ${error.message}`)
    }
    throw new Error('文件上传失败: 未知错误')
  }
}

/**
 * 下载文件
 */
export const downloadFile = async (
  url: string,
  config?: {
    header?: Record<string, string>
    timeout?: number
  }
): Promise<{tempFilePath: string}> => {
  const {header = {}, timeout} = config || {}
  const downloadTimeout = timeout || platformNetwork.getUploadTimeout()

  if (platform.isWeapp()) {
    return new Promise((resolve, reject) => {
      Taro.downloadFile({
        url,
        header,
        timeout: downloadTimeout,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({tempFilePath: res.tempFilePath})
          } else {
            reject(new Error(`下载失败: HTTP ${res.statusCode}`))
          }
        },
        fail: (error) => {
          reject(new Error(`下载失败: ${error.errMsg || '未知错误'}`))
        }
      })
    })
  } else {
    // H5和安卓APP中的下载处理
    try {
      const response = await fetch(url, {headers: header})
      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      return {tempFilePath: objectUrl}
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`下载失败: ${error.message}`)
      }
      throw new Error('下载失败: 未知错误')
    }
  }
}

export default {
  request,
  get,
  post,
  put,
  del,
  uploadFile,
  downloadFile
}
