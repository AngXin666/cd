/**
 * 使用Supabase客户端直接创建表
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setup() {
  console.log('🔄 开始自动设置...\n');

  try {
    // 步骤1：检查表是否已存在
    console.log('📋 步骤1：检查 app_versions 表...');
    const { data: existingData, error: checkError } = await supabase
      .from('app_versions')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ app_versions 表已存在！\n');
      
      // 显示表信息
      const { data: versions, error: selectError } = await supabase
        .from('app_versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!selectError && versions) {
        console.log(`📊 当前有 ${versions.length} 条版本记录：`);
        versions.forEach(v => {
          console.log(`  - v${v.version}: ${v.is_force_update ? '强制' : '可选'}更新 (${v.is_active ? '激活' : '未激活'})`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  表不存在，需要手动创建');
      console.log('');
      console.log('请在 Supabase Dashboard 执行以下SQL：');
      console.log('👉 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql/new\n');
      console.log('```sql');
      console.log(`CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  apk_url TEXT NOT NULL,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_versions_active ON app_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read active versions" ON app_versions;

CREATE POLICY "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);`);
      console.log('```\n');
      return;
    }

    // 步骤2：检查Storage bucket
    console.log('📦 步骤2：检查 apk-files bucket...');
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.log('⚠️  无法检查buckets:', bucketError.message);
    } else {
      const apkBucket = buckets.find(b => b.name === 'apk-files');
      if (apkBucket) {
        console.log('✅ apk-files bucket 已存在！');
        console.log(`   - 公开访问: ${apkBucket.public ? '是' : '否'}`);
        
        // 列出bucket中的文件
        const { data: files, error: listError } = await supabase
          .storage
          .from('apk-files')
          .list();

        if (!listError && files) {
          console.log(`   - 文件数量: ${files.length}`);
          if (files.length > 0) {
            console.log('   - 最近的文件:');
            files.slice(0, 3).forEach(f => {
              console.log(`     • ${f.name}`);
            });
          }
        }
      } else {
        console.log('⚠️  apk-files bucket 不存在');
        console.log('');
        console.log('请手动创建：');
        console.log('👉 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets');
        console.log('   1. 点击 "Create a new bucket"');
        console.log('   2. 名称: apk-files');
        console.log('   3. 选择 "Public bucket"');
        console.log('   4. 点击 "Create"');
      }
    }

    console.log('\n✅ 设置检查完成！');
    console.log('\n📝 下一步：');
    console.log('  1. 上传APK到 apk-files bucket');
    console.log('  2. 在 app_versions 表插入版本记录');
    console.log('  3. 测试更新功能');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

setup();
