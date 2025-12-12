# 项目臃肿优化 - 设计文档

## 📅 设计时间
**2025-12-12 23:30**

---

## 🎯 设计目标

基于臃肿分析报告，设计一套系统化的优化方案，将代码量减少 40%，提升开发效率 40%，降低维护成本 60%。

---

## 📐 架构设计

### 1. 整体架构优化

#### 当前架构问题

```
src/pages/
├── super-admin/
│   ├── user-management/index.tsx (72KB) ❌ 单文件过大
│   ├── add-vehicle/index.tsx (71KB) ❌ 单文件过大
│   └── ... (所有逻辑都在单文件中)
├── manager/
│   └── ... (大量重复代码)
└── driver/
    └── ... (大量重复代码)
```

#### 优化后架构

```
src/
├── pages/                          # 页面入口（轻量级）
│   ├── super-admin/
│   │   ├── user-management/
│   │   │   ├── index.tsx          # 主页面 (~200行)
│   │   │   └── components/        # 页面专属组件
│   │   │       ├── UserList.tsx
│   │   │       ├── UserCard.tsx
│   │   │       ├── UserDetail.tsx
│   │   │       ├── WarehouseAssign.tsx
│   │   │       └── AddUserModal.tsx
│   │   └── ...
│   └── ...
│
├── components/                     # 公共组件库
│   ├── business/                   # 业务组件
│   │   ├── UserCard/
│   │   │   ├── index.tsx
│   │   │   ├── UserCard.module.scss
│   │   │   └── types.ts
│   │   ├── DataTable/
│   │   ├── FilterBar/
│   │   ├── ApprovalCard/
│   │   └── StatCard/
│   └── form/                       # 表单组件
│       ├── FormInput/
│       ├── FormSelect/
│       ├── FormDatePicker/
│       └── FormImageUpload/
│
├── hooks/                          # 自定义 Hooks
│   ├── data/                       # 数据获取
│   │   ├── useUsers.ts
│   │   ├── useWarehouses.ts
│   │   ├── useAttendance.ts
│   │   └── usePieceWork.ts
│   ├── business/                   # 业务逻辑
│   │   ├── useApproval.ts
│   │   ├── useSearch.ts
│   │   ├── useFilter.ts
│   │   └── useWarehouseAssign.ts
│   └── form/                       # 表单逻辑
│       ├── useForm.ts
│       ├── useFormValidation.ts
│       └── useFormSubmit.ts
│
└── store/                          # 全局状态
    ├── userStore.ts
    ├── warehouseStore.ts
    └── appStore.ts
```

---

## 🔧 组件设计

### 1. 页面组件化设计原则

#### 原则 1: 单一职责
每个组件只负责一个功能

```typescript
// ❌ 错误: 一个组件做太多事
const UserManagement = () => {
  // 用户列表逻辑
  // 搜索逻辑
  // 筛选逻辑
  // 详情逻辑
  // 仓库分配逻辑
  // 添加用户逻辑
  // ... 2000+ 行代码
}

// ✅ 正确: 拆分成多个组件
const UserManagement = () => {
  return (
    <View>
      <FilterBar />
      <UserList />
      <AddUserModal />
    </View>
  )
}
```

#### 原则 2: 组件大小限制
- 页面组件: < 300 行
- 业务组件: < 200 行
- 基础组件: < 100 行

#### 原则 3: Props 数量限制
- 每个组件 Props < 10 个
- 超过 10 个考虑拆分或使用配置对象

---

### 2. 公共组件设计

#### 2.1 UserCard 组件

**功能**: 显示用户信息卡片

**Props 设计**:
```typescript
interface UserCardProps {
  user: Profile
  showDetail?: boolean
  showActions?: boolean
  onEdit?: (user: Profile) => void
  onDelete?: (user: Profile) => void
  onAssignWarehouse?: (user: Profile) => void
}
```

**使用场景**:
- 用户管理页面
- 司机管理页面
- 车队长管理页面
- 员工管理页面

**复用次数**: 20+

#### 2.2 DataTable 组件

**功能**: 通用数据表格

**Props 设计**:
```typescript
interface DataTableProps<T> {
  data: T[]
  columns: ColumnConfig<T>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  onSort?: (field: keyof T, order: 'asc' | 'desc') => void
  pagination?: PaginationConfig
}

interface ColumnConfig<T> {
  key: keyof T
  title: string
  width?: string
  render?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
}
```

**使用场景**:
- 所有列表页面
- 报表页面
- 统计页面

**复用次数**: 15+

#### 2.3 FilterBar 组件

**功能**: 通用筛选栏

**Props 设计**:
```typescript
interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  onReset?: () => void
}

interface FilterConfig {
  key: string
  label: string
  type: 'input' | 'select' | 'date' | 'dateRange'
  options?: Array<{label: string; value: any}>
  placeholder?: string
}
```

**使用场景**:
- 所有需要筛选的页面

**复用次数**: 10+

#### 2.4 ApprovalCard 组件

**功能**: 审批卡片

**Props 设计**:
```typescript
interface ApprovalCardProps {
  application: LeaveApplication | ResignationApplication
  type: 'leave' | 'resignation'
  onApprove: (id: string, comment?: string) => void
  onReject: (id: string, reason: string) => void
  showActions?: boolean
}
```

**使用场景**:
- 请假审批页面
- 离职审批页面
- 车辆审核页面

**复用次数**: 8+

#### 2.5 StatCard 组件

**功能**: 统计卡片

**Props 设计**:
```typescript
interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  color?: string
  onClick?: () => void
}
```

**使用场景**:
- 仪表盘
- 数据汇总页面
- 统计报表

**复用次数**: 12+

---

### 3. 自定义 Hooks 设计

#### 3.1 数据获取 Hooks

##### useUsers Hook

**功能**: 管理用户数据获取和缓存

```typescript
interface UseUsersOptions {
  role?: UserRole
  warehouseId?: string
  autoFetch?: boolean
}

interface UseUsersReturn {
  users: Profile[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateUser: (id: string, data: Partial<Profile>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
}

function useUsers(options?: UseUsersOptions): UseUsersReturn
```

**使用场景**:
- 用户管理页面
- 司机管理页面
- 员工管理页面

##### useWarehouses Hook

**功能**: 管理仓库数据获取和缓存

```typescript
interface UseWarehousesReturn {
  warehouses: Warehouse[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  getWarehouseById: (id: string) => Warehouse | undefined
}

function useWarehouses(): UseWarehousesReturn
```

#### 3.2 业务逻辑 Hooks

##### useApproval Hook

**功能**: 统一的审批逻辑

```typescript
interface UseApprovalOptions<T> {
  type: 'leave' | 'resignation' | 'vehicle'
  fetchData: () => Promise<T[]>
  approveApi: (id: string, comment?: string) => Promise<boolean>
  rejectApi: (id: string, reason: string) => Promise<boolean>
}

interface UseApprovalReturn<T> {
  applications: T[]
  loading: boolean
  approving: boolean
  handleApprove: (id: string, comment?: string) => Promise<void>
  handleReject: (id: string, reason: string) => Promise<void>
  refetch: () => Promise<void>
}

function useApproval<T>(options: UseApprovalOptions<T>): UseApprovalReturn<T>
```

**使用场景**:
- 请假审批
- 离职审批
- 车辆审核

##### useSearch Hook

**功能**: 通用搜索逻辑

```typescript
interface UseSearchOptions<T> {
  data: T[]
  searchFields: Array<keyof T>
  fuzzyMatch?: boolean
}

interface UseSearchReturn<T> {
  searchKeyword: string
  setSearchKeyword: (keyword: string) => void
  filteredData: T[]
  clearSearch: () => void
}

function useSearch<T>(options: UseSearchOptions<T>): UseSearchReturn<T>
```

##### useFilter Hook

**功能**: 通用筛选逻辑

```typescript
interface UseFilterOptions<T> {
  data: T[]
  filters: FilterConfig[]
}

interface UseFilterReturn<T> {
  filterValues: Record<string, any>
  setFilterValue: (key: string, value: any) => void
  filteredData: T[]
  resetFilters: () => void
}

function useFilter<T>(options: UseFilterOptions<T>): UseFilterReturn<T>
```

#### 3.3 表单 Hooks

##### useForm Hook

**功能**: 表单状态管理

```typescript
interface UseFormOptions<T> {
  initialValues: T
  onSubmit: (values: T) => Promise<void>
  validate?: (values: T) => Record<keyof T, string>
}

interface UseFormReturn<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  setFieldValue: (field: keyof T, value: any) => void
  setFieldTouched: (field: keyof T, touched: boolean) => void
  handleSubmit: () => Promise<void>
  resetForm: () => void
  isSubmitting: boolean
  isValid: boolean
}

function useForm<T>(options: UseFormOptions<T>): UseFormReturn<T>
```

---

## 🎨 状态管理设计

### 1. Zustand Store 设计

#### userStore

**功能**: 管理用户相关的全局状态

```typescript
interface UserState {
  // 状态
  currentUser: Profile | null
  users: Profile[]
  loading: boolean
  
  // 操作
  setCurrentUser: (user: Profile | null) => void
  fetchUsers: (role?: UserRole) => Promise<void>
  updateUser: (id: string, data: Partial<Profile>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
}

const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  users: [],
  loading: false,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  fetchUsers: async (role) => {
    set({ loading: true })
    try {
      const users = await getUsersByRole(role)
      set({ users, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
  
  // ... 其他操作
}))
```

#### warehouseStore

**功能**: 管理仓库相关的全局状态

```typescript
interface WarehouseState {
  warehouses: Warehouse[]
  currentWarehouse: Warehouse | null
  loading: boolean
  
  fetchWarehouses: () => Promise<void>
  setCurrentWarehouse: (warehouse: Warehouse | null) => void
  updateWarehouse: (id: string, data: Partial<Warehouse>) => Promise<void>
}
```

#### appStore

**功能**: 管理应用级别的全局状态

```typescript
interface AppState {
  // UI 状态
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  // 缓存状态
  cacheVersion: number
  
  // 操作
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  invalidateCache: () => void
}
```

---

## 📝 重构计划

### 阶段 1: 用户管理页面重构 (2天)

#### 当前状态
- 文件: `src/pages/super-admin/user-management/index.tsx`
- 大小: 72KB
- 行数: ~2000 行
- 问题: 所有逻辑都在一个文件中

#### 重构目标
- 拆分为 8 个组件
- 提取 3 个自定义 Hooks
- 代码量减少 70%

#### 文件结构
```
src/pages/super-admin/user-management/
├── index.tsx                    # 主页面 (~200行)
├── components/
│   ├── UserList.tsx            # 用户列表 (~150行)
│   ├── UserCard.tsx            # 用户卡片 (~100行)
│   ├── UserDetail.tsx          # 用户详情 (~150行)
│   ├── WarehouseAssign.tsx     # 仓库分配 (~200行)
│   ├── AddUserModal.tsx        # 添加用户 (~150行)
│   ├── UserFilter.tsx          # 用户筛选 (~100行)
│   └── UserTabs.tsx            # 标签页 (~80行)
└── hooks/
    ├── useUserManagement.ts    # 用户管理逻辑 (~100行)
    ├── useWarehouseAssign.ts   # 仓库分配逻辑 (~80行)
    └── useUserFilter.ts        # 筛选逻辑 (~60行)
```

#### 重构步骤

**Day 1 上午: 分析和准备**
1. 阅读现有代码，理解业务逻辑
2. 识别可复用的逻辑和组件
3. 设计组件接口和 Props

**Day 1 下午: 提取组件**
1. 创建 UserCard 组件
2. 创建 UserList 组件
3. 创建 UserFilter 组件

**Day 2 上午: 提取复杂组件**
1. 创建 UserDetail 组件
2. 创建 WarehouseAssign 组件
3. 创建 AddUserModal 组件

**Day 2 下午: 提取 Hooks 和测试**
1. 提取 useUserManagement Hook
2. 提取 useWarehouseAssign Hook
3. 重构主页面
4. 测试验证

### 阶段 2: 车辆添加页面重构 (2天)

#### 当前状态
- 文件: `src/pages/driver/add-vehicle/index.tsx`
- 大小: 71KB
- 行数: ~1900 行

#### 重构目标
- 拆分为 6 个组件
- 提取 2 个自定义 Hooks
- 代码量减少 65%

#### 文件结构
```
src/pages/driver/add-vehicle/
├── index.tsx                    # 主页面 (~200行)
├── components/
│   ├── VehicleForm.tsx         # 车辆表单 (~200行)
│   ├── ImageUpload.tsx         # 图片上传 (~150行)
│   ├── OCRProcessor.tsx        # OCR处理 (~180行)
│   ├── VehiclePreview.tsx      # 车辆预览 (~120行)
│   └── FormSteps.tsx           # 表单步骤 (~100行)
└── hooks/
    ├── useVehicleForm.ts       # 表单逻辑 (~120行)
    └── useOCR.ts               # OCR逻辑 (~100行)
```

### 阶段 3: 提取公共组件 (2天)

#### Day 1: 基础组件
1. UserCard 组件 (通用化)
2. DataTable 组件
3. FilterBar 组件

#### Day 2: 业务组件
1. ApprovalCard 组件
2. StatCard 组件
3. FormInput 组件
4. FormSelect 组件

### 阶段 4: 提取自定义 Hooks (1天)

1. useUsers Hook
2. useWarehouses Hook
3. useApproval Hook
4. useSearch Hook
5. useFilter Hook
6. useForm Hook

---

## ✅ 验收标准

### 代码质量标准

```typescript
// 1. 文件大小限制
✅ 页面组件 < 300 行
✅ 业务组件 < 200 行
✅ 基础组件 < 100 行
✅ Hook 文件 < 150 行

// 2. 组件复杂度
✅ Props 数量 < 10 个
✅ useState 数量 < 5 个
✅ useEffect 数量 < 3 个
✅ 圈复杂度 < 10

// 3. 代码复用
✅ 代码复用率 > 60%
✅ 组件复用次数 > 3
✅ Hook 复用次数 > 2

// 4. 类型安全
✅ 所有 Props 有类型定义
✅ 所有 Hook 有类型定义
✅ 无 any 类型（除非必要）
```

### 性能标准

```typescript
✅ 组件渲染时间 < 16ms
✅ Hook 执行时间 < 10ms
✅ 页面加载时间 < 1.5s
✅ 内存占用 < 100MB
```

### 测试标准

```typescript
✅ 组件单元测试覆盖率 > 80%
✅ Hook 单元测试覆盖率 > 90%
✅ 集成测试覆盖核心流程
✅ 所有测试通过
```

---

## 🎯 成功指标

### 代码量指标

```
总代码行数:    59,765 → 35,000 (↓ 41%)
pages 大小:    1,897KB → 950KB (↓ 50%)
平均文件大小:  11.5KB → 7KB (↓ 39%)
最大文件大小:  72KB → 30KB (↓ 58%)
```

### 质量指标

```
代码复用率:    30% → 70% (↑ 133%)
组件数量:      17 → 45 (↑ 165%)
Hook 数量:     11 → 25 (↑ 127%)
代码可读性:    ⭐⭐ → ⭐⭐⭐⭐⭐
```

### 效率指标

```
新功能开发:    5天 → 3天 (↑ 40%)
Bug 修复:      2小时 → 1小时 (↑ 50%)
代码审查:      1小时 → 30分钟 (↑ 50%)
维护成本:      ⭐⭐⭐⭐⭐ → ⭐⭐ (↓ 60%)
```

---

## 📚 技术选型

### 组件开发

```typescript
// 使用 React 函数组件 + Hooks
// 使用 TypeScript 严格模式
// 使用 Tailwind CSS 样式
// 使用 Taro 组件库
```

### 状态管理

```typescript
// 全局状态: Zustand
// 组件状态: useState
// 服务端状态: React Query (可选)
```

### 代码规范

```typescript
// ESLint + Biome
// Prettier
// TypeScript strict mode
// 组件命名: PascalCase
// Hook 命名: use + PascalCase
// 文件命名: kebab-case
```

---

## 🎊 总结

这个设计方案提供了一套完整的优化架构，包括：

1. ✅ 清晰的目录结构
2. ✅ 完整的组件设计
3. ✅ 详细的 Hook 设计
4. ✅ 合理的状态管理
5. ✅ 明确的重构计划
6. ✅ 严格的验收标准

通过这套方案，我们可以：
- 将代码量减少 40%
- 提升开发效率 40%
- 降低维护成本 60%
- 提高代码质量 80%

**准备开始实施！** 🚀

---

**设计完成时间**: 2025-12-12 23:30  
**设计版本**: v1.0  
**设计团队**: Kiro AI
