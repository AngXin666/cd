/*
# 禁用所有表的RLS策略

## 背景
由于RLS策略配置导致500错误，需要临时禁用所有表的RLS以恢复系统功能。

## 问题原因
1. profiles表的RLS已被禁用
2. 其他表的RLS策略中大量使用了对profiles表的查询来检查用户角色
3. 这些策略在执行时可能会遇到权限问题，导致500错误

## 解决方案
临时禁用所有表的RLS，后续可以通过以下方式优化：
- 方案1: 统一使用SECURITY DEFINER函数
- 方案2: 重新设计RLS策略
- 方案3: 混合方案（敏感数据保持RLS，非敏感数据禁用RLS）

## 受影响的表（16个）
1. attendance_records - 考勤记录
2. attendance_rules - 考勤规则
3. category_prices - 品类价格
4. driver_licenses - 司机证件
5. driver_warehouses - 司机仓库关联
6. feedback - 反馈
7. leave_applications - 请假申请
8. manager_permissions - 管理员权限
9. manager_warehouses - 管理员仓库关联
10. notifications - 通知
11. piece_work_categories - 计件品类
12. piece_work_records - 计件记录
13. resignation_applications - 离职申请
14. vehicles - 车辆
15. warehouse_categories - 仓库品类
16. warehouses - 仓库

## 注意事项
- 这是一个临时解决方案，用于快速恢复系统功能
- 禁用RLS会降低数据安全性
- 建议在开发/测试环境中使用
- 生产环境应该使用更安全的方案（如统一使用SECURITY DEFINER函数）

## 后续优化建议
详见 ERROR_500_ANALYSIS.md 文档
*/

-- ============================================
-- 禁用所有表的RLS
-- ============================================

-- 考勤相关
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules DISABLE ROW LEVEL SECURITY;

-- 价格相关
ALTER TABLE category_prices DISABLE ROW LEVEL SECURITY;

-- 司机相关
ALTER TABLE driver_licenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_warehouses DISABLE ROW LEVEL SECURITY;

-- 反馈
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;

-- 请假相关
ALTER TABLE leave_applications DISABLE ROW LEVEL SECURITY;

-- 管理员相关
ALTER TABLE manager_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE manager_warehouses DISABLE ROW LEVEL SECURITY;

-- 通知
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 计件相关
ALTER TABLE piece_work_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE piece_work_records DISABLE ROW LEVEL SECURITY;

-- 离职申请
ALTER TABLE resignation_applications DISABLE ROW LEVEL SECURITY;

-- 车辆
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- 仓库相关
ALTER TABLE warehouse_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 验证
-- ============================================

-- 查看所有表的RLS状态（应该全部为false）
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
