/*
# 修复普通管理员插入司机的 RLS 策略

## 问题
策略中使用 `is_manager(auth.uid())` 可能无法正确解析，因为策略执行时的上下文可能找不到 auth.uid() 函数。

## 解决方案
1. 删除旧的策略
2. 创建新的策略，直接在策略中检查用户角色，而不是调用 is_manager 函数
3. 添加普通管理员的 UPDATE 和 DELETE 策略
*/

-- 删除旧的策略
DROP POLICY IF EXISTS "Managers can insert driver profiles" ON profiles;

-- 创建新的 INSERT 策略：普通管理员可以插入司机记录
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    -- 检查当前用户是否是 manager
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'::user_role
    )
    -- 并且插入的记录角色必须是 driver
    AND role = 'driver'::user_role
  );

-- 创建 UPDATE 策略：普通管理员可以更新司机信息
CREATE POLICY "Managers can update driver profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    -- 只能更新司机记录
    role = 'driver'::user_role
    -- 并且当前用户是 manager
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'::user_role
    )
  )
  WITH CHECK (
    -- 更新后仍然是司机
    role = 'driver'::user_role
  );

-- 创建 DELETE 策略：普通管理员可以删除司机记录
CREATE POLICY "Managers can delete driver profiles" ON profiles
  FOR DELETE TO authenticated
  USING (
    -- 只能删除司机记录
    role = 'driver'::user_role
    -- 并且当前用户是 manager
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'::user_role
    )
  );
