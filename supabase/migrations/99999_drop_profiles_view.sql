/*
# 删除 profiles 视图

## 背景
profiles 视图是 users 和 user_roles 表的联合视图，用于向后兼容旧代码。
现在所有代码已经迁移到直接使用 users 和 user_roles 表，不再需要这个视图。

## 变更内容
1. 删除依赖于 profiles 视图的权限策略
2. 删除 profiles 视图

## 影响
- 所有代码已经迁移到使用 users 和 user_roles 表
- 删除视图不会影响现有功能
- 简化数据库结构，提升查询性能

## 迁移完成情况
- src/db/api.ts: 45 个函数已迁移 ✅
- 页面组件和服务: 13 处已迁移 ✅
- 总计: 58 处已全部迁移完成 ✅

## 清理的策略
- "Allow anonymous read for test login": 允许匿名用户读取 profiles（开发测试专用）
*/

-- 1. 删除依赖于 profiles 视图的权限策略
DROP POLICY IF EXISTS "Allow anonymous read for test login" ON profiles;

-- 2. 删除 profiles 视图（CASCADE 会自动删除其他依赖对象）
DROP VIEW IF EXISTS profiles CASCADE;
