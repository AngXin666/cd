# 租赁端功能优化：老板账号展开显示车队长列表

## 功能概述

优化了租赁管理端的租户列表页面，实现了老板账号可展开显示下属车队长的功能。点击老板账号可以查看该老板下的所有车队长信息，提升了租赁管理的便捷性。

## 功能特性

### 1. 展开/收起交互
- **点击展开**：点击老板账号卡片顶部区域，可展开显示该老板下的车队长列表
- **动态图标**：展开状态下显示向下箭头（▼），收起状态下显示向右箭头（▶）
- **多账号支持**：支持同时展开多个老板账号，互不影响

### 2. 车队长列表显示
- **懒加载机制**：只有在点击展开时才加载车队长数据，提升页面性能
- **数据缓存**：已加载的车队长数据会被缓存，再次展开时无需重新加载
- **信息展示**：
  - 车队长姓名
  - 联系电话
  - 登录账号
  - 账号状态（正常/停用）
- **数量统计**：显示该老板下的车队长总数

### 3. UI 设计
- **视觉区分**：车队长列表使用灰色背景，与老板账号卡片区分
- **图标标识**：
  - 老板账号：展开/收起箭头
  - 车队长列表：团队图标
  - 车队长卡片：领带图标
- **状态提示**：
  - 加载中：显示"加载中..."提示
  - 空状态：显示"暂无车队长"提示

## 技术实现

### 1. 新增 API 函数

在 `src/db/api.ts` 中新增：

```typescript
/**
 * 获取某个租户下的所有车队长
 */
export async function getManagersByTenantId(tenantId: string): Promise<Profile[]>
```

**功能说明**：
- 查询指定租户（老板）下的所有车队长
- 按创建时间倒序排列
- 返回车队长的完整 Profile 信息

### 2. 页面状态管理

在 `src/pages/lease-admin/tenant-list/index.tsx` 中添加：

```typescript
// 展开状态：记录哪些老板账号被展开了
const [expandedTenantIds, setExpandedTenantIds] = useState<Set<string>>(new Set())

// 车队长数据：记录每个老板下的车队长列表
const [managersMap, setManagersMap] = useState<Map<string, Profile[]>>(new Map())

// 加载中的老板ID
const [loadingManagerIds, setLoadingManagerIds] = useState<Set<string>>(new Set())
```

### 3. 展开/收起逻辑

```typescript
const handleToggleExpand = async (tenantId: string) => {
  const newExpandedIds = new Set(expandedTenantIds)
  
  if (newExpandedIds.has(tenantId)) {
    // 收起
    newExpandedIds.delete(tenantId)
    setExpandedTenantIds(newExpandedIds)
  } else {
    // 展开
    newExpandedIds.add(tenantId)
    setExpandedTenantIds(newExpandedIds)
    
    // 如果还没有加载过车队长数据，则加载
    if (!managersMap.has(tenantId)) {
      // 加载车队长数据
      const managers = await getManagersByTenantId(tenantId)
      setManagersMap(new Map(managersMap).set(tenantId, managers))
    }
  }
}
```

## 使用场景

### 场景 1：查看老板下的车队长
1. 租赁管理员登录系统
2. 进入"租户管理"页面
3. 点击某个老板账号的顶部区域
4. 系统展开显示该老板下的所有车队长
5. 可以查看车队长的姓名、电话、账号等信息

### 场景 2：管理多个老板的车队长
1. 租赁管理员可以同时展开多个老板账号
2. 对比不同老板下的车队长配置
3. 快速了解各个租户的管理团队规模

### 场景 3：检查车队长状态
1. 展开老板账号
2. 查看车队长列表中的状态标识
3. 识别哪些车队长账号已停用
4. 及时发现异常状态

## 性能优化

### 1. 懒加载
- 只有在用户点击展开时才加载车队长数据
- 避免一次性加载所有老板的车队长数据
- 减少初始页面加载时间

### 2. 数据缓存
- 已加载的车队长数据会被缓存在 `managersMap` 中
- 再次展开同一个老板账号时，直接使用缓存数据
- 减少不必要的 API 请求

### 3. 状态管理
- 使用 `Set` 数据结构管理展开状态，查询效率高
- 使用 `Map` 数据结构缓存车队长数据，访问效率高
- 独立的加载状态管理，避免全局 loading 影响用户体验

## 用户体验优化

### 1. 视觉反馈
- **展开图标动画**：箭头方向变化提供视觉反馈
- **加载提示**：显示"加载中..."避免用户等待焦虑
- **空状态提示**：明确告知用户该老板下暂无车队长

### 2. 交互设计
- **点击区域**：整个老板账号顶部区域都可点击展开
- **独立操作**：展开/收起不影响其他操作按钮
- **多账号支持**：可以同时展开多个老板账号进行对比

### 3. 信息层次
- **主卡片**：老板账号信息（白色背景）
- **子列表**：车队长列表（灰色背景）
- **子卡片**：单个车队长信息（白色背景，带边框）

## 数据结构

### Profile 类型
```typescript
interface Profile {
  id: string
  name: string | null
  phone: string | null
  login_account: string | null
  role: 'driver' | 'manager' | 'super_admin' | 'lease_admin'
  status: 'active' | 'suspended'
  tenant_id: string | null
  // ... 其他字段
}
```

### 车队长查询条件
- `role = 'manager'`：角色为车队长
- `tenant_id = tenantId`：属于指定租户
- 按 `created_at` 倒序排列

## 测试建议

### 1. 功能测试
- [ ] 点击老板账号可以正常展开
- [ ] 点击已展开的老板账号可以正常收起
- [ ] 展开时正确显示车队长列表
- [ ] 车队长信息显示完整（姓名、电话、账号、状态）
- [ ] 车队长数量统计正确

### 2. 性能测试
- [ ] 首次展开时加载车队长数据
- [ ] 再次展开时使用缓存数据，无需重新加载
- [ ] 同时展开多个老板账号时性能正常

### 3. 边界测试
- [ ] 老板下没有车队长时显示"暂无车队长"
- [ ] 加载车队长失败时显示错误提示
- [ ] 网络慢时显示"加载中..."提示

### 4. 兼容性测试
- [ ] 微信小程序环境正常运行
- [ ] H5 环境正常运行
- [ ] 不同屏幕尺寸下显示正常

## 后续优化建议

### 1. 功能增强
- 支持在车队长列表中直接编辑车队长信息
- 支持在车队长列表中直接停用/启用车队长
- 支持在车队长列表中查看车队长的详细信息

### 2. 交互优化
- 添加展开/收起动画效果
- 支持全部展开/全部收起功能
- 支持搜索时自动展开匹配的老板账号

### 3. 数据展示
- 显示车队长管理的仓库数量
- 显示车队长管理的司机数量
- 显示车队长的最后登录时间

## 相关文件

### 修改的文件
1. `src/db/api.ts`
   - 新增 `getManagersByTenantId` 函数

2. `src/pages/lease-admin/tenant-list/index.tsx`
   - 添加展开状态管理
   - 添加车队长数据缓存
   - 实现展开/收起交互
   - 渲染车队长列表

### 相关页面
- 租户列表页面：`/pages/lease-admin/tenant-list/index`
- 租户详情页面：`/pages/lease-admin/tenant-detail/index`
- 租户编辑页面：`/pages/lease-admin/tenant-form/index`

## 总结

本次优化实现了租赁端老板账号的展开功能，使租赁管理员可以快速查看每个老板下的车队长信息。通过懒加载和数据缓存机制，在提升用户体验的同时保证了系统性能。清晰的视觉层次和友好的交互设计，让租赁管理工作更加高效便捷。
