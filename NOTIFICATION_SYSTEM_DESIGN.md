# 通知系统设计文档

## 一、需求分析

### 1. 通知发送权限

#### 司机
- ✅ 可以向老板发送通知
- ✅ 可以向平级账号发送通知
- ✅ 可以向车队长发送通知

#### 车队长
- ✅ 可以向管辖范围内的司机发送通知
- ✅ 可以向老板发送通知
- ✅ 可以向平级账号发送通知

#### 平级账号
- ✅ 可以向老板发送通知
- ✅ 可以向车队长发送通知
- ✅ 可以向司机发送通知

#### 老板
- ✅ 可以向所有人发送通知

### 2. 通知查看权限

- ✅ 所有人只能查看发送给自己的通知
- ✅ 所有人可以查看自己发送的通知

---

## 二、数据库设计

### notifications 表结构

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| `id` | UUID | 通知ID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `sender_id` | UUID | 发送者ID | NOT NULL, REFERENCES profiles(id) |
| `receiver_id` | UUID | 接收者ID | NOT NULL, REFERENCES profiles(id) |
| `title` | TEXT | 标题 | NOT NULL |
| `content` | TEXT | 内容 | NOT NULL |
| `type` | TEXT | 类型 | DEFAULT 'user' |
| `status` | TEXT | 状态 | DEFAULT 'unread' |
| `created_at` | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| `read_at` | TIMESTAMPTZ | 阅读时间 | - |

### 类型枚举值

```sql
CONSTRAINT valid_notification_type CHECK (type IN ('system', 'user', 'announcement'))
```

- `system`：系统通知
- `user`：用户通知
- `announcement`：公告通知

### 状态枚举值

```sql
CONSTRAINT valid_notification_status CHECK (status IN ('unread', 'read'))
```

- `unread`：未读
- `read`：已读

### 索引

- `idx_notifications_sender_id`：发送者ID索引
- `idx_notifications_receiver_id`：接收者ID索引
- `idx_notifications_status`：状态索引
- `idx_notifications_created_at`：创建时间索引

---

## 三、RLS 策略设计

### 1. 查看通知

**策略名称**：查看通知

**规则**：
```sql
CREATE POLICY "查看通知" ON notifications
  FOR SELECT TO authenticated
  USING (
    -- 可以查看发送给自己的通知
    receiver_id = auth.uid()
    OR
    -- 可以查看自己发送的通知
    sender_id = auth.uid()
  );
```

### 2. 发送通知

**策略名称**：发送通知

**规则**：
```sql
CREATE POLICY "发送通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- 发送者必须是当前用户
    sender_id = auth.uid()
    AND
    -- 检查是否有权限向接收者发送通知
    can_send_notification(auth.uid(), receiver_id)
  );
```

### 3. 更新通知（标记为已读）

**策略名称**：更新通知

**规则**：
```sql
CREATE POLICY "更新通知" ON notifications
  FOR UPDATE TO authenticated
  USING (
    -- 只能更新发送给自己的通知
    receiver_id = auth.uid()
  );
```

### 4. 删除通知

**策略名称**：删除通知

**规则**：
```sql
CREATE POLICY "删除通知" ON notifications
  FOR DELETE TO authenticated
  USING (
    -- 可以删除发送给自己的通知
    receiver_id = auth.uid()
    OR
    -- 可以删除自己发送的通知
    sender_id = auth.uid()
  );
```

---

## 四、辅助函数

### can_send_notification(sender_id UUID, receiver_id UUID)

**功能**：检查发送者是否有权限向接收者发送通知

**返回值**：BOOLEAN

**逻辑**：
```sql
CREATE OR REPLACE FUNCTION can_send_notification(sender_id UUID, receiver_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles sender
    LEFT JOIN profiles receiver ON receiver.id = receiver_id
    WHERE sender.id = sender_id
      AND sender.status = 'active'
      AND receiver.status = 'active'
      AND (
        -- 老板可以向所有人发送通知
        (sender.role = 'boss')
        OR
        -- 平级账号可以向所有人发送通知
        (sender.role = 'peer')
        OR
        -- 车队长可以向管辖范围内的司机、老板、平级账号发送通知
        (
          sender.role = 'fleet_leader'
          AND (
            -- 向管辖范围内的司机发送通知
            (receiver.role = 'driver' AND receiver.warehouse_ids && sender.warehouse_ids)
            OR
            -- 向老板发送通知
            (receiver.role = 'boss')
            OR
            -- 向平级账号发送通知
            (receiver.role = 'peer')
          )
        )
        OR
        -- 司机可以向老板、平级账号、车队长发送通知
        (
          sender.role = 'driver'
          AND receiver.role IN ('boss', 'peer', 'fleet_leader')
        )
      )
  );
$$;
```

---

## 五、权限矩阵

### 发送通知权限

| 发送者 \ 接收者 | 老板 | 平级账号 | 车队长 | 司机（管辖范围内） | 司机（管辖范围外） |
|----------------|------|----------|--------|-------------------|-------------------|
| 老板 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 平级账号（完整权限） | ✅ | ✅ | ✅ | ✅ | ✅ |
| 平级账号（只读权限） | ✅ | ✅ | ✅ | ✅ | ✅ |
| 车队长（完整权限） | ✅ | ✅ | ❌ | ✅ | ❌ |
| 车队长（只读权限） | ✅ | ✅ | ❌ | ✅ | ❌ |
| 司机 | ✅ | ✅ | ✅ | ❌ | ❌ |

### 查看通知权限

| 角色 | 查看发送给自己的通知 | 查看自己发送的通知 | 查看其他人的通知 |
|------|---------------------|-------------------|-----------------|
| 所有角色 | ✅ | ✅ | ❌ |

---

## 六、使用示例

### 1. 司机向老板发送通知

```typescript
await supabase
  .from('notifications')
  .insert({
    sender_id: driverId,
    receiver_id: bossId,
    title: '请假申请',
    content: '我需要请假3天，请批准',
    type: 'user'
  })
```

### 2. 车队长向管辖范围内的司机发送通知

```typescript
await supabase
  .from('notifications')
  .insert({
    sender_id: fleetLeaderId,
    receiver_id: driverId,
    title: '任务分配',
    content: '明天请到仓库A取货',
    type: 'user'
  })
```

### 3. 平级账号向所有人发送公告

```typescript
// 需要先查询所有用户
const { data: users } = await supabase
  .from('profiles')
  .select('id')

// 批量发送通知
const notifications = users.map(user => ({
  sender_id: peerId,
  receiver_id: user.id,
  title: '系统维护通知',
  content: '系统将于明天凌晨2点进行维护',
  type: 'announcement'
}))

await supabase
  .from('notifications')
  .insert(notifications)
```

### 4. 查看未读通知

```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('receiver_id', currentUserId)
  .eq('status', 'unread')
  .order('created_at', { ascending: false })
```

### 5. 标记通知为已读

```typescript
await supabase
  .from('notifications')
  .update({
    status: 'read',
    read_at: new Date().toISOString()
  })
  .eq('id', notificationId)
  .eq('receiver_id', currentUserId)
```

---

## 七、总结

### ✅ 功能完整性

| 功能 | 状态 | 说明 |
|------|------|------|
| 通知表创建 | ✅ 已实现 | 在创建租户时自动创建 |
| 发送权限控制 | ✅ 已实现 | 通过 RLS 策略和辅助函数实现 |
| 查看权限控制 | ✅ 已实现 | 只能查看与自己相关的通知 |
| 通知状态管理 | ✅ 已实现 | 支持未读/已读状态 |
| 通知类型分类 | ✅ 已实现 | 支持系统/用户/公告类型 |

### 📊 核心特性

1. **细粒度权限控制**：根据角色和管辖范围控制发送权限
2. **数据隔离**：用户只能查看与自己相关的通知
3. **状态管理**：支持未读/已读状态，记录阅读时间
4. **类型分类**：支持不同类型的通知
5. **性能优化**：创建必要的索引，提高查询效率

---

**文档版本**：1.0  
**创建时间**：2025-11-27  
**作者**：秒哒 AI
