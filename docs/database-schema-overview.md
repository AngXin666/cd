# 车队管家数据库结构总览

> 最后更新时间：2025-11-05
> 
> 本文档提供数据库表结构的概览，详细的字段信息请使用小程序内的"数据库结构查看器"工具查看。

## 数据库版本信息

- **数据库类型**：PostgreSQL (Supabase)
- **最新迁移版本**：025_create_database_schema_functions
- **总表数量**：约 20+ 张表

## 核心表分类

### 1. 用户与权限管理

#### profiles（用户档案表）
- **用途**：存储所有用户的基本信息
- **关键字段**：id, name, phone, email, role
- **角色类型**：driver（司机）、manager（车队长）、super_admin（老板）

### 2. 仓库管理

#### warehouses（仓库表）
- **用途**：存储仓库基本信息
- **关键字段**：id, name, location, is_active

#### driver_warehouses（司机-仓库关联表）
- **用途**：记录司机分配到哪些仓库工作
- **关键字段**：driver_id, warehouse_id
- **约束**：同一司机和仓库的组合唯一

#### manager_warehouses（管理员-仓库关联表）
- **用途**：记录管理员负责管理哪些仓库
- **关键字段**：manager_id, warehouse_id
- **约束**：同一管理员和仓库的组合唯一

### 3. 考勤管理

#### attendance_rules（考勤规则表）
- **用途**：定义各仓库的考勤规则
- **关键字段**：warehouse_id, clock_in_time, clock_out_time

#### attendance_records（考勤记录表）
- **用途**：记录司机的打卡记录
- **关键字段**：driver_id, warehouse_id, clock_in_time, clock_out_time, status

### 4. 计件工作管理

#### piece_work_categories（计件品类表）
- **用途**：定义计件工作的品类
- **关键字段**：name, unit, is_active

#### category_prices（品类价格表）
- **用途**：定义各仓库各品类的价格
- **关键字段**：warehouse_id, category_id, price

#### piece_work_records（计件记录表）
- **用途**：记录司机的计件工作数据
- **关键字段**：driver_id, warehouse_id, category_id, quantity, amount

### 5. 请假管理

#### leave_applications（请假申请表）
- **用途**：记录司机的请假申请
- **关键字段**：driver_id, leave_type, start_date, end_date, status

#### resignation_applications（离职申请表）
- **用途**：记录司机的离职申请
- **关键字段**：driver_id, reason, status

### 6. 车辆管理

#### vehicles（车辆表）
- **用途**：记录车辆基本信息
- **关键字段**：license_plate, driver_id, status

#### vehicle_records（车辆记录表）
- **用途**：记录车辆的使用历史
- **关键字段**：vehicle_id, driver_id, action_type, action_time

#### driver_licenses（驾驶证信息表）
- **用途**：存储司机的驾驶证信息
- **关键字段**：driver_id, license_number, id_card_name

### 7. 司机类型管理

#### driver_types（司机类型表）
- **用途**：定义司机类型（如正式工、临时工）
- **关键字段**：name, is_active

#### driver_details（司机详细信息表）
- **用途**：存储司机的详细信息
- **关键字段**：driver_id, driver_type_id, hire_date

### 8. 通知系统

#### notifications（通知表）
- **用途**：存储系统通知消息
- **关键字段**：user_id, title, content, type, is_read

### 9. 反馈系统

#### feedback（反馈表）
- **用途**：存储用户反馈信息
- **关键字段**：user_id, content, status

## 表关系图（简化版）

```
profiles (用户)
  ├── driver_warehouses → warehouses (司机-仓库)
  ├── manager_warehouses → warehouses (管理员-仓库)
  ├── attendance_records → warehouses (考勤记录)
  ├── piece_work_records → warehouses (计件记录)
  ├── piece_work_records → piece_work_categories (计件品类)
  ├── leave_applications (请假申请)
  ├── resignation_applications (离职申请)
  ├── vehicles (车辆)
  ├── driver_licenses (驾驶证)
  ├── driver_details → driver_types (司机详情)
  ├── notifications (通知)
  └── feedback (反馈)

warehouses (仓库)
  ├── attendance_rules (考勤规则)
  ├── category_prices → piece_work_categories (品类价格)
  └── attendance_records (考勤记录)

vehicles (车辆)
  └── vehicle_records (车辆记录)
```

## 枚举类型

### user_role（用户角色）
- `driver`：司机
- `manager`：车队长
- `super_admin`：老板

### leave_type（请假类型）
- `sick`：病假
- `personal`：事假
- `annual`：年假
- `other`：其他

### leave_status（请假状态）
- `pending`：待审批
- `approved`：已批准
- `rejected`：已拒绝

### vehicle_status（车辆状态）
- `available`：可用
- `in_use`：使用中
- `maintenance`：维护中
- `retired`：已退役

### attendance_status（考勤状态）
- `normal`：正常
- `late`：迟到
- `early_leave`：早退
- `absent`：缺勤

## 安全策略（RLS）

所有表都启用了行级安全策略（Row Level Security），确保：

1. **司机**：只能查看和修改自己的数据
2. **车队长**：可以查看和管理所负责仓库的司机数据
3. **老板**：拥有所有数据的完全访问权限

## 索引策略

主要索引包括：

1. 外键字段（如 driver_id, warehouse_id）
2. 查询频繁的字段（如 created_at, status）
3. 唯一约束字段（如 phone, email）

## 迁移历史

迁移文件位于 `supabase/migrations/` 目录，按编号顺序执行：

- `001_create_enums.sql`：创建枚举类型
- `002_create_core_tables.sql`：创建核心表
- `003_create_association_tables.sql`：创建关联表
- `004_create_attendance_tables.sql`：创建考勤相关表
- `005_create_piece_work_tables.sql`：创建计件相关表
- `006_create_leave_tables.sql`：创建请假相关表
- `007_create_vehicle_tables.sql`：创建车辆相关表
- `008_create_feedback_table.sql`：创建反馈表
- `009_create_storage_buckets.sql`：创建存储桶
- `010_create_rls_policies.sql`：创建 RLS 策略
- `011_create_test_data.sql`：创建测试数据
- `025_create_database_schema_functions.sql`：创建数据库结构查询函数

## 查看详细结构

要查看详细的表结构、字段类型、约束等信息，请使用以下方式：

### 方式一：使用小程序内置工具（推荐）
1. 登录老板端账号
2. 进入"系统功能" → "数据库结构"
3. 选择要查看的表

### 方式二：查看迁移文件
查看 `supabase/migrations/` 目录下的 SQL 文件

### 方式三：使用 Supabase Dashboard
登录 Supabase 控制台，在 Table Editor 中查看

## 维护建议

1. **定期备份**：建议每天自动备份数据库
2. **迁移管理**：所有结构变更必须通过迁移文件进行
3. **文档更新**：每次添加新表或修改结构后，更新本文档
4. **版本控制**：所有迁移文件纳入 Git 版本控制

## 性能优化

1. **索引优化**：定期检查慢查询，添加必要的索引
2. **数据清理**：定期清理过期的通知和日志数据
3. **查询优化**：使用 EXPLAIN ANALYZE 分析查询性能
4. **连接池**：合理配置数据库连接池大小

## 常见问题

### Q: 如何添加新表？
A: 创建新的迁移文件，使用 `supabase_apply_migration` 工具应用迁移。

### Q: 如何修改现有表结构？
A: 创建新的迁移文件，使用 ALTER TABLE 语句修改结构。

### Q: 如何查看表的 RLS 策略？
A: 在 Supabase Dashboard 的 Authentication → Policies 中查看。

### Q: 如何回滚迁移？
A: 创建新的迁移文件，执行相反的操作（如 DROP TABLE、ALTER TABLE）。

## 相关资源

- [Supabase 官方文档](https://supabase.com/docs)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [数据库结构查看器使用指南](./database-schema-viewer.md)
- [迁移文件目录](../supabase/migrations/)

## 更新日志

### 2025-11-05
- 添加数据库结构查询函数
- 创建数据库结构查看器工具
- 修复管理员仓库分配加载问题

### 2025-11-04
- 添加通知系统相关表
- 优化 RLS 策略
- 添加车辆管理相关字段

---

**注意**：本文档提供概览信息，详细的字段定义和约束请使用"数据库结构查看器"工具或查看迁移文件。
