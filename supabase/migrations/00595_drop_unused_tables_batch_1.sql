
/*
# 删除未使用的表 - 第一批

## 删除的表（共9个）
1. leave_requests - 请假请求表（未使用，可能是leave_applications的旧版本）
2. new_attendance - 新考勤表（未使用，attendance的重复）
3. new_notifications - 新通知表（未使用，notifications的重复）
4. new_vehicles - 新车辆表（未使用，vehicles的重复）
5. piecework_records - 计件记录表（未使用，piece_work_records的重复）
6. permission_strategies - 权限策略表（未使用）
7. resource_permissions - 资源权限表（未使用）
8. role_permission_mappings - 角色权限映射表（未使用，依赖permission_strategies）
9. user_permission_assignments - 用户权限分配表（未使用，依赖permission_strategies）

## 删除原因
所有这些表在代码中的使用次数为0，删除不会影响现有功能。

## 删除顺序
先删除有依赖关系的表，再删除被依赖的表：
1. 先删除role_permission_mappings和user_permission_assignments（依赖permission_strategies）
2. 再删除permission_strategies
3. 最后删除其他独立的表

## 预期结果
- 表数量从25个减少到16个
- 减少36%的表数量
- 简化数据库结构
*/

-- 第一步：删除依赖permission_strategies的表
DROP TABLE IF EXISTS role_permission_mappings CASCADE;
DROP TABLE IF EXISTS user_permission_assignments CASCADE;

-- 第二步：删除permission_strategies
DROP TABLE IF EXISTS permission_strategies CASCADE;

-- 第三步：删除其他未使用的表
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS new_attendance CASCADE;
DROP TABLE IF EXISTS new_notifications CASCADE;
DROP TABLE IF EXISTS new_vehicles CASCADE;
DROP TABLE IF EXISTS piecework_records CASCADE;
DROP TABLE IF EXISTS resource_permissions CASCADE;
