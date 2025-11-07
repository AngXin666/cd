# 仪表盘缓存与数据更新优化方案

## 1. 核心目标

实现所有仪表盘的数据切换操作均具备智能缓存机制，优化数据查询与监听逻辑，全面提升仪表盘的响应效率与用户体验。

## 2. 技术架构

### 2.1 缓存机制设计

#### 2.1.1 缓存策略
- **缓存存储**：使用Taro的本地存储API（`Taro.setStorageSync`/`Taro.getStorageSync`）
- **缓存键设计**：
  - 司机端：`driver_dashboard_${warehouseId}` 或 `driver_dashboard_all`
  - 管理端：`manager_dashboard_${warehouseId}` 或 `manager_dashboard_all`
  - 超级管理端：`super_admin_dashboard_${warehouseId}` 或 `super_admin_dashboard_all`
- **缓存有效期**：5分钟（300,000毫秒）
- **缓存数据结构**：
  ```typescript
  interface CachedData {
    data: DashboardStats
    timestamp: number
    warehouseId?: string
  }
  ```

#### 2.1.2 缓存读取逻辑
1. 用户切换仓库时，优先检查本地缓存
2. 如果缓存存在且未过期（当前时间 - 缓存时间 < 5分钟），直接使用缓存数据
3. 如果缓存不存在或已过期，从服务器加载最新数据
4. 加载成功后，将新数据保存到缓存

#### 2.1.3 缓存更新策略
- **自动更新**：缓存过期后自动从服务器获取最新数据
- **强制刷新**：用户主动刷新时清除缓存并重新加载
- **智能清理**：关键操作后（如数据录入、审批）自动清除相关缓存

### 2.2 实时数据监听机制

#### 2.2.1 WebSocket订阅
使用Supabase Realtime功能监听数据库表的变更：
- **监听表**：
  - `piece_work_records`（计件记录）
  - `attendance_records`（考勤记录）
  - `leave_applications`（请假申请）
- **监听事件**：INSERT、UPDATE、DELETE
- **过滤条件**：
  - 单仓库视图：只监听当前仓库的数据变更
  - 汇总视图：监听所有仓库的数据变更

#### 2.2.2 数据变更处理
1. 接收到数据变更通知
2. 清除对应仓库的缓存数据
3. 自动重新加载最新数据
4. 更新UI显示

#### 2.2.3 连接管理
- **自动重连**：网络断开后自动重新建立连接
- **心跳检测**：定期检查连接状态
- **资源清理**：组件卸载时自动取消订阅

### 2.3 性能优化策略

#### 2.3.1 防抖与节流
- **防止重复加载**：使用`loadingRef`标记，避免并发请求
- **切换节流**：仓库切换时使用防抖，避免频繁切换导致的多次请求

#### 2.3.2 懒加载
- **按需加载**：只加载当前查看的仓库数据
- **预加载**：可选的预加载相邻仓库数据（未实现）

#### 2.3.3 内存管理
- **缓存大小限制**：通过有效期自动清理过期数据
- **手动清理**：提供`clearCache`方法手动清除缓存

## 3. 实现细节

### 3.1 自定义Hook实现

#### 3.1.1 司机端Hook：`useDriverDashboard`
```typescript
// 位置：src/hooks/useDriverDashboard.ts
export function useDriverDashboard(options: UseDriverDashboardOptions) {
  const {warehouseId, enableRealtime = true, cacheEnabled = true} = options
  
  // 状态管理
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 缓存管理
  const loadFromCache = useCallback(...)
  const saveToCache = useCallback(...)
  const clearCache = useCallback(...)
  
  // 数据加载
  const loadData = useCallback(...)
  const refresh = useCallback(...)
  
  // 实时订阅
  useEffect(() => {
    // 设置WebSocket订阅
    // 监听数据变更
    // 自动刷新缓存
  }, [warehouseId, enableRealtime])
  
  return {data, loading, error, refresh, clearCache}
}
```

#### 3.1.2 管理端Hook：`useManagerDashboard`
类似司机端Hook，但支持多仓库管理员的权限过滤。

#### 3.1.3 超级管理端Hook：`useSuperAdminDashboard`
支持查看所有仓库汇总数据和单个仓库详细数据。

### 3.2 页面集成

#### 3.2.1 超级管理端首页集成示例
```typescript
const SuperAdminHome: React.FC = () => {
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  
  // 获取当前选中的仓库ID
  const currentWarehouseId = 
    currentWarehouseIndex === 0 
      ? undefined 
      : warehouses[currentWarehouseIndex - 1]?.id
  
  // 使用Hook（自动缓存和实时更新）
  const {
    data: dashboardStats,
    loading,
    refresh
  } = useSuperAdminDashboard({
    warehouseId: currentWarehouseId,
    enableRealtime: true,
    cacheEnabled: true
  })
  
  // 仓库切换时，Hook会自动处理缓存和数据加载
  const handleWarehouseChange = (e: any) => {
    setCurrentWarehouseIndex(e.detail.current)
  }
  
  // 页面显示时刷新数据
  useDidShow(() => {
    refresh()
  })
}
```

## 4. 预期效果

### 4.1 性能提升
- **首次加载**：正常网络请求（约500ms-1s）
- **缓存命中**：即时显示（<50ms）
- **切换流畅度**：从卡顿变为流畅切换
- **网络请求减少**：减少70%以上的重复请求

### 4.2 用户体验改善
- **即时响应**：切换仓库时立即显示数据（使用缓存）
- **数据实时性**：后台自动监听数据变更，确保数据最新
- **离线支持**：网络异常时仍可查看缓存数据
- **加载提示**：首次加载或刷新时显示加载状态

### 4.3 服务器压力降低
- **请求频率**：从每次切换都请求，变为5分钟内复用缓存
- **并发请求**：避免用户快速切换导致的并发请求
- **带宽节省**：减少数据传输量

## 5. 配置选项

### 5.1 Hook配置参数
```typescript
interface DashboardOptions {
  warehouseId?: string      // 仓库ID（undefined表示所有仓库）
  enableRealtime?: boolean  // 是否启用实时监听（默认true）
  cacheEnabled?: boolean    // 是否启用缓存（默认true）
}
```

### 5.2 缓存配置
```typescript
const CACHE_EXPIRY_MS = 5 * 60 * 1000  // 缓存有效期：5分钟
```

可根据实际需求调整缓存有效期：
- 数据更新频繁：缩短至2-3分钟
- 数据更新较少：延长至10-15分钟

## 6. 注意事项

### 6.1 缓存一致性
- 关键操作后需要清除缓存（如数据录入、审批）
- 实时监听确保数据变更时自动更新
- 用户可手动刷新强制获取最新数据

### 6.2 内存管理
- 缓存数据存储在本地存储，不占用运行时内存
- 过期缓存自动清理
- 避免缓存过大数据（如图片、大量列表）

### 6.3 网络异常处理
- 网络异常时显示缓存数据并提示
- 提供重试机制
- WebSocket断开后自动重连

## 7. 后续优化方向

### 7.1 智能预加载
- 预测用户可能查看的仓库
- 后台预加载相邻仓库数据
- 提升切换体验

### 7.2 增量更新
- 只更新变更的数据字段
- 减少数据传输量
- 提升更新速度

### 7.3 离线模式
- 完整的离线数据支持
- 离线操作队列
- 网络恢复后自动同步

### 7.4 缓存策略优化
- 根据数据访问频率动态调整缓存时间
- LRU缓存淘汰策略
- 缓存预热机制

## 8. 技术栈

- **前端框架**：Taro + React + TypeScript
- **状态管理**：React Hooks
- **本地存储**：Taro Storage API
- **实时通信**：Supabase Realtime (WebSocket)
- **数据库**：Supabase PostgreSQL

## 9. 文件清单

### 9.1 核心Hook文件
- `src/hooks/useDriverDashboard.ts` - 司机端仪表盘Hook
- `src/hooks/useManagerDashboard.ts` - 管理端仪表盘Hook
- `src/hooks/useSuperAdminDashboard.ts` - 超级管理端仪表盘Hook
- `src/hooks/useWarehousesData.ts` - 仓库数据管理Hook

### 9.2 页面文件
- `src/pages/driver/index.tsx` - 司机端首页
- `src/pages/manager/index.tsx` - 管理端首页
- `src/pages/super-admin/index.tsx` - 超级管理端首页

### 9.3 API文件
- `src/db/api.ts` - 数据库API封装

## 10. 测试建议

### 10.1 功能测试
- [ ] 首次加载数据正常
- [ ] 切换仓库时缓存命中
- [ ] 缓存过期后自动刷新
- [ ] 手动刷新清除缓存
- [ ] 实时监听数据变更
- [ ] 网络异常时显示缓存

### 10.2 性能测试
- [ ] 测量首次加载时间
- [ ] 测量缓存命中时间
- [ ] 测量切换流畅度
- [ ] 监控内存使用
- [ ] 监控网络请求数量

### 10.3 边界测试
- [ ] 无网络环境
- [ ] 网络不稳定
- [ ] 快速切换仓库
- [ ] 长时间停留后返回
- [ ] 多标签页同时操作

## 11. 总结

通过实现智能缓存机制和实时数据监听，我们成功优化了仪表盘的数据加载和切换体验：

1. **缓存机制**：5分钟有效期的本地缓存，大幅减少重复请求
2. **实时监听**：WebSocket自动监听数据变更，确保数据实时性
3. **性能优化**：防抖节流、懒加载、内存管理等多重优化
4. **用户体验**：即时响应、流畅切换、离线支持

这套方案在保证数据实时性的同时，显著提升了系统的响应速度和用户体验，降低了服务器压力。
