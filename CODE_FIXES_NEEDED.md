# 代码修复清单

## 数据库表名不匹配问题

### 已修复 ✅
1. `attendance_records` → `attendance` - 已全部替换
2. `piece_work_categories` → `category_prices` - 已全部替换

### 待修复 ⚠️

#### 1. `warehouse_categories` 表不存在
**影响文件：**
- `src/db/api.ts` (多处)
- `src/pages/manager/warehouse-categories/index.tsx`
- `src/pages/super-admin/category-management/index.tsx`

**解决方案：**
- 这个表的功能已经被 `category_prices` 表替代
- 需要重构相关代码，使用 `category_prices` 表

#### 2. `manager_permissions` 表不存在
**影响文件：**
- `src/db/api.ts` (2处)

**解决方案：**
- 权限管理现在通过 `manager_warehouses` 表实现
- 需要删除或重构相关代码

#### 3. `vehicle_lease_info` 和 `vehicles_base` 表不存在
**影响文件：**
- `src/db/vehicle-lease.ts` (多处)
- `src/db/api.ts` (多处)
- `src/db/types.ts` (类型定义)

**解决方案：**
- 车辆相关功能现在使用以下表：
  - `vehicles` - 车辆基本信息
  - `vehicle_records` - 车辆使用记录
  - `driver_licenses` - 驾驶证信息
- 需要重构车辆租赁相关代码

## 重构建议

### 优先级 1（高）- 影响核心功能
1. 修复 `warehouse_categories` 相关代码
   - 将所有引用改为使用 `category_prices`
   - 更新相关的类型定义
   - 测试品类管理功能

### 优先级 2（中）- 影响管理功能
2. 修复 `manager_permissions` 相关代码
   - 使用 `manager_warehouses` 表替代
   - 更新权限检查逻辑

### 优先级 3（低）- 影响车辆租赁功能
3. 重构车辆租赁相关代码
   - 评估是否需要保留车辆租赁功能
   - 如果需要，使用新的表结构重新实现
   - 如果不需要，删除相关代码

## 临时解决方案

为了让应用能够正常运行，可以考虑：

1. **注释掉不存在的表的相关代码**
   - 暂时禁用车辆租赁功能
   - 暂时禁用品类管理功能（如果影响太大）

2. **创建兼容性视图**
   - 为旧表名创建视图，映射到新表
   - 这样可以保持代码不变，但不推荐长期使用

3. **逐步重构**
   - 先修复核心功能（考勤、计件）
   - 再修复管理功能
   - 最后处理车辆租赁功能

## 当前状态

- ✅ 考勤功能：已修复，可以正常使用
- ✅ 计件功能：已修复，可以正常使用
- ⚠️ 品类管理：需要重构
- ⚠️ 权限管理：需要重构
- ⚠️ 车辆租赁：需要重构或删除
