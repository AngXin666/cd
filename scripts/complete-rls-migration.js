#!/usr/bin/env node

const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wxvrwkpkioalqdsfswwu',
  password: 'hyegaokao19911206',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功\n');
    
    // 1. 检查当前 RLS 状态
    console.log('📊 检查当前 RLS 状态...\n');
    const checkResult = await client.query(`
      SELECT 
        tablename,
        rowsecurity as rls_enabled,
        (SELECT count(*) FROM pg_policies p 
         WHERE p.schemaname = 'public' AND p.tablename = t.tablename) as policy_count
      FROM pg_tables t
      WHERE schemaname = 'public' AND rowsecurity = true
      ORDER BY tablename;
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ 所有表的 RLS 已经禁用\n');
      await client.end();
      return;
    }
    
    console.log(`⚠️  发现 ${checkResult.rows.length} 个表仍启用 RLS:\n`);
    checkResult.rows.forEach(row => {
      console.log(`   - ${row.tablename} (${row.policy_count} 个策略)`);
    });
    console.log('');
    
    // 2. 禁用所有表的 RLS
    console.log('🔄 禁用所有表的 RLS...\n');
    for (const row of checkResult.rows) {
      await client.query(`ALTER TABLE ${row.tablename} DISABLE ROW LEVEL SECURITY`);
      console.log(`   ✅ ${row.tablename}`);
    }
    
    // 3. 删除所有 RLS 策略
    console.log('\n🗑️  删除所有 RLS 策略...\n');
    const policiesResult = await client.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    for (const policy of policiesResult.rows) {
      await client.query(`DROP POLICY IF EXISTS "${policy.policyname}" ON ${policy.tablename}`);
    }
    console.log(`   ✅ 删除了 ${policiesResult.rows.length} 个策略`);
    
    // 4. 验证结果
    console.log('\n📋 验证执行结果...\n');
    const verifyRLS = await client.query(`
      SELECT count(*) as count FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = true;
    `);
    const verifyPolicies = await client.query(`
      SELECT count(*) as count FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    
    console.log('================================');
    console.log(`RLS 启用的表: ${verifyRLS.rows[0].count}`);
    console.log(`剩余策略数: ${verifyPolicies.rows[0].count}`);
    console.log('================================\n');
    
    if (verifyRLS.rows[0].count === '0' && verifyPolicies.rows[0].count === '0') {
      console.log('🎉 RLS 完全禁用成功！');
      console.log('💡 所有权限控制已迁移到应用层\n');
    } else {
      console.log('⚠️  仍有残留，请检查\n');
    }
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
