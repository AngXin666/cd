-- 第三部分：为users表创建独立的BOSS RLS策略

-- 删除旧的"管理员"策略
DROP POLICY IF EXISTS "管理员可以查看所有用户" ON users;
DROP POLICY IF EXISTS "管理员可以插入用户" ON users;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON users;
DROP POLICY IF EXISTS "管理员可以删除所有用户" ON users;

-- 创建BOSS独立策略
CREATE POLICY "BOSS可以查看所有用户" ON users
  FOR SELECT
  USING (is_boss(auth.uid()));

CREATE POLICY "BOSS可以插入用户" ON users
  FOR INSERT
  WITH CHECK (is_boss(auth.uid()));

CREATE POLICY "BOSS可以更新所有用户" ON users
  FOR UPDATE
  USING (is_boss(auth.uid()))
  WITH CHECK (is_boss(auth.uid()));

CREATE POLICY "BOSS可以删除所有用户" ON users
  FOR DELETE
  USING (is_boss(auth.uid()));

-- 创建PEER_ADMIN策略
CREATE POLICY "PEER_ADMIN（完整控制权）可以查看所有用户" ON users
  FOR SELECT
  USING (peer_admin_has_full_control(auth.uid()));

CREATE POLICY "PEER_ADMIN（完整控制权）可以插入用户" ON users
  FOR INSERT
  WITH CHECK (peer_admin_has_full_control(auth.uid()));

CREATE POLICY "PEER_ADMIN（完整控制权）可以更新所有用户" ON users
  FOR UPDATE
  USING (peer_admin_has_full_control(auth.uid()))
  WITH CHECK (peer_admin_has_full_control(auth.uid()));

CREATE POLICY "PEER_ADMIN（完整控制权）可以删除所有用户" ON users
  FOR DELETE
  USING (peer_admin_has_full_control(auth.uid()));