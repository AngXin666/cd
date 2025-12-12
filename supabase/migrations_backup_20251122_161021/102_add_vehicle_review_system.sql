/*
# 车辆审核系统数据库迁移

## 1. 新增内容

### 枚举类型
- `review_status` - 审核状态枚举
  - `drafting` - 录入中
  - `pending_review` - 待审核
  - `need_supplement` - 需补录
  - `approved` - 审核通过

### 新增字段到 vehicles 表
- `review_status` (review_status) - 审核状态，默认为 'drafting'
- `locked_photos` (jsonb) - 已锁定的图片信息，格式：{"pickup_photos": [0, 2], "return_photos": [1]}
- `required_photos` (text[]) - 需要补录的图片字段列表
- `review_notes` (text) - 审核备注
- `reviewed_at` (timestamptz) - 审核时间
- `reviewed_by` (uuid) - 审核人ID，外键关联 profiles.id

## 2. 安全策略
- 保持现有 RLS 策略不变
- 审核操作由超级管理员执行

## 3. 注意事项
- 现有车辆的 review_status 默认设置为 'approved'（已审核通过）
- 新录入的车辆默认为 'drafting'（录入中）
*/

-- 创建审核状态枚举类型
CREATE TYPE review_status AS ENUM ('drafting', 'pending_review', 'need_supplement', 'approved');

-- 添加审核相关字段到 vehicles 表
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS review_status review_status DEFAULT 'drafting'::review_status NOT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS locked_photos jsonb DEFAULT '{}'::jsonb;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS required_photos text[] DEFAULT ARRAY[]::text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id);

-- 为现有车辆设置审核状态为"已审核通过"
UPDATE vehicles SET review_status = 'approved'::review_status WHERE review_status = 'drafting'::review_status;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_vehicles_review_status ON vehicles(review_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_reviewed_by ON vehicles(reviewed_by);

-- 添加注释
COMMENT ON COLUMN vehicles.review_status IS '审核状态：drafting-录入中, pending_review-待审核, need_supplement-需补录, approved-审核通过';
COMMENT ON COLUMN vehicles.locked_photos IS '已锁定的图片信息，JSON格式，例如：{"pickup_photos": [0, 2], "return_photos": [1]}';
COMMENT ON COLUMN vehicles.required_photos IS '需要补录的图片字段列表，例如：["pickup_photos_0", "return_photos_1"]';
COMMENT ON COLUMN vehicles.review_notes IS '管理员审核备注';
COMMENT ON COLUMN vehicles.reviewed_at IS '审核时间';
COMMENT ON COLUMN vehicles.reviewed_by IS '审核人ID，关联profiles表';
