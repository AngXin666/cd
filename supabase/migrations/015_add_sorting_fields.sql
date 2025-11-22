/*
# 添加分拣功能字段

## 1. 修改表
- `piece_work_records` - 计件记录表
  - 添加 `need_sorting` (boolean) - 是否需要分拣
  - 添加 `sorting_quantity` (integer) - 分拣件数
  - 添加 `sorting_unit_price` (numeric) - 分拣单价

## 2. 说明
- 分拣功能默认关闭
- 开启分拣时，分拣件数和分拣单价为必填项
- 总金额 = (件数 × 单价) + (上楼件数 × 上楼单价) + (分拣件数 × 分拣单价)
*/

-- 添加分拣相关字段
ALTER TABLE piece_work_records 
  ADD COLUMN IF NOT EXISTS need_sorting boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sorting_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sorting_unit_price numeric(10, 2) DEFAULT 0;

-- 更新现有记录的总金额计算（包含分拣费用）
UPDATE piece_work_records
SET total_amount = 
  (quantity * unit_price) + 
  (CASE WHEN need_upstairs THEN (quantity * upstairs_price) ELSE 0 END) +
  (CASE WHEN need_sorting THEN (sorting_quantity * sorting_unit_price) ELSE 0 END);
