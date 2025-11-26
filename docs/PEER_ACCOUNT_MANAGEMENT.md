# 平级账号管理指南

## 📋 概述

平级账号（Peer Account）是主账号（老板）下属的相同权限账号，用于多人共同管理同一个车队。

## 🎯 核心特性

### 1. 什么是平级账号？

- **定义**：平级账号是绑定到主账号的子账号，拥有与主账号相同的权限
- **用途**：允许多人（如老板和合伙人）共同管理同一个车队
- **数量限制**：一个主账号最多可以创建 **3 个平级账号**

### 2. 平级账号 vs 主账号

| 特性 | 主账号 | 平级账号 |
|------|--------|---------|
| **角色** | `super_admin` | `super_admin` |
| **main_account_id** | `NULL` | 主账号的 ID |
| **数据库 Schema** | 拥有独立的 `tenant_xxx` schema | 使用主账号的 schema |
| **权限** | 完全权限 | 与主账号相同的权限 |
| **管理** | 可以创建/管理平级账号 | 不能创建平级账号 |
| **数量** | 1 个 | 最多 3 个 |

### 3. 数据隔离

```
主账号（老板A）
  ↓
tenant_xxx schema（独立数据库）
  ↑
平级账号1、平级账号2、平级账号3
（共享主账号的数据库）
```

**关键点**：
- ✅ 主账号和平级账号共享同一个数据库 Schema
- ✅ 平级账号不会创建独立的 Schema
- ✅ 所有平级账号看到的数据完全相同
- ✅ 平级账号的操作会影响主账号的数据

---

## 🔧 技术实现

### 1. 数据库结构

#### profiles 表字段

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  name text,
  phone text,
  role user_role,  -- 'super_admin' 表示主账号或平级账号
  main_account_id uuid REFERENCES profiles(id),  -- NULL = 主账号，非 NULL = 平级账号
  -- 其他字段...
);
```

#### 区分主账号和平级账号

```sql
-- 主账号
SELECT * FROM profiles
WHERE role = 'super_admin'
  AND main_account_id IS NULL;

-- 平级账号
SELECT * FROM profiles
WHERE role = 'super_admin'
  AND main_account_id IS NOT NULL;
```

### 2. Schema 创建规则

#### 触发器逻辑

```sql
-- 只为主账号创建 Schema
IF NEW.role = 'super_admin' AND NEW.main_account_id IS NULL THEN
  -- 创建独立的 tenant_xxx schema
  PERFORM create_tenant_schema(NEW.id);
ELSIF NEW.role = 'super_admin' AND NEW.main_account_id IS NOT NULL THEN
  -- 平级账号，不创建 Schema
  RAISE NOTICE '平级账号，使用主账号的 Schema';
END IF;
```

### 3. search_path 设置

#### 自动选择正确的 Schema

```sql
-- 在 set_tenant_search_path 函数中
IF main_account_id IS NOT NULL THEN
  -- 平级账号，使用主账号的 Schema
  tenant_boss_id := main_account_id;
ELSE
  -- 主账号，使用自己的 Schema
  tenant_boss_id := auth.uid();
END IF;

-- 构造 Schema 名称
target_schema := 'tenant_' || replace(tenant_boss_id::text, '-', '_');
```

### 4. 数量限制

#### 触发器检查

```sql
-- 在插入平级账号前检查数量
CREATE TRIGGER trigger_check_peer_account_limit
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_peer_account_limit();

-- 检查函数
CREATE FUNCTION check_peer_account_limit()
RETURNS TRIGGER AS $$
DECLARE
  peer_count int;
BEGIN
  IF NEW.role = 'super_admin' AND NEW.main_account_id IS NOT NULL THEN
    SELECT COUNT(*) INTO peer_count
    FROM profiles
    WHERE main_account_id = NEW.main_account_id
      AND role = 'super_admin';
    
    IF peer_count >= 3 THEN
      RAISE EXCEPTION '一个主账号最多只能创建 3 个平级账号';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 💼 使用场景

### 场景 1：老板和合伙人共同管理

**需求**：
- 老板 A 和合伙人 B 共同管理一个车队
- 两人需要相同的权限，都能管理司机、车辆、考勤等

**解决方案**：
1. 老板 A 注册主账号
2. 老板 A 创建平级账号给合伙人 B
3. 合伙人 B 使用平级账号登录
4. 两人看到的数据完全相同

### 场景 2：多设备登录

**需求**：
- 老板需要在多个设备上登录（手机、平板、电脑）
- 不想在多个设备上使用同一个账号

**解决方案**：
1. 主账号在手机上使用
2. 创建平级账号在平板和电脑上使用
3. 所有设备看到的数据一致

### 场景 3：临时授权

**需求**：
- 老板出差，需要临时授权给助理管理车队
- 出差结束后收回权限

**解决方案**：
1. 创建平级账号给助理
2. 助理使用平级账号管理车队
3. 出差结束后停用或删除平级账号

---

## 🚀 操作指南

### 1. 创建平级账号

#### 前端调用

```typescript
import { createPeerAccount } from '@/db/api'

const createPeer = async (mainAccountId: string) => {
  const result = await createPeerAccount(
    mainAccountId,
    {
      name: '合伙人张三',
      phone: '13900000002',
      notes: '合伙人账号'
    },
    null,  // email
    '123456'  // password
  )
  
  if (result === 'EMAIL_EXISTS') {
    console.log('手机号已被注册')
  } else if (result) {
    console.log('平级账号创建成功:', result)
  } else {
    console.log('创建失败')
  }
}
```

#### 数据库记录

```sql
INSERT INTO profiles (
  id,
  name,
  phone,
  role,
  main_account_id,  -- 指向主账号的 ID
  boss_id,          -- 与主账号相同
  status
) VALUES (
  '新平级账号UUID',
  '合伙人张三',
  '13900000002',
  'super_admin',
  '主账号UUID',
  '主账号UUID',
  'active'
);
```

### 2. 查看平级账号列表

```typescript
import { supabase } from '@/client/supabase'

const loadPeerAccounts = async (mainAccountId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('main_account_id', mainAccountId)
    .eq('role', 'super_admin')
    .order('created_at', { ascending: false })
  
  console.log('平级账号列表:', data)
}
```

### 3. 修改平级账号信息

```typescript
import { supabase } from '@/client/supabase'

const updatePeerAccount = async (peerAccountId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', peerAccountId)
    .select()
    .maybeSingle()
  
  if (error) {
    console.error('更新失败:', error)
  } else {
    console.log('更新成功:', data)
  }
}
```

### 4. 停用平级账号

```typescript
import { supabase } from '@/client/supabase'

const deactivatePeerAccount = async (peerAccountId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'inactive' })
    .eq('id', peerAccountId)
  
  if (error) {
    console.error('停用失败:', error)
  } else {
    console.log('平级账号已停用')
  }
}
```

### 5. 删除平级账号

```typescript
import { supabase } from '@/client/supabase'

const deletePeerAccount = async (peerAccountId: string) => {
  // 注意：删除平级账号不会删除 Schema（因为平级账号没有独立的 Schema）
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', peerAccountId)
  
  if (error) {
    console.error('删除失败:', error)
  } else {
    console.log('平级账号已删除')
  }
}
```

---

## 🔐 权限管理

### 主账号的权限

主账号可以：
- ✅ 创建平级账号（最多3个）
- ✅ 查看所有平级账号
- ✅ 修改平级账号信息
- ✅ 停用平级账号
- ✅ 删除平级账号
- ✅ 管理所有业务数据（仓库、司机、车辆等）

### 平级账号的权限

平级账号可以：
- ✅ 管理所有业务数据（与主账号相同）
- ✅ 查看主账号和其他平级账号的信息
- ❌ 不能创建新的平级账号
- ❌ 不能修改主账号的信息
- ❌ 不能删除主账号

---

## ⚠️ 注意事项

### 1. 数据共享

- 主账号和平级账号共享同一个数据库
- 平级账号的任何操作都会影响主账号的数据
- 删除平级账号不会删除数据

### 2. 数量限制

- 一个主账号最多创建 3 个平级账号
- 超过限制时会抛出异常
- 如需更多账号，请联系系统管理员

### 3. 安全建议

- 只为信任的人创建平级账号
- 定期检查平级账号列表
- 及时停用或删除不再使用的平级账号
- 不要共享平级账号的密码

### 4. Schema 管理

- 平级账号不会创建独立的 Schema
- 删除平级账号不会影响主账号的 Schema
- 如果错误地为平级账号创建了 Schema，需要手动删除

---

## 🐛 故障排查

### 问题 1：平级账号无法登录

**可能原因**：
- 账号被停用（status = 'inactive'）
- 密码错误

**解决方法**：
```sql
-- 检查账号状态
SELECT id, name, phone, status
FROM profiles
WHERE id = '平级账号UUID';

-- 重新启用账号
UPDATE profiles
SET status = 'active'
WHERE id = '平级账号UUID';
```

### 问题 2：平级账号看不到数据

**可能原因**：
- search_path 设置错误
- 主账号的 Schema 不存在

**解决方法**：
```sql
-- 检查 Schema 是否存在
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%';

-- 手动设置 search_path
SELECT set_tenant_search_path();
```

### 问题 3：无法创建平级账号（超过限制）

**可能原因**：
- 已经创建了 3 个平级账号

**解决方法**：
```sql
-- 查看当前平级账号数量
SELECT COUNT(*)
FROM profiles
WHERE main_account_id = '主账号UUID'
  AND role = 'super_admin';

-- 删除不需要的平级账号
DELETE FROM profiles
WHERE id = '不需要的平级账号UUID';
```

### 问题 4：平级账号错误地创建了 Schema

**可能原因**：
- 在修复触发器之前创建的平级账号

**解决方法**：
```sql
-- 删除平级账号的 Schema
SELECT drop_tenant_schema('平级账号UUID');
```

---

## 📚 相关文档

- [独立数据库隔离架构](../SCHEMA_ISOLATION_SUMMARY.md)
- [租赁系统数据库架构](LEASE_SYSTEM_DATABASE_ARCHITECTURE.md)
- [快速入门指南](../QUICK_START_SCHEMA_ISOLATION.md)

---

## 🎉 总结

平级账号是一个强大的功能，允许多人共同管理同一个车队：

✅ **相同权限** - 平级账号与主账号拥有相同的权限  
✅ **数据共享** - 共享同一个数据库，数据完全一致  
✅ **灵活管理** - 主账号可以随时创建、修改、停用、删除平级账号  
✅ **数量限制** - 最多 3 个平级账号，防止滥用  
✅ **安全隔离** - 不同主账号的平级账号之间完全隔离  

这是一个**简单、安全、易用**的多人协作解决方案！🎊
