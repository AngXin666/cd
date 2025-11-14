# 管理员仓库分配问题调试指南

## 📋 问题描述

**用户反馈**：普通管理员在登录的时候应该能读取到仓库分配，但现在普通管理员根本无法读取仓库分配，会显示"暂无分配仓库"。

## 🔍 问题分析

### 数据库状态检查

#### 1. 检查数据是否存在

```sql
-- 查看 manager_warehouses 表中的数据
SELECT 
  mw.id,
  mw.manager_id,
  p.phone as manager_phone,
  p.role as manager_role,
  mw.warehouse_id,
  w.name as warehouse_name
FROM manager_warehouses mw
LEFT JOIN profiles p ON p.id = mw.manager_id
LEFT JOIN warehouses w ON w.id = mw.warehouse_id
ORDER BY mw.created_at DESC;
```

**结果**：
- ✅ 数据存在
- admin2 (ID: 00000000-0000-0000-0000-000000000002) 被分配了"好惠购"仓库

#### 2. 检查 RLS 状态

```sql
-- 检查 manager_warehouses 表的 RLS 状态
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'manager_warehouses';
```

**结果**：
- ✅ RLS 未启用 (`rls_enabled: false`)
- 所以 RLS 策略不会阻止查询

#### 3. 检查 RLS 策略

```sql
-- 检查 RLS 策略
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'manager_warehouses';
```

**结果**：
- 有 3 个策略，但因为 RLS 未启用，所以不会生效

### 代码逻辑检查

#### 1. getManagerWarehouses 函数

**位置**：`src/db/api.ts:1268`

**逻辑**：
```typescript
export async function getManagerWarehouses(managerId: string): Promise<Warehouse[]> {
  // 1. 查询 manager_warehouses 表
  const {data, error} = await supabase
    .from('manager_warehouses')
    .select('warehouse_id')
    .eq('manager_id', managerId)
  
  // 2. 获取仓库详情
  const warehouseIds = data.map((item) => item.warehouse_id)
  const {data: warehouses} = await supabase
    .from('warehouses')
    .select('*')
    .in('id', warehouseIds)
  
  return warehouses
}
```

**状态**：✅ 逻辑正确

#### 2. useWarehousesData Hook

**位置**：`src/hooks/useWarehousesData.ts`

**逻辑**：
```typescript
const loadWarehouses = useCallback(async (forceRefresh = false) => {
  // 1. 尝试从缓存加载
  if (!forceRefresh) {
    const cachedData = loadFromCache()
    if (cachedData) {
      return cachedData
    }
  }
  
  // 2. 从服务器加载
  const warehousesData = await getManagerWarehouses(managerId)
  
  // 3. 保存到缓存
  saveToCache(warehousesData)
  
  return warehousesData
}, [managerId])
```

**状态**：✅ 逻辑正确

#### 3. 管理员页面

**位置**：`src/pages/manager/index.tsx`

**逻辑**：
```typescript
const {
  warehouses: rawWarehouses,
  loading: warehousesLoading,
  refresh: refreshWarehouses
} = useWarehousesData({
  managerId: user?.id || '',
  cacheEnabled: true,
  enableRealtime: true
})
```

**状态**：✅ 逻辑正确

## 🐛 可能的问题

### 问题 1: managerId 不正确

**可能原因**：
- `user?.id` 可能为空字符串
- `user?.id` 可能与数据库中的 manager_id 不匹配

**排查方法**：
1. 在浏览器控制台查看日志
2. 检查 `[useWarehousesData] 开始加载仓库列表，managerId: xxx`
3. 确认 managerId 是否正确

**预期值**：
- admin2 的 ID 应该是 `00000000-0000-0000-0000-000000000002`

### 问题 2: 缓存问题

**可能原因**：
- 缓存中存储了空数据
- 缓存没有过期，一直返回空数据

**排查方法**：
1. 在浏览器控制台查看日志
2. 检查是否有 `[useWarehousesData] 从缓存加载，仓库数量: 0`
3. 如果是，说明缓存了空数据

**解决方法**：
1. 清除缓存：在控制台执行
   ```javascript
   Taro.removeStorageSync('manager_warehouses_cache')
   ```
2. 刷新页面

### 问题 3: 网络请求失败

**可能原因**：
- Supabase 连接失败
- 网络问题
- API 错误

**排查方法**：
1. 在浏览器控制台查看日志
2. 检查是否有错误信息
3. 查看 Network 标签，检查请求是否成功

### 问题 4: 数据库查询返回空

**可能原因**：
- managerId 不匹配
- 数据被删除
- 查询条件错误

**排查方法**：
1. 在浏览器控制台查看日志
2. 检查 `[getManagerWarehouses] 查询结果: {data: [], error: null}`
3. 如果 data 为空数组，说明查询没有找到数据

## 🔧 调试步骤

### 步骤 1: 启用详细日志

**已完成**：
- ✅ 在 `getManagerWarehouses` 函数中添加了详细日志
- ✅ 在 `useWarehousesData` Hook 中添加了详细日志

### 步骤 2: 登录并查看日志

1. 使用 admin2 账号登录
   - 账号：admin2
   - 密码：123456

2. 打开浏览器开发者工具
   - 按 F12 或右键 -> 检查

3. 切换到 Console 标签

4. 查看日志输出

### 步骤 3: 分析日志

#### 场景 1: managerId 为空

**日志**：
```
[useWarehousesData] 开始加载仓库列表，managerId: , forceRefresh: false
```

**问题**：user?.id 为空

**解决方法**：
- 检查认证状态
- 确认用户已登录
- 检查 useAuth Hook 是否正常工作

#### 场景 2: 从缓存加载空数据

**日志**：
```
[useWarehousesData] 开始加载仓库列表，managerId: 00000000-0000-0000-0000-000000000002, forceRefresh: false
[useWarehousesData] 从缓存加载，仓库数量: 0
```

**问题**：缓存了空数据

**解决方法**：
```javascript
// 在浏览器控制台执行
Taro.removeStorageSync('manager_warehouses_cache')
// 然后刷新页面
```

#### 场景 3: 查询返回空

**日志**：
```
[useWarehousesData] 开始加载仓库列表，managerId: 00000000-0000-0000-0000-000000000002, forceRefresh: false
[useWarehousesData] 从服务器加载数据...
[getManagerWarehouses] 开始查询，管理员ID: 00000000-0000-0000-0000-000000000002
[getManagerWarehouses] 查询结果: {data: [], error: null}
[getManagerWarehouses] 没有找到仓库分配数据
[useWarehousesData] 服务器返回仓库数量: 0
```

**问题**：数据库查询没有找到数据

**可能原因**：
1. managerId 不匹配
2. 数据被删除
3. Supabase 配置问题

**排查方法**：
```sql
-- 在 Supabase SQL Editor 中执行
SELECT * FROM manager_warehouses 
WHERE manager_id = '00000000-0000-0000-0000-000000000002';
```

#### 场景 4: 查询成功

**日志**：
```
[useWarehousesData] 开始加载仓库列表，managerId: 00000000-0000-0000-0000-000000000002, forceRefresh: false
[useWarehousesData] 从服务器加载数据...
[getManagerWarehouses] 开始查询，管理员ID: 00000000-0000-0000-0000-000000000002
[getManagerWarehouses] 查询结果: {data: [{warehouse_id: 'xxx'}], error: null}
[getManagerWarehouses] 找到仓库ID列表: ['xxx']
[getManagerWarehouses] 仓库详情查询结果: {warehouses: [{id: 'xxx', name: '好惠购'}], warehouseError: null}
[getManagerWarehouses] 最终返回仓库数量: 1
[useWarehousesData] 服务器返回仓库数量: 1
```

**状态**：✅ 正常

## 🛠️ 临时解决方案

### 方案 1: 清除缓存

在浏览器控制台执行：
```javascript
Taro.removeStorageSync('manager_warehouses_cache')
location.reload()
```

### 方案 2: 强制刷新

在管理员首页下拉刷新

### 方案 3: 重新登录

1. 退出登录
2. 重新登录

## 📊 测试验证

### 测试 1: 检查 managerId

**步骤**：
1. admin2 登录
2. 打开控制台
3. 执行：
   ```javascript
   console.log('当前用户ID:', localStorage.getItem('supabase.auth.token'))
   ```

**预期**：应该看到 JWT token

### 测试 2: 手动查询

**步骤**：
1. 在控制台执行：
   ```javascript
   import {supabase} from '@/client/supabase'
   const {data, error} = await supabase
     .from('manager_warehouses')
     .select('warehouse_id')
     .eq('manager_id', '00000000-0000-0000-0000-000000000002')
   console.log('查询结果:', {data, error})
   ```

**预期**：应该返回仓库数据

### 测试 3: 检查认证状态

**步骤**：
1. 在控制台执行：
   ```javascript
   import {supabase} from '@/client/supabase'
   const {data: {user}} = await supabase.auth.getUser()
   console.log('当前用户:', user)
   ```

**预期**：应该返回用户信息

## 📝 下一步行动

1. **收集日志**
   - 请用户登录并提供控制台日志
   - 特别关注 `[useWarehousesData]` 和 `[getManagerWarehouses]` 开头的日志

2. **验证数据**
   - 确认数据库中确实有 admin2 的仓库分配
   - 确认 managerId 正确

3. **测试查询**
   - 在 Supabase SQL Editor 中手动查询
   - 确认查询能返回数据

4. **检查认证**
   - 确认用户已正确登录
   - 确认 JWT token 有效

## ✅ 修复状态

| 项目 | 状态 | 说明 |
|------|------|------|
| 添加详细日志 | ✅ 完成 | 已在关键函数中添加日志 |
| 数据库检查 | ✅ 完成 | 数据存在，RLS 未启用 |
| 代码逻辑检查 | ✅ 完成 | 逻辑正确 |
| 等待用户反馈 | ⏳ 进行中 | 需要用户提供日志 |

---

**创建时间**: 2025-11-14 23:00  
**创建人员**: Miaoda AI Assistant  
**文档版本**: 1.0  
**状态**: 等待用户反馈
