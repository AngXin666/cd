# 权限结构适配审计报告

## 审计日期
2025-12-02

## 审计目标
全面检查系统中所有核心功能，识别哪些功能还没有适配新的权限结构（基于 `user_roles` 表）。

## 审计方法
1. 扫描所有数据库迁移文件
2. 识别使用旧权限函数的RLS策略
3. 分析每个表的业务重要性
4. 制定修复优先级和方案

## 审计结果

### 已修复的表 ✅
1. **piece_work_records** - 计件记录表（迁移 00586）
2. **category_prices** - 品类价格表（迁移 00586）
3. **attendance** - 考勤记录表（迁移 00587）
4. **attendance_rules** - 考勤规则表（迁移 00587）

### 需要修复的核心业务表

#### 🔴 高优先级（核心业务功能）

##### 1. vehicles - 车辆管理表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：车辆管理是车队管理的核心功能
**当前策略**：
- Super admins 可以管理所有车辆
- Admins 可以管理车辆
- Users 可以查看自己的车辆

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有车辆
- 车队长可以查看其管理仓库的车辆
- 司机可以查看分配给自己的车辆

-- 管理策略
- 老板可以管理所有车辆
- 车队长可以管理其管理仓库的车辆
```

##### 2. warehouses - 仓库管理表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：仓库是组织架构的基础
**当前策略**：
- Super admins 可以管理所有仓库
- Admins 可以管理仓库

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有仓库
- 车队长可以查看其管理的仓库
- 司机可以查看分配给自己的仓库

-- 管理策略
- 老板可以管理所有仓库
```

##### 3. leave_applications - 请假申请表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：请假管理是人事管理的核心功能
**当前策略**：
- Super admins 可以查看/更新所有请假申请
- Admins 可以更新请假申请
- Users 可以查看/创建自己的请假申请

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有请假申请
- 车队长可以查看其管理仓库的司机的请假申请
- 司机可以查看自己的请假申请

-- 审批策略
- 老板可以审批所有请假申请
- 车队长可以审批其管理仓库的司机的请假申请

-- 创建策略
- 司机可以创建自己的请假申请
```

##### 4. resignation_applications - 离职申请表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：离职管理是人事管理的重要功能
**当前策略**：
- Super admins 可以查看/更新所有离职申请
- Admins 可以更新离职申请
- Users 可以查看/创建自己的离职申请

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有离职申请
- 车队长可以查看其管理仓库的司机的离职申请
- 司机可以查看自己的离职申请

-- 审批策略
- 老板可以审批所有离职申请
- 车队长可以审批其管理仓库的司机的离职申请

-- 创建策略
- 司机可以创建自己的离职申请
```

##### 5. notifications - 通知表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：通知系统是用户沟通的重要渠道
**当前策略**：
- Admins 可以创建/更新/删除通知
- Users 可以查看自己的通知

**修复方案**：
```sql
-- 查看策略
- 所有用户可以查看发送给自己的通知

-- 创建策略
- 老板可以创建发送给所有用户的通知
- 车队长可以创建发送给其管理仓库的司机的通知

-- 管理策略
- 老板可以管理所有通知
- 车队长可以管理自己创建的通知
```

##### 6. feedback - 反馈表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：反馈系统是收集用户意见的重要渠道
**当前策略**：
- Admins 可以查看/回复/更新所有反馈
- Users 可以查看/创建自己的反馈

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有反馈
- 车队长可以查看其管理仓库的司机的反馈
- 司机可以查看自己的反馈

-- 回复策略
- 老板可以回复所有反馈
- 车队长可以回复其管理仓库的司机的反馈

-- 创建策略
- 司机可以创建自己的反馈
```

##### 7. driver_licenses - 驾驶证管理表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：驾驶证管理是司机资质管理的核心
**当前策略**：
- Admins 可以查看/管理所有驾驶证
- Users 可以查看/更新自己的驾驶证

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有驾驶证
- 车队长可以查看其管理仓库的司机的驾驶证
- 司机可以查看自己的驾驶证

-- 管理策略
- 老板可以管理所有驾驶证
- 车队长可以管理其管理仓库的司机的驾驶证
- 司机可以更新自己的驾驶证
```

##### 8. vehicle_records - 车辆记录表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：车辆记录是车辆管理的重要组成部分
**当前策略**：
- Admins 可以管理所有车辆记录
- Users 可以查看/创建自己的车辆记录

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有车辆记录
- 车队长可以查看其管理仓库的车辆记录
- 司机可以查看自己的车辆记录

-- 管理策略
- 老板可以管理所有车辆记录
- 车队长可以管理其管理仓库的车辆记录
- 司机可以创建自己的车辆记录
```

#### 🟡 中优先级（支持功能）

##### 9. warehouse_assignments - 仓库分配表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：仓库分配是权限管理的基础
**当前策略**：
- Admins 可以管理所有仓库分配

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有仓库分配
- 车队长可以查看其管理仓库的分配
- 司机可以查看自己的仓库分配

-- 管理策略
- 老板可以管理所有仓库分配
```

##### 10. user_roles - 用户角色表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：用户角色是权限管理的核心
**当前策略**：
- Admins 可以管理所有用户角色

**修复方案**：
```sql
-- 查看策略
- 老板可以查看所有用户角色
- 车队长可以查看其管理仓库的用户角色
- 司机可以查看自己的角色

-- 管理策略
- 老板可以管理所有用户角色
```

##### 11. driver_warehouses - 司机仓库关联表（已废弃？）
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：可能已被 warehouse_assignments 替代
**建议**：检查是否还在使用，如果不使用则删除

##### 12. manager_warehouses - 车队长仓库关联表（已废弃？）
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：可能已被 warehouse_assignments 替代
**建议**：检查是否还在使用，如果不使用则删除

#### 🟢 低优先级（系统功能）

##### 13. notification_templates - 通知模板表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：通知模板管理
**修复方案**：只有老板可以管理通知模板

##### 14. notification_send_records - 通知发送记录表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：通知发送记录
**修复方案**：老板和车队长可以查看相关的发送记录

##### 15. scheduled_notifications - 定时通知表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：定时通知管理
**修复方案**：只有老板可以管理定时通知

##### 16. auto_reminder_rules - 自动提醒规则表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：自动提醒规则管理
**修复方案**：只有老板可以管理自动提醒规则

##### 17. profiles - 用户资料表
**问题**：使用旧权限函数 `is_super_admin()`, `is_admin()`
**影响**：用户资料管理
**修复方案**：
- 老板可以查看/管理所有用户资料
- 车队长可以查看其管理仓库的用户资料
- 司机可以查看/更新自己的资料

#### ⚪ 待评估（可能已废弃）

##### 18. permission_strategies - 权限策略表
**问题**：使用旧权限函数
**建议**：检查是否还在使用，可能已被新权限结构替代

##### 19. resource_permissions - 资源权限表
**问题**：使用旧权限函数
**建议**：检查是否还在使用，可能已被新权限结构替代

##### 20. role_permission_mappings - 角色权限映射表
**问题**：使用旧权限函数
**建议**：检查是否还在使用，可能已被新权限结构替代

##### 21. user_behavior_logs - 用户行为日志表
**问题**：使用旧权限函数
**建议**：检查是否还在使用

##### 22. user_feature_weights - 用户特征权重表
**问题**：使用旧权限函数
**建议**：检查是否还在使用

##### 23. system_performance_metrics - 系统性能指标表
**问题**：使用旧权限函数
**建议**：检查是否还在使用

## 修复优先级建议

### 第一批（立即修复）- 核心业务功能
1. vehicles - 车辆管理
2. warehouses - 仓库管理
3. leave_applications - 请假管理
4. resignation_applications - 离职管理

### 第二批（尽快修复）- 重要业务功能
5. notifications - 通知系统
6. feedback - 反馈系统
7. driver_licenses - 驾驶证管理
8. vehicle_records - 车辆记录

### 第三批（计划修复）- 支持功能
9. warehouse_assignments - 仓库分配
10. user_roles - 用户角色
11. profiles - 用户资料

### 第四批（评估后修复）- 系统功能
12. notification_templates - 通知模板
13. notification_send_records - 通知发送记录
14. scheduled_notifications - 定时通知
15. auto_reminder_rules - 自动提醒规则

### 第五批（评估是否需要）- 待评估表
16. driver_warehouses - 可能已废弃
17. manager_warehouses - 可能已废弃
18. permission_strategies - 可能已废弃
19. resource_permissions - 可能已废弃
20. role_permission_mappings - 可能已废弃
21. user_behavior_logs - 待评估
22. user_feature_weights - 待评估
23. system_performance_metrics - 待评估

## 修复方案模板

### 通用RLS策略模板

```sql
-- ============================================
-- 表名：{table_name}
-- ============================================

-- 1. 删除旧策略
DROP POLICY IF EXISTS "旧策略名称" ON {table_name};

-- 2. 创建新的查看策略
CREATE POLICY "老板可以查看所有{table_name}"
ON {table_name} FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的{table_name}"
ON {table_name} FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "司机可以查看自己的{table_name}"
ON {table_name} FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. 创建新的创建策略
CREATE POLICY "司机可以创建自己的{table_name}"
ON {table_name} FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库的司机创建{table_name}"
ON {table_name} FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以为任何司机创建{table_name}"
ON {table_name} FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 4. 创建新的修改策略
CREATE POLICY "司机可以修改自己的{table_name}"
ON {table_name} FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的{table_name}"
ON {table_name} FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以修改所有{table_name}"
ON {table_name} FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 5. 创建新的删除策略
CREATE POLICY "司机可以删除自己的{table_name}"
ON {table_name} FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND is_driver_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的{table_name}"
ON {table_name} FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) AND is_manager_of_warehouse_v2(auth.uid(), warehouse_id)
);

CREATE POLICY "老板可以删除所有{table_name}"
ON {table_name} FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));
```

## 预估工作量

### 第一批（4个表）
- 预估时间：2-3小时
- 迁移文件：1个
- 测试时间：1小时

### 第二批（4个表）
- 预估时间：2-3小时
- 迁移文件：1个
- 测试时间：1小时

### 第三批（3个表）
- 预估时间：1-2小时
- 迁移文件：1个
- 测试时间：30分钟

### 第四批（4个表）
- 预估时间：1-2小时
- 迁移文件：1个
- 测试时间：30分钟

### 第五批（8个表）
- 预估时间：需要先评估是否使用
- 如果需要修复：2-3小时
- 测试时间：1小时

### 总计
- 总时间：8-13小时（不含第五批）
- 迁移文件：4个
- 测试时间：3小时

## 风险评估

### 高风险
- **车辆管理**：核心业务，影响面大
- **仓库管理**：基础架构，影响其他功能
- **请假/离职管理**：人事管理核心

### 中风险
- **通知系统**：影响用户体验
- **反馈系统**：影响用户沟通
- **驾驶证管理**：影响司机资质

### 低风险
- **通知模板**：系统配置
- **自动提醒规则**：系统配置

## 建议

1. **分批修复**：按优先级分批修复，每批修复后进行充分测试
2. **备份数据**：修复前备份相关表的数据
3. **灰度发布**：先在测试环境验证，再发布到生产环境
4. **监控观察**：修复后密切监控系统运行情况
5. **用户通知**：如果影响用户使用，提前通知用户

## 下一步行动

1. **确认修复范围**：与团队确认哪些表需要优先修复
2. **制定修复计划**：制定详细的修复时间表
3. **准备测试用例**：为每个表准备测试用例
4. **开始第一批修复**：从核心业务功能开始修复

## 相关文档

- 已完成修复：`COMPREHENSIVE_FIX_SUMMARY.md`
- 计件管理修复：`PIECE_WORK_RLS_FIX_REPORT.md`
- 考勤管理修复：`ATTENDANCE_RLS_FIX_REPORT.md`
- 本审计报告：`PERMISSION_STRUCTURE_AUDIT_REPORT.md`
