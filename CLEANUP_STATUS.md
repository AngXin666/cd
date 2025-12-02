# 代码清理状态报告

## 已完成的工作

### 1. RLS策略修复（100%完成）✅
- ✅ 完成27个表的RLS策略修复
- ✅ 所有策略已更新为使用新权限函数（is_boss_v2, is_manager_v2）
- ✅ 创建了6个迁移文件（00586-00593）
- ✅ 所有策略已成功应用到数据库

### 2. API层清理（部分完成）⚠️
**已完成：**
- ✅ 修改了feedback相关的3个API函数：
  - `submitFeedback()` - 返回"功能暂未开放"错误
  - `getUserFeedbackList()` - 返回空数组
  - `getAllFeedbackList()` - 返回空数组
  - `updateFeedbackStatus()` - 返回失败

**待完成：**
- ⏳ vehicle_records相关API函数（vehicleRecordsApi.ts）
- ⏳ notification相关API函数
- ⏳ warehouse assignment相关API函数
- ⏳ behavior tracking相关函数
- ⏳ performance monitoring相关函数

### 3. 文档创建（100%完成）✅
- ✅ 创建了CLEANUP_PLAN.md - 详细的清理计划
- ✅ 创建了CLEANUP_STATUS.md - 当前状态报告
- ✅ 更新了PERMISSION_FIX_PROGRESS.md - 权限修复进度

## 不存在的表及其影响

### 高影响表（需要立即处理）

#### 1. vehicle_records - 车辆记录表 🔴
**影响范围：**
- `src/db/vehicleRecordsApi.ts` - 整个文件（约600行代码）
- 多个车辆管理页面

**建议方案：**
1. 评估是否应该创建此表
2. 或者使用vehicles/new_vehicles表替代
3. 或者禁用相关功能

#### 2. feedback - 反馈系统表 🟡
**影响范围：**
- `src/db/api.ts` - 4个函数（已修复✅）
- `src/pages/profile/feedback/index.tsx` - 反馈页面

**状态：** API层已修复，UI层待更新

### 中影响表（可以延后处理）

#### 3. notification_templates - 通知模板表 🟡
**影响范围：**
- `src/pages/shared/notification-templates/index.tsx`

**建议：** 在UI中添加"功能暂未开放"提示

#### 4. notification_send_records - 通知发送记录表 🟡
**影响范围：**
- `src/pages/shared/notification-records/index.tsx`

**建议：** 在UI中添加"功能暂未开放"提示

#### 5. scheduled_notifications - 定时通知表 🟡
**影响范围：**
- `src/pages/shared/scheduled-notifications/index.tsx`

**建议：** 在UI中添加"功能暂未开放"提示

#### 6. auto_reminder_rules - 自动提醒规则表 🟡
**影响范围：**
- `src/pages/shared/auto-reminder-rules/index.tsx`

**建议：** 在UI中添加"功能暂未开放"提示

### 低影响表（可以忽略）

#### 7. driver_warehouses - 司机仓库关联表 🟢
**影响范围：**
- `src/pages/super-admin/driver-warehouse-assignment/index.tsx`

**建议：** 使用warehouse_assignments表替代

#### 8. manager_warehouses - 车队长仓库关联表 🟢
**影响范围：**
- `src/pages/super-admin/manager-warehouse-assignment/index.tsx`

**建议：** 使用warehouse_assignments表替代

#### 9. user_behavior_logs - 用户行为日志表 🟢
**影响范围：**
- `src/utils/behaviorTracker.ts`

**建议：** 禁用行为跟踪或仅记录到控制台

#### 10. system_performance_metrics - 系统性能指标表 🟢
**影响范围：**
- `src/utils/performanceMonitor.ts`

**建议：** 禁用性能监控或仅记录到控制台

#### 11. profiles - 用户资料表 🟢
**影响范围：** 可能在某些地方被引用

**建议：** 使用users表替代

## 权限结构更新状态

### 新权限函数（已创建）✅
```sql
-- 检查是否为老板
CREATE OR REPLACE FUNCTION is_boss_v2(uid uuid)
RETURNS boolean

-- 检查是否为车队长
CREATE OR REPLACE FUNCTION is_manager_v2(uid uuid)
RETURNS boolean

-- 获取用户角色
CREATE OR REPLACE FUNCTION get_user_role_v2(uid uuid)
RETURNS user_role
```

### RLS策略更新（已完成）✅
- ✅ 所有27个表的RLS策略已更新
- ✅ 使用新的权限函数
- ✅ 实现三级权限控制（老板-车队长-用户）

### 应用代码更新（待完成）⏳
**需要更新的代码：**
1. 所有直接查询user_roles表的代码
2. 所有使用旧权限检查逻辑的代码
3. 前端权限判断逻辑

## 下一步行动计划

### 优先级1：关键功能修复 🔴
1. **vehicle_records表问题**
   - [ ] 评估是否需要创建此表
   - [ ] 或者修改vehicleRecordsApi.ts使用现有表
   - [ ] 更新相关页面

2. **权限检查代码更新**
   - [ ] 搜索所有权限检查代码
   - [ ] 更新为使用新的权限结构
   - [ ] 测试权限功能

### 优先级2：UI层更新 🟡
1. **反馈页面**
   - [ ] 添加"功能暂未开放"提示
   - [ ] 或者完全禁用提交功能

2. **通知管理页面**
   - [ ] 在4个通知相关页面添加提示
   - [ ] 或者从导航中移除这些页面

3. **仓库分配页面**
   - [ ] 更新为使用warehouse_assignments表
   - [ ] 测试功能是否正常

### 优先级3：工具函数清理 🟢
1. **behaviorTracker.ts**
   - [ ] 禁用或修改为仅记录到控制台

2. **performanceMonitor.ts**
   - [ ] 禁用或修改为仅记录到控制台

## 测试计划

### 功能测试
- [ ] 测试所有角色的权限是否正常
- [ ] 测试所有受影响页面是否能正常加载
- [ ] 测试数据操作是否正常

### 错误检查
- [ ] 运行`pnpm run lint`检查代码错误
- [ ] 检查控制台是否有运行时错误
- [ ] 检查是否有未处理的表引用

### 用户体验测试
- [ ] 确保所有错误提示清晰友好
- [ ] 确保禁用的功能有明确说明
- [ ] 确保用户不会遇到意外错误

## 风险评估

### 高风险 🔴
- vehicle_records表缺失可能影响核心车辆管理功能
- 需要尽快决定解决方案

### 中风险 🟡
- feedback功能不可用，但不影响核心业务
- 通知管理功能不可用，但有替代方案（notifications表）

### 低风险 🟢
- 行为跟踪和性能监控功能不影响业务
- 可以安全禁用

## 建议

### 立即执行
1. 决定vehicle_records表的处理方案
2. 完成权限检查代码的更新
3. 运行完整的功能测试

### 短期内执行
1. 更新所有受影响的UI页面
2. 清理工具函数
3. 更新文档

### 长期规划
1. 考虑是否需要实现feedback功能
2. 考虑是否需要实现高级通知管理功能
3. 评估是否需要行为跟踪和性能监控

## 总结

### 已完成 ✅
- RLS策略修复（100%）
- 权限函数创建（100%）
- feedback API修复（100%）
- 文档创建（100%）

### 进行中 ⏳
- API层清理（25%）
- UI层更新（0%）

### 待开始 ⏸️
- 工具函数清理
- 完整测试
- 权限代码更新

### 预计完成时间
- 关键功能修复：2-4小时
- UI层更新：2-3小时
- 工具函数清理：1小时
- 测试和验证：2小时
- **总计：7-10小时**
