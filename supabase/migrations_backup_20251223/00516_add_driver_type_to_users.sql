/*
# 添加司机类型字段到 users 表

## 问题
- 代码尝试查询 users.driver_type 字段，但该字段不存在
- 导致获取司机信息失败

## 修复
1. 创建 driver_type 枚举类型
2. 在 users 表中添加 driver_type 字段
3. 设置默认值为 NULL（非司机用户）

## 字段说明
- driver_type: 司机类型
  - pure: 纯司机（只开车，不带车）
  - with_vehicle: 带车司机（自带车辆）
  - NULL: 非司机用户（车队长、老板等）
*/

-- 创建司机类型枚举（如果不存在）
DO $$ BEGIN
    CREATE TYPE driver_type AS ENUM ('pure', 'with_vehicle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 添加 driver_type 字段到 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS driver_type driver_type DEFAULT NULL;