/*
# 清空租户数据

## 概述
清空系统中所有现有的租户数据，为新的租户配置做准备。

## 操作内容
1. 清空 tenant_configs 表中的所有数据
2. 保留表结构和索引
3. 保留 RLS 策略和辅助函数

## 注意事项
- 此操作会删除所有租户配置数据
- 不会影响用户数据（profiles 表）
- 不会影响业务数据（warehouses, drivers 等表）
*/

-- 清空租户配置表
TRUNCATE TABLE public.tenant_configs CASCADE;

-- 记录日志
DO $$
BEGIN
  RAISE NOTICE '✅ 租户配置数据已清空';
  RAISE NOTICE '📊 tenant_configs 表已清空';
  RAISE NOTICE '🔧 表结构、索引、RLS 策略和辅助函数保持不变';
END $$;
