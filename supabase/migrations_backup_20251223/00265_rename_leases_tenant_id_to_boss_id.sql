/*
# 重命名 leases 表的 tenant_id 字段为 boss_id

## 问题
- 数据库表使用 `tenant_id` 字段
- 代码中使用 `boss_id` 字段
- 导致查询失败（400 Bad Request）

## 解决方案
- 将 `tenant_id` 字段重命名为 `boss_id`
- 更新相关索引和注释
- 保持外键约束和 RLS 策略

## 影响
- leases 表的字段名
- 索引名称
- 列注释
*/

-- 1. 删除旧索引
DROP INDEX IF EXISTS idx_leases_tenant_id;

-- 2. 重命名列
ALTER TABLE leases RENAME COLUMN tenant_id TO boss_id;

-- 3. 创建新索引
CREATE INDEX idx_leases_boss_id ON leases(boss_id);

-- 4. 更新列注释
COMMENT ON COLUMN leases.boss_id IS '老板账号ID（主账号）';

-- 5. 更新 RLS 策略
-- 删除旧策略
DROP POLICY IF EXISTS "Tenants can view their own leases" ON leases;

-- 创建新策略（使用 boss_id）
CREATE POLICY "Tenants can view their own leases" ON leases
  FOR SELECT TO authenticated
  USING (boss_id = auth.uid());

-- 验证
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ leases 表字段重命名完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '变更内容：';
  RAISE NOTICE '  - tenant_id → boss_id';
  RAISE NOTICE '  - idx_leases_tenant_id → idx_leases_boss_id';
  RAISE NOTICE '  - RLS 策略已更新';
  RAISE NOTICE '========================================';
END $$;