# 权限系统 API 文档

## 概述

本文档描述了车队管理系统的权限检查机制和 403 错误响应格式。

## 权限错误代码

### PermissionErrorCode 枚举

| 错误代码 | 值 | 说明 | 前端处理 |
|---------|---|------|---------|
| USER_DISABLED | `user_disabled` | 用户已被禁用 | 强制登出，显示模态框提示 |
| ROLE_INSUFFICIENT | `role_insufficient` | 角色权限不足 | 显示 Toast 提示 |
| RESOURCE_NOT_OWNED | `resource_not_owned` | 资源不属于当前用户 | 显示 Toast 提示 |
| WAREHOUSE_NOT_ACCESSIBLE | `warehouse_not_accessible` | 无权访问该仓库 | 显示 Toast 提示 |
| HIGH_ROLE_OPERATION | `high_role_operation` | 需要超级管理员权限 | 显示 Toast 提示 |

## 403 错误响应格式

### 新格式（推荐）

```json
{
  "detail": {
    "error_code": "resource_not_owned",
    "message": "无权操作此车辆"
  }
}
```

### 旧格式（向后兼容）

```json
{
  "detail": "权限不足"
}
```

## 权限检查规则

### 1. 车辆所有权检查

**适用 API**:
- `GET /api/vehicles/{id}` - 获取车辆详情
- `PUT /api/vehicles/{id}` - 更新车辆信息
- `DELETE /api/vehicles/{id}` - 删除车辆
- `PUT /api/vehicles/{id}/return` - 车辆退车
- `GET /api/vehicles/{id}/lease` - 获取租赁信息
- `PUT /api/vehicles/{id}/lease` - 更新租赁信息
- `POST /api/vehicles/{id}/supplement-photo` - 补充照片
- `GET /api/vehicles/{id}/supplemented-photos` - 获取补充照片

**规则**:
- 管理角色（车队长、调度、老板、超级管理员）可以访问任何车辆
- 司机只能访问自己的车辆

**错误响应**:
```json
{
  "detail": {
    "error_code": "resource_not_owned",
    "message": "无权操作此车辆"
  }
}
```

### 2. 高权限角色操作检查

**适用 API**:
- `POST /api/users` - 创建用户
- `PUT /api/users/{id}` - 更新用户
- `DELETE /api/users/{id}` - 删除用户

**规则**:
- 只有超级管理员可以创建/修改/删除老板或超级管理员角色
- 其他角色尝试操作高权限角色会返回 403 错误

**错误响应**:
```json
{
  "detail": {
    "error_code": "high_role_operation",
    "message": "只有超级管理员可以创建老板或超级管理员角色"
  }
}
```

### 3. 车队长仓库权限检查

**适用 API**:
- `PUT /api/users/{id}/driver-info` - 更新司机信息
- `POST /api/users/{id}/warehouses` - 分配仓库

**规则**:
- 车队长只能操作司机角色
- 车队长只能操作属于其管理仓库的司机

**错误响应**:

车队长尝试操作非司机:
```json
{
  "detail": {
    "error_code": "role_insufficient",
    "message": "车队长只能操作司机"
  }
}
```

车队长尝试操作不属于其仓库的司机:
```json
{
  "detail": {
    "error_code": "warehouse_not_accessible",
    "message": "无权操作该司机，该司机不属于您管理的仓库"
  }
}
```

### 4. 通用资源所有权检查

**适用 API**:
- `PUT /api/piece-work/records/{id}` - 更新计件记录
- `DELETE /api/piece-work/records/{id}` - 删除计件记录
- `GET /api/leave/{id}` - 获取请假详情
- `PUT /api/notifications/{id}/read` - 标记通知已读

**规则**:
- 管理角色可以访问任何资源
- 司机只能访问自己的资源

**错误响应**:
```json
{
  "detail": {
    "error_code": "resource_not_owned",
    "message": "无权操作此计件记录"
  }
}
```

### 5. 用户禁用检查

**适用**: 所有需要认证的 API

**规则**:
- 被禁用的用户无法访问任何 API

**错误响应**:
```json
{
  "detail": {
    "error_code": "user_disabled",
    "message": "用户已被禁用"
  }
}
```

## 角色权限矩阵

| 角色 | 访问自己资源 | 访问他人资源 | 管理司机 | 管理车队长 | 管理老板 |
|-----|------------|------------|---------|----------|---------|
| 司机 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 车队长 | ✅ | ✅（仓库内） | ✅（仓库内） | ❌ | ❌ |
| 调度 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 老板 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 超级管理员 | ✅ | ✅ | ✅ | ✅ | ✅ |

## 前端错误处理

### 处理流程

```typescript
// 403 错误处理
if (statusCode === 403) {
  const { error_code, message } = response.detail;
  
  switch (error_code) {
    case 'user_disabled':
      // 强制登出
      userStore.logout();
      // 显示模态框
      showModal({
        title: '账号已被禁用',
        content: '您的账号已被管理员禁用，请联系管理员'
      });
      break;
      
    case 'resource_not_owned':
    case 'warehouse_not_accessible':
    case 'role_insufficient':
    case 'high_role_operation':
      // 显示 Toast 提示
      showToast(message);
      break;
      
    default:
      // 未知错误，显示默认提示
      showToast(message || '权限不足');
  }
}
```

### 向后兼容

前端需要同时支持新旧两种错误格式：

```typescript
// 解析错误响应
let errorCode = '';
let errorMessage = '权限不足';

if (typeof response.detail === 'object') {
  // 新格式
  errorCode = response.detail.error_code || '';
  errorMessage = response.detail.message || '权限不足';
} else {
  // 旧格式
  errorMessage = response.detail || '权限不足';
  
  // 兼容旧格式的用户禁用检查
  if (errorMessage === '用户已被禁用') {
    errorCode = 'user_disabled';
  }
}
```

## 日志记录

权限检查失败时，系统会记录 WARNING 级别的日志：

```
权限拒绝: 用户 123 (角色: driver) 尝试访问 车辆 (owner: 456)
```

日志包含：
- 用户 ID
- 用户角色
- 操作类型
- 资源信息

日志不包含敏感信息（如密码、Token 等）。

## 更新历史

| 版本 | 日期 | 说明 |
|-----|------|------|
| 1.0 | 2025-12-28 | 初始版本，统一权限错误代码和响应格式 |
