# 数据库函数审计报告

## 审计时间
2025-11-22

## 审计目标
检查所有数据库函数是否有错误，并确保完全实现数据隔离（基于 boss_id）。

---

## 一、发现的问题

### 1.1 通知系统函数字段名错误 ⚠️

**问题描述**：
notifications 表的实际字段名是 `recipient_id`，但多个函数使用了错误的字段名 `user_id`。

**受影响的函数**：
1. `get_active_scroll_notifications` - 使用 `n.user_id`（错误）
2. `get_unread_notification_count` (无参数版本) - 使用 `user_id`（错误）
3. `get_unread_notification_count` (有参数版本) - 使用 `user_id`（错误）
4. `mark_notification_as_read` - 使用 `user_id`（错误）
5. `mark_all_notifications_as_read` - 使用 `user_id`（错误）
6. `create_notification` - 使用 `user_id`（错误）

**正确字段名**：
- ❌ `user_id` → ✅ `recipient_id`

**影响**：
- 这些函数无法正常工作
- 查询会失败（字段不存在）

### 1.2 通知系统函数缺少 boss_id 隔离 ⚠️

**问题描述**：
通知相关函数没有使用 boss_id 进行数据隔离，可能导致跨租户数据泄露。

**受影响的函数**：
1. `get_active_scroll_notifications` - 只检查 user_id，没有检查 boss_id
2. `get_unread_notification_count` - 只检查 user_id，没有检查 boss_id
3. `mark_notification_as_read` - 只检查 user_id，没有检查 boss_id
4. `mark_all_notifications_as_read` - 只检查 user_id，没有检查 boss_id
5. `create_notification` - 没有设置 boss_id

**安全风险**：
- 用户可能看到其他租户的通知
- 用户可能标记其他租户的通知为已读

### 1.3 仓库访问函数缺少 boss_id 隔离 ⚠️

**问题描述**：
仓库相关函数没有使用 boss_id 进行数据隔离。

**受影响的函数**：
1. `can_access_warehouse` - 没有检查 boss_id
2. `get_manager_warehouse_ids` - 没有检查 boss_id
3. `is_driver_of_warehouse` - 没有检查 boss_id
4. `is_manager_of_warehouse` - 没有检查 boss_id
5. `is_manager_of_driver` - 没有检查 boss_id

**安全风险**：
- 管理员可能访问其他租户的仓库
- 司机可能访问其他租户的仓库

---

## 二、修复方案

### 2.1 修复通知系统函数

#### 2.1.1 修复 get_active_scroll_notifications

**修复前**：
```sql
SELECT 
  n.id,
  n.type,
  n.title,
  n.content,
  n.created_at,
  n.expires_at
FROM notifications n
WHERE n.user_id = p_user_id  -- ❌ 错误字段名
AND n.is_dismissed = false
AND n.expires_at > now()
ORDER BY n.created_at DESC
LIMIT 1;
```

**修复后**：
```sql
SELECT 
  n.id,
  n.type,
  n.title,
  n.content,
  n.created_at,
  n.expires_at
FROM notifications n
WHERE n.recipient_id = p_user_id  -- ✅ 正确字段名
AND n.boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
AND n.is_dismissed = false
AND n.expires_at > now()
ORDER BY n.created_at DESC
LIMIT 1;
```

#### 2.1.2 修复 get_unread_notification_count (无参数版本)

**修复前**：
```sql
SELECT COUNT(*)::integer INTO v_count
FROM notifications
WHERE user_id = auth.uid() AND is_read = false;  -- ❌ 错误字段名
```

**修复后**：
```sql
SELECT COUNT(*)::integer INTO v_count
FROM notifications
WHERE recipient_id = auth.uid()  -- ✅ 正确字段名
AND boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
AND is_read = false;
```

#### 2.1.3 修复 get_unread_notification_count (有参数版本)

**修复前**：
```sql
SELECT COUNT(*)::integer INTO unread_count
FROM notifications
WHERE user_id = p_user_id  -- ❌ 错误字段名
AND is_read = false;
```

**修复后**：
```sql
SELECT COUNT(*)::integer INTO unread_count
FROM notifications
WHERE recipient_id = p_user_id  -- ✅ 正确字段名
AND boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
AND is_read = false;
```

#### 2.1.4 修复 mark_notification_as_read

**修复前**：
```sql
UPDATE notifications
SET is_read = true, read_at = now()
WHERE id = p_notification_id AND user_id = auth.uid();  -- ❌ 错误字段名
```

**修复后**：
```sql
UPDATE notifications
SET is_read = true
WHERE id = p_notification_id 
AND recipient_id = auth.uid()  -- ✅ 正确字段名
AND boss_id = get_current_user_boss_id();  -- ✅ 添加 boss_id 隔离
```

**注意**：notifications 表没有 `read_at` 字段，需要删除。

#### 2.1.5 修复 mark_all_notifications_as_read

**修复前**：
```sql
UPDATE notifications
SET is_read = true, read_at = now()
WHERE user_id = auth.uid() AND is_read = false;  -- ❌ 错误字段名
```

**修复后**：
```sql
UPDATE notifications
SET is_read = true
WHERE recipient_id = auth.uid()  -- ✅ 正确字段名
AND boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
AND is_read = false;
```

**注意**：notifications 表没有 `read_at` 字段，需要删除。

#### 2.1.6 修复 create_notification

**修复前**：
```sql
INSERT INTO notifications (
  user_id,  -- ❌ 错误字段名
  type,
  title,
  content,
  related_id,
  related_type,
  action_url
) VALUES (
  p_user_id,
  p_type,
  p_title,
  p_content,
  p_related_id,
  p_related_type,
  p_action_url
) RETURNING id INTO v_notification_id;
```

**修复后**：
```sql
INSERT INTO notifications (
  recipient_id,  -- ✅ 正确字段名
  sender_id,
  sender_name,
  sender_role,
  type,
  title,
  content,
  action_url,
  related_id,
  boss_id  -- ✅ 添加 boss_id
) VALUES (
  p_user_id,
  auth.uid(),
  (SELECT name FROM profiles WHERE id = auth.uid()),
  (SELECT role::text FROM profiles WHERE id = auth.uid()),
  p_type::text,
  p_title,
  p_content,
  p_action_url,
  p_related_id,
  get_current_user_boss_id()  -- ✅ 添加 boss_id
) RETURNING id INTO v_notification_id;
```

**注意**：
- notifications 表没有 `related_type` 字段，需要删除参数
- type 字段是 text 类型，不是 enum 类型

### 2.2 修复仓库访问函数

#### 2.2.1 修复 can_access_warehouse

**修复前**：
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = uid AND p.role = 'super_admin'::user_role
) OR EXISTS (
  SELECT 1 FROM manager_warehouses mw
  WHERE mw.manager_id = uid AND mw.warehouse_id = wid
);
```

**修复后**：
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = uid 
  AND p.role = 'super_admin'::user_role
  AND p.boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
) OR EXISTS (
  SELECT 1 FROM manager_warehouses mw
  JOIN warehouses w ON mw.warehouse_id = w.id
  WHERE mw.manager_id = uid 
  AND mw.warehouse_id = wid
  AND w.boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
);
```

#### 2.2.2 修复 get_manager_warehouse_ids

**修复前**：
```sql
SELECT ARRAY_AGG(warehouse_id)
FROM manager_warehouses
WHERE manager_id = uid;
```

**修复后**：
```sql
SELECT ARRAY_AGG(mw.warehouse_id)
FROM manager_warehouses mw
JOIN warehouses w ON mw.warehouse_id = w.id
WHERE mw.manager_id = uid
AND w.boss_id = get_current_user_boss_id();  -- ✅ 添加 boss_id 隔离
```

#### 2.2.3 修复 is_driver_of_warehouse

**修复前**：
```sql
SELECT EXISTS (
  SELECT 1 FROM driver_warehouses
  WHERE driver_id = uid AND warehouse_id = wid
);
```

**修复后**：
```sql
SELECT EXISTS (
  SELECT 1 FROM driver_warehouses dw
  JOIN warehouses w ON dw.warehouse_id = w.id
  WHERE dw.driver_id = uid 
  AND dw.warehouse_id = wid
  AND w.boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
);
```

#### 2.2.4 修复 is_manager_of_warehouse

**修复前**：
```sql
SELECT EXISTS (
  SELECT 1 FROM manager_warehouses
  WHERE manager_id = uid AND warehouse_id = wid
);
```

**修复后**：
```sql
SELECT EXISTS (
  SELECT 1 FROM manager_warehouses mw
  JOIN warehouses w ON mw.warehouse_id = w.id
  WHERE mw.manager_id = uid 
  AND mw.warehouse_id = wid
  AND w.boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
);
```

#### 2.2.5 修复 is_manager_of_driver

**修复前**：
```sql
SELECT EXISTS (
  SELECT 1
  FROM driver_warehouses dw
  INNER JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
  WHERE mw.manager_id = manager_id
    AND dw.driver_id = driver_id
);
```

**修复后**：
```sql
SELECT EXISTS (
  SELECT 1
  FROM driver_warehouses dw
  INNER JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
  INNER JOIN warehouses w ON dw.warehouse_id = w.id
  WHERE mw.manager_id = manager_id
    AND dw.driver_id = driver_id
    AND w.boss_id = get_current_user_boss_id()  -- ✅ 添加 boss_id 隔离
);
```

---

## 三、其他需要检查的函数

### 3.1 cleanup_expired_notifications

**当前实现**：
```sql
DELETE FROM notifications
WHERE is_dismissed = true
AND expires_at < now();
```

**问题**：
- notifications 表没有 `is_dismissed` 和 `expires_at` 字段

**建议**：
- 删除此函数或修改为删除旧的已读通知

### 3.2 get_active_scroll_notifications

**当前实现**：
```sql
WHERE n.is_dismissed = false
AND n.expires_at > now()
```

**问题**：
- notifications 表没有 `is_dismissed` 和 `expires_at` 字段

**建议**：
- 删除这些条件或修改为其他逻辑

---

## 四、修复优先级

### 高优先级（必须立即修复）⚠️

1. **通知系统函数字段名错误**
   - 影响：函数完全无法工作
   - 风险：高
   - 修复难度：低

2. **通知系统函数缺少 boss_id 隔离**
   - 影响：跨租户数据泄露
   - 风险：高
   - 修复难度：低

3. **仓库访问函数缺少 boss_id 隔离**
   - 影响：跨租户权限泄露
   - 风险：高
   - 修复难度：低

### 中优先级（建议修复）⚠️

4. **cleanup_expired_notifications 函数字段错误**
   - 影响：清理功能无法工作
   - 风险：中
   - 修复难度：低

5. **get_active_scroll_notifications 函数字段错误**
   - 影响：滚动通知功能无法工作
   - 风险：中
   - 修复难度：低

---

## 五、修复计划

### 阶段 1：修复通知系统函数（高优先级）

1. 修复 `create_notification` - 修复字段名和添加 boss_id
2. 修复 `get_unread_notification_count` (两个版本) - 修复字段名和添加 boss_id
3. 修复 `mark_notification_as_read` - 修复字段名和添加 boss_id
4. 修复 `mark_all_notifications_as_read` - 修复字段名和添加 boss_id
5. 修复 `get_active_scroll_notifications` - 修复字段名和添加 boss_id

### 阶段 2：修复仓库访问函数（高优先级）

6. 修复 `can_access_warehouse` - 添加 boss_id 隔离
7. 修复 `get_manager_warehouse_ids` - 添加 boss_id 隔离
8. 修复 `is_driver_of_warehouse` - 添加 boss_id 隔离
9. 修复 `is_manager_of_warehouse` - 添加 boss_id 隔离
10. 修复 `is_manager_of_driver` - 添加 boss_id 隔离

### 阶段 3：修复其他函数（中优先级）

11. 修复 `cleanup_expired_notifications` - 修改逻辑或删除
12. 更新相关触发器函数

---

## 六、测试计划

### 6.1 通知系统测试

1. 创建通知 - 验证 boss_id 自动添加
2. 查询通知 - 验证只能看到同租户的通知
3. 标记已读 - 验证只能标记同租户的通知
4. 跨租户测试 - 验证无法访问其他租户的通知

### 6.2 仓库访问测试

1. 仓库访问权限 - 验证只能访问同租户的仓库
2. 管理员仓库列表 - 验证只能看到同租户的仓库
3. 司机仓库关联 - 验证只能关联同租户的仓库
4. 跨租户测试 - 验证无法访问其他租户的仓库

---

## 七、总结

### 7.1 发现的问题总结

| 问题类型 | 数量 | 优先级 | 状态 |
|---------|------|--------|------|
| 字段名错误 | 6 | 高 | 待修复 |
| 缺少 boss_id 隔离 | 10 | 高 | 待修复 |
| 字段不存在 | 2 | 中 | 待修复 |

### 7.2 安全风险评估

| 风险类型 | 严重程度 | 影响范围 | 修复难度 |
|---------|---------|---------|---------|
| 跨租户数据泄露 | 高 | 通知系统 | 低 |
| 跨租户权限泄露 | 高 | 仓库系统 | 低 |
| 功能无法使用 | 高 | 通知系统 | 低 |

### 7.3 修复建议

1. **立即修复高优先级问题**
   - 通知系统函数字段名错误
   - 通知系统函数缺少 boss_id 隔离
   - 仓库访问函数缺少 boss_id 隔离

2. **尽快修复中优先级问题**
   - cleanup_expired_notifications 函数
   - get_active_scroll_notifications 函数

3. **全面测试**
   - 修复后进行全面测试
   - 验证数据隔离完整性
   - 验证功能正常工作

---

**报告结束**

⚠️ **发现严重问题，需要立即修复**
⚠️ **数据隔离不完整，存在安全风险**
⚠️ **部分函数无法正常工作**

---

**审计时间**：2025-11-22
**审计人员**：AI Assistant
**审计状态**：⚠️ 发现问题
