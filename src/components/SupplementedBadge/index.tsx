/**
 * 补录标记徽章组件
 * 显示在补录照片上的视觉标识，帮助老板在审核时快速定位补录的照片
 */
import {View, Text} from '@tarojs/components'
import './index.scss'

/**
 * 补录标记徽章组件属性
 */
export interface SupplementedBadgeProps {
  /** 补录时间（ISO 8601 格式） */
  supplementedAt: string
  /** 补录次数（可选，默认为1） */
  supplementCount?: number
  /** 是否显示详细信息（补录时间和次数） */
  showDetail?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 格式化补录时间为易读格式
 * @param isoString - ISO 8601 格式的时间字符串
 * @returns 格式化后的时间字符串，如 "12-17 10:30"
 */
function formatSupplementedTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    // 获取月、日、时、分
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  } catch {
    // 解析失败时返回原始字符串
    return isoString
  }
}

/**
 * 补录标记徽章组件
 * 在补录照片上显示"补录"标记，支持显示补录时间和次数
 * @param props - 组件属性
 * @returns 补录标记徽章
 */
export function SupplementedBadge({
  supplementedAt,
  supplementCount = 1,
  showDetail = false,
  className = ''
}: SupplementedBadgeProps) {
  // 格式化补录时间
  const formattedTime = formatSupplementedTime(supplementedAt)

  return (
    <View className={`supplemented-badge ${className}`}>
      {/* 补录标记 */}
      <View className="supplemented-badge__tag">
        <Text className="supplemented-badge__text">补录</Text>
        {/* 如果补录次数大于1，显示次数 */}
        {supplementCount > 1 && (
          <Text className="supplemented-badge__count">×{supplementCount}</Text>
        )}
      </View>
      {/* 详细信息（补录时间） */}
      {showDetail && (
        <View className="supplemented-badge__detail">
          <Text className="supplemented-badge__time">{formattedTime}</Text>
        </View>
      )}
    </View>
  )
}

export default SupplementedBadge
