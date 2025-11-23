# 通知栏功能优化总结

## 优化内容

本次优化为通知系统添加了以下功能：

### 1. 仓库分配通知

当司机被分配到新的仓库或被取消仓库分配时，系统会自动发送通知：

#### 通知对象
- **司机本人**：收到仓库分配或取消分配的通知
- **管理员操作时**：
  - 普通管理员操作 → 通知所有超级管理员
- **超级管理员操作时**：
  - 超级管理员操作 → 通知相关仓库的普通管理员

#### 实现位置
- 文件：`src/pages/super-admin/driver-warehouse-assignment/index.tsx`
- 函数：`sendWarehouseAssignmentNotifications`
- 调用位置：`handleSave` 函数中，保存成功后

#### 通知类型
- `warehouse_assigned`：仓库分配通知
- `warehouse_unassigned`：仓库取消分配通知

### 2. 司机类型变更通知

当司机类型在"带车司机"和"纯司机"之间切换时，系统会自动发送通知：

#### 通知对象
- **司机本人**：收到类型变更通知
- **管理员操作时**：
  - 普通管理员操作 → 通知所有超级管理员
- **超级管理员操作时**：
  - 超级管理员操作 → 通知该司机所属仓库的普通管理员

#### 实现位置

**普通管理员端**：
- 文件：`src/pages/manager/driver-management/index.tsx`
- 函数：`handleToggleDriverType`
- 触发：管理员点击切换司机类型按钮

**超级管理员端**：
- 文件：`src/pages/super-admin/user-management/index.tsx`
- 函数：`handleToggleUserType`
- 触发：超级管理员点击切换司机类型按钮

#### 通知类型
- `driver_type_changed`：司机类型变更通知

## 数据库变更

### 新增通知类型

在 `notification_type` 枚举中添加了以下类型：

```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'warehouse_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'warehouse_unassigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'driver_type_changed';
```

迁移文件：`supabase/migrations/00051_add_warehouse_and_driver_type_notification_types.sql`

## API 变更

### 新增函数

**src/db/api.ts**：
- `getAllSuperAdmins()`：获取所有超级管理员列表

**src/db/notificationApi.ts**：
- `createNotification()`：创建单条通知
- `createNotifications()`：批量创建通知

### 导入的函数

各页面导入了以下辅助函数：
- `getAllSuperAdmins`：获取超级管理员
- `getAllManagers`：获取普通管理员
- `getWarehouseManagers`：获取仓库管理员
- `getDriverWarehouseIds`：获取司机所属仓库
- `getCurrentUserProfile`：获取当前用户信息

## 通知流程

### 仓库分配通知流程

```
1. 用户操作：分配/取消仓库
   ↓
2. 保存到数据库
   ↓
3. 判断变更类型（新增/取消）
   ↓
4. 通知司机
   ↓
5. 根据操作者角色：
   - 普通管理员 → 通知所有超级管理员
   - 超级管理员 → 通知相关仓库的普通管理员
   ↓
6. 批量发送通知
```

### 司机类型变更通知流程

```
1. 用户操作：切换司机类型
   ↓
2. 二次确认
   ↓
3. 更新数据库
   ↓
4. 通知司机本人
   ↓
5. 根据操作者角色：
   - 普通管理员 → 通知所有超级管理员
   - 超级管理员 → 通知该司机所属仓库的普通管理员
   ↓
6. 批量发送通知
```

## 测试建议

### 仓库分配通知测试

1. **普通管理员操作**：
   - 登录普通管理员账号
   - 为司机分配新仓库
   - 验证：司机收到通知，超级管理员收到通知

2. **超级管理员操作**：
   - 登录超级管理员账号
   - 为司机分配新仓库
   - 验证：司机收到通知，相关仓库的普通管理员收到通知

3. **取消仓库分配**：
   - 取消司机的仓库分配
   - 验证：司机收到取消通知，相关管理员收到通知

### 司机类型变更通知测试

1. **普通管理员操作**：
   - 登录普通管理员账号
   - 切换司机类型（带车司机 ↔ 纯司机）
   - 验证：司机收到通知，超级管理员收到通知

2. **超级管理员操作**：
   - 登录超级管理员账号
   - 切换司机类型
   - 验证：司机收到通知，该司机所属仓库的普通管理员收到通知

## 注意事项

1. **通知发送是异步的**：通知发送失败不会影响主要操作（仓库分配、类型变更）
2. **错误处理**：所有通知发送都包含 try-catch，失败时只记录日志
3. **批量发送**：使用 `createNotifications` 批量发送，提高效率
4. **去重处理**：使用 Set 去重，避免重复通知同一管理员

## 相关文件

### 数据库迁移
- `supabase/migrations/00051_add_warehouse_and_driver_type_notification_types.sql`

### API 文件
- `src/db/api.ts`
- `src/db/notificationApi.ts`

### 页面文件
- `src/pages/super-admin/driver-warehouse-assignment/index.tsx`
- `src/pages/manager/driver-management/index.tsx`
- `src/pages/super-admin/user-management/index.tsx`
