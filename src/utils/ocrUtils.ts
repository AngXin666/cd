/**
 * OCR识别工具函数
 * 使用文心一言多模态API进行证件识别
 */

import {createChatDataHandler, sendChatStream} from 'miaoda-taro-utils/chatStream'
import {compressImage, imageToBase64} from './imageUtils'

const APP_ID = process.env.TARO_APP_APP_ID || ''
const API_ENDPOINT = 'https://api-integrations.appmiaoda.com/app-7cdqf07mbu9t/api-2jBYdN3A9Jyz/v2/chat/completions'

// OCR识别类型
export type OcrDocumentType = 'driving_license' | 'id_card_front' | 'id_card_back' | 'driver_license'

// OCR识别结果类型
export interface DrivingLicenseOcrResult {
  plate_number?: string // 车牌号
  vehicle_type?: string // 车辆类型
  owner_name?: string // 所有人
  use_character?: string // 使用性质
  brand?: string // 品牌型号
  model?: string // 品牌型号
  vin?: string // 车辆识别代号
  register_date?: string // 注册日期
  issue_date?: string // 发证日期
}

export interface IdCardOcrResult {
  name?: string // 姓名
  id_card_number?: string // 身份证号
  address?: string // 地址
  birth_date?: string // 出生日期
}

export interface DriverLicenseOcrResult {
  license_number?: string // 证号
  license_class?: string // 准驾车型
  valid_from?: string // 有效期起始日期
  valid_to?: string // 有效期截止日期
  issue_authority?: string // 发证机关
}

export type OcrResult = DrivingLicenseOcrResult | IdCardOcrResult | DriverLicenseOcrResult

/**
 * OCR识别提示词
 */
const OCR_PROMPTS: Record<OcrDocumentType, string> = {
  driving_license: `请识别这张行驶证，提取以下信息并以JSON格式返回：
{
  "plate_number": "车牌号",
  "vehicle_type": "车辆类型",
  "owner_name": "所有人",
  "use_character": "使用性质",
  "brand": "品牌",
  "model": "型号",
  "vin": "车辆识别代号",
  "register_date": "注册日期(YYYY-MM-DD格式)",
  "issue_date": "发证日期(YYYY-MM-DD格式)"
}
只返回JSON数据，不要其他说明文字。`,

  id_card_front: `请识别这张身份证正面，提取以下信息并以JSON格式返回：
{
  "name": "姓名",
  "id_card_number": "身份证号",
  "address": "地址",
  "birth_date": "出生日期(YYYY-MM-DD格式)"
}
只返回JSON数据，不要其他说明文字。`,

  id_card_back: `请识别这张身份证反面，提取以下信息并以JSON格式返回：
{
  "issue_authority": "签发机关",
  "valid_from": "有效期起始日期(YYYY-MM-DD格式)",
  "valid_to": "有效期截止日期(YYYY-MM-DD格式或'长期')"
}
只返回JSON数据，不要其他说明文字。`,

  driver_license: `请识别这张驾驶证，提取以下信息并以JSON格式返回：
{
  "license_number": "证号",
  "license_class": "准驾车型",
  "valid_from": "有效期起始日期(YYYY-MM-DD格式)",
  "valid_to": "有效期截止日期(YYYY-MM-DD格式)",
  "issue_authority": "发证机关"
}
只返回JSON数据，不要其他说明文字。`
}

/**
 * 执行OCR识别
 * @param imagePath 图片路径
 * @param documentType 证件类型
 * @param onProgress 进度回调
 * @returns 识别结果
 */
export async function recognizeDocument(
  imagePath: string,
  documentType: OcrDocumentType,
  onProgress?: (message: string) => void
): Promise<OcrResult | null> {
  try {
    onProgress?.('正在压缩图片...')

    // 1. 压缩图片
    const compressedPath = await compressImage(imagePath, 0.8)

    onProgress?.('正在转换图片格式...')

    // 2. 转换为Base64
    const base64Image = await imageToBase64(compressedPath)

    onProgress?.('正在识别证件信息...')

    // 3. 调用OCR API
    let fullContent = ''

    const handleData = createChatDataHandler((content) => {
      fullContent = content
    })

    return new Promise((resolve, reject) => {
      sendChatStream({
        endpoint: API_ENDPOINT,
        appId: APP_ID,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: OCR_PROMPTS[documentType]
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        onUpdate: handleData,
        onComplete: () => {
          try {
            onProgress?.('正在解析识别结果...')

            // 解析JSON结果
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0])
              resolve(result)
            } else {
              console.error('无法从响应中提取JSON:', fullContent)
              reject(new Error('识别结果格式错误'))
            }
          } catch (error) {
            console.error('解析OCR结果失败:', error)
            reject(new Error('识别结果解析失败'))
          }
        },
        onError: (error: Error) => {
          console.error('OCR识别失败:', error)
          reject(error)
        }
      })
    })
  } catch (error) {
    console.error('OCR识别异常:', error)
    return null
  }
}

/**
 * 识别行驶证
 */
export async function recognizeDrivingLicense(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<DrivingLicenseOcrResult | null> {
  return recognizeDocument(imagePath, 'driving_license', onProgress) as Promise<DrivingLicenseOcrResult | null>
}

/**
 * 识别身份证正面
 */
export async function recognizeIdCardFront(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<IdCardOcrResult | null> {
  return recognizeDocument(imagePath, 'id_card_front', onProgress) as Promise<IdCardOcrResult | null>
}

/**
 * 识别身份证反面
 */
export async function recognizeIdCardBack(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<any | null> {
  return recognizeDocument(imagePath, 'id_card_back', onProgress)
}

/**
 * 识别驾驶证
 */
export async function recognizeDriverLicense(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<DriverLicenseOcrResult | null> {
  return recognizeDocument(imagePath, 'driver_license', onProgress) as Promise<DriverLicenseOcrResult | null>
}
