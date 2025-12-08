const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 手动读取.env文件
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const localToday = `${year}-${month}-${day}`;
  
  console.log('=== 日期检查 ===');
  console.log('本地今天日期:', localToday);
  console.log('UTC今天日期:', new Date().toISOString().split('T')[0]);
  console.log('');
  
  // 查询仓库
  const { data: warehouses } = await supabase.from('warehouses').select('id, name');
  console.log('=== 仓库列表 ===');
  warehouses.forEach(w => console.log(`- ${w.name} (${w.id})`));
  console.log('');
  
  // 查询今天的所有打卡记录
  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, user_id, warehouse_id, work_date, clock_in_time')
    .order('work_date', { ascending: false })
    .limit(20);
  
  console.log('=== 最近20条打卡记录 ===');
  attendance.forEach(a => {
    const wh = warehouses.find(w => w.id === a.warehouse_id);
    console.log(`- ${a.work_date} | ${wh?.name || '未知仓库'} | ${a.user_id.substring(0, 8)}... | ${a.clock_in_time}`);
  });
  console.log('');
  
  // 按仓库统计今天的打卡
  console.log('=== 各仓库今日出勤统计 (work_date = ' + localToday + ') ===');
  for (const wh of warehouses) {
    const { count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('warehouse_id', wh.id)
      .eq('work_date', localToday);
    
    console.log(`${wh.name}: ${count}条打卡记录`);
  }
  console.log('');
  
  // 查询仓库分配
  console.log('=== 各仓库分配的司机数 ===');
  for (const wh of warehouses) {
    const { count } = await supabase
      .from('warehouse_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('warehouse_id', wh.id);
    console.log(`${wh.name}: ${count}个司机`);
  }
  console.log('');
  
  // 检查是否有重复打卡
  console.log('=== 检查今天是否有重复打卡 ===');
  const todayAttendance = attendance.filter(a => a.work_date === localToday);
  const userCountMap = new Map();
  todayAttendance.forEach(a => {
    const key = `${a.user_id}_${a.warehouse_id}`;
    userCountMap.set(key, (userCountMap.get(key) || 0) + 1);
  });
  
  for (const [key, count] of userCountMap.entries()) {
    if (count > 1) {
      console.log(`⚠️  发现重复: ${key} 打卡了${count}次`);
    }
  }
  if (userCountMap.size === 0) {
    console.log('今天暂无打卡记录');
  } else if ([...userCountMap.values()].every(c => c === 1)) {
    console.log('✓ 无重复打卡');
  }
}

check().catch(console.error);
