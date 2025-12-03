const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取.env配置
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.TARO_APP_SUPABASE_URL;
const supabaseKey = envVars.TARO_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  { name: 'users', columns: ['id','name','phone','email','avatar_url','role','created_at','updated_at'] },
  { name: 'warehouses', columns: ['id','name','address','contact_person','contact_phone','is_active','created_at','updated_at'] },
  { name: 'vehicles', columns: ['id','plate_number','vehicle_type','brand','model','driver_id','status','created_at','updated_at'] },
  { name: 'attendance', columns: ['id','user_id','work_date','clock_in_time','clock_out_time','warehouse_id','status','notes','created_at'] },
  { name: 'leave_applications', columns: ['id','user_id','leave_type','start_date','end_date','days','reason','status','reviewed_by','reviewed_at','review_notes','created_at','updated_at'] },
  { name: 'notifications', columns: ['id','title','content','type','sender_id','recipient_id','is_read','created_at'] },
  { name: 'piece_work_records', columns: ['id','user_id','work_date','warehouse_id','category','quantity','unit_price','total_amount','notes','created_at','updated_at'] },
  { name: 'warehouse_assignments', columns: ['id','warehouse_id','user_id','assigned_by','created_at'] },
  { name: 'driver_licenses', columns: ['id','driver_id','id_card_name','front_photo','back_photo','created_at','updated_at'] },
];

(async () => {
  console.log(`\n🔎 Supabase Schema 校验 - ${supabaseUrl}\n`);
  for (const t of tables) {
    const selectStr = t.columns.join(',');
    try {
      const { data, error } = await supabase
        .from(t.name)
        .select(selectStr)
        .limit(1);

      if (error) {
        console.log(`❌ [${t.name}] 无法按期望字段查询: ${error.message}`);
        // 逐列检测缺失列
        for (const col of t.columns) {
          const { error: colErr } = await supabase.from(t.name).select(col).limit(1);
          if (colErr) {
            console.log(`   - 缺失字段: ${col} (${colErr.message})`);
          }
        }
      } else {
        console.log(`✅ [${t.name}] 字段可用: ${selectStr}`);
      }
    } catch (e) {
      console.log(`❌ [${t.name}] 表不可访问或不存在: ${e.message}`);
    }
  }

  // 基本数据存在性统计
  console.log('\n📊 数据量检查');
  for (const t of tables) {
    try {
      const { count, error } = await supabase
        .from(t.name)
        .select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`   - ${t.name}: 无法统计 (${error.message})`);
      } else {
        console.log(`   - ${t.name}: ${count} 条记录`);
      }
    } catch (e) {
      console.log(`   - ${t.name}: 无法统计 (${e.message})`);
    }
  }

  console.log('\n✅ 校验完成\n');
})();
