/*
# 添加 MANAGER 角色枚举值 - 步骤 1

## 背景
代码中使用 MANAGER 角色，但数据库枚举中只有 DISPATCHER。
本迁移添加 MANAGER 枚举值。

## 操作
- 添加 MANAGER 枚举值到 user_role 类型

## 注意事项
- 新的枚举值必须在单独的事务中提交后才能使用
- 数据迁移将在下一个迁移文件中执行
*/

-- 添加 MANAGER 枚举值
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MANAGER';