# PEER_ADMIN角色功能说明

## 📋 概述

**执行时间**: 2025-12-01  
**状态**: ✅ 已完成

---

## 🎯 功能说明

### 1. PEER_ADMIN角色

**PEER_ADMIN**（对等管理员）是一个新增的角色，具有以下特点：

- **权限范围**：与BOSS相同
- **受BOSS控制**：只有BOSS可以创建、管理和删除PEER_ADMIN
- **权限级别**：支持两种权限级别
  - `full_control`：完整控制权（可以管理所有数据和用户）
  - `view_only`：仅查看权（只能查看数据，不能修改）

### 2. 权限级别详解

#### 2.1 完整控制权（full_control）

**权限说明**：
- 拥有与BOSS相同的所有权限
- 可以查看和管理所有数据
- 可以创建、修改、删除用户
- 可以管理仓库、车辆、考勤等所有业务数据
- 可以审批请假、离职申请
- 可以发送通知

**适用场景**：
- 需要完全代理BOSS进行管理的管理员
- 负责日常运营管理的高级管理员
- 需要完整权限的副总经理或运营总监

#### 2.2 仅查看权（view_only）

**权限说明**：
- 只能查看所有数据
- 不能修改、创建或删除任何数据
- 不能审批申请
- 不能发送通知
- 不能管理用户

**适用场景**：
- 需要查看数据进行分析的数据分析师
- 需要监督运营情况的监察人员
- 需要了解业务情况的顾问或咨询人员

---

## 📊 数据库结构

### 1. peer_admin_permissions表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户ID（外键关联users表） |
| permission_level | text | 权限级别（full_control或view_only） |
| granted_by | uuid | 授权人ID（BOSS的用户ID） |
| granted_at | timestamptz | 授权时间 |
| updated_at | timestamptz | 更新时间 |
| notes | text | 备注 |

**约束**：
- `valid_permission_level`：权限级别只能是'full_control'或'view_only'
- `unique_user_permission`：每个用户只能有一条权限记录

**索引**：
- `idx_peer_admin_permissions_user_id`：用户ID索引
- `idx_peer_admin_permissions_granted_by`：授权人ID索引
- `idx_peer_admin_permissions_level`：权限级别索引

---

## 🔧 数据库函数

### 1. 权限检查函数

#### 1.1 is_peer_admin
**功能**：检查用户是否为PEER_ADMIN

**参数**：
- `p_user_id` (uuid)：用户ID

**返回**：boolean

**示例**：
```sql
SELECT is_peer_admin('user-uuid');
```

#### 1.2 peer_admin_has_full_control
**功能**：检查PEER_ADMIN是否有完整控制权

**参数**：
- `p_user_id` (uuid)：用户ID

**返回**：boolean

**示例**：
```sql
SELECT peer_admin_has_full_control('user-uuid');
```

#### 1.3 peer_admin_is_view_only
**功能**：检查PEER_ADMIN是否只有查看权

**参数**：
- `p_user_id` (uuid)：用户ID

**返回**：boolean

**示例**：
```sql
SELECT peer_admin_is_view_only('user-uuid');
```

#### 1.4 is_boss_or_full_control_peer_admin
**功能**：检查用户是否为BOSS或有完整控制权的PEER_ADMIN

**参数**：
- `p_user_id` (uuid)：用户ID

**返回**：boolean

**示例**：
```sql
SELECT is_boss_or_full_control_peer_admin('user-uuid');
```

#### 1.5 is_admin（已更新）
**功能**：检查用户是否为管理员（BOSS或有完整控制权的PEER_ADMIN）

**参数**：
- `uid` (uuid)：用户ID

**返回**：boolean

**说明**：此函数已更新，现在包含有完整控制权的PEER_ADMIN

**示例**：
```sql
SELECT is_admin('user-uuid');
```

### 2. 管理函数

#### 2.1 create_peer_admin
**功能**：创建PEER_ADMIN（仅BOSS可用）

**参数**：
- `p_user_id` (uuid)：用户ID
- `p_permission_level` (text)：权限级别（'full_control'或'view_only'）
- `p_boss_id` (uuid)：BOSS的用户ID
- `p_notes` (text, 可选)：备注

**返回**：uuid（权限记录ID）

**异常**：
- 只有BOSS可以创建PEER_ADMIN
- 用户不存在
- 无效的权限级别
- 用户已经是PEER_ADMIN

**示例**：
```sql
SELECT create_peer_admin(
  'user-uuid',
  'full_control',
  'boss-uuid',
  '负责日常运营管理'
);
```

#### 2.2 update_peer_admin_permission
**功能**：更新PEER_ADMIN权限级别（仅BOSS可用）

**参数**：
- `p_user_id` (uuid)：用户ID
- `p_permission_level` (text)：新的权限级别
- `p_boss_id` (uuid)：BOSS的用户ID
- `p_notes` (text, 可选)：备注

**返回**：boolean

**异常**：
- 只有BOSS可以更新PEER_ADMIN权限
- 用户不是PEER_ADMIN
- 无效的权限级别

**示例**：
```sql
SELECT update_peer_admin_permission(
  'user-uuid',
  'view_only',
  'boss-uuid',
  '调整为仅查看权限'
);
```

#### 2.3 remove_peer_admin
**功能**：删除PEER_ADMIN（仅BOSS可用）

**参数**：
- `p_user_id` (uuid)：用户ID
- `p_boss_id` (uuid)：BOSS的用户ID

**返回**：boolean

**异常**：
- 只有BOSS可以删除PEER_ADMIN
- 用户不是PEER_ADMIN

**示例**：
```sql
SELECT remove_peer_admin('user-uuid', 'boss-uuid');
```

### 3. 查询函数

#### 3.1 get_all_peer_admins
**功能**：获取所有PEER_ADMIN列表（仅BOSS可用）

**参数**：
- `p_boss_id` (uuid)：BOSS的用户ID

**返回**：表格
- `user_id` (uuid)：用户ID
- `user_name` (text)：用户名称
- `user_phone` (text)：用户手机号
- `user_email` (text)：用户邮箱
- `permission_level` (text)：权限级别
- `granted_by` (uuid)：授权人ID
- `granted_by_name` (text)：授权人名称
- `granted_at` (timestamptz)：授权时间
- `notes` (text)：备注

**异常**：
- 只有BOSS可以查看PEER_ADMIN列表

**示例**：
```sql
SELECT * FROM get_all_peer_admins('boss-uuid');
```

#### 3.2 get_peer_admin_permission
**功能**：获取PEER_ADMIN权限详情

**参数**：
- `p_user_id` (uuid)：用户ID

**返回**：表格
- `user_id` (uuid)：用户ID
- `permission_level` (text)：权限级别
- `granted_by` (uuid)：授权人ID
- `granted_by_name` (text)：授权人名称
- `granted_at` (timestamptz)：授权时间
- `updated_at` (timestamptz)：更新时间
- `notes` (text)：备注

**示例**：
```sql
SELECT * FROM get_peer_admin_permission('user-uuid');
```

---

## 💻 TypeScript API

### 1. 类型定义

```typescript
/**
 * 权限级别
 */
export type PermissionLevel = 'full_control' | 'view_only'

/**
 * PEER_ADMIN权限信息
 */
export interface PeerAdminPermission {
  user_id: string
  permission_level: PermissionLevel
  granted_by: string
  granted_by_name: string
  granted_at: string
  updated_at: string
  notes: string | null
}

/**
 * PEER_ADMIN列表项
 */
export interface PeerAdminListItem {
  user_id: string
  user_name: string
  user_phone: string
  user_email: string
  permission_level: PermissionLevel
  granted_by: string
  granted_by_name: string
  granted_at: string
  notes: string | null
}
```

### 2. API函数

#### 2.1 createPeerAdmin
**功能**：创建PEER_ADMIN

**参数**：
- `userId` (string)：用户ID
- `permissionLevel` (PermissionLevel)：权限级别
- `bossId` (string)：BOSS的用户ID
- `notes?` (string)：备注（可选）

**返回**：Promise<string | null>（权限记录ID）

**示例**：
```typescript
import { createPeerAdmin } from '@/db/api/peer-admin'

const permissionId = await createPeerAdmin(
  userId,
  'full_control',
  bossId,
  '负责日常运营管理'
)
```

#### 2.2 updatePeerAdminPermission
**功能**：更新PEER_ADMIN权限级别

**参数**：
- `userId` (string)：用户ID
- `permissionLevel` (PermissionLevel)：新的权限级别
- `bossId` (string)：BOSS的用户ID
- `notes?` (string)：备注（可选）

**返回**：Promise<boolean>

**示例**：
```typescript
import { updatePeerAdminPermission } from '@/db/api/peer-admin'

const success = await updatePeerAdminPermission(
  userId,
  'view_only',
  bossId,
  '调整为仅查看权限'
)
```

#### 2.3 removePeerAdmin
**功能**：删除PEER_ADMIN

**参数**：
- `userId` (string)：用户ID
- `bossId` (string)：BOSS的用户ID

**返回**：Promise<boolean>

**示例**：
```typescript
import { removePeerAdmin } from '@/db/api/peer-admin'

const success = await removePeerAdmin(userId, bossId)
```

#### 2.4 getAllPeerAdmins
**功能**：获取所有PEER_ADMIN列表

**参数**：
- `bossId` (string)：BOSS的用户ID

**返回**：Promise<PeerAdminListItem[]>

**示例**：
```typescript
import { getAllPeerAdmins } from '@/db/api/peer-admin'

const peerAdmins = await getAllPeerAdmins(bossId)
console.log('PEER_ADMIN列表:', peerAdmins)
```

#### 2.5 getPeerAdminPermission
**功能**：获取PEER_ADMIN权限详情

**参数**：
- `userId` (string)：用户ID

**返回**：Promise<PeerAdminPermission | null>

**示例**：
```typescript
import { getPeerAdminPermission } from '@/db/api/peer-admin'

const permission = await getPeerAdminPermission(userId)
console.log('权限详情:', permission)
```

#### 2.6 isPeerAdmin
**功能**：检查用户是否为PEER_ADMIN

**参数**：
- `userId` (string)：用户ID

**返回**：Promise<boolean>

**示例**：
```typescript
import { isPeerAdmin } from '@/db/api/peer-admin'

const isPeer = await isPeerAdmin(userId)
console.log('是否为PEER_ADMIN:', isPeer)
```

#### 2.7 peerAdminHasFullControl
**功能**：检查PEER_ADMIN是否有完整控制权

**参数**：
- `userId` (string)：用户ID

**返回**：Promise<boolean>

**示例**：
```typescript
import { peerAdminHasFullControl } from '@/db/api/peer-admin'

const hasFullControl = await peerAdminHasFullControl(userId)
console.log('是否有完整控制权:', hasFullControl)
```

#### 2.8 peerAdminIsViewOnly
**功能**：检查PEER_ADMIN是否只有查看权

**参数**：
- `userId` (string)：用户ID

**返回**：Promise<boolean>

**示例**：
```typescript
import { peerAdminIsViewOnly } from '@/db/api/peer-admin'

const isViewOnly = await peerAdminIsViewOnly(userId)
console.log('是否只有查看权:', isViewOnly)
```

#### 2.9 isBossOrFullControlPeerAdmin
**功能**：检查用户是否为BOSS或有完整控制权的PEER_ADMIN

**参数**：
- `userId` (string)：用户ID

**返回**：Promise<boolean>

**示例**：
```typescript
import { isBossOrFullControlPeerAdmin } from '@/db/api/peer-admin'

const isAdmin = await isBossOrFullControlPeerAdmin(userId)
console.log('是否为管理员:', isAdmin)
```

---

## 📝 使用示例

### 1. 创建PEER_ADMIN

```typescript
import { createPeerAdmin } from '@/db/api/peer-admin'
import Taro from '@tarojs/taro'

const handleCreatePeerAdmin = async (userId: string, bossId: string) => {
  try {
    // 创建有完整控制权的PEER_ADMIN
    const permissionId = await createPeerAdmin(
      userId,
      'full_control',
      bossId,
      '负责日常运营管理'
    )
    
    Taro.showToast({
      title: '创建成功',
      icon: 'success'
    })
    
    console.log('权限记录ID:', permissionId)
  } catch (error) {
    Taro.showToast({
      title: error.message || '创建失败',
      icon: 'error'
    })
  }
}
```

### 2. 更新PEER_ADMIN权限

```typescript
import { updatePeerAdminPermission } from '@/db/api/peer-admin'
import Taro from '@tarojs/taro'

const handleUpdatePermission = async (userId: string, bossId: string) => {
  try {
    // 将权限从完整控制权改为仅查看权
    const success = await updatePeerAdminPermission(
      userId,
      'view_only',
      bossId,
      '调整为仅查看权限'
    )
    
    if (success) {
      Taro.showToast({
        title: '更新成功',
        icon: 'success'
      })
    }
  } catch (error) {
    Taro.showToast({
      title: error.message || '更新失败',
      icon: 'error'
    })
  }
}
```

### 3. 删除PEER_ADMIN

```typescript
import { removePeerAdmin } from '@/db/api/peer-admin'
import Taro from '@tarojs/taro'

const handleRemovePeerAdmin = async (userId: string, bossId: string) => {
  try {
    const success = await removePeerAdmin(userId, bossId)
    
    if (success) {
      Taro.showToast({
        title: '删除成功',
        icon: 'success'
      })
    }
  } catch (error) {
    Taro.showToast({
      title: error.message || '删除失败',
      icon: 'error'
    })
  }
}
```

### 4. 查看PEER_ADMIN列表

```typescript
import { getAllPeerAdmins } from '@/db/api/peer-admin'
import { useState, useEffect } from 'react'

const PeerAdminList = ({ bossId }: { bossId: string }) => {
  const [peerAdmins, setPeerAdmins] = useState([])
  
  useEffect(() => {
    loadPeerAdmins()
  }, [])
  
  const loadPeerAdmins = async () => {
    try {
      const data = await getAllPeerAdmins(bossId)
      setPeerAdmins(data)
    } catch (error) {
      console.error('加载失败:', error)
    }
  }
  
  return (
    <View>
      {peerAdmins.map(admin => (
        <View key={admin.user_id}>
          <Text>{admin.user_name}</Text>
          <Text>{admin.permission_level === 'full_control' ? '完整控制权' : '仅查看权'}</Text>
        </View>
      ))}
    </View>
  )
}
```

### 5. 权限检查

```typescript
import { 
  isPeerAdmin, 
  peerAdminHasFullControl,
  isBossOrFullControlPeerAdmin 
} from '@/db/api/peer-admin'

const checkUserPermissions = async (userId: string) => {
  // 检查是否为PEER_ADMIN
  const isPeer = await isPeerAdmin(userId)
  console.log('是否为PEER_ADMIN:', isPeer)
  
  // 检查是否有完整控制权
  if (isPeer) {
    const hasFullControl = await peerAdminHasFullControl(userId)
    console.log('是否有完整控制权:', hasFullControl)
  }
  
  // 检查是否为管理员（BOSS或有完整控制权的PEER_ADMIN）
  const isAdmin = await isBossOrFullControlPeerAdmin(userId)
  console.log('是否为管理员:', isAdmin)
}
```

---

## 🔒 权限控制

### 1. RLS策略

#### 1.1 peer_admin_permissions表

| 策略名称 | 操作 | 说明 |
|---------|------|------|
| BOSS可以查看所有PEER_ADMIN权限 | SELECT | BOSS可以查看所有PEER_ADMIN的权限记录 |
| BOSS可以管理PEER_ADMIN权限 | ALL | BOSS可以创建、修改、删除PEER_ADMIN权限 |
| PEER_ADMIN可以查看自己的权限 | SELECT | PEER_ADMIN可以查看自己的权限详情 |

### 2. 函数权限

| 函数名 | 权限要求 | 说明 |
|--------|---------|------|
| create_peer_admin | 仅BOSS | 只有BOSS可以创建PEER_ADMIN |
| update_peer_admin_permission | 仅BOSS | 只有BOSS可以更新PEER_ADMIN权限 |
| remove_peer_admin | 仅BOSS | 只有BOSS可以删除PEER_ADMIN |
| get_all_peer_admins | 仅BOSS | 只有BOSS可以查看PEER_ADMIN列表 |
| get_peer_admin_permission | 所有用户 | 所有用户可以查看指定用户的权限详情 |
| is_peer_admin | 所有用户 | 所有用户可以检查用户是否为PEER_ADMIN |
| peer_admin_has_full_control | 所有用户 | 所有用户可以检查PEER_ADMIN是否有完整控制权 |
| peer_admin_is_view_only | 所有用户 | 所有用户可以检查PEER_ADMIN是否只有查看权 |
| is_boss_or_full_control_peer_admin | 所有用户 | 所有用户可以检查用户是否为BOSS或有完整控制权的PEER_ADMIN |

---

## 📊 审计日志

系统会自动记录PEER_ADMIN权限的所有变更：

### 1. 创建PEER_ADMIN
- 事件类型：`peer_admin_created`
- 记录内容：权限级别、授权人

### 2. 更新权限级别
- 事件类型：`peer_admin_permission_changed`
- 记录内容：旧权限级别、新权限级别

### 3. 删除PEER_ADMIN
- 事件类型：`peer_admin_removed`
- 记录内容：权限级别、授权人

---

## ✅ 验证结果

### 1. 数据库验证
- ✅ peer_admin_permissions表创建成功
- ✅ 所有索引创建成功
- ✅ RLS策略创建成功
- ✅ 所有函数创建成功
- ✅ 触发器创建成功

### 2. 功能验证
- ✅ 创建PEER_ADMIN功能正常
- ✅ 更新权限级别功能正常
- ✅ 删除PEER_ADMIN功能正常
- ✅ 查询功能正常
- ✅ 权限检查功能正常

### 3. 权限验证
- ✅ BOSS可以管理PEER_ADMIN
- ✅ PEER_ADMIN可以查看自己的权限
- ✅ 非BOSS用户无法管理PEER_ADMIN
- ✅ 有完整控制权的PEER_ADMIN被is_admin函数识别为管理员

### 4. 代码质量验证
- ✅ TypeScript类型定义完整
- ✅ API函数实现完整
- ✅ 错误处理完善
- ✅ 日志记录详细
- ✅ 代码检查通过（230个文件）

---

## 🎉 总结

### 主要成果

1. **角色系统扩展**
   - ✅ 添加了PEER_ADMIN角色
   - ✅ 实现了两级权限控制（完整控制权和仅查看权）
   - ✅ 完善了权限检查机制

2. **数据库设计**
   - ✅ 创建了peer_admin_permissions表
   - ✅ 添加了完整的索引和约束
   - ✅ 实现了RLS策略

3. **功能实现**
   - ✅ 创建了10个数据库函数
   - ✅ 实现了完整的CRUD操作
   - ✅ 添加了权限检查函数

4. **API封装**
   - ✅ 创建了完整的TypeScript API
   - ✅ 定义了2个TypeScript接口
   - ✅ 实现了9个API函数

5. **审计和日志**
   - ✅ 实现了权限变更审计
   - ✅ 记录所有关键操作
   - ✅ 支持权限变更追踪

### 下一步工作

1. **前端界面**
   - 创建PEER_ADMIN管理页面
   - 实现权限级别切换界面
   - 添加PEER_ADMIN列表展示

2. **功能增强**
   - 添加批量操作功能
   - 实现权限变更通知
   - 添加权限使用统计

3. **文档完善**
   - 添加更多使用示例
   - 创建最佳实践指南
   - 编写故障排查文档

---

**文档版本**: 1.0  
**创建时间**: 2025-12-01  
**维护人员**: 系统管理员  
**状态**: ✅ 已完成
