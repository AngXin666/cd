/**
 * H5 版本回滚脚本
 * 将指定版本设为激活状态，其他版本设为非激活
 * 
 * 使用方法: node scripts/rollback-version.js <版本号>
 * 示例: node scripts/rollback-version.js 1.3.4
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function rollback(targetVersion) {
  console.log('========================================');
  console.log('H5 Version Rollback');
  console.log('========================================');
  console.log('');
  console.log(`Target version: ${targetVersion}`);
  console.log('');

  // 检查目标版本是否存在
  const { data: targetData, error: checkError } = await supabase
    .from('h5_versions')
    .select('*')
    .eq('version', targetVersion)
    .single();

  if (checkError || !targetData) {
    console.log(`ERROR: Version ${targetVersion} not found`);
    process.exit(1);
  }

  console.log(`Found version: ${targetVersion}`);
  console.log(`Release notes: ${targetData.release_notes}`);
  console.log('');

  // 将所有版本设为非激活
  const { error: deactivateError } = await supabase
    .from('h5_versions')
    .update({ is_active: false })
    .neq('version', targetVersion);

  if (deactivateError) {
    console.log('ERROR: Failed to deactivate other versions:', deactivateError.message);
    process.exit(1);
  }

  // 将目标版本设为激活
  const { error: activateError } = await supabase
    .from('h5_versions')
    .update({ is_active: true })
    .eq('version', targetVersion);

  if (activateError) {
    console.log('ERROR: Failed to activate target version:', activateError.message);
    process.exit(1);
  }

  console.log('SUCCESS: Rollback completed!');
  console.log(`Active version is now: ${targetVersion}`);
  console.log('');
  console.log('APP will detect the version change and prompt for update.');
}

// 获取命令行参数
const targetVersion = process.argv[2];

if (!targetVersion) {
  console.log('Usage: node scripts/rollback-version.js <version>');
  console.log('Example: node scripts/rollback-version.js 1.3.4');
  process.exit(1);
}

rollback(targetVersion).catch(console.error);
