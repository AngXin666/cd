#!/usr/bin/env node

/**
 * 清除仪表板缓存脚本
 * 用于强制刷新仪表板数据
 */

console.log('🧹 清除仪表板缓存...\n')

console.log('请在微信开发者工具的控制台中执行以下代码：\n')

console.log('// 清除车队长端仪表板缓存')
console.log("const keys = Taro.getStorageInfoSync().keys")
console.log("keys.forEach(key => {")
console.log("  if (key.startsWith('dashboard_cache_') || key.startsWith('super_admin_dashboard_')) {")
console.log("    Taro.removeStorageSync(key)")
console.log("    console.log('已清除缓存:', key)")
console.log("  }")
console.log("})")
console.log("console.log('✅ 缓存清除完成，请下拉刷新页面')\n")

console.log('或者直接在页面上下拉刷新即可！')
