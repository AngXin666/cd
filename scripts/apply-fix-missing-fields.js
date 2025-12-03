const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.TARO_APP_SUPABASE_URL;
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(supabaseUrl, serviceKey);

const sqlPath = path.join(__dirname, '../supabase/fix-missing-fields.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// 分割SQL语句
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s !== '');

(async () => {
  console.log('🚀 开始执行 fix-missing-fields.sql\n');
  
  const statements = [
    `CREATE TABLE IF NOT EXISTS warehouse_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(warehouse_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS driver_licenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      id_card_name TEXT,
      front_photo TEXT,
      back_photo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "warehouse_assignments_select" ON warehouse_assignments`,
    `DROP POLICY IF EXISTS "driver_licenses_select_own" ON driver_licenses`,
    `CREATE POLICY "warehouse_assignments_select" ON warehouse_assignments FOR SELECT TO authenticated USING (true)`,
    `CREATE POLICY "driver_licenses_select_own" ON driver_licenses FOR SELECT TO authenticated USING (driver_id = auth.uid())`,
    `CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_user_id ON warehouse_assignments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_id ON warehouse_assignments(warehouse_id)`,
    `CREATE INDEX IF NOT EXISTS idx_driver_licenses_driver_id ON driver_licenses(driver_id)`
  ];
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] 执行: ${stmt.substring(0, 60)}...`);
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: stmt })
      });
      
      if (response.ok) {
        console.log(`   ✅ 成功`);
      } else {
        const text = await response.text();
        console.log(`   ⚠️  ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`   ⚠️  ${e.message}`);
    }
  }
  
  console.log('\n✅ 执行完成！\n');
  console.log('现在验证结果...\n');
  
  // 验证
  const { exec } = require('child_process');
  exec('node scripts/validate-new-supabase.js', (error, stdout, stderr) => {
    if (error) {
      console.error('验证失败:', error);
      return;
    }
    console.log(stdout);
  });
})();
