# 租赁端功能优化任务清单

## 任务概述
优化租赁端功能，包括账号创建流程调整、功能模块精简和界面优化。

## 任务列表

### 1. 账号创建流程调整
- [x] 修改 tenant-form/index.tsx - 取消邮箱必填项
- [x] 修改 tenant-form/index.tsx - 添加密码二次确认输入框
- [x] 修改 api.ts 中的 createTenant 和 createPeerAccount 函数 - 支持无邮箱创建
- [x] 修复 TypeScript 错误（loadTenant 函数添加 confirmPassword 字段）

### 2. 功能模块精简
- [x] 从 app.config.ts 移除核销管理和账单管理页面路由
- [x] 修改 lease-admin/index.tsx - 移除核销管理和账单管理快速操作按钮
- [x] 修改 getLeaseStats 函数 - 移除账单相关统计

### 3. 界面优化
- [x] 修改 lease-admin/index.tsx - 隐藏"新增老板账号"按钮
- [x] 修改 lease-admin/index.tsx - 移除"待核销账单"和"本月核销账单"数据卡片
- [x] 调整数据概览布局（从6个卡片减少到4个）

## 完成情况
所有任务已完成！

## 修改总结

### 1. 账号创建流程优化
- **邮箱改为可选**：用户可以选择不填写邮箱，系统会自动使用手机号作为登录凭证
- **密码二次确认**：添加了"确认密码"输入框，确保用户输入密码的准确性
- **后端支持**：修改了 `createTenant` 和 `createPeerAccount` 函数，当没有邮箱时使用 `手机号@phone.local` 作为认证邮箱

### 2. 功能模块精简
- **移除核销管理**：从路由配置中移除 `pages/lease-admin/verification/index`
- **移除账单管理**：从路由配置中移除 `pages/lease-admin/bill-list/index`
- **简化统计数据**：`getLeaseStats` 函数不再查询账单相关数据

### 3. 界面优化
- **数据概览精简**：从6个统计卡片减少到4个，移除了"待核销账单"和"本月核销账单"
- **快速操作简化**：只保留"老板账号管理"一个快速操作按钮，移除了"核销管理"、"账单管理"和"新增老板账号"按钮
- **布局调整**：快速操作区域改为单列布局，更加简洁

## 注意事项
- verification 和 bill-list 页面文件仍然存在于文件系统中，但已从路由配置中移除，不会被访问
- 如需彻底删除这些页面，可以手动删除对应的文件夹
- 所有修改已通过 TypeScript 类型检查
