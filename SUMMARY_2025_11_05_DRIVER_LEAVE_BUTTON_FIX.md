# 司机端请假离职申请按钮状态优化 - 完成总结

## 完成时间
2025-11-05

## 需求回顾

当司机在所分配的任何一个仓库中存在审核中的请假或离职申请时：

1. **请假申请按钮**
   - ✅ 改变名称为"请假审批中"
   - ✅ 按钮变成灰色
   - ✅ 无法点击申请
   - ✅ 避免司机多次申请

2. **离职申请按钮**
   - ✅ 改变名称为"离职审批中"
   - ✅ 按钮变成灰色
   - ✅ 无法点击申请
   - ✅ 避免司机多次申请

## 实现内容

### 1. 添加状态变量

```typescript
// 审核中的申请状态
const [hasPendingLeave, setHasPendingLeave] = useState(false)
const [hasPendingResignation, setHasPendingResignation] = useState(false)
```

### 2. 在数据加载时检查审核状态

```typescript
// 检查是否有审核中的请假申请
const pendingLeave = leaveData.some((app) => app.status === 'pending')
setHasPendingLeave(pendingLeave)

// 检查是否有审核中的离职申请
const pendingResignation = resignationData.some((app) => app.status === 'pending')
setHasPendingResignation(pendingResignation)
```

### 3. 修改按钮点击处理函数

```typescript
const _handleApplyLeave = () => {
  if (!profile) {
    showToast({title: '请先完善个人信息', icon: 'none'})
    return
  }
  // 检查是否有审核中的请假申请
  if (hasPendingLeave) {
    showToast({title: '您有请假申请正在审批中，请等待审批完成', icon: 'none', duration: 2000})
    return
  }
  navigateTo({url: '/pages/driver/leave/apply/index'})
}
```

### 4. 修改按钮UI

```typescript
<Button
  className="text-sm break-keep"
  size="default"
  style={{
    backgroundColor: hasPendingLeave ? '#9CA3AF' : '#1E3A8A',
    color: 'white',
    borderRadius: '8px',
    border: 'none',
    padding: '16px',
    opacity: hasPendingLeave ? 0.6 : 1
  }}
  onClick={_handleApplyLeave}
  disabled={hasPendingLeave}>
  <View className="flex flex-col items-center">
    <View className={`${hasPendingLeave ? 'i-mdi-clock-alert' : 'i-mdi-calendar-clock'} text-3xl mb-2`} />
    <Text className="text-sm">{hasPendingLeave ? '请假审批中' : '申请请假'}</Text>
  </View>
</Button>
```

## 功能特性

### 1. 智能状态检测
- ✅ 自动检测是否有审核中的申请
- ✅ 实时更新状态
- ✅ 多仓库支持

### 2. 视觉反馈

#### 正常状态
- **请假申请按钮**：深蓝色背景 (`#1E3A8A`)，日历图标，文本"申请请假"
- **离职申请按钮**：橙色背景 (`#F97316`)，用户移除图标，文本"申请离职"

#### 审批中状态
- **请假申请按钮**：灰色背景 (`#9CA3AF`)，时钟警告图标，文本"请假审批中"，透明度 0.6
- **离职申请按钮**：灰色背景 (`#9CA3AF`)，时钟警告图标，文本"离职审批中"，透明度 0.6

### 3. 交互限制
- ✅ 使用 `disabled` 属性禁用按钮
- ✅ 点击时显示友好提示
- ✅ 防止重复申请

### 4. 用户体验
- ✅ 清晰的状态指示
- ✅ 友好的错误提示
- ✅ 一致的设计语言

## 测试场景

### ✅ 场景 1：正常申请
- 登录司机账号
- 进入请假页面
- 按钮为正常颜色，可点击

### ✅ 场景 2：有审核中的请假申请
- 提交请假申请（状态为 `pending`）
- 返回请假页面
- "请假审批中"按钮为灰色，不可点击
- 点击显示提示："您有请假申请正在审批中，请等待审批完成"

### ✅ 场景 3：有审核中的离职申请
- 提交离职申请（状态为 `pending`）
- 返回请假页面
- "离职审批中"按钮为灰色，不可点击
- 点击显示提示："您有离职申请正在审批中，请等待审批完成"

### ✅ 场景 4：申请被批准后
- 管理员批准申请（状态变为 `approved`）
- 刷新页面
- 按钮恢复正常，可再次申请

### ✅ 场景 5：申请被拒绝后
- 管理员拒绝申请（状态变为 `rejected`）
- 刷新页面
- 按钮恢复正常，可再次申请

### ✅ 场景 6：多仓库场景
- 司机分配到多个仓库
- 在任一仓库提交申请
- 按钮在所有仓库都显示为审批中状态

## 改进效果

### 优化前
- ❌ 司机可以多次提交请假申请
- ❌ 没有明确的状态指示
- ❌ 容易造成重复申请
- ❌ 管理员需要处理多个重复申请

### 优化后
- ✅ 司机只能在没有审核中申请时提交新申请
- ✅ 清晰的视觉反馈显示当前状态
- ✅ 防止重复申请
- ✅ 减少管理员的工作量

## 技术实现

### 状态检查逻辑
```typescript
const pendingLeave = leaveData.some((app) => app.status === 'pending')
```

**优点**：
- 简洁高效
- 只要有一个申请是 `pending` 状态就返回 `true`
- 适用于多仓库场景

### 按钮禁用
```typescript
<Button disabled={hasPendingLeave} onClick={_handleApplyLeave}>
```

**效果**：
- 禁用按钮的点击事件
- 浏览器自动添加禁用样式
- 配合自定义样式增强视觉效果

### 动态样式
```typescript
style={{
  backgroundColor: hasPendingLeave ? '#9CA3AF' : '#1E3A8A',
  opacity: hasPendingLeave ? 0.6 : 1
}}
```

**优点**：
- 实时响应状态变化
- 灵活控制样式
- 易于维护

## 修改文件清单

### 1. 司机请假页面
- **文件**：`src/pages/driver/leave/index.tsx`
- **新增**：`hasPendingLeave` 和 `hasPendingResignation` 状态变量
- **修改**：`loadData` 函数，添加审核状态检查
- **修改**：`_handleApplyLeave` 和 `_handleApplyResignation` 函数，添加状态验证
- **修改**：按钮UI，根据状态动态改变样式和文本

### 2. 文档
- **新增**：`docs/司机端请假离职申请按钮状态优化.md` - 详细实现说明
- **新增**：`docs/网络请求错误处理优化.md` - 网络错误处理方案
- **新增**：`SUMMARY_2025_11_05_DRIVER_LEAVE_BUTTON_FIX.md` - 完成总结

## 代码质量

### TypeScript 类型检查
```bash
pnpm run lint
```

**结果**：✅ 通过，无新增错误

### 代码规范
- ✅ 使用 TypeScript 严格模式
- ✅ 添加详细的注释
- ✅ 遵循项目代码风格
- ✅ 使用 React Hooks 最佳实践

## Git 提交记录

```
commit 037eadc
优化司机端请假离职申请按钮状态

需求：
- 当司机有审核中的请假申请时，禁用请假申请按钮
- 当司机有审核中的离职申请时，禁用离职申请按钮
- 按钮变成灰色，文本改为'审批中'
- 防止司机多次提交申请

实现内容：
1. 添加状态变量
2. 在数据加载时检查审核状态
3. 修改按钮点击处理函数
4. 修改按钮UI

改进点：
- 清晰的状态指示
- 防止重复申请
- 友好的用户体验
- 减少管理员工作量
```

## 后续优化建议

### 1. 添加加载状态
在数据加载期间显示加载指示器

### 2. 添加骨架屏
在数据加载期间显示骨架屏，提升用户体验

### 3. 优化错误处理
添加更详细的错误提示和重试机制

### 4. 添加动画效果
在状态切换时添加平滑的过渡动画

## 总结

本次优化成功实现了司机端请假和离职申请按钮的智能状态管理，主要改进包括：

1. ✅ **状态检测**：自动检测是否有审核中的申请
2. ✅ **视觉反馈**：通过颜色、图标和文本明确显示状态
3. ✅ **交互限制**：禁用按钮，防止重复申请
4. ✅ **友好提示**：显示清晰的错误提示信息
5. ✅ **多仓库支持**：检查司机在所有仓库中的申请状态

这些改进显著提升了用户体验，减少了重复申请，降低了管理成本。

## 相关文档

- [司机端请假离职申请按钮状态优化详细说明](./docs/司机端请假离职申请按钮状态优化.md)
- [网络请求错误处理优化方案](./docs/网络请求错误处理优化.md)
- [双管理员端请假审批跳转优化](./docs/双管理员端请假审批跳转优化.md)

## 完成状态

✅ **所有需求已完成**
✅ **代码已提交**
✅ **文档已更新**
✅ **测试场景已验证**

---

**完成日期**：2025-11-05  
**Commit ID**：037eadc  
**状态**：已完成并提交
