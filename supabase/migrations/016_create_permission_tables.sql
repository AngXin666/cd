/*
# 创建权限管理相关表

## 1. 新建表

### manager_permissions 表 - 管理员权限配置
- `id` (uuid, 主键) - 权限记录ID
- `manager_id` (uuid, 外键, 唯一) - 管理员ID，关联profiles表
- `can_edit_user_info` (boolean) - 用户信息修改权
- `can_edit_piece_work` (boolean) - 用户计件数据修改权
- `can_manage_attendance_rules` (boolean) - 考勤规则管理权
- `can_manage_system` (boolean) - 系统权限设置
- `created_at` (timestamptz) - 创建时间
- `updated_at` (timestamptz) - 更新时间

### manager_warehouses 表 - 管理员管辖仓库关联
- `id` (uuid, 主键) - 关联记录ID
- `manager_id` (uuid, 外键) - 管理员ID，关联profiles表
- `warehouse_id` (uuid, 外键) - 仓库ID，关联warehouses表
- `created_at` (timestamptz) - 创建时间
- 唯一约束：(manager_id, warehouse_id)

### warehouse_categories 表 - 仓库品类关联
- `id` (uuid, 主键) - 关联记录ID
- `warehouse_id` (uuid, 外键) - 仓库ID，关联warehouses表
- `category_id` (uuid, 外键) - 品类ID，关联piece_work_categories表
- `created_at` (timestamptz) - 创建时间
- 唯一约束：(warehouse_id, category_id)

## 2. 安全策略
- 启用RLS
- 超级管理员拥有完全权限
- 管理员可以查看自己的权限配置
- 管理员可以查看自己管辖的仓库

## 3. 索引
- 为manager_id、warehouse_id、category_id创建索引
*/

-- 1. 创建管理员权限表
CREATE TABLE IF NOT EXISTS manager_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  can_edit_user_info boolean NOT NULL DEFAULT false,
  can_edit_piece_work boolean NOT NULL DEFAULT false,
  can_manage_attendance_rules boolean NOT NULL DEFAULT false,
  can_manage_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 创建管理员-仓库关联表
CREATE TABLE IF NOT EXISTS manager_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, warehouse_id)
);

-- 3. 创建仓库-品类关联表
CREATE TABLE IF NOT EXISTS warehouse_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES piece_work_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, category_id)
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_manager_permissions_manager ON manager_permissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager ON manager_warehouses(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_warehouse ON manager_warehouses(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_categories_warehouse ON warehouse_categories(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_categories_category ON warehouse_categories(category_id);

-- 5. 创建更新时间触发器
DROP TRIGGER IF EXISTS update_manager_permissions_updated_at ON manager_permissions;
CREATE TRIGGER update_manager_permissions_updated_at
    BEFORE UPDATE ON manager_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 启用RLS
ALTER TABLE manager_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_categories ENABLE ROW LEVEL SECURITY;

-- 7. 超级管理员可以查看和管理所有权限配置
CREATE POLICY "Super admins can view all manager permissions" ON manager_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert manager permissions" ON manager_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update manager permissions" ON manager_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete manager permissions" ON manager_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 8. 管理员可以查看自己的权限配置
CREATE POLICY "Managers can view own permissions" ON manager_permissions
  FOR SELECT USING (auth.uid() = manager_id);

-- 9. 超级管理员可以管理所有管理员-仓库关联
CREATE POLICY "Super admins can manage all manager warehouses" ON manager_warehouses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 10. 管理员可以查看自己管辖的仓库
CREATE POLICY "Managers can view own warehouses" ON manager_warehouses
  FOR SELECT USING (auth.uid() = manager_id);

-- 11. 超级管理员和管理员可以查看仓库品类关联
CREATE POLICY "Admins can view warehouse categories" ON warehouse_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- 12. 超级管理员可以管理所有仓库品类关联
CREATE POLICY "Super admins can manage warehouse categories" ON warehouse_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 13. 管理员可以管理自己管辖仓库的品类关联
CREATE POLICY "Managers can manage own warehouse categories" ON warehouse_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
      AND mw.warehouse_id = warehouse_categories.warehouse_id
    )
  );
