# 多租户数据隔离改造任务

## 目标
实现完全的租户数据隔离，每个老板（super_admin）的数据完全独立，互不干扰。

## 实施方案
采用**逻辑数据库隔离**模式：
- 在所有需要隔离的表中添加 `boss_id` 字段（租户ID）
- 使用严格的 RLS 策略确保数据隔离
- 创建数据迁移脚本，将现有数据分配到对应租户
- 更新应用代码以支持租户隔离

## 需要隔离的表

### 核心业务表
- [ ] warehouses（仓库管理）- 已有 boss_id
- [ ] profiles（用户管理）- 需要添加 boss_id
- [ ] attendance（考勤管理）- 需要添加 boss_id
- [ ] piece_work_records（计件管理）- 需要添加 boss_id
- [ ] leave_applications（请假管理）- 需要添加 boss_id
- [ ] resignations（离职管理）- 需要添加 boss_id
- [ ] vehicles（车辆管理）- 需要添加 boss_id
- [ ] feedback（反馈管理）- 需要添加 boss_id
- [ ] notifications（通知管理）- 已有 boss_id

### 关联表
- [ ] driver_warehouses（司机仓库分配）- 需要添加 boss_id
- [ ] manager_warehouses（车队长仓库分配）- 需要添加 boss_id
- [ ] driver_licenses（驾驶证信息）- 需要添加 boss_id
- [ ] warehouse_categories（仓库分类）- 需要添加 boss_id
- [ ] category_prices（分类价格）- 需要添加 boss_id
- [ ] vehicle_reviews（车辆审核）- 需要添加 boss_id
- [ ] leases（租赁信息）- 需要添加 boss_id

## 实施步骤

### 1. 数据库结构改造
- [ ] 为所有需要隔离的表添加 boss_id 字段
- [ ] 创建索引优化查询性能
- [ ] 更新外键约束

### 2. RLS 策略更新
- [ ] 更新所有表的 RLS 策略，添加 boss_id 验证
- [ ] 确保老板只能访问自己的数据
- [ ] 确保车队长和司机只能访问所属老板的数据

### 3. 数据迁移
- [ ] 创建数据迁移脚本
- [ ] 为现有数据分配正确的 boss_id
- [ ] 验证数据迁移结果

### 4. 应用代码更新
- [ ] 更新 API 函数，添加 boss_id 验证
- [ ] 更新前端页面，确保数据隔离
- [ ] 测试所有功能

### 5. 测试验证
- [ ] 测试跨租户数据隔离
- [ ] 测试数据完整性
- [ ] 测试性能影响

## 注意事项
1. 老板（super_admin）的 boss_id 是自己的 ID
2. 车队长（manager）和司机（driver）的 boss_id 是所属老板的 ID
3. 所有数据操作都必须验证 boss_id
4. 确保不会出现跨租户数据泄露
