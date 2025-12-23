-- 第三部分：修改users表的MANAGER RLS策略

-- 3.1 删除旧的MANAGER固定策略（如果存在）
DROP POLICY IF EXISTS "MANAGER可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以插入用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以更新所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以删除用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER（仅查看权）可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以插入用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以更新所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER（完整控制权）可以删除用户" ON users;

-- 3.2 创建新的MANAGER策略（基于策略模板）

-- MANAGER（有完整控制权）可以查看所有用户
CREATE POLICY "MANAGER（完整控制权）可以查看所有用户" ON users
  FOR SELECT
  USING (manager_has_full_control(auth.uid()));

-- MANAGER（仅查看权）可以查看所有用户
CREATE POLICY "MANAGER（仅查看权）可以查看所有用户" ON users
  FOR SELECT
  USING (manager_is_view_only(auth.uid()));

-- MANAGER（有完整控制权）可以插入用户
CREATE POLICY "MANAGER（完整控制权）可以插入用户" ON users
  FOR INSERT
  WITH CHECK (manager_has_full_control(auth.uid()));

-- MANAGER（有完整控制权）可以更新所有用户
CREATE POLICY "MANAGER（完整控制权）可以更新所有用户" ON users
  FOR UPDATE
  USING (manager_has_full_control(auth.uid()))
  WITH CHECK (manager_has_full_control(auth.uid()));

-- MANAGER（有完整控制权）可以删除用户
CREATE POLICY "MANAGER（完整控制权）可以删除用户" ON users
  FOR DELETE
  USING (manager_has_full_control(auth.uid()));