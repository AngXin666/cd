# 权限系统 API 文档

**更新日期**: 2026-01-05

---

## 权限错误代码

| 错误代码 | 说明 | 前端处理 |
|---------|------|---------|
| `user_disabled` | 用户已禁用 | 强制登出 |
| `role_insufficient` | 角色权限不足 | Toast 提示 |
| `resource_not_owned` | 资源不属于当前用户 | Toast 提示 |
| `warehouse_not_accessible` | 无权访问该仓库 | Toast 提示 |
| `high_role_operation` | 需要老板权限 | Toast 提示 |

---

## 403 错误响应格式

```json
{
  "detail": {
    "error_code": "resource_not_owned",
    "message": "无权操作此车辆"
  }
}
```

---

## 角色权限矩阵

| 角色 | 访问自己资源 | 访问他人资源 | 管理司机 | 管理车队长 | 管理老板 |
|-----|------------|------------|---------|----------|---------|
| 司机 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 车队长 | ✅ | ✅（仓库内） | ✅（仓库内） | ❌ | ❌ |
| 调度 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 老板 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 权限检查规则

### 1. 车辆所有权检查
- 管理角色可访问任何车辆
- 司机只能访问自己的车辆

### 2. 高权限角色操作
- 只有老板可操作其他老板角色

### 3. 车队长仓库权限
- 车队长只能操作所辖仓库的司机

---

## 前端错误处理

```typescript
if (statusCode === 403) {
  const { error_code, message } = response.detail;
  
  if (error_code === 'user_disabled') {
    userStore.logout();
    showModal({ title: '账号已被禁用' });
  } else {
    showToast(message);
  }
}
```
