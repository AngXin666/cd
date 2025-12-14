# 缓存系统清理计划

## 📋 当前状态

### ✅ 已完成
1. **新缓存系统**（100% 完成）
   - ✅ `src/utils/cacheManager.ts` - 新的缓存管理器
   - ✅ `src/utils/realtimeListener.ts` - 实时监听器
   - ✅ `src/hooks/useDataCache.ts` - 通用缓存 Hook
   - ✅ 5个专用 Hooks（用户、司机、仓库、车辆、仪表板）

2. **页面集成**（7/7 完成）
   - ✅ 老板端用户管理页面
   - ✅ 车队长端司机管理页面
   - ✅ 老板端仓库管理页面
   - ✅ 老板端车辆管理页面
   - ✅ 老板端首页
   - ✅ 车队长端首页
   - ✅ 司机端车辆列表页面

### 🔍 发现的问题

#### 1. 旧缓存系统（`src/utils/cache.ts`）
该文件包含两套缓存系统：

**A. 新的 CacheManager 类**（保留）
- `CacheManager` 类 - 智能缓存管理器
- `createCache()` - 创建缓存实例
- `apiCache` - 全局API缓存实例
- `cached()` - 缓存装饰器
- `withCache()` - 包装函数

**B. 旧的简单缓存函数**（需要评估）
- `setCache()` - 设置缓存
- `getCache()` - 获取缓存
- `clearCache()` - 清除缓存
- `clearAllCache()` - 清除所有缓存
- `clearCacheByPrefix()` - 按前缀清除
- `getVersionedCache()` - 获取带版本的缓存 ⚠️
- `setVersionedCache()` - 设置带版本的缓存 ⚠️
- `clearVersionedCache()` - 清除带版本的缓存 ⚠️
- `onDataUpdated()` - 数据更新通知 ⚠️
- `notifyDataUpdated()` - 触发更新回调 ⚠️

#### 2. 仍在使用旧缓存的代码

**A. 用户管理 Hook**
- 文件：`src/pages/super-admin/user-management/hooks/useUserManagement.ts`
- 使用：`getVersionedCache`, `setVersionedCache`, `onDataUpdated`
- 状态：已被 `useUserListCache` 替代，但 Hook 本身仍存在
- 建议：可以考虑删除或重构

**B. 计件报表页面**（2个）
- 文件：
  - `src/pages/super-admin/piece-work-report/index.tsx`
  - `src/pages/manager/piece-work-report/index.tsx`
- 使用：~~`getVersionedCache`, `setVersionedCache`, `clearVersionedCache`~~ ✅ 已迁移
- 状态：✅ 已完成迁移到 `useUserListCache`
- 完成时间：2024-12-14

## 🎯 清理策略

### 策略 A：保守清理（推荐）

**原因**：
1. 计件报表页面仍在使用旧缓存函数
2. 可能有其他未发现的使用场景
3. 保持向后兼容性

**行动**：
1. ✅ 保留 `src/utils/cache.ts` 中的所有函数
2. ✅ 添加注释标记哪些是旧API（已兼容）
3. ✅ 在文档中说明新旧系统的区别
4. ⏳ 逐步迁移剩余页面到新系统
5. ⏳ 最后再删除旧函数

### 策略 B：激进清理（不推荐）

**原因**：
- 可能破坏现有功能
- 需要立即迁移所有使用旧缓存的页面

**行动**：
1. 删除所有旧缓存函数
2. 立即迁移计件报表页面
3. 修复所有编译错误

## 📝 推荐的下一步行动

### 优先级 1：文档和标记
1. ✅ 在 `src/utils/cache.ts` 中添加清晰的注释
   - 标记哪些是新API
   - 标记哪些是旧API（兼容）
   - 说明迁移路径

2. ✅ 更新项目文档
   - 说明新旧缓存系统的区别
   - 提供迁移指南

### 优先级 2：测试验证
1. ⏳ 测试所有已集成的页面
   - 验证缓存功能正常
   - 验证实时更新功能
   - 验证离线模式

2. ⏳ 编写测试用例
   - RealtimeListener 测试
   - useDataCache 集成测试

### 优先级 3：可选迁移
1. ⏳ 迁移 `useUserManagement` Hook
   - 评估是否还需要这个 Hook
   - 如果需要，迁移到新缓存系统
   - 如果不需要，删除

2. ✅ 迁移计件报表页面（已完成）
   - ✅ 老板端计件报表
   - ✅ 车队长端计件报表
   - 完成时间：2024-12-14

### 优先级 4：最终清理
1. ⏳ 确认所有页面都已迁移
2. ⏳ 删除旧缓存函数
3. ⏳ 更新所有导入语句

## 🔗 相关文件

### 新缓存系统
- `src/utils/cacheManager.ts` - 新的缓存管理器
- `src/utils/realtimeListener.ts` - 实时监听器
- `src/hooks/useDataCache.ts` - 通用缓存 Hook
- `src/hooks/useUserListCache.ts` - 用户列表缓存
- `src/hooks/useDriverListCache.ts` - 司机列表缓存
- `src/hooks/useWarehousesCache.ts` - 仓库列表缓存
- `src/hooks/useVehiclesCache.ts` - 车辆列表缓存
- `src/hooks/useDashboardCache.ts` - 仪表板缓存

### 旧缓存系统
- `src/utils/cache.ts` - 包含新旧两套系统

### 仍在使用旧缓存的文件
- `src/pages/super-admin/user-management/hooks/useUserManagement.ts`
- `src/pages/super-admin/piece-work-report/index.tsx`
- `src/pages/manager/piece-work-report/index.tsx`

## 💡 建议

### 当前阶段（推荐）
采用**保守清理策略**：
1. 保留所有旧缓存函数（已标记为兼容API）
2. 添加清晰的文档和注释
3. 逐步迁移剩余页面
4. 最后再删除旧函数

### 理由
1. **稳定性优先**：不破坏现有功能
2. **渐进式迁移**：降低风险
3. **充分测试**：有时间验证新系统
4. **向后兼容**：给团队时间适应

## 📊 迁移进度

### 已迁移（9/9 主要页面）
- ✅ 老板端用户管理页面
- ✅ 车队长端司机管理页面
- ✅ 老板端仓库管理页面
- ✅ 老板端车辆管理页面
- ✅ 老板端首页
- ✅ 车队长端首页
- ✅ 司机端车辆列表页面
- ✅ 老板端计件报表页面（2024-12-14）
- ✅ 车队长端计件报表页面（2024-12-14）

### 待迁移（1个文件，优先级较低）
- ⏳ `useUserManagement` Hook（可能不需要）

### 完成度
- 主要页面：**100%** (9/9)
- 所有使用场景：**90%** (9/10)

---

**最后更新**: 2024-12-14
**状态**: 所有主要页面迁移完成（9/9），包括计件报表页面
**下一步**: 评估是否需要迁移 `useUserManagement` Hook，或直接删除旧缓存函数
