/*
# 允许匿名用户读取 profiles 表（仅用于开发测试）

## 目的
在登录页面的"开发测试 - 快速登录"功能中，需要加载测试账号列表。
由于用户还未登录，无法通过现有的 RLS 策略读取 profiles 表。

## 策略
创建一个允许匿名用户（anon）读取 profiles 表的策略。

## 安全说明
⚠️ 此策略仅用于开发测试环境！
⚠️ 生产环境部署前必须删除此策略！
⚠️ 建议配合登录页面的测试功能一起删除！

## 删除方法
生产环境部署前，执行以下 SQL：
```sql
DROP POLICY IF EXISTS "Allow anonymous read for test login" ON profiles;
```
*/

-- 创建允许匿名用户读取 profiles 的策略
CREATE POLICY "Allow anonymous read for test login" ON profiles
  FOR SELECT TO anon
  USING (true);

-- 添加注释说明
COMMENT ON POLICY "Allow anonymous read for test login" ON profiles IS 
  '⚠️ 开发测试专用：允许匿名用户读取 profiles 表，用于登录页面的快速登录功能。生产环境必须删除！';
