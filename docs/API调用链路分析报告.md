# API 调用链路分析报告

## 概述

本报告详细分析了项目中所有 Supabase API 调用链路，包括数据库表操作、认证、存储和 RPC 函数调用。

## 1. 数据库架构

### 1.1 核心数据表

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `users` | 用户信息 | id, name, phone, email, role, driver_type |
| `warehouses` | 仓库信息 | id, name, address, is_active |
| `warehouse_assignments` | 仓库分配 | user_id, warehouse_id |
| `vehicles` | 车辆核心信息 | id, plate_number, user_id, status, review_status |
| `vehicle_documents` | 车辆扩展信息 | vehicle_id, 照片字段, 租赁信息 |
| `driver_licenses` | 驾驶员证件 | driver_id, 身份证/驾照信息 |
| `attendance` | 考勤记录 | user_id, work_date, status |
| `attendance_rules` | 考勤规则 | warehouse_id, work_start_time, work_end_time |
| `piece_work_records` | 计件记录 | user_id, warehouse_id, category_id, quantity |
| `piece_work_categories` | 计件品类 | id, name, description |
| `category_prices` | 品类价格 | warehouse_id, category_id, driver_only_price |
| `leave_applications` | 请假申请 | user_id, warehouse_id, status |
| `resignation_applications` | 离职申请 | user_id, warehouse_id, status |
| `notifications` | 通知消息 | recipient_id, sender_id, type, content |

---

## 2. API 模块调用链路


### 2.1 用户模块 (`src/db/api/users.ts`)

#### 认证相关
```
supabase.auth.getUser()           → 获取当前登录用户
supabase.auth.updateUser()        → 更新用户密码
```

#### 用户查询
```
supabase.from('users').select()   → 查询用户信息
  .eq('id', userId)               → 按ID查询
  .eq('role', 'DRIVER')           → 按角色查询
  .maybeSingle()                  → 返回单条记录
```

#### 用户管理
```
supabase.from('users').insert()   → 创建用户
supabase.from('users').update()   → 更新用户
supabase.from('users').delete()   → 删除用户
```

#### RPC 函数调用
```
supabase.rpc('create_driver_in_tenant')           → 创建司机
supabase.rpc('create_user_auth_account_first')    → 创建认证账号
supabase.rpc('reset_user_password_by_admin')      → 重置密码
supabase.rpc('update_user_email')                 → 更新邮箱
```

#### 仓库分配查询
```
supabase.from('warehouse_assignments').select('warehouse_id')
  .eq('user_id', managerId)       → 获取管理员的仓库
```

---

### 2.2 考勤模块 (`src/db/api/attendance.ts`)

#### 打卡记录
```
supabase.from('attendance').insert()    → 创建打卡记录
supabase.from('attendance').update()    → 更新打卡记录
supabase.from('attendance').select()    → 查询打卡记录
  .eq('user_id', userId)
  .eq('work_date', today)
  .gte('work_date', startDate)
  .lte('work_date', endDate)
```

#### 考勤规则
```
supabase.from('attendance_rules').select()   → 查询考勤规则
  .eq('warehouse_id', warehouseId)
  .eq('is_active', true)
supabase.from('attendance_rules').insert()   → 创建考勤规则
supabase.from('attendance_rules').update()   → 更新考勤规则
supabase.from('attendance_rules').delete()   → 删除考勤规则
```

---

### 2.3 仪表盘模块 (`src/db/api/dashboard.ts`)

#### 统计查询
```
supabase.from('leave_applications').select()
  .eq('user_id', userId)
  .eq('status', 'approved')
  .lte('start_date', today)
  .gte('end_date', today)         → 获取今日已批准请假

supabase.from('piece_work_records').select('id', {count: 'exact', head: true})
  .eq('warehouse_id', warehouseId)
  .eq('work_date', today)         → 统计今日计件数量

supabase.from('attendance').select('id', {count: 'exact', head: true})
  .eq('warehouse_id', warehouseId)
  .eq('work_date', today)         → 统计今日考勤数量
```

---

### 2.4 请假/离职模块 (`src/db/api/leave.ts`)

#### 请假申请
```
supabase.from('leave_applications').insert()   → 创建请假申请
supabase.from('leave_applications').update()   → 审批请假申请
supabase.from('leave_applications').select()   → 查询请假申请
  .eq('user_id', userId)
  .eq('warehouse_id', warehouseId)
  .eq('status', 'pending')
  .in('status', ['approved', 'pending'])
```

#### 离职申请
```
supabase.from('resignation_applications').insert()   → 创建离职申请
supabase.from('resignation_applications').update()   → 审批离职申请
supabase.from('resignation_applications').select()   → 查询离职申请
```

---

### 2.5 通知模块 (`src/db/api/notifications.ts`)

#### 通知管理
```
supabase.from('notifications').insert()    → 创建通知
supabase.from('notifications').select()    → 查询通知
  .eq('recipient_id', userId)
  .eq('is_read', false)
  .order('created_at', {ascending: false})
supabase.from('notifications').update()    → 标记已读
  .eq('id', notificationId)
supabase.from('notifications').delete()    → 删除通知
```

#### 批量通知
```
supabase.from('users').select('id')
  .in('role', ['MANAGER', 'BOSS', 'DISPATCHER'])   → 获取管理员列表
supabase.from('notifications').insert(notificationsData)   → 批量创建通知
```

---

### 2.6 计件模块 (`src/db/api/piecework.ts`)

#### 计件记录
```
supabase.from('piece_work_records').insert()   → 创建计件记录
supabase.from('piece_work_records').update()   → 更新计件记录
supabase.from('piece_work_records').delete()   → 删除计件记录
supabase.from('piece_work_records').select()   → 查询计件记录
  .eq('user_id', userId)
  .eq('warehouse_id', warehouseId)
```

#### 品类管理
```
supabase.from('piece_work_categories').select()   → 查询品类
  .eq('is_active', true)
supabase.from('piece_work_categories').insert()   → 创建品类
supabase.from('piece_work_categories').update()   → 更新品类
supabase.from('piece_work_categories').delete()   → 删除品类
```

#### 品类价格
```
supabase.from('category_prices').select()   → 查询品类价格
  .eq('warehouse_id', warehouseId)
  .eq('category_id', categoryId)
supabase.from('category_prices').insert()   → 创建品类价格
supabase.from('category_prices').update()   → 更新品类价格
supabase.from('category_prices').delete()   → 删除品类价格
```


---

### 2.7 车辆模块 (`src/db/api/vehicles.ts`)

#### 车辆查询
```
supabase.from('vehicles').select(`*, document:vehicle_documents(*)`)
  .or(`driver_id.eq.${driverId},user_id.eq.${driverId}`)   → 获取司机车辆
  .eq('id', vehicleId)                                      → 按ID查询
  .eq('plate_number', plateNumber)                          → 按车牌查询
  .eq('review_status', 'pending_review')                    → 待审核车辆
```

#### 车辆管理
```
supabase.from('vehicles').insert()   → 添加车辆
supabase.from('vehicles').update()   → 更新车辆
supabase.from('vehicles').delete()   → 删除车辆
```

#### 车辆文档
```
supabase.from('vehicle_documents').insert()   → 创建车辆文档
supabase.from('vehicle_documents').update()   → 更新车辆文档
  .eq('vehicle_id', vehicleId)
```

#### 驾驶员证件
```
supabase.from('driver_licenses').select()     → 查询驾照信息
  .eq('driver_id', driverId)
supabase.from('driver_licenses').upsert()     → 创建/更新驾照
supabase.from('driver_licenses').update()     → 更新驾照
supabase.from('driver_licenses').delete()     → 删除驾照
```

#### 存储操作
```
supabase.storage.from('h5-app').upload()      → 上传图片
supabase.storage.from('h5-app').remove()      → 删除图片
supabase.storage.from('h5-app').getPublicUrl()   → 获取公开URL
```

---

### 2.8 仓库模块 (`src/db/api/warehouses.ts`)

#### 仓库管理
```
supabase.from('warehouses').select()   → 查询仓库
  .eq('is_active', true)
  .eq('id', warehouseId)
supabase.from('warehouses').insert()   → 创建仓库
supabase.from('warehouses').update()   → 更新仓库
supabase.from('warehouses').delete()   → 删除仓库
```

#### 仓库分配
```
supabase.from('warehouse_assignments').select('warehouse_id')
  .eq('user_id', driverId)             → 获取司机的仓库
supabase.from('warehouse_assignments').select('user_id')
  .eq('warehouse_id', warehouseId)     → 获取仓库的用户
supabase.from('warehouse_assignments').insert()   → 分配仓库
supabase.from('warehouse_assignments').delete()   → 取消分配
  .eq('user_id', driverId)
  .eq('warehouse_id', warehouseId)
```

---

### 2.9 统计模块 (`src/db/api/stats.ts`)

#### RPC 函数调用
```
supabase.rpc('get_warehouse_stats')        → 获取仓库统计
supabase.rpc('get_all_warehouses_stats')   → 获取所有仓库统计
supabase.rpc('get_user_all_roles')         → 获取用户角色
supabase.rpc('user_has_role')              → 检查用户角色
supabase.rpc('get_current_user_info')      → 获取当前用户信息
supabase.rpc('add_role_to_user')           → 添加角色
supabase.rpc('remove_role_from_user')      → 移除角色
supabase.rpc('get_users_by_role')          → 按角色获取用户
```

---

## 3. Repository 层缓存策略

### 3.1 缓存配置

| Repository | 缓存 TTL | 缓存键前缀 |
|------------|----------|------------|
| DashboardRepository | 2 分钟 | `dashboard_` |
| StatsRepository | 5 分钟 (系统) / 2 分钟 (个人) | `stats_` |
| VehiclesRepository | 5 分钟 | `vehicles_` |
| CategoriesRepository | 10 分钟 | `categories_` |
| LeaveRepository | 2 分钟 | `leave_` |

### 3.2 缓存失效触发

```
创建/更新/删除操作 → clearCache() / clearCacheByPrefix()
事件发布 → publish('entity:action', data)
```

---

## 4. 完整调用链路示例

### 4.1 司机打卡流程
```
1. supabase.auth.getUser()                    → 获取当前用户
2. supabase.from('attendance').select()       → 检查今日是否已打卡
   .eq('user_id', userId)
   .eq('work_date', today)
3. supabase.from('attendance').insert()       → 创建打卡记录
   或 .update()                               → 更新打卡记录
4. clearCache(CACHE_KEYS.ATTENDANCE_MONTHLY)  → 清除缓存
5. publish('attendance:created', data)        → 发布事件
```

### 4.2 请假申请流程
```
1. supabase.auth.getUser()                    → 获取当前用户
2. supabase.from('leave_applications').insert()   → 创建请假申请
3. supabase.from('users').select()            → 获取申请人信息
4. supabase.from('warehouse_assignments').select()   → 获取仓库信息
5. sendDriverSubmissionNotification()         → 发送通知
   → supabase.from('notifications').insert()
6. publish('leave:created', data)             → 发布事件
7. leaveRepository.invalidateLeaveCache()     → 清除缓存
```

### 4.3 车辆审核流程
```
1. supabase.from('vehicles').select()         → 获取车辆信息
2. supabase.from('vehicles').update()         → 更新审核状态
   .eq('id', vehicleId)
3. supabase.from('vehicle_documents').update()   → 更新文档信息
4. supabase.from('users').select()            → 获取司机信息
5. supabase.from('warehouse_assignments').select()   → 获取仓库信息
6. sendDriverSubmissionNotification()         → 发送通知
7. clearCacheByPrefix('driver_vehicles_')     → 清除缓存
8. publish('vehicle:review_submitted', data)  → 发布事件
```

### 4.4 仪表盘数据加载
```
1. dashboardRepository.getWarehouseStats()    → 检查缓存
2. 缓存未命中时:
   a. supabase.from('warehouse_assignments').select()   → 获取仓库司机
   b. supabase.from('attendance').select()    → 统计今日考勤
   c. supabase.from('piece_work_records').select()   → 统计今日计件
   d. supabase.from('leave_applications').select()   → 统计待审批请假
   e. supabase.from('vehicles').select()      → 统计车辆
3. setCache(cacheKey, result, TTL)            → 设置缓存
```

---

## 5. 数据流向图

```
┌─────────────────────────────────────────────────────────────────┐
│                         页面组件 (Pages)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Hooks (useXxx)                              │
│  useAuth, useDashboardData, useVehicleRealtime, useNotifications │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository 层 (带缓存)                        │
│  DashboardRepository, VehiclesRepository, StatsRepository        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 层 (src/db/api/)                        │
│  users.ts, attendance.ts, vehicles.ts, leave.ts, piecework.ts    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Client                               │
│  supabase.from(), supabase.auth, supabase.storage, supabase.rpc  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase 后端                                 │
│  PostgreSQL + Auth + Storage + Realtime                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 事件总线 (EventBus) 事件列表

| 事件名 | 触发场景 | 数据结构 |
|--------|----------|----------|
| `attendance:created` | 打卡成功 | `{id, userId}` |
| `leave:created` | 请假申请创建 | `{id, userId}` |
| `leave:updated` | 请假申请审批 | `{id, status, userId}` |
| `resignation:created` | 离职申请创建 | `{id, userId}` |
| `resignation:updated` | 离职申请审批 | `{id, status, userId}` |
| `vehicle:created` | 车辆添加 | `{id, plate_number, user_id}` |
| `vehicle:updated` | 车辆更新 | `{id, ...updates}` |
| `vehicle:deleted` | 车辆删除 | `{id, plate_number, user_id}` |
| `vehicle:review_submitted` | 车辆提交审核 | `{vehicle_id, status}` |
| `vehicle:approved` | 车辆审核通过 | `{vehicle_id, reviewer_id}` |
| `notification:created` | 通知创建 | - |
| `notification:read` | 通知已读 | `{id}` |
| `notification:deleted` | 通知删除 | `{id}` |
| `warehouse:created` | 仓库创建 | `{id, name, address}` |
| `warehouse:updated` | 仓库更新 | `{id, ...updates}` |
| `warehouse:deleted` | 仓库删除 | `{id}` |
| `warehouse_assignment:created` | 仓库分配 | `{user_id, warehouse_id}` |
| `warehouse_assignment:deleted` | 取消分配 | `{user_id, warehouse_id}` |
| `piece_work:created` | 计件记录创建 | `{userId}` |
| `piece_work:updated` | 计件记录更新 | `{id}` |
| `category:created` | 品类创建 | `{id, name}` |
| `category:updated` | 品类更新 | `{id, ...updates}` |
| `category:deleted` | 品类删除 | `{id}` |
| `category_price:updated` | 品类价格更新 | `{warehouse_id, category_id}` |
| `driver_license:updated` | 驾照更新 | `{driver_id, id_card_name}` |
| `driver_license:deleted` | 驾照删除 | `{driver_id}` |
| `attendance_rule:created` | 考勤规则创建 | `{id, warehouse_id}` |
| `attendance_rule:updated` | 考勤规则更新 | `{id, ...updates}` |
| `attendance_rule:deleted` | 考勤规则删除 | `{id}` |

---

## 7. 缓存键常量 (CACHE_KEYS)

```typescript
// src/utils/cache.ts
export const CACHE_KEYS = {
  ATTENDANCE_MONTHLY: 'attendance_monthly',
  ATTENDANCE_ALL_RECORDS: 'attendance_all_records',
  ALL_VEHICLES: 'all_vehicles',
  WAREHOUSE_ASSIGNMENTS: 'warehouse_assignments',
  // ... 其他缓存键
}
```

---

*报告生成时间: 2024-12-18*
