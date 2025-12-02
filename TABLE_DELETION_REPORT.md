# 数据库表删除报告

## 删除日期
2025-11-05

## 删除的表

### 1. departments（部门表）
- **删除原因：** 代码中未使用
- **影响范围：** 无
- **数据丢失：** 所有部门数据已永久删除

### 2. user_departments（用户部门关联表）
- **删除原因：** 代码中未使用，且依赖于已删除的departments表
- **影响范围：** 无
- **数据丢失：** 所有用户部门关联数据已永久删除

## 删除前检查

### 代码使用情况
```bash
# 检查departments的使用
grep -r "departments" src/ --include="*.ts" --include="*.tsx"
结果：0个匹配

# 检查user_departments的使用
grep -r "user_departments" src/ --include="*.ts" --include="*.tsx"
结果：0个匹配
```

### 数据库依赖关系
- user_departments表有外键引用departments表
- 无其他表依赖这两个表

## 删除方法
使用CASCADE删除，自动处理所有依赖关系：
```sql
DROP TABLE IF EXISTS user_departments CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
```

## 删除结果

### 表数量变化
- **删除前：** 27个表
- **删除后：** 25个表
- **减少：** 2个表

### 当前数据库表列表（25个）
1. attendance - 考勤表
2. attendance_rules - 考勤规则表
3. category_prices - 分类价格表
4. driver_licenses - 驾驶证表
5. leave_applications - 请假申请表
6. leave_requests - 请假请求表
7. new_attendance - 新考勤表
8. new_notifications - 新通知表
9. new_vehicles - 新车辆表
10. notifications - 通知表
11. permission_strategies - 权限策略表
12. permissions - 权限表
13. piece_work_records - 计件工作记录表
14. piecework_records - 计件记录表
15. resignation_applications - 离职申请表
16. resource_permissions - 资源权限表
17. role_permission_mappings - 角色权限映射表
18. role_permissions - 角色权限表
19. roles - 角色表
20. user_permission_assignments - 用户权限分配表
21. user_roles - 用户角色表
22. users - 用户表
23. vehicles - 车辆表
24. warehouse_assignments - 仓库分配表
25. warehouses - 仓库表

## 迁移文件
- **文件名：** `supabase/migrations/*_drop_departments_tables.sql`
- **状态：** 已成功应用

## 验证结果
✅ 表已成功删除
✅ 无代码影响
✅ 无外键约束冲突
✅ 数据库状态正常

## 注意事项
⚠️ 此操作不可逆，所有部门相关数据已永久删除
⚠️ 如果将来需要部门功能，需要重新创建表和数据

## 后续建议
1. 继续清理其他未使用的表
2. 检查是否有重复功能的表（如attendance和new_attendance）
3. 优化数据库结构，减少冗余
