# 🔍 超级管理员端数据问题诊断指南

## 📋 问题描述

**问题**：超级管理员端没有数据显示

**影响范围**：
- ❌ 超级管理员工作台 (src/pages/super-admin/index.tsx)
- ❌ 仪表板统计数据不显示
- ❌ 司机列表为空

---

## 🛠️ 已添加的诊断日志

为了帮助诊断问题，我已经在关键位置添加了详细的日志输出：

### 1. API 层日志 (`src/db/api.ts`)

#### `getAllWarehousesDashboardStats()` 函数

```typescript
console.log('[getAllWarehousesDashboardStats] 开始加载所有仓库数据')
console.log('[getAllWarehousesDashboardStats] 日期:', {today, firstDayOfMonth})
console.log('[getAllWarehousesDashboardStats] 查询结果:', {...})
console.log('[getAllWarehousesDashboardStats] 统计数据:', {...})
console.log('[getAllWarehousesDashboardStats] 司机列表:', driverList.length)
console.log('[getAllWarehousesDashboardStats] 返回结果:', result)
```

**日志内容**：
- ✅ 开始加载标记
- ✅ 查询日期（今天、本月第一天）
- ✅ 各项查询结果数量
- ✅ 统计数据计算结果
- ✅ 司机列表长度
- ✅ 最终返回结果

**错误日志**：
```typescript
console.error('[getAllWarehousesDashboardStats] 查询司机失败:', error)
console.error('[getAllWarehousesDashboardStats] 查询今日出勤失败:', error)
console.error('[getAllWarehousesDashboardStats] 查询今日计件失败:', error)
console.error('[getAllWarehousesDashboardStats] 查询待审批请假失败:', error)
console.error('[getAllWarehousesDashboardStats] 查询本月计件失败:', error)
```

---

### 2. Hook 层日志 (`src/hooks/useSuperAdminDashboard.ts`)

#### `loadData()` 函数

```typescript
console.log('[useSuperAdminDashboard] 正在加载中，跳过')
console.log('[useSuperAdminDashboard] 开始加载数据:', {wid, forceRefresh})
console.log('[useSuperAdminDashboard] 使用缓存数据')
console.log('[useSuperAdminDashboard] 从服务器加载数据')
console.log('[useSuperAdminDashboard] 服务器返回数据:', stats)
console.error('[useSuperAdminDashboard] 加载仪表板数据失败:', err)
```

**日志内容**：
- ✅ 加载状态检查
- ✅ 加载参数（仓库ID、是否强制刷新）
- ✅ 缓存使用情况
- ✅ 服务器数据加载
- ✅ 服务器返回的数据
- ✅ 错误信息

---

### 3. 页面层日志 (`src/pages/super-admin/index.tsx`)

#### `dashboardStats` 监听

```typescript
useEffect(() => {
  console.log('[SuperAdminHome] dashboardStats 更新:', dashboardStats)
}, [dashboardStats])
```

**日志内容**：
- ✅ 仪表板数据更新
- ✅ 数据内容

---

## 🔍 诊断步骤

### 步骤 1：打开浏览器开发者工具

1. 在浏览器中打开小程序
2. 按 `F12` 打开开发者工具
3. 切换到 `Console` 标签页

### 步骤 2：登录超级管理员账号

1. 使用超级管理员账号登录
2. 进入超级管理员工作台

### 步骤 3：查看控制台日志

按照以下顺序查看日志输出：

#### 3.1 检查 Hook 层日志

**预期日志**：
```
[useSuperAdminDashboard] 开始加载数据: {wid: undefined, forceRefresh: false}
[useSuperAdminDashboard] 从服务器加载数据
```

**可能的问题**：
- ❌ 如果看到 "正在加载中，跳过" - 说明有重复加载
- ❌ 如果看到 "使用缓存数据" - 说明使用了旧缓存
- ❌ 如果看到错误日志 - 说明加载失败

#### 3.2 检查 API 层日志

**预期日志**：
```
[getAllWarehousesDashboardStats] 开始加载所有仓库数据
[getAllWarehousesDashboardStats] 日期: {today: "2025-11-05", firstDayOfMonth: "2025-11-01"}
[getAllWarehousesDashboardStats] 查询结果: {allDrivers: 3, todayAttendance: 2, todayPiece: 5, pendingLeave: 1, monthlyPiece: 150}
[getAllWarehousesDashboardStats] 统计数据: {todayAttendance: 2, todayPieceCount: 150, pendingLeaveCount: 1, monthlyPieceCount: 1500}
[getAllWarehousesDashboardStats] 司机列表: 3
[getAllWarehousesDashboardStats] 返回结果: {...}
```

**可能的问题**：
- ❌ 如果 `allDrivers: 0` - 说明没有司机数据
- ❌ 如果看到错误日志 - 说明数据库查询失败
- ❌ 如果日期不正确 - 说明日期计算有问题

#### 3.3 检查页面层日志

**预期日志**：
```
[SuperAdminHome] dashboardStats 更新: {todayAttendance: 2, todayPieceCount: 150, ...}
```

**可能的问题**：
- ❌ 如果 `dashboardStats: null` - 说明数据没有传递到页面
- ❌ 如果没有这条日志 - 说明 Hook 没有返回数据

---

## 🐛 常见问题及解决方案

### 问题 1：数据库权限问题

**症状**：
```
[getAllWarehousesDashboardStats] 查询司机失败: {code: "42501", message: "permission denied"}
```

**原因**：超级管理员没有查询权限

**解决方案**：
1. 检查 RLS 策略
2. 确保超级管理员有 `SELECT` 权限
3. 检查 `is_super_admin()` 函数是否正确

**SQL 检查**：
```sql
-- 检查 profiles 表的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 检查 is_super_admin 函数
SELECT * FROM pg_proc WHERE proname = 'is_super_admin';
```

---

### 问题 2：没有司机数据

**症状**：
```
[getAllWarehousesDashboardStats] 查询结果: {allDrivers: 0, ...}
```

**原因**：数据库中没有司机角色的用户

**解决方案**：
1. 检查 `profiles` 表
2. 确保有 `role = 'driver'` 的用户
3. 如果没有，添加测试司机

**SQL 检查**：
```sql
-- 检查司机数量
SELECT COUNT(*) FROM profiles WHERE role = 'driver';

-- 查看所有用户角色
SELECT id, name, phone, role FROM profiles;
```

---

### 问题 3：日期格式问题

**症状**：
```
[getAllWarehousesDashboardStats] 日期: {today: "11/05/2025", firstDayOfMonth: "11/01/2025"}
```

**原因**：日期格式不是 `YYYY-MM-DD`

**解决方案**：
1. 检查 `getLocalDateString()` 函数
2. 确保返回格式为 `YYYY-MM-DD`

**代码检查**：
```typescript
// src/db/api.ts
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

---

### 问题 4：缓存问题

**症状**：
```
[useSuperAdminDashboard] 使用缓存数据
```

**原因**：使用了旧的缓存数据

**解决方案**：
1. 清除缓存
2. 强制刷新

**操作步骤**：
```typescript
// 在浏览器控制台执行
Taro.clearStorageSync()
location.reload()
```

---

### 问题 5：数据没有传递到页面

**症状**：
```
[useSuperAdminDashboard] 服务器返回数据: {...}
// 但是没有看到
[SuperAdminHome] dashboardStats 更新: {...}
```

**原因**：Hook 的 `setData()` 没有生效

**解决方案**：
1. 检查 Hook 的返回值
2. 检查页面的 Hook 调用
3. 检查 React 状态更新

---

## 📊 诊断流程图

```
开始
  ↓
登录超级管理员
  ↓
进入工作台
  ↓
[useSuperAdminDashboard] 开始加载数据
  ↓
检查缓存？
  ├─ 有缓存 → 使用缓存数据 → 显示数据
  └─ 无缓存 → 从服务器加载
                ↓
      [getAllWarehousesDashboardStats] 开始加载
                ↓
      查询数据库
        ├─ 查询司机
        ├─ 查询出勤
        ├─ 查询计件
        ├─ 查询请假
        └─ 查询本月计件
                ↓
      处理统计数据
                ↓
      构建司机列表
                ↓
      返回结果
                ↓
      [useSuperAdminDashboard] 服务器返回数据
                ↓
      setData(stats)
                ↓
      [SuperAdminHome] dashboardStats 更新
                ↓
      显示数据
```

---

## 🧪 测试命令

### 1. 检查数据库连接

```typescript
// 在浏览器控制台执行
const { data, error } = await supabase.from('profiles').select('count')
console.log('数据库连接:', error ? '失败' : '成功', data)
```

### 2. 检查司机数据

```typescript
// 在浏览器控制台执行
const { data, error } = await supabase
  .from('profiles')
  .select('id, name, phone, role')
  .eq('role', 'driver')
console.log('司机数据:', data, error)
```

### 3. 检查今日数据

```typescript
// 在浏览器控制台执行
const today = new Date().toISOString().split('T')[0]
const { data: attendance } = await supabase
  .from('attendance_records')
  .select('*')
  .eq('work_date', today)
const { data: piece } = await supabase
  .from('piece_work_records')
  .select('*')
  .eq('work_date', today)
console.log('今日出勤:', attendance?.length || 0)
console.log('今日计件:', piece?.length || 0)
```

### 4. 清除缓存

```typescript
// 在浏览器控制台执行
Taro.removeStorageSync('super_admin_dashboard_all')
console.log('缓存已清除')
```

---

## 📝 诊断报告模板

请按照以下格式提供诊断信息：

```markdown
### 诊断报告

**日期**：2025-11-05
**用户**：超级管理员
**问题**：数据不显示

#### 1. Hook 层日志
```
[粘贴 useSuperAdminDashboard 相关日志]
```

#### 2. API 层日志
```
[粘贴 getAllWarehousesDashboardStats 相关日志]
```

#### 3. 页面层日志
```
[粘贴 SuperAdminHome 相关日志]
```

#### 4. 数据库检查
- 司机数量：[数量]
- 今日出勤：[数量]
- 今日计件：[数量]

#### 5. 错误信息
```
[粘贴任何错误信息]
```
```

---

## 🔧 下一步行动

根据诊断结果，可能需要：

1. **修复 RLS 策略** - 如果是权限问题
2. **添加测试数据** - 如果是数据缺失
3. **修复日期函数** - 如果是日期格式问题
4. **清除缓存** - 如果是缓存问题
5. **修复 Hook** - 如果是状态管理问题

---

## 📞 技术支持

如果问题仍然存在，请提供：

1. ✅ 完整的控制台日志
2. ✅ 数据库检查结果
3. ✅ 错误截图
4. ✅ 用户角色信息

**联系方式**：
- **邮箱**：support@fleet.com
- **电话**：400-123-4567

---

**文档版本**：v1.0  
**创建时间**：2025-11-05  
**适用版本**：车队管家 v1.2  
**状态**：🔍 诊断中
