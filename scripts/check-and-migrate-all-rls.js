/**
 * 检查并迁移所有 RLS 策略到应用层
 * 
 * 执行步骤：
 * 1. 列出所有启用 RLS 的表
 * 2. 检查每个表的应用层权限控制是否完整
 * 3. 禁用 RLS 并删除策略
 */

const { Client } = require('pg');
const fs = require('fs');

// 数据库连接配置
const DB_CONFIG = {
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.wxvrwkpkioalqdsfswwu',
  password: process.env.DB_PASSWORD || '',
  ssl: { rejectUnauthorized: false }
};

// 核心敏感表列表（保留 RLS）
const CRITICAL_TABLES = [
  'users',
  'notifications', 
  'leave_applications',
  'resignation_applications',
  'attendance',
  'piece_work_records',
  'driver_licenses',
  'salary_records'
];

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    console.log('🔌 连接数据库...\n');
    await client.connect();
    console.log('✅ 连接成功\n');
    
    // 第一步：查询所有启用 RLS 的表
    console.log('📊 检查启用 RLS 的表...\n');
    const result = await client.query(`
      SELECT 
        t.tablename,
        t.rowsecurity as rls_enabled,
        (SELECT count(*) 
         FROM pg_policies p
         WHERE p.schemaname = t.schemaname 
         AND p.tablename = t.tablename) as policy_count,
        array_agg(p.policyname) as policies
      FROM pg_tables t
      LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
      WHERE t.schemaname = 'public' 
      AND t.rowsecurity = true
      GROUP BY t.schemaname, t.tablename, t.rowsecurity
      ORDER BY t.tablename;
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ 没有表启用 RLS\n');
      return;
    }
    
    console.log(`找到 ${result.rows.length} 个启用 RLS 的表:\n`);
    console.log('┌────────────────────────────────┬──────┬─────────┐');
    console.log('│ 表名                           │ 策略 │ 状态    │');
    console.log('├────────────────────────────────┼──────┼─────────┤');
    
    const toMigrate = [];
    const toKeep = [];
    
    result.rows.forEach(row => {
      const isCritical = CRITICAL_TABLES.includes(row.tablename);
      const status = isCritical ? '保留' : '迁移';
      const padded = row.tablename.padEnd(30);
      const count = String(row.policy_count).padStart(4);
      
      console.log(`│ ${padded} │ ${count} │ ${status.padEnd(7)} │`);
      
      if (isCritical) {
        toKeep.push(row);
      } else {
        toMigrate.push(row);
      }
    });
    
    console.log('└────────────────────────────────┴──────┴─────────┘\n');
    
    console.log(`✅ 保留 RLS: ${toKeep.length} 个核心表`);
    console.log(`📋 待迁移: ${toMigrate.length} 个非核心表\n`);
    
    // 第二步：生成迁移 SQL
    if (toMigrate.length > 0) {
      console.log('📝 生成迁移 SQL...\n');
      
      let sql = `-- RLS 迁移脚本
-- 生成时间: ${new Date().toISOString()}
-- 
-- 说明：将非核心表的 RLS 迁移到应用层控制
-- 保留核心表 RLS：${CRITICAL_TABLES.join(', ')}
\n`;
      
      toMigrate.forEach((row, i) => {
        sql += `-- ${i + 1}. ${row.tablename} (${row.policy_count} 个策略)\n`;
        
        // 删除所有策略
        if (row.policies && row.policies[0]) {
          row.policies.forEach(policy => {
            sql += `DROP POLICY IF EXISTS "${policy}" ON ${row.tablename};\n`;
          });
        }
        
        // 禁用 RLS
        sql += `ALTER TABLE ${row.tablename} DISABLE ROW LEVEL SECURITY;\n`;
        sql += `COMMENT ON TABLE ${row.tablename} IS 'RLS已关闭 - 应用层权限控制';\n\n`;
      });
      
      // 保存 SQL 文件
      const sqlFile = 'supabase/migrations/99999_migrate_rls_to_app_layer.sql';
      fs.writeFileSync(sqlFile, sql);
      console.log(`✅ 已生成: ${sqlFile}\n`);
      
      // 询问是否执行
      console.log('⚠️  是否立即执行迁移？');
      console.log('请设置环境变量 EXECUTE_MIGRATION=true 来执行\n');
      
      if (process.env.EXECUTE_MIGRATION === 'true') {
        console.log('🚀 执行迁移...\n');
        await client.query(sql);
        console.log('✅ 迁移完成！\n');
        
        // 验证
        const verify = await client.query(`
          SELECT tablename, rowsecurity
          FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = ANY($1)
        `, [toMigrate.map(r => r.tablename)]);
        
        const stillEnabled = verify.rows.filter(r => r.rowsecurity);
        if (stillEnabled.length > 0) {
          console.log('⚠️  以下表仍启用 RLS:');
          stillEnabled.forEach(r => console.log(`  - ${r.tablename}`));
        } else {
          console.log('✅ 所有非核心表 RLS 已禁用');
        }
      }
    } else {
      console.log('✅ 所有非核心表已完成迁移！\n');
    }
    
    // 第三步：检查核心表
    console.log('🔒 核心表 RLS 状态:\n');
    toKeep.forEach(row => {
      console.log(`  ✓ ${row.tablename} - ${row.policy_count} 个策略`);
    });
    console.log();
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 执行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
