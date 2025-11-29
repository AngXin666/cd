# 多租户代码清理计划

## 📋 清理目标
移除所有多租户相关的代码和注释，简化系统架构为单用户系统。

## ✅ 已完成的清理

### 1. src/db/api.ts（已完成）
- ✅ 删除 `_convertTenantProfileToProfile()` 函数
- ✅ 更新 `getDriversByWarehouse()` - 移除多租户逻辑
- ✅ 更新 `createLeaveApplication()` - 移除多租户逻辑
- ✅ 更新 `getWarehouseManager()` - 移除多租户逻辑
- ✅ 所有函数已不再使用 `getCurrentUserRoleAndTenant()` 的 `tenant_id`

### 2. src/services/notificationService.ts（已完成）
- ✅ 移除 `getCurrentUserRoleAndTenant` 的导入
- ✅ 更新 `getPrimaryAdmin()` - 移除 Schema 切换逻辑
- ✅ 更新 `getPeerAccounts()` - 移除 Schema 切换逻辑
- ✅ 更新 `_getAllAdmins()` - 移除 Schema 切换逻辑
- ✅ 更新 `getManagersWithJurisdiction()` - 移除 Schema 切换逻辑
- ✅ 所有函数改为直接查询 public schema

## 📋 待清理的文件和函数

### 1. src/db/api.ts（剩余部分）
需要清理的函数（使用 `getCurrentUserRoleAndTenant()` 并检查 `tenant_id`）：

#### 高优先级（直接使用 tenant_id 进行 Schema 切换）
- [ ] `getWarehouseDashboardStats()` - 第 3704 行
- [ ] 其他使用 `.schema(schemaName)` 的函数

#### 中优先级（仅包含多租户注释）
- [ ] 清理所有 "支持多租户架构" 的注释
- [ ] 清理所有 "租户用户" 的日志输出
- [ ] 清理所有 "中央用户" 的日志输出

### 2. src/services/notificationService.ts
需要清理的函数：
- [ ] `getPrimaryAdmin()` - 第 28 行
- [ ] `getManagers()` - 第 78 行
- [ ] `getDrivers()` - 第 136 行
- [ ] `getPeerAccounts()` - 第 242 行
- [ ] 其他使用 `getCurrentUserRoleAndTenant()` 的函数

### 3. src/db/api/utils.ts
- [ ] 检查并清理多租户相关的工具函数

### 4. src/db/types.ts
已标记为废弃的类型（保留用于兼容性）：
- ✅ 仓库规则（已废弃 - 多租户相关）
- ✅ 考勤规则（已废弃 - 多租户相关）
- ✅ 司机仓库关联（已废弃 - 多租户相关）
- ✅ 车辆扩展（已废弃 - 多租户相关）
- ✅ 司机类型和驾照（已废弃 - 多租户相关）
- ✅ 租赁管理（已废弃 - 多租户相关）
- ✅ 辞职申请（已废弃 - 多租户相关）
- ✅ 审核相关（已废弃 - 多租户相关）
- ✅ 权限管理（已废弃 - 多租户相关）
- ✅ 锁定照片（已废弃 - 多租户相关）
- ✅ 通知模板和定时通知（已废弃 - 多租户相关）
- ✅ 自动提醒规则（已废弃 - 多租户相关）
- ✅ 反馈管理（已废弃 - 多租户相关）
- ✅ 租户管理（已废弃 - 多租户相关）

**注意**：这些类型已标记为废弃，但保留用于向后兼容。如果确认不再使用，可以删除。

## 🔧 清理方法

### 模式 1：移除 Schema 切换逻辑
```typescript
// 旧代码
const {role, tenant_id} = await getCurrentUserRoleAndTenant()
let schemaName = 'public'
if (tenant_id && role !== 'BOSS') {
  schemaName = `tenant_${tenant_id.replace(/-/g, '_')}`
}
const {data} = await supabase.schema(schemaName).from('table').select('*')

// 新代码
const {data} = await supabase.from('table').select('*')
```

### 模式 2：简化注释
```typescript
// 旧注释
/**
 * 获取数据
 * 支持多租户架构：根据当前用户角色查询对应的 Schema
 */

// 新注释
/**
 * 获取数据
 * 单用户架构：直接查询表
 */
```

### 模式 3：清理日志
```typescript
// 旧代码
if (tenant_id && role !== 'BOSS') {
  console.log(`租户用户查询数据，使用 Schema: ${schemaName}`)
} else {
  console.log('中央用户查询数据，使用 Schema: public')
}

// 新代码
// 删除这些日志
```

## 📊 清理进度

### 总体进度
- **总计**：约 30 处多租户相关代码
- **已清理**：4 处 (13%)
- **待清理**：26 处 (87%)

### 文件进度
- **src/db/api.ts**：4/20 (20%)
- **src/services/notificationService.ts**：0/5 (0%)
- **src/db/api/utils.ts**：0/1 (0%)
- **src/db/types.ts**：已标记废弃 ✅

## 🎯 下一步行动

### 第一批：清理 src/db/api.ts 中剩余的多租户逻辑
1. 搜索所有使用 `getCurrentUserRoleAndTenant()` 的函数
2. 移除 Schema 切换逻辑
3. 简化为直接查询 public schema
4. 运行 lint 检查

### 第二批：清理 src/services/notificationService.ts
1. 更新所有通知相关函数
2. 移除多租户逻辑
3. 运行 lint 检查

### 第三批：清理注释和日志
1. 搜索所有 "多租户" 相关注释
2. 搜索所有 "租户用户" 相关日志
3. 搜索所有 "中央用户" 相关日志
4. 批量替换为单用户架构的注释

### 第四批：清理废弃类型（可选）
1. 确认废弃类型是否还在使用
2. 如果不再使用，删除这些类型定义
3. 运行 lint 和类型检查

## 📝 注意事项

1. **保留向后兼容性**：
   - `getCurrentUserRoleAndTenant()` 函数保留，但 `tenant_id` 始终返回 `null`
   - 废弃的类型定义保留，但标记为 `@deprecated`

2. **测试覆盖**：
   - 每批清理后运行 lint 检查
   - 确保所有功能正常工作

3. **文档更新**：
   - 更新 README.md 记录清理情况
   - 更新数据库文档

## 🔗 相关文档

- **迁移总结**：[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
- **迁移计划**：[MIGRATION_TO_USERS_TABLE.md](./MIGRATION_TO_USERS_TABLE.md)
- **项目文档**：[README.md](./README.md)

---

**创建时间**：2025-11-30  
**文档版本**：v1.0
