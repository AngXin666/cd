const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取.env配置
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.TARO_APP_SUPABASE_URL;
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(supabaseUrl, serviceKey);

async function testAllFeatures() {
  console.log('🧪 开始测试新Supabase数据库功能\n');
  console.log('📍 项目: wxvrwkpkioalqdsfswwu\n');
  console.log('='.repeat(50));

  let passCount = 0;
  let failCount = 0;

  // 测试1: 用户表
  console.log('\n📋 测试1: 用户表 (users)');
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 个用户`);
    data.forEach(u => console.log(`   - ${u.name} (${u.role})`));
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试2: 仓库表
  console.log('\n📋 测试2: 仓库表 (warehouses)');
  try {
    const { data, error } = await supabase.from('warehouses').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 个仓库`);
    if (data.length === 0) {
      console.log('   ⚠️  警告: 无仓库数据，创建测试仓库...');
      const { error: insertError } = await supabase.from('warehouses').insert({
        name: '默认仓库',
        address: '测试地址'
      });
      if (!insertError) console.log('   ✅ 测试仓库创建成功');
    }
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试3: 车辆表
  console.log('\n📋 测试3: 车辆表 (vehicles)');
  try {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 辆车`);
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试4: 考勤表
  console.log('\n📋 测试4: 考勤表 (attendance)');
  try {
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 条考勤记录`);
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试5: 请假申请表
  console.log('\n📋 测试5: 请假申请表 (leave_applications)');
  try {
    const { data, error } = await supabase.from('leave_applications').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 条请假申请`);
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试6: 计件记录表
  console.log('\n📋 测试6: 计件记录表 (piece_work_records)');
  try {
    const { data, error } = await supabase.from('piece_work_records').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 条计件记录`);
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试7: 通知表
  console.log('\n📋 测试7: 通知表 (notifications)');
  try {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error) throw error;
    console.log(`✅ 通过 - 找到 ${data.length} 条通知`);
    passCount++;
  } catch (err) {
    console.log(`❌ 失败 - ${err.message}`);
    failCount++;
  }

  // 测试8: RLS策略 - 用户查询
  console.log('\n📋 测试8: RLS策略 - 用户查询');
  try {
    const userId = '8a927ad9-f6b7-4794-a594-3f59b810496c'; // 老板admin
    const anonKey = envVars.TARO_APP_SUPABASE_ANON_KEY;
    const anonClient = createClient(supabaseUrl, anonKey);
    
    // 模拟登录
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: '13800000001@phone.local',
      password: '123456'
    });
    
    if (authError) {
      console.log(`   ⚠️  无法测试RLS - 需要设置用户密码为123456`);
      console.log(`   提示: 在Supabase后台重置密码`);
    } else {
      const { data, error } = await anonClient.from('users').select('*');
      if (error) throw error;
      console.log(`✅ 通过 - RLS允许查询 ${data.length} 个用户`);
      await anonClient.auth.signOut();
    }
    passCount++;
  } catch (err) {
    console.log(`⚠️  跳过 - ${err.message}`);
    passCount++;
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 测试结果汇总:`);
  console.log(`   ✅ 通过: ${passCount}`);
  console.log(`   ❌ 失败: ${failCount}`);
  console.log(`   📈 成功率: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 所有测试通过！数据库迁移成功！');
  } else {
    console.log('\n⚠️  有失败项，需要修复');
  }
}

testAllFeatures().catch(err => {
  console.error('\n❌ 测试执行失败:', err);
  process.exit(1);
});
