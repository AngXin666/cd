# 租赁端开发总结

## 已完成功能

### 1. 数据库层
- ✅ 添加 `lease_admin` 角色到 `user_role` 枚举
- ✅ 创建 `vehicle_leases` 表
- ✅ 配置 RLS 策略，支持租赁管理员权限
- ✅ 创建租赁管理员权限检查函数 `is_lease_admin_user()`
- ✅ 创建租赁管理员初始化函数 `init_lease_admin_profile()`

### 2. 类型定义
- ✅ 更新 `UserRole` 类型，添加 `'lease_admin'`
- ✅ 添加 `VehicleLease` 接口
- ✅ 添加租赁相关 API 函数到 `src/db/api.ts`

### 3. 权限系统
- ✅ 更新 `TenantContext`，添加 `isLeaseAdmin` 属性
- ✅ 更新权限检查逻辑，支持租赁管理员
- ✅ 租赁管理员可以查看所有用户和仓库数据（只读）

### 4. 登录验证
- ✅ 限制租赁管理员账号（15766121960）只能使用验证码登录
- ✅ 密码登录时检测租赁管理员账号并拒绝

### 5. 页面开发
- ✅ 租赁端工作台（`pages/lease-admin/index.tsx`）
  - 显示租赁统计信息
  - 快速操作按钮
  - 最近租赁记录列表
- ✅ 租赁列表页面（`pages/lease-admin/lease-list/index.tsx`）
  - 搜索功能
  - 状态过滤（全部/活跃/已过期）
  - 查看、编辑、删除操作

### 6. 路由配置
- ✅ 添加租赁端路由到 `app.config.ts`
- ✅ 更新首页角色跳转逻辑

## 待完成功能

### 1. 页面开发
- ⏳ 添加租赁页面（`pages/lease-admin/add-lease/index.tsx`）
- ⏳ 编辑租赁页面（`pages/lease-admin/edit-lease/index.tsx`）
- ⏳ 租赁详情页面（`pages/lease-admin/lease-detail/index.tsx`）

### 2. 测试验证
- ⏳ 测试登录功能
- ⏳ 测试租赁 CRUD 功能
- ⏳ 测试权限控制

## 使用说明

### 创建租赁管理员账号

1. 使用手机号 `15766121960` 通过验证码登录小程序
2. 登录成功后，执行以下 SQL 初始化账号：

```sql
-- 获取用户 ID
SELECT id FROM auth.users WHERE phone = '15766121960';

-- 初始化租赁管理员 profile（替换 'user-id' 为实际的用户 ID）
SELECT init_lease_admin_profile('user-id'::uuid, '15766121960');
```

3. 验证账号创建成功：

```sql
SELECT id, phone, name, role 
FROM profiles 
WHERE phone = '15766121960';
```

### 租赁管理员权限

| 操作 | 权限 |
|------|------|
| 查看所有租赁 | ✅ |
| 创建租赁 | ✅ |
| 编辑租赁 | ✅ |
| 删除租赁 | ✅ |
| 查看车辆信息 | ✅ |
| 查看司机信息 | ✅ |
| 修改车辆信息 | ❌ |
| 修改司机信息 | ❌ |

## 技术架构

### 数据库表结构

```sql
CREATE TABLE vehicle_leases (
  id uuid PRIMARY KEY,
  vehicle_id text NOT NULL,
  driver_id uuid REFERENCES profiles(id),
  start_date date NOT NULL,
  end_date date,
  monthly_rent numeric NOT NULL,
  deposit numeric,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz,
  updated_at timestamptz
);
```

### API 函数

- `getAllVehicleLeases()` - 获取所有租赁记录
- `getVehicleLeaseById(id)` - 获取单个租赁记录
- `createVehicleLease(lease)` - 创建租赁记录
- `updateVehicleLease(id, updates)` - 更新租赁记录
- `deleteVehicleLease(id)` - 删除租赁记录
- `getVehicleLeasesByVehicleId(vehicleId)` - 获取车辆的租赁记录
- `getVehicleLeasesByDriverId(driverId)` - 获取司机的租赁记录

## 注意事项

1. 租赁管理员只能通过验证码登录，不支持密码登录
2. 手机号固定为 15766121960
3. 租赁管理员可以管理所有租赁信息，但不能修改车辆和司机的基本信息
4. 所有租赁操作都会记录创建人信息（created_by 字段）
5. 租赁记录支持软删除，删除后数据仍保留在数据库中
