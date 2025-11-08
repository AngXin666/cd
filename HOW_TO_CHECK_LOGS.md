# 📋 如何查看超级管理员端数据加载日志

## 🎯 目的

帮助您诊断超级管理员端数据不显示的问题。

---

## 📝 操作步骤

### 步骤 1：打开开发者工具

1. **在浏览器中打开小程序**
   - 使用 Chrome、Edge 或 Firefox 浏览器
   - 访问小程序的 H5 版本

2. **打开开发者工具**
   - 按键盘上的 `F12` 键
   - 或者右键点击页面，选择"检查"或"审查元素"

3. **切换到 Console 标签页**
   - 在开发者工具顶部找到 `Console` 标签
   - 点击切换到控制台视图

---

### 步骤 2：登录并查看日志

1. **登录超级管理员账号**
   - 使用超级管理员的手机号登录
   - 验证码：`123456`

2. **进入超级管理员工作台**
   - 登录后会自动跳转到工作台
   - 或者点击底部的"超级管理"标签

3. **查看控制台日志**
   - 在 Console 中会自动显示日志
   - 日志会按时间顺序显示

---

### 步骤 3：查找关键日志

请在控制台中查找以下日志：

#### 🔍 日志 1：Hook 层开始加载

```
[useSuperAdminDashboard] 开始加载数据: {wid: undefined, forceRefresh: false}
```

**说明**：
- `wid: undefined` - 表示加载所有仓库的数据
- `forceRefresh: false` - 表示会先尝试使用缓存

---

#### 🔍 日志 2：API 层开始加载

```
[getAllWarehousesDashboardStats] 开始加载所有仓库数据
```

**说明**：API 函数开始执行

---

#### 🔍 日志 3：查询日期

```
[getAllWarehousesDashboardStats] 日期: {today: "2025-11-05", firstDayOfMonth: "2025-11-01"}
```

**说明**：
- `today` - 今天的日期
- `firstDayOfMonth` - 本月第一天的日期
- **重要**：日期格式必须是 `YYYY-MM-DD`

---

#### 🔍 日志 4：查询结果

```
[getAllWarehousesDashboardStats] 查询结果: {
  allDrivers: 3,
  todayAttendance: 2,
  todayPiece: 5,
  pendingLeave: 1,
  monthlyPiece: 150
}
```

**说明**：
- `allDrivers` - 司机总数
- `todayAttendance` - 今日出勤记录数
- `todayPiece` - 今日计件记录数
- `pendingLeave` - 待审批请假数
- `monthlyPiece` - 本月计件记录数

**⚠️ 如果所有数字都是 0，说明数据库中没有数据！**

---

#### 🔍 日志 5：统计数据

```
[getAllWarehousesDashboardStats] 统计数据: {
  todayAttendance: 2,
  todayPieceCount: 150,
  pendingLeaveCount: 1,
  monthlyPieceCount: 1500
}
```

**说明**：
- `todayAttendance` - 今日出勤人数
- `todayPieceCount` - 今日总件数
- `pendingLeaveCount` - 待审批请假数
- `monthlyPieceCount` - 本月总件数

---

#### 🔍 日志 6：司机列表

```
[getAllWarehousesDashboardStats] 司机列表: 3
```

**说明**：司机列表的长度

**⚠️ 如果是 0，说明没有司机数据！**

---

#### 🔍 日志 7：返回结果

```
[getAllWarehousesDashboardStats] 返回结果: {
  todayAttendance: 2,
  todayPieceCount: 150,
  pendingLeaveCount: 1,
  monthlyPieceCount: 1500,
  driverList: [...]
}
```

**说明**：API 函数返回的完整数据

---

#### 🔍 日志 8：服务器返回数据

```
[useSuperAdminDashboard] 服务器返回数据: {...}
```

**说明**：Hook 收到服务器返回的数据

---

#### 🔍 日志 9：页面数据更新

```
[SuperAdminHome] dashboardStats 更新: {...}
```

**说明**：页面收到数据并更新

**⚠️ 如果没有这条日志，说明数据没有传递到页面！**

---

## 🐛 常见问题

### 问题 1：所有查询结果都是 0

**日志示例**：
```
[getAllWarehousesDashboardStats] 查询结果: {
  allDrivers: 0,
  todayAttendance: 0,
  todayPiece: 0,
  pendingLeave: 0,
  monthlyPiece: 0
}
```

**原因**：数据库中没有数据

**解决方案**：
1. 添加测试司机
2. 添加测试仓库
3. 录入测试数据

---

### 问题 2：看到权限错误

**日志示例**：
```
[getAllWarehousesDashboardStats] 查询司机失败: {
  code: "42501",
  message: "permission denied for table profiles"
}
```

**原因**：超级管理员没有查询权限

**解决方案**：
1. 检查 RLS 策略
2. 确保超级管理员有 SELECT 权限

---

### 问题 3：日期格式错误

**日志示例**：
```
[getAllWarehousesDashboardStats] 日期: {
  today: "11/05/2025",
  firstDayOfMonth: "11/01/2025"
}
```

**原因**：日期格式不是 `YYYY-MM-DD`

**解决方案**：修复 `getLocalDateString()` 函数

---

### 问题 4：使用了旧缓存

**日志示例**：
```
[useSuperAdminDashboard] 使用缓存数据
```

**原因**：使用了旧的缓存数据

**解决方案**：
1. 在控制台执行：`Taro.clearStorageSync()`
2. 刷新页面：`location.reload()`

---

### 问题 5：数据没有传递到页面

**症状**：
- 看到了 `[useSuperAdminDashboard] 服务器返回数据: {...}`
- 但是没有看到 `[SuperAdminHome] dashboardStats 更新: {...}`

**原因**：Hook 的状态更新没有生效

**解决方案**：检查 React 状态管理

---

## 📸 截图示例

### 正常的日志输出

```
[useSuperAdminDashboard] 开始加载数据: {wid: undefined, forceRefresh: false}
[useSuperAdminDashboard] 从服务器加载数据
[getAllWarehousesDashboardStats] 开始加载所有仓库数据
[getAllWarehousesDashboardStats] 日期: {today: "2025-11-05", firstDayOfMonth: "2025-11-01"}
[getAllWarehousesDashboardStats] 查询结果: {allDrivers: 3, todayAttendance: 2, todayPiece: 5, pendingLeave: 1, monthlyPiece: 150}
[getAllWarehousesDashboardStats] 统计数据: {todayAttendance: 2, todayPieceCount: 150, pendingLeaveCount: 1, monthlyPieceCount: 1500}
[getAllWarehousesDashboardStats] 司机列表: 3
[getAllWarehousesDashboardStats] 返回结果: {todayAttendance: 2, todayPieceCount: 150, pendingLeaveCount: 1, monthlyPieceCount: 1500, driverList: Array(3)}
[useSuperAdminDashboard] 服务器返回数据: {todayAttendance: 2, todayPieceCount: 150, pendingLeaveCount: 1, monthlyPieceCount: 1500, driverList: Array(3)}
[SuperAdminHome] dashboardStats 更新: {todayAttendance: 2, todayPieceCount: 150, pendingLeaveCount: 1, monthlyPieceCount: 1500, driverList: Array(3)}
```

---

## 📋 诊断报告模板

请将控制台日志复制并发送给我，格式如下：

```
### 超级管理员端数据问题诊断报告

**日期**：2025-11-05
**浏览器**：Chrome / Edge / Firefox
**问题**：数据不显示

#### 控制台日志

```
[粘贴所有相关日志]
```

#### 问题描述

[描述您看到的问题]

#### 截图

[如果可能，请提供截图]
```

---

## 🔧 快速测试命令

### 1. 清除缓存

在控制台执行：
```javascript
Taro.clearStorageSync()
console.log('缓存已清除')
location.reload()
```

### 2. 检查数据库连接

在控制台执行：
```javascript
const { data, error } = await supabase.from('profiles').select('count')
console.log('数据库连接:', error ? '失败' : '成功', data)
```

### 3. 检查司机数据

在控制台执行：
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('id, name, phone, role')
  .eq('role', 'driver')
console.log('司机数据:', data, error)
```

---

## 📞 需要帮助？

如果您不确定如何操作，或者看到了错误日志，请：

1. ✅ 截图控制台日志
2. ✅ 复制所有日志文本
3. ✅ 描述您看到的问题
4. ✅ 发送给技术支持

**联系方式**：
- **邮箱**：support@fleet.com
- **电话**：400-123-4567

---

**文档版本**：v1.0  
**创建时间**：2025-11-05  
**适用版本**：车队管家 v1.2  
**状态**：✅ 可用
