/*
# 添加请假申请的"已撤销"状态

## 变更内容
1. 在 application_status 枚举类型中添加 'cancelled' 状态
2. 允许司机主动撤销已批准的请假申请

## 状态说明
- pending: 待审批
- approved: 已批准
- rejected: 已拒绝
- cancelled: 已撤销（新增）

## 使用场景
司机可以主动撤销已批准的当日假期，撤销后状态更新为 'cancelled'
*/

-- ============================================
-- 添加 'cancelled' 状态到枚举类型
-- ============================================

-- 先检查是否已存在 cancelled 状态
DO $$
BEGIN
    -- 尝试添加 cancelled 状态
    BEGIN
        ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'cancelled';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'cancelled 状态已存在，跳过添加';
    END;
END $$;

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '请假申请状态枚举更新完成';
    RAISE NOTICE '1. 添加了 cancelled 状态';
    RAISE NOTICE '2. 司机可以主动撤销已批准的请假';
END $$;
