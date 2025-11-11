/*
# 添加司机类型字段

## 业务需求
区分两种司机类型：
1. **纯司机**：没有自己的车，开公司分配的车辆
2. **带车司机**：自己有车，开自己的车

两种司机都需要记录车牌号（vehicle_plate），区别在于车辆的所有权。

## 数据库变更
1. 创建 driver_type 枚举类型
   - 'pure': 纯司机
   - 'with_vehicle': 带车司机

2. 在 profiles 表中添加 driver_type 字段
   - 类型：driver_type_enum
   - 默认值：NULL（非司机用户不需要此字段）
   - 约束：只有 role = 'driver' 的用户才能有 driver_type

3. 数据迁移
   - 现有的司机用户：
     * 如果有 vehicle_plate，设为 'with_vehicle'
     * 如果没有 vehicle_plate，设为 'pure'

## 字段说明
- role: 用户角色（driver/manager/super_admin）
- driver_type: 司机类型（pure/with_vehicle），仅对 role='driver' 有效
- vehicle_plate: 车牌号，两种司机都可以有

## 示例数据
1. 纯司机：
   - role: 'driver'
   - driver_type: 'pure'
   - vehicle_plate: '京A12345'（公司分配的车）

2. 带车司机：
   - role: 'driver'
   - driver_type: 'with_vehicle'
   - vehicle_plate: '京B67890'（自己的车）

3. 管理员：
   - role: 'manager'
   - driver_type: NULL
   - vehicle_plate: NULL
*/

-- ============================================
-- 第一步：创建司机类型枚举
-- ============================================

CREATE TYPE driver_type_enum AS ENUM ('pure', 'with_vehicle');

COMMENT ON TYPE driver_type_enum IS '司机类型：pure=纯司机（开公司的车），with_vehicle=带车司机（开自己的车）';

-- ============================================
-- 第二步：添加 driver_type 字段
-- ============================================

ALTER TABLE profiles 
ADD COLUMN driver_type driver_type_enum DEFAULT NULL;

COMMENT ON COLUMN profiles.driver_type IS '司机类型：pure=纯司机，with_vehicle=带车司机。仅对 role=driver 的用户有效';

-- ============================================
-- 第三步：数据迁移
-- ============================================

-- 为现有的司机用户设置 driver_type
-- 如果有 vehicle_plate，设为 'with_vehicle'
-- 如果没有 vehicle_plate，设为 'pure'
UPDATE profiles
SET driver_type = CASE
    WHEN vehicle_plate IS NOT NULL AND vehicle_plate != '' THEN 'with_vehicle'::driver_type_enum
    ELSE 'pure'::driver_type_enum
END
WHERE role = 'driver'::user_role;

-- ============================================
-- 第四步：添加约束
-- ============================================

-- 约束：只有司机才能有 driver_type
ALTER TABLE profiles
ADD CONSTRAINT check_driver_type_only_for_drivers
CHECK (
    (role = 'driver'::user_role AND driver_type IS NOT NULL)
    OR
    (role != 'driver'::user_role AND driver_type IS NULL)
);

COMMENT ON CONSTRAINT check_driver_type_only_for_drivers ON profiles IS '确保只有司机才有 driver_type，非司机用户的 driver_type 必须为 NULL';

-- ============================================
-- 第五步：验证数据
-- ============================================

-- 查看所有司机的类型分布
-- SELECT 
--     driver_type,
--     COUNT(*) as count,
--     COUNT(CASE WHEN vehicle_plate IS NOT NULL THEN 1 END) as with_plate_count
-- FROM profiles
-- WHERE role = 'driver'::user_role
-- GROUP BY driver_type;

-- 查看所有司机的详细信息
-- SELECT 
--     id,
--     name,
--     role,
--     driver_type,
--     vehicle_plate,
--     created_at
-- FROM profiles
-- WHERE role = 'driver'::user_role
-- ORDER BY created_at DESC;
