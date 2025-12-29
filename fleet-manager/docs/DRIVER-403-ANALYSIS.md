# 司机端 403 错误分析报告

## 概述

本文档详细分析了车队管家系统中所有可能导致司机端出现 403 (权限不足) 错误的场景。

## 已修复的问题

### 问题 1: 计件记录更新/删除权限

**问题描述**: 司机页面调用 `updatePieceWorkRecord` 和 `deletePieceWorkRecord` API，但这些 API 原本需要管理权限。

**影响场景**:
- 司机累计计件记录时（entry.vue）
- 司机编辑自己的计件记录时（list.vue）
- 司机删除自己的计件记录时（list.vue）

**修复方案**: 修改后端 API，允许司机更新/删除自己的计件记录
- `PUT /api/piece-work/records/{id}` - 司机可以更新自己的记录
- `DELETE /api/piece-work/records/{id}` - 司机可以删除自己的记录

### 问题 2: 403 错误处理不够友好

**问题描述**: 前端 403 错误处理只显示 "权限不足"，没有区分不同的错误类型。

**修复方案**: 改进 `request.ts` 中的 403 错误处理
- 特殊处理 "用户已被禁用" 错误，强制登出并显示友好提示
- 其他 403 错误显示后端返回的具体错误信息

---

## 403 错误来源分类

### 一、用户状态检查 (auth.py)

**位置**: `fleet-manager/backend/auth.py:155-159`

```python
if not user.is_active:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="用户已被禁用"
    )
```

**触发条件**: 用户账号被管理员禁用 (`is_active = False`)

**影响范围**: 所有需要认证的 API 请求

**前端表现**: 任何 API 调用都会返回 403，提示 "用户已被禁用"

**解决方案**: 
- 前端应该捕获此错误并强制登出用户
- 显示友好提示 "您的账号已被禁用，请联系管理员"

---

### 二、角色权限检查 (auth.py)

**位置**: `fleet-manager/backend/auth.py:193-197`

```python
if current_user.role not in allowed_roles:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="权限不足，无法执行此操作"
    )
```

**触发条件**: 司机访问了需要管理权限的 API

**受影响的 API 列表** (使用 `require_management` 依赖):

| API 路径 | 方法 | 功能 | 司机是否应该访问 |
|---------|------|------|-----------------|
| `/api/users` | GET | 获取用户列表 | ❌ 不应该 |
| `/api/users/{id}` | GET | 获取用户详情 | ❌ 不应该 |
| `/api/users/{id}` | PUT | 更新用户信息 | ❌ 不应该 |
| `/api/users/{id}/warehouses` | PUT | 分配仓库 | ❌ 不应该 |
| `/api/users/{id}/warehouses` | GET | 获取用户仓库 | ❌ 不应该 |
| `/api/warehouses/{id}/users` | GET | 获取仓库用户 | ❌ 不应该 |
| `/api/piece-work/categories` | POST | 创建分类 | ❌ 不应该 |
| `/api/piece-work/categories/{id}` | PUT | 更新分类 | ❌ 不应该 |
| `/api/piece-work/categories/{id}` | DELETE | 删除分类 | ❌ 不应该 |
| `/api/piece-work/records/{id}` | PUT | 更新计件记录 | ❌ 不应该 |
| `/api/piece-work/records/{id}` | DELETE | 删除计件记录 | ❌ 不应该 |
| `/api/leave/{id}/approve` | PUT | 审批请假 | ❌ 不应该 |
| `/api/vehicles/all` | GET | 获取所有车辆 | ❌ 不应该 |
| `/api/vehicles/{id}/assign` | PUT | 分配车辆 | ❌ 不应该 |
| `/api/vehicles/{id}/history` | GET | 获取车辆历史 | ❌ 不应该 |
| `/api/vehicles/lease-reminders` | GET | 获取租赁提醒 | ❌ 不应该 |
| `/api/notifications` | POST | 创建通知 | ❌ 不应该 |
| `/api/notifications/from-template` | POST | 从模板创建通知 | ❌ 不应该 |

**前端检查**: 确保司机页面不会调用这些 API

---

### 三、仓库访问权限检查 (main.py)

**位置**: `fleet-manager/backend/main.py:762-766`

```python
if warehouse_id not in user_warehouse_ids:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="无权访问该仓库"
    )
```

**触发条件**: 司机访问了未分配给自己的仓库的车辆列表

**受影响的 API**: `GET /api/warehouses/{warehouse_id}/vehicles`

**前端检查**: 
- 确保仓库选择器只显示分配给司机的仓库
- 不要让司机访问未分配的仓库

---

### 四、请假申请权限检查 (main.py)

**位置**: `fleet-manager/backend/main.py:1427-1431`

```python
if current_user.role == UserRole.DRIVER and application.user_id != current_user.id:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="无权查看此申请"
    )
```

**触发条件**: 司机尝试查看其他人的请假申请详情

**受影响的 API**: `GET /api/leave/{application_id}`

**前端检查**: 确保司机只能查看自己的请假申请

---

### 五、车辆权限检查 (main.py)

以下 API 都有类似的权限检查：司机只能操作自己的车辆

| API 路径 | 方法 | 错误信息 | 代码位置 |
|---------|------|---------|---------|
| `/api/vehicles/{id}` | GET | 无权查看此车辆 | 1755-1759 |
| `/api/vehicles/{id}` | PUT | 无权更新此车辆 | 1797-1801 |
| `/api/vehicles/{id}` | DELETE | 无权操作此车辆 | 1906-1910 |
| `/api/vehicles/{id}/return` | PUT | 无权操作该车辆 | 1973-1977 |
| `/api/vehicles/{id}/lease` | GET | 无权查看此车辆的租赁信息 | 2307-2311 |
| `/api/vehicles/{id}/lease` | PUT | 无权更新此车辆的租赁信息 | 2371-2375 |
| `/api/vehicles/{id}/supplement-photo` | POST | 无权补录此车辆的照片 | 2505-2509 |
| `/api/vehicles/{id}/supplemented-photos` | GET | 无权查看此车辆的补录照片信息 | 2565-2569 |

**触发条件**: 司机尝试操作不属于自己的车辆

**前端检查**: 确保车辆列表只显示司机自己的车辆

---

### 六、通知权限检查 (main.py)

**位置**: `fleet-manager/backend/main.py:2640-2644`

```python
if notification.user_id != current_user.id:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="无权操作此通知"
    )
```

**触发条件**: 用户尝试操作不属于自己的通知

**受影响的 API**: `PUT /api/notifications/{id}/read`

---

## 司机页面 API 调用分析

### 司机首页 (`/pages/driver/index/index.vue`)

调用的 API:
- `getTodayAttendance()` - ✅ 安全，只返回当前用户数据
- `getPieceWorkStats()` - ✅ 安全，后端会过滤为当前用户
- `getLeaveApplications()` - ✅ 安全，后端会过滤为当前用户
- `getUnreadCount()` - ✅ 安全，只返回当前用户数据
- `getWarehouses()` - ✅ 安全，返回所有启用的仓库
- `getAttendanceRecords()` - ✅ 安全，后端会过滤为当前用户

### 计件录入页 (`/pages/driver/piece-work/entry.vue`)

调用的 API:
- `getWarehouses()` - ✅ 安全
- `getPieceWorkCategories()` - ✅ 安全
- `getTodayAttendanceForUser()` → `getAttendanceRecords()` - ✅ 安全
- `getCategoryPriceForDriver()` → `getPieceWorkCategories()` - ✅ 安全
- `canStartPieceWork()` → `getLeaveApplications()` - ✅ 安全
- `checkDuplicateRecord()` - ✅ 安全
- `createPieceWorkRecord()` - ✅ 安全
- `updatePieceWorkRecord()` - ⚠️ 需要检查

### 车辆列表页 (`/pages/driver/vehicle/list.vue`)

调用的 API:
- `getVehicles()` - ✅ 安全，后端会过滤为当前用户的车辆
- `deleteVehicle()` - ⚠️ 需要确保只删除自己的车辆

### 请假列表页 (`/pages/driver/leave/list.vue`)

调用的 API:
- `getLeaveApplications()` - ✅ 安全，后端会过滤为当前用户
- `getAttendanceRecords()` - ✅ 安全

---

## 潜在问题场景

### 场景 1: 用户被禁用

**问题**: 用户登录后被管理员禁用，但前端没有及时处理

**解决方案**: 
1. 在 `request.ts` 中捕获 "用户已被禁用" 错误
2. 强制登出并显示提示

### 场景 2: 仓库分配变更

**问题**: 用户正在使用某个仓库，但管理员取消了分配

**解决方案**:
1. 使用 SSE 实时推送仓库分配变更
2. 前端收到变更后刷新仓库列表

### 场景 3: 车辆被转移

**问题**: 用户正在查看某辆车，但车辆被管理员转移给其他人

**解决方案**:
1. 使用 SSE 实时推送车辆变更
2. 前端收到变更后刷新车辆列表

---

## 建议的前端错误处理

```typescript
// request.ts 中的 403 错误处理
if (statusCode === 403) {
  const errorData = responseData as ErrorResponse;
  const detail = errorData?.detail || '权限不足';
  
  // 特殊处理用户被禁用的情况
  if (detail === '用户已被禁用') {
    // 强制登出
    userStore.logout();
    uni.showModal({
      title: '账号已被禁用',
      content: '您的账号已被管理员禁用，请联系管理员',
      showCancel: false,
      success: () => {
        uni.reLaunch({ url: '/pages/login/index' });
      }
    });
  } else {
    showError(detail);
  }
  
  reject(new Error(detail));
  return;
}
```

---

## 总结

司机端可能遇到 403 错误的主要场景：

1. **用户被禁用** - 最常见，需要特殊处理
2. **访问管理 API** - 前端代码错误，不应该发生
3. **访问未分配的仓库** - 仓库分配变更后可能发生
4. **访问他人的资源** - 数据不一致时可能发生

建议：
1. 完善前端 403 错误处理，区分不同的错误类型
2. 利用 SSE 实时更新用户权限和资源分配
3. 定期检查前端代码，确保不会调用管理 API
