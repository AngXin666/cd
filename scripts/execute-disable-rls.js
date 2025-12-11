#!/usr/bin/env node

/**
 * 自动执行 RLS 禁用迁移脚本
 * 使用 Supabase Management API
 */

const https = require('https');
const fs = require('fs');

const PROJECT_REF = 'wxvrwkpkioalqdsfswwu';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

// 读取 SQL 文件
const sql = fs.readFileSync('supabase/migrations/99999_disable_all_rls_final.sql', 'utf8');

// 分步执行 SQL（因为包含多个 DO 块）
const steps = [
  {
    name: '禁用所有表的 RLS',
    sql: `
DO $$
DECLARE
    table_record RECORD;
    disabled_count INTEGER := 0;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        ORDER BY tablename
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        disabled_count := disabled_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ 共禁用 % 个表的 RLS', disabled_count;
END $$;
    `
  },
  {
    name: '删除所有 RLS 策略',
    sql: `
DO $$
DECLARE
    policy_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                      policy_record.policyname, 
                      policy_record.tablename);
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ 共删除 % 个策略', deleted_count;
END $$;
    `
  },
  {
    name: '更新表注释',
    sql: `
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE format('COMMENT ON TABLE %I IS %L', 
                      table_record.tablename,
                      'RLS已禁用 - 应用层权限控制 (PermissionService)');
    END LOOP;
END $$;
    `
  }
];

async function executeSQL(stepName, sqlCode) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sqlCode });
    
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`  ✅ ${stepName}`);
          resolve(data);
        } else {
          console.log(`  ❌ ${stepName} - HTTP ${res.statusCode}`);
          console.log(`  响应: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`  ❌ ${stepName} - ${err.message}`);
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('🚀 开始执行 RLS 完全禁用\n');
  
  for (const step of steps) {
    try {
      await executeSQL(step.name, step.sql);
    } catch (err) {
      // RPC 函数不存在，说明需要其他方式
      if (err.message.includes('PGRST202') || err.message.includes('404')) {
        console.log('\n⚠️  PostgREST RPC 不支持执行 DDL\n');
        console.log('📋 需要手动执行 SQL：');
        console.log('   文件位置: supabase/migrations/99999_disable_all_rls_final.sql');
        console.log('   执行位置: Supabase Dashboard > SQL Editor\n');
        process.exit(1);
      }
      throw err;
    }
  }
  
  console.log('\n🎉 RLS 完全禁用成功！');
})();
