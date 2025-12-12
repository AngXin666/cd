/*
# 更新司机类型枚举值

## 1. 修改内容
- 更新 driver_type_enum 枚举类型的值
- 将 'pure' 重命名为 'driver'
- 将 'with_vehicle' 重命名为 'driver_with_vehicle'

## 2. 说明
此迁移更新现有的司机类型枚举值，使其更加语义化。
*/

-- 由于 PostgreSQL 不支持直接重命名枚举值，我们需要：
-- 1. 添加新的枚举值
-- 2. 更新所有使用旧值的记录
-- 3. 删除旧的枚举值（如果可能）

-- 添加新的枚举值
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'driver' AND enumtypid = 'driver_type_enum'::regtype) THEN
    ALTER TYPE driver_type_enum ADD VALUE 'driver';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'driver_with_vehicle' AND enumtypid = 'driver_type_enum'::regtype) THEN
    ALTER TYPE driver_type_enum ADD VALUE 'driver_with_vehicle';
  END IF;
END $$;

-- 更新所有使用旧值的记录
UPDATE profiles SET driver_type = 'driver'::driver_type_enum WHERE driver_type = 'pure'::driver_type_enum;
UPDATE profiles SET driver_type = 'driver_with_vehicle'::driver_type_enum WHERE driver_type = 'with_vehicle'::driver_type_enum;

-- 注意：PostgreSQL 不支持删除正在使用的枚举值，所以我们保留旧值以保持向后兼容
-- 如果需要完全删除旧值，需要重新创建枚举类型

-- 更新注释
COMMENT ON COLUMN profiles.driver_type IS '司机类型：driver=纯司机，driver_with_vehicle=带车司机';

