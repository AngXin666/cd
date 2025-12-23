/*
# 为现有数据分配 boss_id

## 变更说明
为现有的所有数据分配 boss_id，实现数据迁移。

## 迁移策略
1. 为每个超级管理员生成唯一的 boss_id
2. 为超级管理员的下属用户分配相同的 boss_id
3. 为所有业务数据分配对应的 boss_id

## 影响范围
- 所有现有数据都将被分配 boss_id
- 确保数据完整性和一致性
*/

-- ============================================
-- 第一步：为超级管理员生成 boss_id
-- ============================================

-- 为每个超级管理员生成唯一的 boss_id
UPDATE profiles
SET boss_id = generate_boss_id()
WHERE role = 'super_admin'::user_role AND (boss_id IS NULL OR boss_id = '');

-- ============================================
-- 第二步：为管理员和司机分配 boss_id
-- ============================================

-- 策略：通过仓库关联找到用户所属的超级管理员

-- 为管理员分配 boss_id
-- 通过 manager_warehouses 找到管理员管理的仓库
-- 再通过仓库的创建者（假设是超级管理员）找到 boss_id
UPDATE profiles p
SET boss_id = (
  SELECT DISTINCT w_owner.boss_id
  FROM manager_warehouses mw
  JOIN warehouses w ON mw.warehouse_id = w.id
  JOIN profiles w_owner ON w_owner.role = 'super_admin'::user_role
  WHERE mw.manager_id = p.id
  LIMIT 1
)
WHERE p.role = 'manager'::user_role 
  AND (p.boss_id IS NULL OR p.boss_id = '');

-- 为司机分配 boss_id
-- 通过 driver_warehouses 找到司机所属的仓库
-- 再通过仓库找到对应的超级管理员
UPDATE profiles p
SET boss_id = (
  SELECT DISTINCT w_owner.boss_id
  FROM driver_warehouses dw
  JOIN warehouses w ON dw.warehouse_id = w.id
  JOIN profiles w_owner ON w_owner.role = 'super_admin'::user_role
  WHERE dw.driver_id = p.id
  LIMIT 1
)
WHERE p.role = 'driver'::user_role 
  AND (p.boss_id IS NULL OR p.boss_id = '');

-- 如果还有用户没有 boss_id（孤立用户），为他们生成独立的 boss_id
UPDATE profiles
SET boss_id = generate_boss_id()
WHERE boss_id IS NULL OR boss_id = '';

-- ============================================
-- 第三步：为仓库分配 boss_id
-- ============================================

-- 假设仓库属于第一个超级管理员
-- 如果有多个超级管理员，需要手动调整
UPDATE warehouses w
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.role = 'super_admin'::user_role
  LIMIT 1
)
WHERE w.boss_id IS NULL OR w.boss_id = '';

-- ============================================
-- 第四步：为关联表分配 boss_id
-- ============================================

-- driver_warehouses
UPDATE driver_warehouses dw
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = dw.driver_id
)
WHERE dw.boss_id IS NULL OR dw.boss_id = '';

-- manager_warehouses
UPDATE manager_warehouses mw
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = mw.manager_id
)
WHERE mw.boss_id IS NULL OR mw.boss_id = '';

-- ============================================
-- 第五步：为业务数据分配 boss_id
-- ============================================

-- attendance（考勤记录）
UPDATE attendance a
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = a.user_id
)
WHERE a.boss_id IS NULL OR a.boss_id = '';

-- attendance_rules（考勤规则）
UPDATE attendance_rules ar
SET boss_id = (
  SELECT w.boss_id
  FROM warehouses w
  WHERE w.id = ar.warehouse_id
)
WHERE ar.boss_id IS NULL OR ar.boss_id = '';

-- piece_work_records（计件记录）
UPDATE piece_work_records pwr
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = pwr.user_id
)
WHERE pwr.boss_id IS NULL OR pwr.boss_id = '';

-- category_prices（价格分类）
UPDATE category_prices cp
SET boss_id = (
  SELECT w.boss_id
  FROM warehouses w
  WHERE w.id = cp.warehouse_id
)
WHERE cp.boss_id IS NULL OR cp.boss_id = '';

-- leave_applications（请假申请）
UPDATE leave_applications la
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = la.user_id
)
WHERE la.boss_id IS NULL OR la.boss_id = '';

-- resignation_applications（离职申请）
UPDATE resignation_applications ra
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = ra.user_id
)
WHERE ra.boss_id IS NULL OR ra.boss_id = '';

-- vehicles（车辆）
UPDATE vehicles v
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = v.current_driver_id
)
WHERE v.boss_id IS NULL OR v.boss_id = '';

-- 如果车辆没有司机，使用第一个超级管理员的 boss_id
UPDATE vehicles v
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.role = 'super_admin'::user_role
  LIMIT 1
)
WHERE (v.boss_id IS NULL OR v.boss_id = '') AND v.current_driver_id IS NULL;

-- vehicle_records（车辆记录）
UPDATE vehicle_records vr
SET boss_id = (
  SELECT v.boss_id
  FROM vehicles v
  WHERE v.id = vr.vehicle_id
)
WHERE vr.boss_id IS NULL OR vr.boss_id = '';

-- driver_licenses（驾驶证）
UPDATE driver_licenses dl
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = dl.driver_id
)
WHERE dl.boss_id IS NULL OR dl.boss_id = '';

-- feedback（反馈）
UPDATE feedback f
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = f.user_id
)
WHERE f.boss_id IS NULL OR f.boss_id = '';

-- notifications（通知）
UPDATE notifications n
SET boss_id = (
  SELECT p.boss_id
  FROM profiles p
  WHERE p.id = n.recipient_id
)
WHERE n.boss_id IS NULL OR n.boss_id = '';

-- ============================================
-- 第六步：设置 boss_id 为 NOT NULL
-- ============================================

-- 在所有数据都有 boss_id 后，设置字段为 NOT NULL
ALTER TABLE profiles ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE driver_warehouses ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE manager_warehouses ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE attendance_rules ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE piece_work_records ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE category_prices ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE leave_applications ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE resignation_applications ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE vehicle_records ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE driver_licenses ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE feedback ALTER COLUMN boss_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN boss_id SET NOT NULL;
