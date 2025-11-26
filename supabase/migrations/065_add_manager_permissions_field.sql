/*
# 添加车队长权限控制字段

## 目的
添加 manager_permissions_enabled 字段来控制车队长的权限是否启用。

## 字段说明
- manager_permissions_enabled (boolean): 车队长权限是否启用
  - true: 车队长可以增删改查自己仓库的司机
  - false: 车队长只能查看自己仓库的司机，不能增删改
  - 默认值: true
*/

-- 添加字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS manager_permissions_enabled boolean DEFAULT true;

-- 添加注释
COMMENT ON COLUMN profiles.manager_permissions_enabled IS '车队长权限是否启用（true=可以增删改，false=只能查看）';

-- 为现有的车队长账号设置默认值
UPDATE profiles 
SET manager_permissions_enabled = true 
WHERE role = 'manager' 
AND manager_permissions_enabled IS NULL;
