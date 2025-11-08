# 数据库恢复总结

## 恢复时间
2025-11-08

## Supabase 配置信息
- **项目ID**: supabase244341780043055104
- **Endpoint**: https://backend.appmiaoda.com/projects/supabase244341780043055104
- **状态**: ACTIVE_HEALTHY

## 已恢复的数据库结构

### 1. 核心表
- **profiles** - 用户档案表
  - 包含用户角色：driver（司机）、manager（管理员）、super_admin（超级管理员）
  
- **warehouses** - 仓库表
  - 总部仓库
  - 东区仓库
  - 西区仓库

- **warehouse_categories** - 仓库分类表

### 2. 考勤管理
- **attendance_records** - 考勤记录表
- **attendance_rules** - 考勤规则表
  - 已为所有仓库配置工作时间

### 3. 计件工作
- **piece_work_categories** - 计件类别表
  - 冻品、饮料、东鹏、分拣、装卸货物、分拣包裹、搬运货物
- **piece_work_records** - 计件记录表

### 4. 请假和离职
- **leave_applications** - 请假申请表
- **resignation_applications** - 离职申请表

### 5. 权限管理
- **manager_permissions** - 管理员权限表
- **manager_warehouses** - 管理员仓库关联表
- **driver_warehouses** - 司机仓库关联表

### 6. 其他
- **feedback** - 反馈表

## 已创建的测试账户

### 1. 超级管理员
- **手机号**: admin
- **密码**: 123456
- **角色**: super_admin
- **权限**: 可以管理所有仓库和所有用户

### 2. 普通管理员
- **手机号**: admin2
- **密码**: 123456
- **角色**: manager
- **管理仓库**: 东区仓库、西区仓库

### 3. 测试司机
- **手机号**: admin1
- **密码**: 123456
- **角色**: driver
- **所属仓库**: 东区仓库

## 初始数据

### 仓库数据
1. **总部仓库**
   - 工作时间：09:00 - 18:00
   - 状态：激活

2. **东区仓库**
   - 工作时间：08:00 - 17:00
   - 状态：激活
   - 分配管理员：普通管理员（admin2）
   - 分配司机：测试司机（admin1）

3. **西区仓库**
   - 工作时间：09:30 - 18:30
   - 状态：激活
   - 分配管理员：普通管理员（admin2）

### 计件类别
- 冻品（激活）
- 饮料（激活）
- 东鹏（激活）
- 分拣（未激活）
- 装卸货物（激活）
- 分拣包裹（激活）
- 搬运货物（激活）

## 数据库功能

### 1. 用户认证
- 使用 Supabase Auth 进行手机号登录
- 首次登录自动创建用户档案
- 第一个注册用户自动成为超级管理员

### 2. 权限控制
- 启用了行级安全（RLS）
- 超级管理员拥有所有权限
- 普通管理员只能管理分配的仓库
- 司机只能查看和修改自己的数据

### 3. 数据完整性
- 所有表都有时间戳字段（created_at, updated_at）
- 使用触发器自动更新 updated_at
- 外键约束确保数据一致性

## 环境变量配置

已在 `.env` 文件中配置：
```
TARO_APP_SUPABASE_URL=https://backend.appmiaoda.com/projects/supabase244341780043055104
TARO_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDc3NjgyODIwLCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.b3iqwHtNluXlwP7OikTa_Qhc1EVofInSPOIjdVM9GAM
TARO_APP_NAME=车队管家
TARO_APP_APP_ID=app-7cdqf07mbu9t
```

## 下一步操作

1. **测试登录功能**
   - 使用测试账户登录系统
   - 验证不同角色的权限

2. **验证数据访问**
   - 超级管理员应该能看到所有数据
   - 普通管理员只能看到分配仓库的数据
   - 司机只能看到自己的数据

3. **功能测试**
   - 考勤打卡
   - 计件记录
   - 请假申请
   - 离职申请

## 注意事项

1. 测试账户密码都是 `123456`，生产环境应该修改
2. 数据库已启用 RLS，确保所有查询都经过权限验证
3. 所有迁移文件都保存在 `supabase/migrations/` 目录
4. 如需重新恢复数据库，可以按顺序执行迁移文件
