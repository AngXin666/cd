/*
# 添加仓库请假与离职设置字段

## 变更说明
为warehouses表添加两个新字段，用于配置仓库级别的请假和离职规则：
1. max_leave_days - 最大请假天数上限
2. resignation_notice_days - 离职申请需提前的天数

## 字段详情
- max_leave_days (integer, default: 7)
  - 司机单次请假不能超过此天数
  - 超过此天数需要管理员手动补录
  - 默认值为7天
  
- resignation_notice_days (integer, default: 30)
  - 司机离职申请需提前此天数提交
  - 离职日期必须 >= 当前日期 + 此天数
  - 默认值为30天

## 业务规则
1. 快捷请假：司机选择天数时，最多只能选择max_leave_days天
2. 补请假：司机可以选择超过max_leave_days的天数，但会显示警告提示
3. 离职申请：期望离职日期必须 >= 当前日期 + resignation_notice_days

## 权限
只有超级管理员可以修改这些设置
*/

-- 添加字段
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS max_leave_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS resignation_notice_days INTEGER DEFAULT 30;

-- 添加字段注释
COMMENT ON COLUMN warehouses.max_leave_days IS '最大请假天数上限，司机单次请假不能超过此天数';
COMMENT ON COLUMN warehouses.resignation_notice_days IS '离职申请需提前的天数，离职日期必须大于等于当前日期加此天数';

-- 添加检查约束，确保值在合理范围内
ALTER TABLE warehouses 
ADD CONSTRAINT check_max_leave_days CHECK (max_leave_days >= 1 AND max_leave_days <= 365);

ALTER TABLE warehouses 
ADD CONSTRAINT check_resignation_notice_days CHECK (resignation_notice_days >= 1 AND resignation_notice_days <= 365);

-- 更新现有仓库的默认值
UPDATE warehouses 
SET max_leave_days = 7, resignation_notice_days = 30 
WHERE max_leave_days IS NULL OR resignation_notice_days IS NULL;
