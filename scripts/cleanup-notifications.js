/**
 * 清理数据库中的旧通知数据
 * 删除所有通知记录，以便测试新的通知逻辑
 * 
 * 使用方法：node scripts/cleanup-notifications.js
 */

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

/**
 * 查询所有通知详情
 * @returns {Promise<Array>} 通知列表
 */
async function getAllNotifications() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications?select=id,recipient_id,sender_name,type,title,content,created_at&order=created_at.desc`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`查询失败: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * 查询用户信息（用于显示用户名）
 * @param {string[]} userIds 用户ID列表
 * @returns {Promise<Map<string, string>>} 用户ID到名称的映射
 */
async function getUserNames(userIds) {
  if (userIds.length === 0) return new Map();
  
  // 去重
  const uniqueIds = [...new Set(userIds)];
  const idsParam = uniqueIds.map(id => `"${id}"`).join(',');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,name&id=in.(${idsParam})`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    return new Map();
  }

  const users = await response.json();
  const userMap = new Map();
  for (const user of users) {
    userMap.set(user.id, user.name || '未知用户');
  }
  return userMap;
}

/**
 * 查询通知数量
 * @returns {Promise<number>} 通知数量
 */
async function getNotificationCount() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications?select=id`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`查询失败: ${response.status} - ${error}`);
  }

  // 从响应头获取总数
  const count = response.headers.get('content-range');
  if (count) {
    const match = count.match(/\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data.length : 0;
}

/**
 * 删除所有通知
 * @returns {Promise<void>}
 */
async function deleteAllNotifications() {
  // 使用 neq 条件删除所有记录（Supabase REST API 需要条件）
  const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`删除失败: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * 格式化日期
 * @param {string} dateStr ISO日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '未知时间';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🔄 开始查询通知数据...\n');

  try {
    // 1. 查询所有通知详情
    const notifications = await getAllNotifications();
    console.log(`📊 当前通知数量: ${notifications.length} 条\n`);

    if (notifications.length === 0) {
      console.log('✅ 没有需要清理的通知数据\n');
      return;
    }

    // 2. 获取用户名称映射
    const recipientIds = notifications.map(n => n.recipient_id);
    const userNames = await getUserNames(recipientIds);

    // 3. 显示所有通知详情
    console.log('📋 即将删除的通知列表：');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < notifications.length; i++) {
      const n = notifications[i];
      const recipientName = userNames.get(n.recipient_id) || '未知用户';
      
      console.log(`\n[${i + 1}] ${n.title}`);
      console.log(`    类型: ${n.type}`);
      console.log(`    接收者: ${recipientName} (${n.recipient_id.substring(0, 8)}...)`);
      console.log(`    发送者: ${n.sender_name || '系统'}`);
      console.log(`    内容: ${n.content || '无'}`);
      console.log(`    时间: ${formatDate(n.created_at)}`);
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log(`\n📊 共 ${notifications.length} 条通知\n`);

    // 4. 按类型统计
    const typeCount = {};
    for (const n of notifications) {
      typeCount[n.type] = (typeCount[n.type] || 0) + 1;
    }
    console.log('📈 按类型统计：');
    for (const [type, count] of Object.entries(typeCount)) {
      console.log(`    ${type}: ${count} 条`);
    }
    console.log('');

    // 5. 删除所有通知
    console.log('🗑️  正在删除所有通知...');
    const deleted = await deleteAllNotifications();
    console.log(`✅ 已删除 ${Array.isArray(deleted) ? deleted.length : notifications.length} 条通知\n`);

    // 6. 验证删除结果
    const countAfter = await getNotificationCount();
    console.log(`📊 清理后通知数量: ${countAfter} 条\n`);

    if (countAfter === 0) {
      console.log('✅ 通知数据清理完成！\n');
      console.log('💡 现在可以测试新的通知逻辑：');
      console.log('   1. 以老板身份登录');
      console.log('   2. 给车队长分配仓库 → 司机不应收到通知');
      console.log('   3. 给司机分配仓库 → 相关车队长应收到通知');
    } else {
      console.log(`⚠️  仍有 ${countAfter} 条通知未删除，请检查\n`);
    }

  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
    process.exit(1);
  }
}

main();
