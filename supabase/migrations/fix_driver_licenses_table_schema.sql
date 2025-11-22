/*
# 修复 driver_licenses 表结构

## 问题描述
代码中使用的字段名与数据库实际字段名不匹配，导致驾驶证信息无法保存。

## 修改内容

### 1. 重命名字段
- `front_photo_url` → `id_card_photo_front`
- `back_photo_url` → `id_card_photo_back`
- `valid_until` → `valid_to`
- `issuing_authority` → `issue_authority`
- `issue_date` → `first_issue_date`

### 2. 添加新字段
- `id_card_address` (text) - 身份证地址
- `id_card_birth_date` (date) - 出生日期
- `status` (text, default: 'active') - 状态

### 3. 数据迁移
- 保留所有现有数据
- 新字段允许为 NULL

*/

-- 重命名字段
ALTER TABLE driver_licenses RENAME COLUMN front_photo_url TO id_card_photo_front;
ALTER TABLE driver_licenses RENAME COLUMN back_photo_url TO id_card_photo_back;
ALTER TABLE driver_licenses RENAME COLUMN valid_until TO valid_to;
ALTER TABLE driver_licenses RENAME COLUMN issuing_authority TO issue_authority;
ALTER TABLE driver_licenses RENAME COLUMN issue_date TO first_issue_date;

-- 添加新字段
ALTER TABLE driver_licenses ADD COLUMN IF NOT EXISTS id_card_address text;
ALTER TABLE driver_licenses ADD COLUMN IF NOT EXISTS id_card_birth_date date;
ALTER TABLE driver_licenses ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 添加注释
COMMENT ON COLUMN driver_licenses.id_card_address IS '身份证地址';
COMMENT ON COLUMN driver_licenses.id_card_birth_date IS '出生日期';
COMMENT ON COLUMN driver_licenses.status IS '状态：active-有效, inactive-无效';
COMMENT ON COLUMN driver_licenses.id_card_photo_front IS '身份证正面照片URL';
COMMENT ON COLUMN driver_licenses.id_card_photo_back IS '身份证反面照片URL';
COMMENT ON COLUMN driver_licenses.valid_to IS '驾驶证有效期至';
COMMENT ON COLUMN driver_licenses.issue_authority IS '签发机关';
COMMENT ON COLUMN driver_licenses.first_issue_date IS '初次领证日期';
