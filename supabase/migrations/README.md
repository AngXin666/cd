# 数据库迁移文件说明

本目录包含所有数据库迁移文件，按照执行顺序编号。

## 迁移文件列表

### 01_create_profiles_table.sql
创建用户档案表（profiles）和相关的权限控制。

**主要内容**：
- 创建 `user_role` 枚举类型（driver, manager, super_admin）
- 创建 `profiles` 表存储用户信息
- 设置行级安全策略（RLS）
- 创建触发器，首位注册用户自动成为超级管理员

### 02_create_test_accounts.sql
在 profiles 表中创建测试账号的档案记录。

**创建的账号**：
- admin（超级管理员）
- admin1（司机）
- admin2（普通管理员）

### 03_create_auth_test_users.sql
在 auth.users 表中创建测试账号的认证记录。

**主要内容**：
- 为每个测试账号创建 auth.users 记录
- 设置邮箱地址（格式：账号名@fleet.com）
- 设置 phone 字段为账号名（用于账号名登录）
- 标记手机号已确认

### 04_fix_test_accounts_password.sql
使用 PostgreSQL 的 crypt() 函数为测试账号设置正确的密码。

**密码信息**：
- 明文密码：123456
- 使用 crypt() 函数自动生成 bcrypt 哈希
- 这是设置密码的正确方式，确保密码可以被 Supabase Auth 正确验证

### 05_create_attendance_table.sql
创建考勤打卡记录表（attendance_records）和相关的权限控制。

**主要内容**：
- 创建 `attendance_records` 表存储考勤打卡记录
- 支持GPS定位打卡（记录经纬度）
- 自动计算工作时长
- 支持考勤状态（正常/迟到/早退/缺勤）
- 设置行级安全策略（RLS）
- 司机可以查看和创建自己的打卡记录
- 管理员可以查看所有打卡记录
- 超级管理员拥有完全权限

## 登录机制说明

系统支持两种登录方式：

### 1. 账号名登录
- 输入账号名（如：admin）
- 系统自动转换为邮箱格式（admin@fleet.com）
- 使用邮箱+密码进行认证

### 2. 手机号登录
- 输入11位手机号
- 使用手机号+密码进行认证
- 或使用手机号+验证码进行认证

## 废弃的迁移文件

以下迁移文件与废弃的策略模板权限系统相关，不再使用：

### 策略模板系统相关（已废弃）
- `00547_refactor_peer_admin_to_strategy.sql` - 平级管理员策略模板重构
- `00548_cleanup_peer_admin_old_implementation.sql` - 清理旧的平级管理员实现
- `00551_refactor_manager_to_strategy.sql` - 车队长策略模板重构
- `00551_refactor_manager_to_strategy_template.sql` - 车队长策略模板重构
- `00552_separate_boss_permissions.sql` - 分离老板权限
- `00559_refactor_manager_to_strategy_template_part2.sql` - 车队长策略模板重构第2部分
- `00560_refactor_manager_to_strategy_template_part3.sql` - 车队长策略模板重构第3部分
- `00561_refactor_manager_to_strategy_template_part4a.sql` - 车队长策略模板重构第4a部分
- `00562_refactor_manager_to_strategy_template_part4b.sql` - 车队长策略模板重构第4b部分
- `00563_refactor_manager_to_strategy_template_part4c.sql` - 车队长策略模板重构第4c部分
- `00564_refactor_manager_add_warehouse_access_function.sql` - 添加仓库访问函数
- `00566_separate_boss_permissions_part1.sql` - 分离老板权限第1部分
- `00567_separate_boss_permissions_part2.sql` - 分离老板权限第2部分
- `00568_separate_boss_permissions_part3.sql` - 分离老板权限第3部分
- `00569_separate_boss_permissions_part4.sql` - 分离老板权限第4部分
- `00570_separate_boss_permissions_part5a.sql` - 分离老板权限第5a部分
- `00571_separate_boss_permissions_part5b.sql` - 分离老板权限第5b部分
- `00576_create_scheduler_permission_strategies.sql` - 创建调度权限策略
- `00577_create_scheduler_permission_strategies_fixed.sql` - 修复调度权限策略
- `00578_create_scheduler_permission_strategies_correct.sql` - 正确的调度权限策略

**说明**：
- 这些迁移文件创建了复杂的策略模板权限系统，包括数据库函数如 `create_manager`、`get_manager_permission` 等
- 该系统已被简化的应用层权限控制系统取代
- 现在权限通过 `users` 表的 `permission_type` 字段直接管理
- 这些文件保留在目录中以避免影响已部署的数据库，但不应再使用

## 注意事项

1. **密码安全**：生产环境中应使用更强的密码策略
2. **测试账号**：这些测试账号仅用于开发和测试，生产环境应删除
3. **迁移顺序**：必须按照文件编号顺序执行迁移
4. **RLS 策略**：确保理解行级安全策略的工作原理，避免数据泄露
5. **废弃的迁移文件**：不要删除废弃的迁移文件，它们对已部署的数据库仍然有效
