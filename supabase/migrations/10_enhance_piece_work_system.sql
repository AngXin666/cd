/*
# 增强计件管理系统

## 1. 新建表
- `piece_work_categories` - 计件品类表
  - `id` (uuid, 主键)
  - `name` (text) - 品类名称
  - `is_active` (boolean) - 是否启用
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- `manager_warehouses` - 管理员仓库关联表
  - `id` (uuid, 主键)
  - `manager_id` (uuid, 外键 -> profiles.id)
  - `warehouse_id` (uuid, 外键 -> warehouses.id)
  - `created_at` (timestamptz)

## 2. 修改表
- `piece_work_records` - 计件记录表
  - 添加 `category_id` (uuid, 外键 -> piece_work_categories.id)
  - 添加 `need_upstairs` (boolean) - 是否需要上楼
  - 添加 `upstairs_price` (numeric) - 上楼单价
  - 移除 `piece_type` 字段

## 3. 安全策略
- 超级管理员可以管理所有数据
- 普通管理员只能查看和管理其管辖仓库的计件数据
- 司机可以查看自己的计件记录

## 4. 说明
- 品类由管理员统一设置
- 管理员只能管理被分配的仓库
- 上楼单价在需要上楼时必填
*/

-- 创建计件品类表
CREATE TABLE IF NOT EXISTS piece_work_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建管理员仓库关联表
CREATE TABLE IF NOT EXISTS manager_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, warehouse_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager_id ON manager_warehouses(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_warehouse_id ON manager_warehouses(warehouse_id);

-- 启用行级安全
ALTER TABLE piece_work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_warehouses ENABLE ROW LEVEL SECURITY;

-- 品类表安全策略：所有认证用户可以查看，超级管理员可以管理
CREATE POLICY "所有认证用户可以查看品类" ON piece_work_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "超级管理员可以管理品类" ON piece_work_categories
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

-- 管理员仓库关联表安全策略：超级管理员可以管理
CREATE POLICY "超级管理员可以管理管理员仓库关联" ON manager_warehouses
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "管理员可以查看自己的仓库关联" ON manager_warehouses
  FOR SELECT TO authenticated
  USING (auth.uid() = manager_id);

-- 修改计件记录表结构
-- 1. 添加新字段
ALTER TABLE piece_work_records 
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES piece_work_categories(id),
  ADD COLUMN IF NOT EXISTS need_upstairs boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS upstairs_price numeric(10, 2) DEFAULT 0;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_piece_work_records_category_id ON piece_work_records(category_id);

-- 3. 插入默认品类数据
INSERT INTO piece_work_categories (name, is_active) VALUES
  ('装卸', true),
  ('搬运', true),
  ('分拣', true),
  ('打包', true),
  ('配送', true)
ON CONFLICT (name) DO NOTHING;

-- 4. 迁移现有数据：将piece_type转换为category_id
DO $$
DECLARE
  rec RECORD;
  cat_id uuid;
BEGIN
  FOR rec IN SELECT DISTINCT piece_type FROM piece_work_records WHERE piece_type IS NOT NULL
  LOOP
    -- 查找或创建对应的品类
    SELECT id INTO cat_id FROM piece_work_categories WHERE name = rec.piece_type;
    
    IF cat_id IS NULL THEN
      INSERT INTO piece_work_categories (name, is_active) 
      VALUES (rec.piece_type, true) 
      RETURNING id INTO cat_id;
    END IF;
    
    -- 更新记录
    UPDATE piece_work_records 
    SET category_id = cat_id 
    WHERE piece_type = rec.piece_type AND category_id IS NULL;
  END LOOP;
END $$;

-- 5. 删除旧字段（如果存在）
ALTER TABLE piece_work_records DROP COLUMN IF EXISTS piece_type;

-- 6. 更新计件记录表的安全策略
DROP POLICY IF EXISTS "超级管理员可以管理所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "司机可以查看自己的计件记录" ON piece_work_records;

-- 创建is_manager函数检查是否为管理员
CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role IN ('manager'::user_role, 'super_admin'::user_role)
  );
$$;

-- 创建函数检查管理员是否有权限访问指定仓库
CREATE OR REPLACE FUNCTION can_access_warehouse(uid uuid, wid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'super_admin'::user_role
  ) OR EXISTS (
    SELECT 1 FROM manager_warehouses mw
    WHERE mw.manager_id = uid AND mw.warehouse_id = wid
  );
$$;

-- 超级管理员可以管理所有计件记录
CREATE POLICY "超级管理员可以管理所有计件记录" ON piece_work_records
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

-- 普通管理员可以查看和管理其管辖仓库的计件记录
CREATE POLICY "管理员可以查看管辖仓库的计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (can_access_warehouse(auth.uid(), warehouse_id));

CREATE POLICY "管理员可以插入管辖仓库的计件记录" ON piece_work_records
  FOR INSERT TO authenticated
  WITH CHECK (can_access_warehouse(auth.uid(), warehouse_id));

CREATE POLICY "管理员可以更新管辖仓库的计件记录" ON piece_work_records
  FOR UPDATE TO authenticated
  USING (can_access_warehouse(auth.uid(), warehouse_id));

CREATE POLICY "管理员可以删除管辖仓库的计件记录" ON piece_work_records
  FOR DELETE TO authenticated
  USING (can_access_warehouse(auth.uid(), warehouse_id));

-- 司机可以查看自己的计件记录
CREATE POLICY "司机可以查看自己的计件记录" ON piece_work_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 插入测试数据：为管理员分配仓库
INSERT INTO manager_warehouses (manager_id, warehouse_id)
SELECT p.id, w.id
FROM profiles p
CROSS JOIN warehouses w
WHERE p.role = 'manager'::user_role
  AND w.is_active = true
ON CONFLICT (manager_id, warehouse_id) DO NOTHING;

-- 更新现有计件记录，添加上楼信息（随机生成测试数据）
UPDATE piece_work_records
SET 
  need_upstairs = (random() > 0.7),
  upstairs_price = CASE 
    WHEN (random() > 0.7) THEN (random() * 2 + 0.5)::numeric(10, 2)
    ELSE 0
  END
WHERE need_upstairs IS NULL;

-- 重新计算总金额（包含上楼费用）
UPDATE piece_work_records
SET total_amount = (quantity * unit_price) + (CASE WHEN need_upstairs THEN (quantity * upstairs_price) ELSE 0 END);
