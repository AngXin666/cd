# RLS 安全策略全面分析报告

生成时间: 2025-11-26
分析人: AI Assistant

---

## 🔍 发现的问题

### 问题概述
发现 **14个表** 都存在类似的宽松"租户数据隔离"策略：

```sql
CREATE POLICY "租户数据隔离 - {表名}" ON {表名}
  FOR ALL
  TO authenticated
  USING (is_lease_admin() OR (tenant_id = get_user_tenant_id()));
```

### 问题分析
这个策略的问题：
- ✅ 实现了租户隔离（不同租户的数据无法互相访问）
- ❌ 没有角色权限控制（同租户的所有用户都可以访问所有数据）
- ❌ 可能导致敏感数据泄露（如司机A可以查看司机B的考勤、工资等）

---

## 📊 受影响的表分类

### 🔴 高风险表（需要立即修复）

这些表包含敏感的个人数据，不同角色应该有不同的访问权限：

#### 1. attendance（考勤记录）
**当前问题**: 司机A可以查看司机B的考勤记录

**正确权限**:
- 司机：只能查看自己的考勤
- 车队长：可以查看自己仓库司机的考勤
- 老板：可以查看所有考勤
- 租赁管理员：可以查看所有考勤

---

#### 2. piece_work_records（计件工作记录）
**当前问题**: 司机A可以查看司机B的计件记录和收入

**正确权限**:
- 司机：只能查看自己的记录
- 车队长：可以查看自己仓库司机的记录
- 老板：可以查看所有记录
- 租赁管理员：可以查看所有记录

---

#### 3. leave_applications（请假申请）
**当前问题**: 司机A可以查看司机B的请假记录

**正确权限**:
- 司机：只能查看自己的请假
- 车队长：可以查看自己仓库司机的请假
- 老板：可以查看所有请假
- 租赁管理员：可以查看所有请假

---

#### 4. resignation_applications（离职申请）
**当前问题**: 司机A可以查看司机B的离职申请

**正确权限**:
- 司机：只能查看自己的离职申请
- 车队长：可以查看自己仓库司机的离职申请
- 老板：可以查看所有离职申请
- 租赁管理员：可以查看所有离职申请

---

#### 5. driver_licenses（司机驾照）
**当前问题**: 司机A可以查看司机B的驾照信息

**正确权限**:
- 司机：只能查看自己的驾照
- 车队长：可以查看自己仓库司机的驾照
- 老板：可以查看所有驾照
- 租赁管理员：可以查看所有驾照

---

#### 6. notifications（通知）
**当前问题**: 用户A可以查看用户B的通知

**正确权限**:
- 用户：只能查看发给自己的通知（user_id = auth.uid()）
- 租赁管理员：可以查看所有通知

---

### 🟡 中风险表（建议优化）

这些表的数据相对不那么敏感，但仍建议添加一些权限控制：

#### 7. feedback（反馈）
**当前情况**: 所有同租户用户都可以查看所有反馈

**建议权限**:
- 用户：只能查看自己提交的反馈
- 老板/车队长：可以查看所有反馈
- 租赁管理员：可以查看所有反馈

---

### 🟢 低风险表（可以保持现状）

这些表的数据是租户内共享的，同租户用户需要访问：

#### 8. warehouses（仓库信息）
**原因**: 同租户用户需要知道有哪些仓库

#### 9. vehicles（车辆信息）
**原因**: 同租户用户需要知道有哪些车辆

#### 10. vehicle_records（车辆记录）
**原因**: 同租户用户需要查看车辆状态

#### 11. attendance_rules（考勤规则）
**原因**: 同租户用户需要知道考勤规则

#### 12. category_prices（分类价格）
**原因**: 同租户用户需要知道价格

#### 13. driver_warehouses（司机仓库关联）
**原因**: 用于权限控制，需要查询

#### 14. manager_warehouses（车队长仓库关联）
**原因**: 用于权限控制，需要查询

---

## 🎯 修复优先级

### P0 - 立即修复（本周）
1. ✅ profiles（已修复）
2. ⏳ attendance（考勤记录）
3. ⏳ piece_work_records（计件记录）
4. ⏳ notifications（通知）

### P1 - 高优先级（下周）
5. ⏳ leave_applications（请假申请）
6. ⏳ resignation_applications（离职申请）
7. ⏳ driver_licenses（司机驾照）

### P2 - 中优先级（下月）
8. ⏳ feedback（反馈）

### P3 - 低优先级（可选）
9-14. warehouses, vehicles, vehicle_records 等（保持现状）

---

## 📝 修复计划

### 第一批修复（P0）

#### 1. attendance（考勤记录）
```sql
-- 删除宽松策略
DROP POLICY IF EXISTS "租户数据隔离 - attendance" ON attendance;

-- 创建严格策略
-- 司机只能查看自己的考勤
CREATE POLICY "司机可以查看自己的考勤" ON attendance
  FOR SELECT TO authenticated
  USING (
    is_driver(auth.uid())
    AND driver_id = auth.uid()
  );

-- 车队长可以查看自己仓库司机的考勤
CREATE POLICY "车队长可以查看仓库司机的考勤" ON attendance
  FOR SELECT TO authenticated
  USING (
    is_manager(auth.uid())
    AND driver_id IN (
      SELECT dw.driver_id
      FROM driver_warehouses dw
      WHERE dw.warehouse_id IN (
        SELECT mw.warehouse_id
        FROM manager_warehouses mw
        WHERE mw.manager_id = auth.uid()
      )
    )
  );

-- 老板可以查看所有考勤
CREATE POLICY "老板可以查看所有考勤" ON attendance
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    AND tenant_id = get_user_tenant_id()
  );

-- 租赁管理员可以查看所有考勤
CREATE POLICY "租赁管理员可以查看所有考勤" ON attendance
  FOR SELECT TO authenticated
  USING (is_lease_admin());
```

#### 2. piece_work_records（计件记录）
```sql
-- 类似 attendance 的策略
```

#### 3. notifications（通知）
```sql
-- 删除宽松策略
DROP POLICY IF EXISTS "租户数据隔离 - notifications" ON notifications;

-- 用户只能查看发给自己的通知
CREATE POLICY "用户可以查看自己的通知" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 租赁管理员可以查看所有通知
CREATE POLICY "租赁管理员可以查看所有通知" ON notifications
  FOR SELECT TO authenticated
  USING (is_lease_admin());
```

---

## 🔒 安全影响评估

### 修复前的风险 🔴

```
🔴 高风险: 敏感数据泄露
  - 司机A可以查看司机B的考勤记录
  - 司机A可以查看司机B的计件收入
  - 司机A可以查看司机B的请假记录
  - 用户A可以查看用户B的通知

🔴 中风险: 隐私泄露
  - 司机A可以查看司机B的驾照信息
  - 司机A可以查看司机B的离职申请

🔴 低风险: 业务数据泄露
  - 用户可以查看其他用户的反馈
```

### 修复后的保障 ✅

```
✅ 敏感数据保护
  - 司机只能查看自己的数据
  - 车队长只能查看自己仓库司机的数据
  - 老板可以查看自己租户的所有数据

✅ 隐私保护
  - 个人信息只能被授权人员查看
  - 通知只能被接收者查看

✅ 审计能力
  - 所有访问都有明确的权限检查
  - 可以追踪数据访问记录
```

---

## 📈 性能影响评估

### 策略复杂度对比

**修复前**:
```sql
-- 简单的租户隔离，查询快
tenant_id = get_user_tenant_id()
```

**修复后**:
```sql
-- 包含子查询，可能影响性能
driver_id IN (
  SELECT dw.driver_id
  FROM driver_warehouses dw
  WHERE dw.warehouse_id IN (
    SELECT mw.warehouse_id
    FROM manager_warehouses mw
    WHERE mw.manager_id = auth.uid()
  )
)
```

### 性能优化建议

1. **添加索引**:
```sql
-- driver_warehouses 表
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_warehouse_driver 
  ON driver_warehouses(warehouse_id, driver_id);

-- manager_warehouses 表
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager_warehouse 
  ON manager_warehouses(manager_id, warehouse_id);
```

2. **使用物化视图**（如果性能问题严重）:
```sql
-- 创建车队长-司机关系的物化视图
CREATE MATERIALIZED VIEW manager_drivers AS
SELECT 
  mw.manager_id,
  dw.driver_id,
  dw.tenant_id
FROM manager_warehouses mw
JOIN driver_warehouses dw ON mw.warehouse_id = dw.warehouse_id;

-- 定期刷新
REFRESH MATERIALIZED VIEW manager_drivers;
```

---

## 🔄 实施步骤

### 第一阶段：P0 修复（本周）

1. **准备工作**
   - [x] 分析所有表的RLS策略
   - [x] 识别高风险表
   - [ ] 创建修复迁移文件

2. **执行修复**
   - [ ] 修复 attendance 表
   - [ ] 修复 piece_work_records 表
   - [ ] 修复 notifications 表

3. **测试验证**
   - [ ] 测试司机权限
   - [ ] 测试车队长权限
   - [ ] 测试老板权限
   - [ ] 测试租赁管理员权限

4. **性能优化**
   - [ ] 添加必要的索引
   - [ ] 监控查询性能
   - [ ] 优化慢查询

### 第二阶段：P1 修复（下周）

1. **执行修复**
   - [ ] 修复 leave_applications 表
   - [ ] 修复 resignation_applications 表
   - [ ] 修复 driver_licenses 表

2. **测试验证**
   - [ ] 完整的功能测试
   - [ ] 性能测试

### 第三阶段：P2 修复（下月）

1. **执行修复**
   - [ ] 修复 feedback 表

2. **全面审查**
   - [ ] 审查所有RLS策略
   - [ ] 更新文档
   - [ ] 培训团队

---

## 💡 最佳实践建议

### 1. RLS 策略设计原则

**三层权限控制**:
1. **租户层**: 确保租户隔离
2. **角色层**: 基于角色分配权限
3. **资源层**: 基于资源所有者控制访问

**示例**:
```sql
USING (
  -- 租户层
  tenant_id = get_user_tenant_id()
  AND (
    -- 角色层
    is_super_admin(auth.uid())
    OR (
      is_manager(auth.uid())
      AND (
        -- 资源层
        driver_id IN (SELECT ... FROM manager_drivers WHERE ...)
      )
    )
    OR (
      is_driver(auth.uid())
      AND driver_id = auth.uid()
    )
  )
)
```

### 2. 性能优化策略

1. **索引优化**: 为常用的查询条件添加索引
2. **查询优化**: 避免过深的嵌套子查询
3. **缓存策略**: 对不常变化的数据使用缓存
4. **监控告警**: 监控慢查询，及时优化

### 3. 安全审计

1. **定期审查**: 每季度审查一次RLS策略
2. **访问日志**: 记录敏感数据的访问
3. **异常检测**: 监控异常的数据访问模式
4. **权限测试**: 自动化测试权限控制

---

**报告生成时间**: 2025-11-26
**分析人**: AI Assistant
**状态**: 待修复
**优先级**: P0（高）
