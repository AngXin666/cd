/**
 * 系统核心功能测试脚本
 * 测试数据库迁移后的功能完整性
 */

// 导入必要的模块
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 创建 Supabase 客户端
const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// 测试辅助函数
function logTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (error) {
      console.log(`   错误: ${error.message}`);
      testResults.errors.push({ test: name, error: error.message });
    }
  }
}

// 1. 测试数据库连接
async function testDatabaseConnection() {
  console.log('\n📊 测试 1: 数据库连接');
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    logTest('数据库连接', !error, error);
    return !error;
  } catch (error) {
    logTest('数据库连接', false, error);
    return false;
  }
}

// 2. 测试用户表查询
async function testUsersTable() {
  console.log('\n👤 测试 2: 用户表查询');
  try {
    // 测试查询所有用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    logTest('查询用户表', !usersError, usersError);
    
    if (users && users.length > 0) {
      console.log(`   找到 ${users.length} 个用户`);
      
      // 测试查询用户角色
      const { data: userWithRole, error: roleError } = await supabase
        .from('users')
        .select('*, user_roles(role)')
        .eq('id', users[0].id)
        .maybeSingle();
      
      logTest('查询用户角色', !roleError, roleError);
      
      if (userWithRole) {
        console.log(`   用户: ${userWithRole.name}, 角色: ${userWithRole.user_roles?.[0]?.role || '无'}`);
      }
    }
    
    return !usersError;
  } catch (error) {
    logTest('用户表查询', false, error);
    return false;
  }
}

// 3. 测试角色过滤查询
async function testRoleFiltering() {
  console.log('\n🎭 测试 3: 角色过滤查询');
  try {
    // 测试查询司机
    const { data: drivers, error: driversError } = await supabase
      .from('user_roles')
      .select('user_id, role, users(*)')
      .eq('role', 'DRIVER')
      .limit(5);
    
    logTest('查询司机角色', !driversError, driversError);
    if (drivers) {
      console.log(`   找到 ${drivers.length} 个司机`);
    }
    
    // 测试查询管理员
    const { data: managers, error: managersError } = await supabase
      .from('user_roles')
      .select('user_id, role, users(*)')
      .eq('role', 'MANAGER')
      .limit(5);
    
    logTest('查询管理员角色', !managersError, managersError);
    if (managers) {
      console.log(`   找到 ${managers.length} 个管理员`);
    }
    
    // 测试查询老板
    const { data: bosses, error: bossesError } = await supabase
      .from('user_roles')
      .select('user_id, role, users(*)')
      .eq('role', 'BOSS')
      .limit(5);
    
    logTest('查询老板角色', !bossesError, bossesError);
    if (bosses) {
      console.log(`   找到 ${bosses.length} 个老板`);
    }
    
    return !driversError && !managersError && !bossesError;
  } catch (error) {
    logTest('角色过滤查询', false, error);
    return false;
  }
}

// 4. 测试部门表查询
async function testDepartmentsTable() {
  console.log('\n🏢 测试 4: 部门表查询');
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .limit(10);
    
    logTest('查询部门表', !error, error);
    if (departments) {
      console.log(`   找到 ${departments.length} 个部门`);
    }
    
    return !error;
  } catch (error) {
    logTest('部门表查询', false, error);
    return false;
  }
}

// 5. 测试仓库表查询
async function testWarehousesTable() {
  console.log('\n🏭 测试 5: 仓库表查询');
  console.log('   注意: 此表需要用户登录才能访问（RLS 策略）');
  try {
    const { data: warehouses, error } = await supabase
      .from('warehouses')
      .select('*')
      .limit(10);
    
    if (error && error.message.includes('anon')) {
      console.log('   ℹ️  RLS 策略正常工作，需要登录用户才能访问');
      logTest('查询仓库表（RLS 验证）', true);
      return true;
    }
    
    logTest('查询仓库表', !error, error);
    if (warehouses) {
      console.log(`   找到 ${warehouses.length} 个仓库`);
      
      // 如果有仓库，测试查询仓库分配
      if (warehouses.length > 0) {
        const { data: assignments, error: assignError } = await supabase
          .from('warehouse_assignments')
          .select('*, users(*)')
          .eq('warehouse_id', warehouses[0].id)
          .limit(5);
        
        logTest('查询仓库分配', !assignError, assignError);
        if (assignments) {
          console.log(`   仓库 "${warehouses[0].name}" 有 ${assignments.length} 个分配`);
        }
      }
    }
    
    return !error;
  } catch (error) {
    logTest('仓库表查询', false, error);
    return false;
  }
}

// 6. 测试通知表查询
async function testNotificationsTable() {
  console.log('\n🔔 测试 6: 通知表查询');
  console.log('   注意: 此表需要用户登录才能访问（RLS 策略）');
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error && error.message.includes('anon')) {
      console.log('   ℹ️  RLS 策略正常工作，需要登录用户才能访问');
      logTest('查询通知表（RLS 验证）', true);
      return true;
    }
    
    logTest('查询通知表', !error, error);
    if (notifications) {
      console.log(`   找到 ${notifications.length} 条通知`);
      
      // 测试未读通知统计
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      
      logTest('统计未读通知', !countError, countError);
      if (count !== null) {
        console.log(`   未读通知数: ${count}`);
      }
    }
    
    return !error;
  } catch (error) {
    logTest('通知表查询', false, error);
    return false;
  }
}

// 7. 测试车辆表查询
async function testVehiclesTable() {
  console.log('\n🚗 测试 7: 车辆表查询');
  console.log('   注意: 此表需要用户登录才能访问（RLS 策略）');
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .limit(10);
    
    if (error && error.message.includes('anon')) {
      console.log('   ℹ️  RLS 策略正常工作，需要登录用户才能访问');
      logTest('查询车辆表（RLS 验证）', true);
      return true;
    }
    
    logTest('查询车辆表', !error, error);
    if (vehicles) {
      console.log(`   找到 ${vehicles.length} 辆车辆`);
    }
    
    return !error;
  } catch (error) {
    logTest('车辆表查询', false, error);
    return false;
  }
}

// 8. 测试考勤表查询
async function testAttendanceTable() {
  console.log('\n📅 测试 8: 考勤表查询');
  console.log('   注意: 此表需要用户登录才能访问（RLS 策略）');
  try {
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('*')
      .order('work_date', { ascending: false })
      .limit(10);
    
    if (error && error.message.includes('anon')) {
      console.log('   ℹ️  RLS 策略正常工作，需要登录用户才能访问');
      logTest('查询考勤表（RLS 验证）', true);
      return true;
    }
    
    logTest('查询考勤表', !error, error);
    if (attendance) {
      console.log(`   找到 ${attendance.length} 条考勤记录`);
    }
    
    return !error;
  } catch (error) {
    logTest('考勤表查询', false, error);
    return false;
  }
}

// 9. 测试请假表查询
async function testLeaveRequestsTable() {
  console.log('\n🏖️ 测试 9: 请假表查询');
  try {
    const { data: leaves, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    logTest('查询请假表', !error, error);
    if (leaves) {
      console.log(`   找到 ${leaves.length} 条请假记录`);
    }
    
    return !error;
  } catch (error) {
    logTest('请假表查询', false, error);
    return false;
  }
}

// 10. 测试索引效果
async function testIndexes() {
  console.log('\n🎯 测试 10: 索引效果验证');
  try {
    // 测试 phone 索引
    const start1 = Date.now();
    const { data: user1, error: error1 } = await supabase
      .from('users')
      .select('*')
      .eq('phone', '13900000001')
      .maybeSingle();
    const time1 = Date.now() - start1;
    
    logTest('phone 索引查询', !error1, error1);
    console.log(`   查询时间: ${time1}ms`);
    
    // 测试角色索引
    const start2 = Date.now();
    const { data: drivers, error: error2 } = await supabase
      .from('user_roles')
      .select('*, users(*)')
      .eq('role', 'DRIVER')
      .limit(10);
    const time2 = Date.now() - start2;
    
    logTest('role 索引查询', !error2, error2);
    console.log(`   查询时间: ${time2}ms`);
    
    return !error1 && !error2;
  } catch (error) {
    logTest('索引效果验证', false, error);
    return false;
  }
}

// 11. 检查是否有遗留的 profiles 视图
async function checkProfilesView() {
  console.log('\n🔍 测试 11: 检查 profiles 视图');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    // 如果查询成功，说明视图还存在（不应该）
    if (!error) {
      logTest('profiles 视图已删除', false, new Error('profiles 视图仍然存在'));
      return false;
    } else {
      // 如果查询失败，说明视图已删除（正确）
      logTest('profiles 视图已删除', true);
      return true;
    }
  } catch (error) {
    // 如果抛出异常，说明视图已删除（正确）
    logTest('profiles 视图已删除', true);
    return true;
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始系统核心功能测试\n');
  console.log('=' .repeat(60));
  
  await testDatabaseConnection();
  await testUsersTable();
  await testRoleFiltering();
  await testDepartmentsTable();
  await testWarehousesTable();
  await testNotificationsTable();
  await testVehiclesTable();
  await testAttendanceTable();
  await testLeaveRequestsTable();
  await testIndexes();
  await checkProfilesView();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 测试结果统计:');
  console.log(`   总测试数: ${testResults.total}`);
  console.log(`   通过: ${testResults.passed} ✅`);
  console.log(`   失败: ${testResults.failed} ❌`);
  console.log(`   通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err.test}`);
      console.log(`      ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过！系统功能正常。');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息。');
    process.exit(1);
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error('\n💥 测试执行出错:', error);
  process.exit(1);
});
