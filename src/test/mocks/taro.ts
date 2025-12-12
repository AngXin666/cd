/**
 * Taro API Mock
 * 用于测试环境中模拟Taro API
 */
import {vi} from 'vitest'

export const showToast = vi.fn()
export const showLoading = vi.fn()
export const hideLoading = vi.fn()
export const showModal = vi.fn().mockResolvedValue({confirm: true})
export const navigateTo = vi.fn()
export const usePullDownRefresh = vi.fn()

export default {
  showToast,
  showLoading,
  hideLoading,
  showModal,
  navigateTo,
  usePullDownRefresh
}
