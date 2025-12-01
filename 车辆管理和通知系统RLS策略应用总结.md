# 车辆管理和通知系统 RLS 策略应用总结

## 概述
本文档总结了车辆管理（vehicles）和通知系统（notifications）表的 RLS 策略应用情况。

## 一、车辆管理（vehicles 表）

### 1.1 策略概览
为 vehicles 表应用了 7 个 RLS 策略，实现了基于角色的访问控制。

### 1.2 已应用的策略

#### SELECT 策略
1. **new_admins_view_all_vehicles**
   - 管理员可以查看所有车辆
   - 条件：`is_admin(auth.uid())`

2. **new_drivers_view_assigned_vehicles**
   - 司机可以查看分配给自己的车辆
   - 条件：`driver_id = auth.uid() OR current_driver_id = auth.uid() OR user_id = auth.uid()`

#### INSERT 策略
3. **new_admins_insert_vehicles**
   - 管理员可以插入车辆
   - 条件：`is_admin(auth.uid())`

4. **new_drivers_insert_own_vehicles**
   - 司机可以创建自己的车辆
   - 条件：`user_id = auth.uid()`

#### UPDATE 策略
5. **new_admins_update_all_vehicles**
   - 管理员可以更新所有车辆
   - 条件：`is_admin(auth.uid())`

6. **new_drivers_update_own_vehicles**
   - 司机可以更新自己的车辆
   - 条件：`user_id = auth.uid()`

#### DELETE 策略
7. **new_admins_delete_vehicles**
   - 管理员可以删除车辆
   - 条件：`is_admin(auth.uid())`

### 1.3 辅助函数

#### 车辆管理函数
1. **create_vehicle** - 创建车辆
2. **assign_vehicle_to_driver** - 分配车辆给司机
3. **unassign_vehicle_from_driver** - 取消车辆分配
4. **get_user_vehicles** - 获取用户的车辆
5. **get_all_vehicles** - 管理员获取所有车辆
6. **get_vehicle_details** - 获取车辆详情
7. **update_vehicle_status** - 更新车辆状态
8. **get_vehicle_statistics** - 获取车辆统计

### 1.4 资源权限配置
```json
{
  "table_name": "vehicles",
  "owner_field": "user_id",
  "manager_field": "warehouse_id",
  "require_approval_status": false,
  "custom_rules": {
    "driver_view_rule": "driver_id = auth.uid() OR current_driver_id = auth.uid() OR user_id = auth.uid()",
    "driver_update_rule": "user_id = auth.uid()"
  }
}
```

## 二、通知系统（notifications 表）

### 2.1 策略概览
为 notifications 表应用了 8 个 RLS 策略，实现了基于角色的访问控制。

### 2.2 已应用的策略

#### SELECT 策略
1. **new_admins_view_all_notifications**
   - 管理员可以查看所有通知
   - 条件：`is_admin(auth.uid())`

2. **new_users_view_own_notifications**
   - 用户可以查看发送给自己的通知
   - 条件：`recipient_id = auth.uid()`

#### INSERT 策略
3. **new_admins_insert_notifications**
   - 管理员可以插入通知
   - 条件：`is_admin(auth.uid())`

4. **new_system_insert_notifications**
   - 系统可以插入通知（用于系统自动通知）
   - 条件：`sender_id = auth.uid()`

#### UPDATE 策略
5. **new_admins_update_all_notifications**
   - 管理员可以更新所有通知
   - 条件：`is_admin(auth.uid())`

6. **new_users_update_own_notifications**
   - 用户可以更新自己的通知（标记为已读）
   - 条件：`recipient_id = auth.uid()`

#### DELETE 策略
7. **new_admins_delete_notifications**
   - 管理员可以删除通知
   - 条件：`is_admin(auth.uid())`

8. **new_users_delete_own_notifications**
   - 用户可以删除自己的通知
   - 条件：`recipient_id = auth.uid()`

### 2.3 辅助函数

#### 通知管理函数
1. **send_notification** - 发送通知
2. **send_notification_to_multiple** - 批量发送通知
3. **mark_notification_as_read** - 标记通知为已读
4. **mark_all_notifications_as_read** - 批量标记通知为已读
5. **get_user_notifications** - 获取用户的通知
6. **get_unread_notifications_count** - 获取未读通知数量
7. **get_all_notifications** - 管理员获取所有通知
8. **delete_notification** - 删除通知
9. **get_notification_statistics** - 获取通知统计

### 2.4 资源权限配置
```json
{
  "table_name": "notifications",
  "owner_field": "recipient_id",
  "manager_field": null,
  "require_approval_status": false,
  "custom_rules": {
    "user_view_rule": "recipient_id = auth.uid()",
    "user_update_rule": "recipient_id = auth.uid()",
    "user_delete_rule": "recipient_id = auth.uid()"
  }
}
```

## 三、验证结果

### 3.1 车辆管理表验证
```sql
SELECT * FROM verify_vehicles_table_policies();
```
结果：7 个策略全部正确应用

### 3.2 通知系统表验证
```sql
SELECT * FROM verify_notifications_table_policies();
```
结果：8 个策略全部正确应用

## 四、迁移文件

### 4.1 车辆管理迁移
- 文件：`supabase/migrations/00540_apply_new_rls_policies_for_vehicles_table.sql`
- 状态：✅ 已成功应用

### 4.2 通知系统迁移
- 文件：`supabase/migrations/00541_apply_new_rls_policies_for_notifications_table.sql`
- 状态：✅ 已成功应用

## 五、权限矩阵

### 5.1 车辆管理权限

| 角色 | 查看 | 创建 | 更新 | 删除 |
|------|------|------|------|------|
| BOSS | 所有车辆 | ✅ | 所有车辆 | ✅ |
| MANAGER | 所有车辆 | ✅ | 所有车辆 | ✅ |
| DRIVER | 分配给自己的车辆 | 自己的车辆 | 自己的车辆 | ❌ |

### 5.2 通知系统权限

| 角色 | 查看 | 创建 | 更新 | 删除 |
|------|------|------|------|------|
| BOSS | 所有通知 | ✅ | 所有通知 | ✅ |
| MANAGER | 所有通知 | ✅ | 所有通知 | ✅ |
| DRIVER | 自己的通知 | 自己发送的 | 自己的通知 | 自己的通知 |

## 六、业务逻辑说明

### 6.1 车辆管理业务逻辑
1. **车辆创建**
   - 管理员可以创建任何车辆
   - 司机可以创建自己的车辆（user_id）

2. **车辆查看**
   - 管理员可以查看所有车辆
   - 司机只能查看分配给自己的车辆（driver_id、current_driver_id 或 user_id）

3. **车辆更新**
   - 管理员可以更新所有车辆
   - 司机只能更新自己的车辆（user_id）

4. **车辆删除**
   - 只有管理员可以删除车辆

5. **车辆分配**
   - 只有管理员可以分配车辆给司机
   - 只有管理员可以取消车辆分配

### 6.2 通知系统业务逻辑
1. **通知创建**
   - 管理员可以创建任何通知
   - 用户可以创建自己发送的通知（sender_id）

2. **通知查看**
   - 管理员可以查看所有通知
   - 用户只能查看发送给自己的通知（recipient_id）

3. **通知更新**
   - 管理员可以更新所有通知
   - 用户只能更新自己的通知（标记为已读）

4. **通知删除**
   - 管理员可以删除任何通知
   - 用户只能删除自己的通知

5. **批量操作**
   - 只有管理员可以批量发送通知
   - 用户可以批量标记自己的通知为已读

## 七、注意事项

### 7.1 车辆管理注意事项
1. 车辆的 `driver_id`、`current_driver_id` 和 `user_id` 字段用于不同的权限控制
2. 司机可以查看分配给自己的车辆，但只能更新自己创建的车辆
3. 车辆状态变更只能由管理员执行
4. 车辆分配和取消分配只能由管理员执行

### 7.2 通知系统注意事项
1. 通知的 `recipient_id` 字段用于权限控制
2. 用户只能查看和操作发送给自己的通知
3. 系统自动通知使用 `sender_id = auth.uid()` 策略
4. 批量发送通知只能由管理员执行

## 八、后续工作

### 8.1 前端集成
- [ ] 在前端页面中集成权限判断
- [ ] 根据用户角色显示/隐藏相应的操作按钮
- [ ] 实现车辆管理相关的前端功能
- [ ] 实现通知系统相关的前端功能

### 8.2 测试
- [ ] 编写车辆管理功能的测试用例
- [ ] 编写通知系统功能的测试用例
- [ ] 测试不同角色的权限控制
- [ ] 测试边界情况和异常处理

### 8.3 性能优化
- [ ] 监控车辆管理查询性能
- [ ] 监控通知系统查询性能
- [ ] 优化索引配置
- [ ] 优化查询语句

## 九、总结

本次为车辆管理和通知系统应用了新的 RLS 策略，共计：
- **车辆管理表**：7 个策略 + 8 个辅助函数
- **通知系统表**：8 个策略 + 9 个辅助函数

所有策略均已成功应用并通过验证，系统的权限控制更加完善和安全。

---

**文档版本**：1.0  
**最后更新**：2025-12-01  
**维护人员**：系统管理员
