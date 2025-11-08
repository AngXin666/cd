/*
# 删除撤销功能

## 1. 变更说明
完全移除撤销功能，包括数据库字段、状态和相关逻辑。

## 2. 删除内容

### 2.1 删除字段
- leave_applications.cancelled_by
- leave_applications.cancelled_at
- resignation_applications.cancelled_by
- resignation_applications.cancelled_at

### 2.2 状态处理
- 将所有 'cancelled' 状态的记录更新为 'rejected'
- 注意：不能直接删除枚举值，但可以确保不再使用

## 3. 数据迁移策略
- 已撤销的申请将被标记为"已拒绝"
- 保留原有的审批记录和时间戳
- 不影响其他状态的数据

## 4. 影响范围
- 请假申请表
- 离职申请表
- 前端撤销功能将被移除
*/

-- ============================================
-- 第一步：数据迁移 - 将 cancelled 状态改为 rejected
-- ============================================

-- 更新请假申请表中的 cancelled 状态
UPDATE leave_applications
SET status = 'rejected'::application_status
WHERE status = 'cancelled'::application_status;

-- 更新离职申请表中的 cancelled 状态
UPDATE resignation_applications
SET status = 'rejected'::application_status
WHERE status = 'cancelled'::application_status;

-- ============================================
-- 第二步：删除撤销追踪字段
-- ============================================

-- 删除请假申请表的撤销字段
ALTER TABLE leave_applications
DROP COLUMN IF EXISTS cancelled_by,
DROP COLUMN IF EXISTS cancelled_at;

-- 删除离职申请表的撤销字段
ALTER TABLE resignation_applications
DROP COLUMN IF EXISTS cancelled_by,
DROP COLUMN IF EXISTS cancelled_at;

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '撤销功能已完全移除';
    RAISE NOTICE '1. 已将所有 cancelled 状态更新为 rejected';
    RAISE NOTICE '2. 已删除 cancelled_by 和 cancelled_at 字段';
    RAISE NOTICE '3. 前端撤销功能需要同步移除';
END $$;
