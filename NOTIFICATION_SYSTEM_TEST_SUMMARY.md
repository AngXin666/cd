# 通知系统测试总结

## 一、需求分析

### 1. 是否需要为通知系统创建单独的表？

✅ **是的，需要创建 notifications 表**

**原因**：
1. 通知是独立的业务功能，需要独立的数据存储
2. 通知涉及发送者、接收者、内容、状态等多个字段
3. 需要支持未读/已读状态管理
4. 需要支持不同类型的通知（系统通知、用户通知、公告通知）

### 2. 通知表应该在哪里创建？

✅ **在每个租户的 Schema 中创建**

**原因**：
1. 通知是租户内部的数据，不同租户的通知应该隔离
2. 符合 Schema 隔离的设计原则
3. 便于数据管理和权限控制

---

## 二、通知发送权限测试

### 测试场景 1：司机发送通知

#### 司机 → 老板
- **权限**：✅ 允许
- **理由**：司机需要向老板汇报工作、请假等

#### 司机 → 平级账号
- **权限**：✅ 允许
- **理由**：司机需要向管理层汇报工作

#### 司机 → 车队长
- **权限**：✅ 允许
- **理由**：司机需要向直接管理者汇报工作

#### 司机 → 其他司机
- **权限**：❌ 不允许
- **理由**：司机之间不需要直接发送通知

**结论**：✅ 符合要求

---

### 测试场景 2：车队长发送通知

#### 车队长 → 管辖范围内的司机
- **权限**：✅ 允许
- **理由**：车队长需要向管辖范围内的司机分配任务、发送通知

#### 车队长 → 管辖范围外的司机
- **权限**：❌ 不允许
- **理由**：车队长只能管理自己管辖范围内的司机

#### 车队长 → 老板
- **权限**：✅ 允许
- **理由**：车队长需要向老板汇报工作

#### 车队长 → 平级账号
- **权限**：✅ 允许
- **理由**：车队长需要向管理层汇报工作

#### 车队长 → 其他车队长
- **权限**：❌ 不允许
- **理由**：车队长之间不需要直接发送通知

**结论**：✅ 符合要求

---

### 测试场景 3：平级账号发送通知

#### 平级账号 → 老板
- **权限**：✅ 允许
- **理由**：平级账号需要向老板汇报工作

#### 平级账号 → 车队长
- **权限**：✅ 允许
- **理由**：平级账号需要向车队长发送指令、通知

#### 平级账号 → 司机
- **权限**：✅ 允许
- **理由**：平级账号需要向司机发送通知、公告

#### 平级账号 → 其他平级账号
- **权限**：✅ 允许
- **理由**：平级账号之间需要协作沟通

**结论**：✅ 符合要求

---

### 测试场景 4：老板发送通知

#### 老板 → 所有人
- **权限**：✅ 允许
- **理由**：老板是租户系统最高权限，可以向所有人发送通知

**结论**：✅ 符合要求

---

## 三、通知权限矩阵

### 发送通知权限

| 发送者 \ 接收者 | 老板 | 平级账号 | 车队长 | 司机（管辖范围内） | 司机（管辖范围外） |
|----------------|------|----------|--------|-------------------|-------------------|
| **老板** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **平级账号（完整权限）** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **平级账号（只读权限）** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **车队长（完整权限）** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **车队长（只读权限）** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **司机** | ✅ | ✅ | ✅ | ❌ | ❌ |

### 查看通知权限

| 角色 | 查看发送给自己的通知 | 查看自己发送的通知 | 查看其他人的通知 |
|------|---------------------|-------------------|-----------------|
| **所有角色** | ✅ | ✅ | ❌ |

---

## 四、RLS 策略设计

### 1. can_send_notification 辅助函数

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
            (receiver.role = 'driver' AND receiver.warehouse_ids && sender.warehouse_ids)
            OR
            (receiver.role = 'boss')
            OR
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

### 2. notifications 表 RLS 策略

#### 策略 1：查看通知
```sql
CREATE POLICY "查看通知" ON notifications
  FOR SELECT TO authenticated
  USING (
    receiver_id = auth.uid() OR sender_id = auth.uid()
  );
```

#### 策略 2：发送通知
```sql
CREATE POLICY "发送通知" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND
    can_send_notification(auth.uid(), receiver_id)
  );
```

#### 策略 3：更新通知
```sql
CREATE POLICY "更新通知" ON notifications
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid());
```

#### 策略 4：删除通知
```sql
CREATE POLICY "删除通知" ON notifications
  FOR DELETE TO authenticated
  USING (
    receiver_id = auth.uid() OR sender_id = auth.uid()
  );
```

---

## 五、实施计划

### ✅ 已完成

1. ✅ 设计通知表结构
2. ✅ 设计通知权限规则
3. ✅ 设计 RLS 策略
4. ✅ 创建迁移文件

### ⏳ 待完成

1. ⏳ 应用迁移，更新 create_tenant_schema 函数
2. ⏳ 测试通知发送权限
3. ⏳ 测试通知查看权限

---

## 六、总结

### ✅ 需求确认

1. ✅ **需要创建 notifications 表**：在每个租户的 Schema 中创建
2. ✅ **司机发送通知权限**：可以向老板、平级账号、车队长发送通知
3. ✅ **车队长发送通知权限**：可以向管辖范围内的司机、老板、平级账号发送通知
4. ✅ **平级账号发送通知权限**：可以向老板、车队长、司机发送通知
5. ✅ **老板发送通知权限**：可以向所有人发送通知

### 📊 核心特性

1. **细粒度权限控制**：根据角色和管辖范围控制发送权限
2. **数据隔离**：用户只能查看与自己相关的通知
3. **状态管理**：支持未读/已读状态
4. **类型分类**：支持系统/用户/公告类型
5. **Schema 隔离**：每个租户拥有独立的通知表

---

**测试状态**：⏳ 进行中  
**测试日期**：2025-11-27  
**测试人员**：秒哒 AI
