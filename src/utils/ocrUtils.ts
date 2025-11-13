/**
 * OCR识别工具函数
 * 使用文心一言多模态API进行证件识别
 */

import {createChatDataHandler, sendChatStream} from 'miaoda-taro-utils/chatStream'
import {compressImage, imageToBase64} from './imageUtils'

const APP_ID = process.env.TARO_APP_APP_ID || ''
const API_ENDPOINT = 'https://api-integrations.appmiaoda.com/app-7cdqf07mbu9t/api-2jBYdN3A9Jyz/v2/chat/completions'

// OCR识别类型
export type OcrDocumentType =
  | 'driving_license_main' // 行驶证主页
  | 'driving_license_sub' // 行驶证副页
  | 'driving_license_sub_back' // 行驶证副页背页
  | 'id_card_front' // 身份证正面
  | 'id_card_back' // 身份证反面
  | 'driver_license' // 驾驶证

// OCR识别结果类型 - 行驶证主页
export interface DrivingLicenseMainOcrResult {
  plate_number?: string // 车牌号
  vehicle_type?: string // 车辆类型
  owner_name?: string // 所有人
  use_character?: string // 使用性质
  brand?: string // 品牌
  model?: string // 型号
  vin?: string // 车辆识别代号
  engine_number?: string // 发动机号码
  register_date?: string // 注册日期
  issue_date?: string // 发证日期
}

// OCR识别结果类型 - 行驶证副页
export interface DrivingLicenseSubOcrResult {
  archive_number?: string // 档案编号
  total_mass?: number // 总质量（kg）
  approved_passengers?: number // 核定载人数
  curb_weight?: number // 整备质量（kg）
  approved_load?: number // 核定载质量（kg）
  overall_dimension_length?: number // 外廓尺寸-长（mm）
  overall_dimension_width?: number // 外廓尺寸-宽（mm）
  overall_dimension_height?: number // 外廓尺寸-高（mm）
  inspection_valid_until?: string // 检验有效期
}

// OCR识别结果类型 - 行驶证副页背页
export interface DrivingLicenseSubBackOcrResult {
  mandatory_scrap_date?: string // 强制报废期
  inspection_date?: string // 年检时间（最近一次年检日期）
  inspection_valid_until?: string // 检验有效期（最新的有效期，优先使用此字段）
}

export interface IdCardOcrResult {
  name?: string // 姓名
  id_number?: string // 身份证号
  address?: string // 地址
  birth_date?: string // 出生日期
}

export interface IdCardBackOcrResult {
  issue_authority?: string // 签发机关
  valid_from?: string // 有效期起始日期
  valid_until?: string // 有效期截止日期
}

export interface DriverLicenseOcrResult {
  name?: string // 姓名
  license_number?: string // 驾驶证编号（证号）
  address?: string // 住址
  license_class?: string // 准驾车型
  first_issue_date?: string // 初次领证日期
  valid_from?: string // 有效期起始日期
  valid_until?: string // 有效期截止日期（有效期至）
  issue_authority?: string // 发证机关
}

export type OcrResult =
  | DrivingLicenseMainOcrResult
  | DrivingLicenseSubOcrResult
  | DrivingLicenseSubBackOcrResult
  | IdCardOcrResult
  | IdCardBackOcrResult
  | DriverLicenseOcrResult

/**
 * OCR识别提示词
 */
const OCR_PROMPTS: Record<OcrDocumentType, string> = {
  driving_license_main: `请识别这张行驶证主页，提取以下信息并以JSON格式返回：
{
  "plate_number": "车牌号码",
  "vehicle_type": "车辆类型",
  "owner_name": "所有人",
  "use_character": "使用性质",
  "brand": "品牌",
  "model": "型号",
  "vin": "车辆识别代号（VIN码）",
  "engine_number": "发动机号码",
  "register_date": "注册日期(YYYY-MM-DD格式)",
  "issue_date": "发证日期(YYYY-MM-DD格式)"
}
重要：只返回纯JSON数据，不要添加任何注释、说明或额外文字。`,

  driving_license_sub: `请识别这张行驶证副页，提取以下信息并以JSON格式返回：
{
  "archive_number": "档案编号",
  "total_mass": "总质量（数字，单位kg）",
  "approved_passengers": "核定载人数（数字）",
  "curb_weight": "整备质量（数字，单位kg）",
  "approved_load": "核定载质量（数字，单位kg）",
  "overall_dimension_length": "外廓尺寸长度（数字，单位mm）",
  "overall_dimension_width": "外廓尺寸宽度（数字，单位mm）",
  "overall_dimension_height": "外廓尺寸高度（数字，单位mm）",
  "inspection_valid_until": "检验有效期(YYYY-MM-DD格式)"
}
注意：
1. 数字类型字段请返回纯数字，不要包含单位
2. 如果某个字段无法识别，请返回null
3. 重要：只返回纯JSON数据，不要在JSON中添加任何注释、括号说明或额外文字`,

  driving_license_sub_back: `请识别这张行驶证副页背页，提取以下信息并以JSON格式返回：
{
  "mandatory_scrap_date": "强制报废期(YYYY-MM-DD格式)",
  "inspection_date": "年检时间(YYYY-MM-DD格式)",
  "inspection_valid_until": "检验有效期(YYYY-MM-DD格式)"
}
注意：
1. 年检时间通常在副页背页的检验记录中，是最近一次年检的日期
2. 检验有效期是最新的检验有效期至日期，通常在年检记录的"检验有效期至"栏
3. 如果副页正面的检验有效期已过期，副页背面会有新的年检记录和新的检验有效期
4. 请优先识别最新（最下方）的年检记录
5. 如果某个字段无法识别，请返回null
6. 重要：只返回纯JSON数据，不要在JSON中添加任何注释、括号说明或额外文字`,

  id_card_front: `请识别这张身份证正面，提取以下信息并以JSON格式返回：
{
  "name": "姓名",
  "id_number": "身份证号",
  "address": "地址",
  "birth_date": "出生日期(YYYY-MM-DD格式)"
}
重要：只返回纯JSON数据，不要添加任何注释、说明或额外文字。`,

  id_card_back: `请识别这张身份证反面，提取以下信息并以JSON格式返回：
{
  "issue_authority": "签发机关",
  "valid_from": "有效期起始日期(YYYY-MM-DD格式)",
  "valid_until": "有效期截止日期(YYYY-MM-DD格式或'长期')"
}
重要：只返回纯JSON数据，不要添加任何注释、说明或额外文字。`,

  driver_license: `请仔细识别这张中国驾驶证，提取以下信息并以JSON格式返回：
{
  "name": "姓名",
  "license_number": "证号（驾驶证编号，通常是18位数字）",
  "license_class": "准驾车型（如C1、C2、B2等）",
  "first_issue_date": "初次领证日期(YYYY-MM-DD格式)",
  "valid_from": "有效期起始日期(YYYY-MM-DD格式)",
  "valid_until": "有效期截止日期(YYYY-MM-DD格式，如果是长期有效则返回'长期')",
  "issue_authority": "发证机关"
}
识别要点：
1. 证号通常在照片下方，是一串18位数字
2. 准驾车型在"准驾车型"标签后，如C1、C2、B2等
3. 初次领证日期在"初次领证日期"标签后
4. 有效期限通常显示为"YYYY-MM-DD至YYYY-MM-DD"或"YYYY-MM-DD至长期"
5. 如果某个字段无法识别，请返回null
6. 重要：只返回纯JSON数据，不要添加任何注释或额外文字`
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
            // 1. 首先尝试提取JSON对象
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              let jsonStr = jsonMatch[0]

              // 2. 清理JSON字符串中的注释
              // 移除行内注释（如：// 注释 或 （注释））
              jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '') // 移除 // 注释
              jsonStr = jsonStr.replace(/（[^）]*）/g, '') // 移除中文括号注释
              jsonStr = jsonStr.replace(/\([^)]*\)/g, '') // 移除英文括号注释

              // 3. 清理多余的空白字符
              jsonStr = jsonStr.replace(/\s+/g, ' ').trim()

              // 4. 修复可能的JSON格式问题
              // 移除最后一个属性值后的逗号（如果有）
              jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

              console.log('清理后的JSON字符串:', jsonStr)

              // 5. 解析JSON
              const result = JSON.parse(jsonStr)
              resolve(result)
            } else {
              console.error('无法从响应中提取JSON:', fullContent)
              reject(new Error('识别结果格式错误'))
            }
          } catch (error) {
            console.error('解析OCR结果失败:', error)
            console.error('原始内容:', fullContent)
            reject(new Error('识别结果解析失败'))
          }
        },
        onError: (error: Error) => {
          console.error('OCR识别失败:', error)

          // 提供更友好的错误信息
          let errorMessage = '识别失败，请重试'

          if (error.message.includes('network')) {
            errorMessage = '网络连接失败，请检查网络后重试'
          } else if (error.message.includes('timeout')) {
            errorMessage = '识别超时，请重新拍摄清晰的照片'
          } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = '认证失败，请联系管理员'
          } else if (error.message.includes('500')) {
            errorMessage = '服务器错误，请稍后重试'
          }

          reject(new Error(errorMessage))
        }
      })
    })
  } catch (error) {
    console.error('OCR识别异常:', error)

    // 处理图片处理阶段的错误
    if (error instanceof Error) {
      if (error.message.includes('compress')) {
        throw new Error('图片压缩失败，请重新拍摄')
      } else if (error.message.includes('base64')) {
        throw new Error('图片格式转换失败，请重新拍摄')
      }
    }

    return null
  }
}

/**
 * 识别行驶证主页
 */
export async function recognizeDrivingLicenseMain(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<DrivingLicenseMainOcrResult | null> {
  return recognizeDocument(imagePath, 'driving_license_main', onProgress) as Promise<DrivingLicenseMainOcrResult | null>
}

/**
 * 识别行驶证副页
 */
export async function recognizeDrivingLicenseSub(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<DrivingLicenseSubOcrResult | null> {
  return recognizeDocument(imagePath, 'driving_license_sub', onProgress) as Promise<DrivingLicenseSubOcrResult | null>
}

/**
 * 识别行驶证副页背页
 */
export async function recognizeDrivingLicenseSubBack(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<DrivingLicenseSubBackOcrResult | null> {
  return recognizeDocument(
    imagePath,
    'driving_license_sub_back',
    onProgress
  ) as Promise<DrivingLicenseSubBackOcrResult | null>
}

/**
 * 识别行驶证（旧版本，保留兼容性）
 * @deprecated 请使用 recognizeDrivingLicenseMain 代替
 */
export async function recognizeDrivingLicense(
  imagePath: string,
  onProgress?: (message: string) => void
): Promise<DrivingLicenseMainOcrResult | null> {
  return recognizeDrivingLicenseMain(imagePath, onProgress)
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
