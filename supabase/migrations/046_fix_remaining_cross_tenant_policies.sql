/*
# 修复剩余的跨租户访问策略

## 问题
git config --global user.name 045）只删除了部分 "Super admins can manage all" 策略，
 SELECT 策略允许跨租户访问：

1. "Super admins can view all ..." - 允许所有 super_admin 查看所有数据
2. "Authenticated users can view ..." - 允许所有登录用户查看所有数据

git config user.name  --global

## 解决方案
git config user.name  --global

## 影响的策略

### Super admin VIEW 策略（允许所有老板查看所有数据）
- piece_work_records: "Super admins can view all piece work records"
- vehicle_records: "Super admins can view all vehicle records"
- driver_licenses: "Super admins can view all driver licenses"
- driver_warehouses: "Super admins can view all driver warehouses"
- manager_warehouses: "Super admins can view all manager warehouses"
- leave_applications: "Super admins can view all leave applications"
- resignation_applications: "Super admins can view all resignation applications"

### Super admin UPDATE/DELETE 策略
- profiles: "Super admins can update all profiles"
- profiles: "Super admins can delete profiles"

### Authenticated users 策略（允许所有用户查看所有数据）
- vehicles: "Authenticated users can view vehicles"
- attendance_rules: "Authenticated users can view attendance rules"
- category_prices: "Authenticated users can view category prices"
- warehouses: "Authenticated users can view active warehouses"
*/

-- ============================================
-- 删除 Super admin VIEW 策略
-- ============================================

-- piece_work_records
DROP POLICY IF EXISTS "Super admins can view all piece work records" ON piece_work_records;

-- vehicle_records
DROP POLICY IF EXISTS "Super admins can view all vehicle records" ON vehicle_records;

-- driver_licenses
DROP POLICY IF EXISTS "Super admins can view all driver licenses" ON driver_licenses;

-- driver_warehouses
DROP POLICY IF EXISTS "Super admins can view all driver warehouses" ON driver_warehouses;

-- manager_warehouses
DROP POLICY IF EXISTS "Super admins can view all manager warehouses" ON manager_warehouses;

-- leave_applications
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;

-- resignation_applications
DROP POLICY IF EXISTS "Super admins can view all resignation applications" ON resignation_applications;

-- ============================================
-- 删除 Super admin UPDATE/DELETE 策略
-- ============================================

-- profiles
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;

-- ============================================
-- 删除 Authenticated users 策略
-- ============================================

-- vehicles - 这个策略允许所有用户查看所有车辆！
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;

-- attendance_rules - 这个策略允许所有用户查看所有考勤规则！
DROP POLICY IF EXISTS "Authenticated users can view attendance rules" ON attendance_rules;

-- category_prices - 这个策略允许所有用户查看所有价格！
DROP POLICY IF EXISTS "Authenticated users can view category prices" ON category_prices;

-- warehouses - 这个策略允许所有用户查看所有仓库！
DROP POLICY IF EXISTS "Authenticated users can view active warehouses" ON warehouses;
