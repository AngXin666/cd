# 不存在表的代码清理计划

## 概述
本文档记录了数据库中不存在的表及其相关代码引用的清理计划。

## 不存在的表列表

### 1. feedback - 反馈系统表
**影响的文件：**
- `src/db/types.ts` - Feedback相关类型定义
- `src/db/api.ts` - getUserFeedbackList, getAllFeedbackList, createFeedback等函数
- `src/pages/profile/feedback/index.tsx` - 反馈页面
- `src/pages/profile/help/index.tsx` - 帮助页面（可能引用）

**清理策略：**
- ✅ 保留类型定义（用于兼容性）
- ✅ 修改API函数返回空数组或模拟数据
- ✅ 在UI中添加"功能暂未开放"提示

### 2. vehicle_records - 车辆记录表
**影响的文件：**
- `src/db/types.ts` - VehicleRecord相关类型定义
- `src/db/vehicleRecordsApi.ts` - 整个文件都依赖此表
- `src/pages/driver/vehicle-list/index.tsx` - 车辆列表页面
- `src/pages/driver/add-vehicle/index.tsx` - 添加车辆页面
- `src/pages/driver/vehicle-detail/index.tsx` - 车辆详情页面
- `src/pages/driver/edit-vehicle/index.tsx` - 编辑车辆页面
- `src/pages/driver/return-vehicle/index.tsx` - 归还车辆页面
- `src/pages/driver/supplement-photos/index.tsx` - 补充照片页面

**清理策略：**
- ⚠️ 这是一个重要功能，需要评估是否应该使用vehicles或new_vehicles表替代
- ✅ 暂时修改API函数返回空数据
- ✅ 在UI中添加提示信息

### 3. profiles - 用户资料表
**影响的文件：**
- 可能在某些地方被引用

**清理策略：**
- ✅ 使用users表替代
- ✅ 搜索并替换所有引用

### 4. notification_templates - 通知模板表
**影响的文件：**
- `src/pages/shared/notification-templates/index.tsx`

**清理策略：**
- ✅ 在UI中添加"功能暂未开放"提示
- ✅ 修改API返回空数据

### 5. notification_send_records - 通知发送记录表
**影响的文件：**
- `src/pages/shared/notification-records/index.tsx`

**清理策略：**
- ✅ 在UI中添加"功能暂未开放"提示
- ✅ 修改API返回空数据

### 6. scheduled_notifications - 定时通知表
**影响的文件：**
- `src/pages/shared/scheduled-notifications/index.tsx`

**清理策略：**
- ✅ 在UI中添加"功能暂未开放"提示
- ✅ 修改API返回空数据

### 7. auto_reminder_rules - 自动提醒规则表
**影响的文件：**
- `src/pages/shared/auto-reminder-rules/index.tsx`

**清理策略：**
- ✅ 在UI中添加"功能暂未开放"提示
- ✅ 修改API返回空数据

### 8. driver_warehouses - 司机仓库关联表
**影响的文件：**
- `src/pages/super-admin/driver-warehouse-assignment/index.tsx`

**清理策略：**
- ✅ 使用warehouse_assignments表替代
- ✅ 更新相关代码

### 9. manager_warehouses - 车队长仓库关联表
**影响的文件：**
- `src/pages/super-admin/manager-warehouse-assignment/index.tsx`

**清理策略：**
- ✅ 使用warehouse_assignments表替代
- ✅ 更新相关代码

### 10. user_behavior_logs - 用户行为日志表
**影响的文件：**
- `src/utils/behaviorTracker.ts`

**清理策略：**
- ✅ 禁用行为跟踪功能
- ✅ 修改为仅记录到控制台

### 11. user_feature_weights - 用户特征权重表
**影响的文件：**
- 可能在推荐系统中使用

**清理策略：**
- ✅ 移除相关代码或返回默认值

### 12. system_performance_metrics - 系统性能指标表
**影响的文件：**
- `src/utils/performanceMonitor.ts`

**清理策略：**
- ✅ 禁用性能监控功能
- ✅ 修改为仅记录到控制台

## 权限结构更新

### 新权限函数
- `is_boss_v2()` - 检查是否为老板
- `is_manager_v2()` - 检查是否为车队长
- `get_user_role_v2()` - 获取用户角色

### 需要更新的代码
1. 所有直接查询user_roles表的代码
2. 所有使用旧权限检查逻辑的代码
3. 所有RLS策略相关的代码

## 执行计划

### 阶段1：API层清理（高优先级）
- [ ] 修改feedback相关API函数
- [ ] 修改vehicle_records相关API函数
- [ ] 修改notification相关API函数
- [ ] 修改warehouse assignment相关API函数

### 阶段2：UI层更新（中优先级）
- [ ] 更新反馈页面
- [ ] 更新车辆管理页面
- [ ] 更新通知管理页面
- [ ] 更新仓库分配页面

### 阶段3：工具函数清理（低优先级）
- [ ] 更新behaviorTracker.ts
- [ ] 更新performanceMonitor.ts
- [ ] 更新cache.ts

### 阶段4：权限逻辑更新（高优先级）
- [ ] 更新所有权限检查代码
- [ ] 测试权限功能
- [ ] 更新文档

## 测试计划
1. 测试所有受影响的页面是否正常加载
2. 测试权限检查是否正常工作
3. 测试数据操作是否正常
4. 确保没有运行时错误

## 注意事项
1. 保持向后兼容性
2. 添加适当的错误处理
3. 提供清晰的用户提示
4. 记录所有更改
