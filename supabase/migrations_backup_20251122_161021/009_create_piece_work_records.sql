/*
# 创建计件记录表

## 1. 新建表
- `piece_work_records` - 计件记录表
  - `id` (uuid, 主键)
  - `user_id` (uuid, 外键 -> profiles.id)
  - `warehouse_id` (uuid, 外键 -> warehouses.id)
  - `work_date` (date) - 工作日期
  - `piece_type` (text) - 计件类型（如：装卸、搬运、分拣等）
  - `quantity` (integer) - 数量
  - `unit_price` (numeric) - 单价
  - `total_amount` (numeric) - 总金额
  - `notes` (text) - 备注
  - `created_at` (timestamptz)

## 2. 安全策略
- 超级管理员可以管理所有计件记录
- 司机可以查看自己的计件记录

## 3. 说明
- 用于记录司机的计件工作数据
- 支持按仓库、日期统计
*/

-- 创建计件记录表
CREATE TABLE IF NOT EXISTS piece_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  piece_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_id ON piece_work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse_id ON piece_work_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date ON piece_work_records(work_date);

-- 启用行级安全
ALTER TABLE piece_work_records ENABLE ROW LEVEL SECURITY;

-- 超级管理员可以管理所有计件记录
CREATE POLICY "超级管理员可以管理所有计件记录" ON piece_work_records
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

-- 司机可以查看自己的计件记录
CREATE POLICY "司机可以查看自己的计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 插入一些测试数据
INSERT INTO piece_work_records (user_id, warehouse_id, work_date, piece_type, quantity, unit_price, total_amount, notes)
SELECT 
  p.id,
  w.id,
  CURRENT_DATE - (random() * 30)::integer,
  CASE (random() * 3)::integer
    WHEN 0 THEN '装卸'
    WHEN 1 THEN '搬运'
    WHEN 2 THEN '分拣'
    ELSE '打包'
  END,
  (random() * 100 + 10)::integer,
  (random() * 5 + 1)::numeric(10, 2),
  0,
  '测试数据'
FROM profiles p
CROSS JOIN warehouses w
WHERE p.role = 'driver'::user_role
  AND w.is_active = true
LIMIT 50;

-- 更新总金额
UPDATE piece_work_records
SET total_amount = quantity * unit_price;
