/*
# 添加平级管理员角色 - 步骤1：添加枚举值

## 说明
由于 PostgreSQL 的限制，新添加的枚举值必须在单独的事务中提交后才能使用。
因此我们分两步执行：
1. 步骤1：添加 peer_admin 枚举值
2. 步骤2：更新 RLS 策略和辅助函数
*/

-- 添加 peer_admin 角色到 user_role 枚举类型
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'peer_admin';
