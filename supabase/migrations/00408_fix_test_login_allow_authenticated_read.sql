/*
# 修复测试登录功能 - 允许已登录用户也能读取 profiles

## 问题
之前的策略只允许 anon 角色读取 profiles 表，导致需要在登录页面退出登录才能加载测试账号列表。
这会清除中央管理系统的登录状态，导致创建租户等操作失败。

## 解决方案
修改策略，同时允许 anon 和 authenticated 角色读取 profiles 表。

## 安全说明
⚠️ 此策略仅用于开发测试环境！
⚠️ 生产环境部署前必须删除此策略！
*/

-- 删除旧的只允许 anon 的策略
DROP POLICY IF EXISTS "Allow anonymous read for test login" ON profiles;

-- 创建新策略：同时允许 anon 和 authenticated 角色读取
CREATE POLICY "Allow read for test login" ON profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- 添加注释说明
COMMENT ON POLICY "Allow read for test login" ON profiles IS 
  '⚠️ 开发测试专用：允许匿名和已登录用户读取 profiles 表，用于登录页面的快速登录功能。生产环境必须删除！';