/**
 * 数据库 API 工具函数
 * 包含所有模块共享的辅助函数
 */

/**
 * 兼容函数：将租户 Profile 转换为 Profile 类型
 * 注意：此函数仅用于向后兼容，新代码不应使用
 * @deprecated 多租户功能已废弃
 */
export function convertTenantProfileToProfile(tenantProfile: any): any {
  console.warn('[convertTenantProfileToProfile] 此函数已废弃，请使用新的用户管理 API')
  return {
    id: tenantProfile.id || '',
    phone: tenantProfile.phone || null,
    email: tenantProfile.email || null,
    name: tenantProfile.name || '',
    role: tenantProfile.role || 'DRIVER',
    avatar_url: tenantProfile.avatar_url || null,
    created_at: tenantProfile.created_at || new Date().toISOString(),
    updated_at: tenantProfile.updated_at || new Date().toISOString()
  }
}

/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * 避免使用toISOString()导致的时区问题
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
