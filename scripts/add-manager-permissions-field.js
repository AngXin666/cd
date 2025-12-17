/**
 * 添加 manager_permissions_enabled 字段到 users 表
 * 通过 exec_sql RPC 函数执行 DDL 语句
 * 
 * 使用方法: node scripts/add-manager-permissions-field.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置，请检查 .env 文件')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 检查字段是否已存在
 */
async function checkFieldExists() {
  console.log('🔍 检查 manager_permissions_enabled 字段是否存在...')
  
  try {
    // 尝试查询包含该字段的数据
    const { data, error } = await supabase
      .from('users')
      .select('manager_permissions_enabled')
      .limit(1)
    
    if (error) {
      // 错误码 42703 表示字段不存在
      if (error.code === '42703' || error.message?.includes('manager_permissions_enabled')) {
        console.log('📋 字段不存在，需要添加')
        return false
      }
      console.error('查询错误:', error)
      return false
    }
    
    console.log('✅ 字段已存在')
    return true
  } catch (err) {
    console.error('检查字段时出错:', err)
    return false
  }
}

/**
 * 通过 exec_sql RPC 函数添加字段
 */
async function addFieldViaRpc() {
  console.log('🔧 尝试通过 exec_sql RPC 函数添加字段...')
  
  const sql = `
    -- 添加 manager_permissions_enabled 字段
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;
    
    -- 添加注释
    COMMENT ON COLUMN public.users.manager_permissions_enabled IS 
      '管理员权限启用状态：true=完整权限(full_control)，false=仅查看权限(view_only)，默认为true';
  `
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ exec_sql 执行失败:', error)
      return false
    }
    
    console.log('✅ 字段添加成功')
    return true
  } catch (err) {
    console.error('❌ RPC 调用失败:', err)
    return false
  }
}

/**
 * 更新现有用户的默认值
 */
async function updateExistingUsers() {
  console.log('📝 更新现有 MANAGER/PEER_ADMIN 用户的默认值...')
  
  const sql = `
    UPDATE public.users 
    SET manager_permissions_enabled = true 
    WHERE role IN ('MANAGER', 'PEER_ADMIN') 
    AND manager_permissions_enabled IS NULL;
  `
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ 更新默认值失败:', error)
      return false
    }
    
    console.log('✅ 默认值更新成功')
    return true
  } catch (err) {
    console.error('❌ 更新失败:', err)
    return false
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('  添加 manager_permissions_enabled 字段')
  console.log('========================================\n')
  
  // 1. 检查字段是否已存在
  const exists = await checkFieldExists()
  
  if (exists) {
    console.log('\n✅ 字段已存在，无需迁移')
    return
  }
  
  // 2. 尝试通过 RPC 添加字段
  const addSuccess = await addFieldViaRpc()
  
  if (!addSuccess) {
    console.log('\n❌ 自动迁移失败')
    console.log('\n请在 Supabase Dashboard 的 SQL Editor 中手动执行以下 SQL：')
    console.log('----------------------------------------')
    console.log(`
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;

UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;

COMMENT ON COLUMN public.users.manager_permissions_enabled IS 
  '管理员权限启用状态：true=完整权限(full_control)，false=仅查看权限(view_only)，默认为true';
    `)
    console.log('----------------------------------------')
    return
  }
  
  // 3. 更新现有用户的默认值
  await updateExistingUsers()
  
  // 4. 验证字段是否添加成功
  const verifyExists = await checkFieldExists()
  
  if (verifyExists) {
    console.log('\n========================================')
    console.log('  ✅ 迁移完成！')
    console.log('========================================')
  } else {
    console.log('\n⚠️ 迁移可能未完全成功，请手动验证')
  }
}

main().catch(console.error)
