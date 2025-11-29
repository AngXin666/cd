# 多租户架构代码审计报告

## 审计日期
2025-11-05

## 审计目的
检查所有前端代码、函数和后端服务是否完全支持多租户架构。

---

## 数据库层面

### ✅ 已完成
1. **外键约束清理**：
   - 删除了所有引用 `public.profiles` 的外键约束（41个）
   - 涉及 23 个表
   - 所有列都添加了注释说明设计决策

2. **RLS 策略**：
   - 所有表都启用了 RLS
   - 租户用户只能访问自己租户的数据
   - 中央用户可以访问所有数据

3. **租户 Schema**：
   - 已创建租户 Schema（tenant_xxx）
   - 租户 Schema 中包含必要的表（profiles、driver_warehouses、manager_warehouses等）

---

## 前端代码层面

### ✅ 已支持多租户的函数

1. **getCurrentUserWithRealName()**
   - ✅ 支持从租户 Schema 获取用户档案
   - ✅ 支持从 public.profiles 获取用户档案
   - ✅ 使用 `getCurrentUserRoleAndTenant()` 判断用户类型

2. **getCurrentUserRoleAndTenant()**
   - ✅ 从 `user_metadata` 获取租户信息
   - ✅ 正确返回用户角色和租户ID

3. **notificationApi.ts 中的函数**
   - ✅ `createNotification()` 使用 `getCurrentUserRoleAndTenant()` 获取用户信息
   - ✅ 支持租户用户创建通知

### ⚠️ 需要审查的函数

以下函数只查询 `public.profiles`，可能不支持租户用户：

1. **getAllProfiles()**
   - 📍 位置：src/db/api.ts:349
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

2. **getAllDriversWithRealName()**
   - 📍 位置：src/db/api.ts:364
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

3. **getProfileById(id: string)**
   - 📍 位置：src/db/api.ts:403
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据用户ID判断是否在租户 Schema 中

4. **getDriverProfiles()**
   - 📍 位置：src/db/api.ts:488
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

5. **getManagerProfiles()**
   - 📍 位置：src/db/api.ts:502
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

6. **getDriversByWarehouse(warehouseId: string)**
   - 📍 位置：src/db/api.ts:1096
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

7. **getWarehouseManagers(warehouseId: string)**
   - 📍 位置：src/db/api.ts:1964
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

8. **getWarehouseManager(warehouseId: string)**
   - 📍 位置：src/db/api.ts:2808
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

9. **getAllUsers()**
   - 📍 位置：src/db/api.ts:3564
   - ⚠️ 只查询 `public.profiles`
   - 💡 建议：根据当前用户角色，查询对应的 Schema

10. **getAllManagers()**
    - 📍 位置：src/db/api.ts:3653
    - ⚠️ 只查询 `public.profiles`
    - 💡 建议：根据当前用户角色，查询对应的 Schema

---

## 分析结论

### 当前状态
1. **数据库层面**：✅ 完全支持多租户架构
   - 所有外键约束已删除
   - RLS 策略已配置
   - 租户 Schema 已创建

2. **前端代码层面**：⚠️ 部分支持多租户架构
   - 核心函数（getCurrentUserWithRealName、getCurrentUserRoleAndTenant）已支持
   - 但有 10+ 个函数只查询 `public.profiles`，不支持租户用户

### 潜在问题
1. **租户用户无法查看其他租户用户**：
   - 例如：租户管理员调用 `getAllDriversWithRealName()` 时，只能看到 `public.profiles` 中的司机
   - 无法看到自己租户 Schema 中的司机

2. **跨 Schema 查询失败**：
   - 例如：租户管理员调用 `getProfileById(driverId)` 时，如果司机在租户 Schema 中，会返回 null

3. **数据不一致**：
   - 前端显示的用户列表可能不完整
   - 某些功能可能无法正常工作

---

## 修复建议

### 方案1：修改所有查询函数（推荐）
为所有查询 `profiles` 的函数添加多租户支持：

```typescript
// 示例：修改 getAllDriversWithRealName
export async function getAllDriversWithRealName(): Promise<Array<Profile & {real_name: string | null}>> {
  // 1. 获取当前用户角色和租户
  const {role, tenant_id} = await getCurrentUserRoleAndTenant()
  
  // 2. 根据角色选择查询的 Schema
  let schemaName = 'public'
  if (tenant_id && role !== 'super_admin') {
    schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
  }
  
  // 3. 从对应的 Schema 查询
  const {data, error} = await supabase
    .schema(schemaName)
    .from('profiles')
    .select('*, driver_licenses(real_name)')
    .eq('role', 'driver')
  
  // ...
}
```

**优点**：
- 完全支持多租户架构
- 租户用户可以正常使用所有功能
- 数据隔离更好

**缺点**：
- 需要修改多个函数
- 测试工作量较大

### 方案2：使用 RLS 策略（当前方案）
依赖 RLS 策略来控制数据访问，不修改查询函数。

**优点**：
- 不需要修改代码
- RLS 策略自动过滤数据

**缺点**：
- 租户用户查询 `public.profiles` 时，RLS 策略会过滤掉所有数据
- 导致租户用户看不到任何用户（包括自己租户的用户）
- **这是当前的主要问题**

### 方案3：创建视图（折中方案）
创建一个视图，自动合并 `public.profiles` 和租户 Schema 的 `profiles`。

**优点**：
- 不需要修改太多代码
- 查询逻辑简单

**缺点**：
- 需要为每个租户创建视图
- 维护成本较高

---

## 推荐方案

**推荐使用方案1**，原因：
1. 最符合多租户架构的设计原则
2. 数据隔离更好，安全性更高
3. 虽然需要修改多个函数，但一次性解决所有问题
4. 未来扩展性更好

---

## 实施计划

### 第一阶段：核心函数修复（高优先级）
修复以下核心函数，确保基本功能可用：
1. ✅ getCurrentUserWithRealName() - 已完成
2. ⚠️ getAllDriversWithRealName()
3. ⚠️ getDriverProfiles()
4. ⚠️ getManagerProfiles()
5. ⚠️ getProfileById()

### 第二阶段：仓库相关函数修复（中优先级）
修复仓库管理相关函数：
1. ⚠️ getDriversByWarehouse()
2. ⚠️ getWarehouseManagers()
3. ⚠️ getWarehouseManager()

### 第三阶段：管理函数修复（低优先级）
修复管理相关函数：
1. ⚠️ getAllProfiles()
2. ⚠️ getAllUsers()
3. ⚠️ getAllManagers()

---

## 测试计划

### 测试场景
1. **中央用户测试**：
   - 登录中央用户（super_admin）
   - 验证可以查看所有用户
   - 验证可以管理所有数据

2. **租户用户测试**：
   - 登录租户用户（boss、peer、fleet_leader、driver、manager）
   - 验证只能查看自己租户的用户
   - 验证只能管理自己租户的数据

3. **跨租户测试**：
   - 验证租户A的用户无法访问租户B的数据
   - 验证数据隔离正确

---

## 当前风险评估

### 高风险 🔴
- 租户用户调用 `getAllDriversWithRealName()` 等函数时，返回空数组
- 导致前端页面显示"暂无数据"
- 影响用户体验

### 中风险 🟡
- 某些功能可能无法正常工作（例如：分配司机、查看司机列表）
- 需要用户手动刷新或重新登录

### 低风险 🟢
- 数据库层面已完全支持多租户架构
- RLS 策略保证数据安全
- 不会出现数据泄露

---

## 结论

**当前系统在数据库层面已完全支持多租户架构，但前端代码层面还需要进一步优化。**

**建议立即修复核心函数（第一阶段），确保基本功能可用。**

**后续可以逐步修复其他函数，完善多租户支持。**
