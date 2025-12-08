// 临时脚本：插入测试价格数据
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

async function insertPrice() {
  const { data, error } = await supabase
    .from('category_prices')
    .upsert({
      warehouse_id: 'eedbf126-4fe7-4a52-942c-e3d1225a7d0c',
      category_id: '5c3c8c9c-1637-4cf0-bf3c-0faa5900b9d1',
      driver_only_price: 1.5,
      driver_with_vehicle_price: 2.0
    }, {
      onConflict: 'warehouse_id,category_id'
    })
    .select()

  if (error) {
    console.error('❌ 插入失败:', error)
  } else {
    console.log('✅ 插入成功:', data)
  }
}

insertPrice()
