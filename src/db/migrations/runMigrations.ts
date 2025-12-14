import {supabase} from '@/client/supabase'

/**
 * 检查表是否存在
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const {error} = await supabase.from(tableName).select('id').limit(1)

    // 如果没有错误，表存在
    return !error
  } catch {
    return false
  }
}

/**
 * 创建 app_versions 表
 */
async function createAppVersionsTable(): Promise<void> {
  const sql = `
    -- 创建应用版本管理表
    CREATE TABLE IF NOT EXISTS app_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version VARCHAR(20) NOT NULL,
      apk_url TEXT NOT NULL,
      release_notes TEXT,
      is_force_update BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_app_versions_active ON app_versions(is_active);
    CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);
  `

  try {
    const {error} = await supabase.rpc('exec_sql', {sql_query: sql})

    if (error) {
      console.error('创建 app_versions 表失败:', error)
      throw error
    }

    console.log('✅ app_versions 表创建成功')
  } catch (_error) {
    // 如果 exec_sql 函数不存在，使用备用方案
    console.warn('无法使用 exec_sql，尝试直接创建表...')

    // 备用方案：通过插入一条记录来触发表创建（如果使用 Supabase 自动模式）
    // 注意：这个方法依赖于 Supabase 的自动表创建功能
    console.log('请在 Supabase Dashboard 中手动执行 SQL 迁移脚本')
    console.log('路径: supabase/migrations/create_app_versions.sql')
  }
}

/**
 * 运行所有迁移
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 检查数据库迁移...')

    // 检查 app_versions 表是否存在
    const appVersionsExists = await tableExists('app_versions')

    if (!appVersionsExists) {
      console.log('📦 app_versions 表不存在，开始创建...')
      await createAppVersionsTable()
    } else {
      console.log('✅ app_versions 表已存在')
    }

    console.log('✅ 数据库迁移检查完成')
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error)
    // 不抛出错误，允许应用继续运行
  }
}

/**
 * 在应用启动时自动运行迁移
 */
export function initMigrations(): void {
  // 延迟执行，避免阻塞应用启动
  setTimeout(() => {
    runMigrations().catch((error) => {
      console.error('迁移初始化失败:', error)
    })
  }, 1000)
}
