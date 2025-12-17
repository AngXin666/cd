/**
 * 添加 session_token 字段到 users 表
 * 用于实现单点登录功能
 * 
 * @module scripts/add-session-token-field
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Supabase 配置
const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少环境变量 TARO_APP_SUPABASE_URL 或 TARO_APP_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log('========================================')
  console.log('添加 session_token 字段（单点登录）')
  console.log('========================================\n')

  try {
    // 1. 添加 session_token 字段
    console.log('1. 添加 session_token 字段...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS session_created_at TIMESTAMPTZ DEFAULT NULL;
      `
    })
    
    if (error1) {
      console.log('   ⚠️ 通过 RPC 添加字段失败，尝试直接更新...')
      // 尝试直接查询来验证字段是否存在
      const { data, error: checkError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (checkError) {
        console.error('   ❌ 无法访问 users 表:', checkError.message)
      } else {
        console.log('   ✅ users 表可访问，字段可能已存在或需要手动添加')
      }
    } else {
      console.log('   ✅ session_token 字段添加成功')
    }

    // 2. 创建更新会话令牌的函数
    console.log('\n2. 创建 update_user_session_token 函数...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_user_session_token(
          p_user_id UUID,
          p_session_token TEXT
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
          UPDATE users
          SET 
            session_token = p_session_token,
            session_created_at = NOW(),
            updated_at = NOW()
          WHERE id = p_user_id;
          
          RETURN FOUND;
        END;
        $$;
      `
    })
    
    if (error2) {
      console.log('   ⚠️ 创建函数失败:', error2.message)
    } else {
      console.log('   ✅ update_user_session_token 函数创建成功')
    }

    // 3. 创建验证会话令牌的函数
    console.log('\n3. 创建 verify_user_session_token 函数...')
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION verify_user_session_token(
          p_user_id UUID,
          p_session_token TEXT
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          v_stored_token TEXT;
        BEGIN
          SELECT session_token INTO v_stored_token
          FROM users
          WHERE id = p_user_id;
          
          IF v_stored_token IS NULL THEN
            RETURN FALSE;
          END IF;
          
          RETURN v_stored_token = p_session_token;
        END;
        $$;
      `
    })
    
    if (error3) {
      console.log('   ⚠️ 创建函数失败:', error3.message)
    } else {
      console.log('   ✅ verify_user_session_token 函数创建成功')
    }

    // 4. 创建清除会话令牌的函数
    console.log('\n4. 创建 clear_user_session_token 函数...')
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION clear_user_session_token(
          p_user_id UUID
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
          UPDATE users
          SET 
            session_token = NULL,
            session_created_at = NULL,
            updated_at = NOW()
          WHERE id = p_user_id;
          
          RETURN FOUND;
        END;
        $$;
      `
    })
    
    if (error4) {
      console.log('   ⚠️ 创建函数失败:', error4.message)
    } else {
      console.log('   ✅ clear_user_session_token 函数创建成功')
    }

    console.log('\n========================================')
    console.log('迁移完成！')
    console.log('========================================')
    console.log('\n如果上述步骤有失败，请在 Supabase Dashboard SQL Editor 中手动执行：')
    console.log('supabase/migrations/00630_add_session_token_for_single_login.sql')

  } catch (error) {
    console.error('❌ 执行失败:', error)
    process.exit(1)
  }
}

main()
