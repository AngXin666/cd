import Taro from '@tarojs/taro'

/**
 * 显示删除确认对话框
 * @param title 对话框标题
 * @param content 对话框内容
 * @returns Promise<boolean> 用户是否确认删除
 */
export async function confirmDelete(title: string, content: string): Promise<boolean> {
  const result = await Taro.showModal({
    title,
    content,
    confirmText: '删除',
    confirmColor: '#EF4444',
    cancelText: '取消'
  })

  return result.confirm
}

/**
 * 显示通用确认对话框
 * @param title 对话框标题
 * @param content 对话框内容
 * @param confirmText 确认按钮文本
 * @param confirmColor 确认按钮颜色
 * @returns Promise<boolean> 用户是否确认
 */
export async function confirm(
  title: string,
  content: string,
  confirmText = '确定',
  confirmColor = '#1E3A8A'
): Promise<boolean> {
  const result = await Taro.showModal({
    title,
    content,
    confirmText,
    confirmColor,
    cancelText: '取消'
  })

  return result.confirm
}
