#!/usr/bin/env node

/**
 * 清除通知缓存脚本
 * 用于测试通知功能时清除欢迎通知的显示标记
 */

console.log('🧹 清除通知缓存...\n')

console.log('请在浏览器开发者工具的控制台中执行以下代码：\n')
console.log('// 清除管理员端欢迎通知标记')
console.log("localStorage.removeItem('manager_welcome_shown')\n")

console.log('// 清除超级管理员端欢迎通知标记')
console.log("localStorage.removeItem('super_admin_welcome_shown')\n")

console.log('// 清除司机端欢迎通知标记')
console.log("localStorage.removeItem('driver_welcome_shown')\n")

console.log('// 清除所有通知数据')
console.log("localStorage.removeItem('app_notifications')\n")

console.log('或者在微信开发者工具的控制台中执行：\n')
console.log("Taro.removeStorageSync('manager_welcome_shown')")
console.log("Taro.removeStorageSync('super_admin_welcome_shown')")
console.log("Taro.removeStorageSync('driver_welcome_shown')")
console.log("Taro.removeStorageSync('app_notifications')\n")

console.log('✅ 执行完成后刷新页面即可看到欢迎通知')
