# 车队管家小程序

一款专为车队管理打造的微信小程序，提供多角色权限管理，包含司机端、普通管理端和超级管理端三个不同界面，满足车队运营的分层管理需求。

---

## 功能特性

### 多角色权限管理
- **司机端**：个人工作台、基础信息展示、今日统计、仓库打卡、当月考勤统计、查看所属仓库
- **普通管理端**：管理员工作台、司机管理、基础管理功能
- **超级管理端**：超级管理员控制台、系统管理、用户权限管理、仓库管理、考勤规则配置、司机仓库分配

### 用户认证系统
- 基于 Supabase Auth 的登录认证
- 支持手机号+验证码登录
- 支持账号/手机号+密码登录（可使用账号名或手机号登录）
- 首位注册用户自动成为超级管理员

### 登录方式
登录界面提供两种登录方式，可自由切换：

1. **密码登录**（默认，推荐）
   - 支持账号名登录（如：admin、admin1、admin2）
   - 支持手机号登录（11位手机号格式）
   - 输入密码后点击登录按钮
   - 系统会自动识别输入类型并使用对应的认证方式

2. **验证码登录**
   - 仅支持手机号登录
   - 输入手机号后点击"发送验证码"按钮
   - 输入收到的验证码
   - 点击登录按钮

### 测试账号
系统已预置3个测试账号，可直接使用密码登录：

| 账号 | 密码 | 角色 | 邮箱 | 说明 |
|------|------|------|------|------|
| admin | 123456 | 超级管理员 | admin@fleet.com | 拥有所有权限 |
| admin2 | 123456 | 普通管理员 | admin2@fleet.com | 可管理司机 |
| admin1 | 123456 | 司机 | admin1@fleet.com | 基础权限 |

**快速登录步骤**：
1. 在登录页面选择"密码登录"（默认已选中）
2. 在账号输入框中输入账号名（如：`admin`）
3. 在密码输入框中输入密码：`123456`
4. 点击"登录"按钮
5. 登录成功后自动跳转到对应角色的工作台

**重要提示**：
- ✅ 密码已使用 PostgreSQL 的 `crypt()` 函数正确加密
- ✅ 所有测试账号均可正常登录
- ✅ 支持使用账号名（admin）或邮箱（admin@fleet.com）登录
- 📖 详细登录指南请查看：[docs/LOGIN_GUIDE.md](docs/LOGIN_GUIDE.md)

### 权限控制
- 超级管理员：拥有所有权限，可管理所有用户和修改任何角色，可管理仓库和考勤规则，可为司机分配仓库
- 普通管理员：可查看所有用户，可修改司机角色，可查看考勤记录
- 司机：只能查看和修改自己的信息，只能在被分配的仓库打卡

### 考勤打卡系统
- **仓库选择打卡**：司机选择所在仓库进行打卡（仅限被分配的仓库）
- **考勤状态判定**：根据管理员设置的考勤规则自动判定迟到、早退等状态
- **工时自动计算**：下班打卡时自动计算工作时长
- **考勤统计分析**：查看当月出勤天数、正常天数、迟到次数、总工时等统计数据
- **灵活打卡设置**：支持设置是否需要打下班卡

### 仓库管理系统（超级管理员）
- **仓库信息管理**：添加、编辑、删除仓库信息
- **考勤规则配置**：设置上下班时间、迟到阈值、早退阈值
- **下班卡设置**：设置是否需要打下班卡
- **仓库状态管理**：启用或禁用仓库
- **实时预览**：查看仓库考勤规则

### 司机仓库分配系统（超级管理员）
- **司机仓库分配**：为司机分配可以工作的仓库
- **多仓库支持**：支持一个司机分配到多个仓库
- **灵活管理**：可随时调整司机的仓库分配
- **权限控制**：司机只能在被分配的仓库打卡

---

## 页面路由

| 路由 | 页面名称 | 说明 |
|------|---------|------|
| `/pages/login/index` | 登录页 | 用户登录入口 |
| `/pages/driver/index` | 司机工作台 | 司机端主页（tabBar） |
| `/pages/driver/clock-in/index` | 上下班打卡 | 仓库选择打卡功能 |
| `/pages/driver/attendance/index` | 当月考勤 | 查看当月考勤记录和统计 |
| `/pages/manager/index` | 管理员工作台 | 普通管理端主页（tabBar） |
| `/pages/super-admin/index` | 超级管理员控制台 | 超级管理端主页（tabBar） |
| `/pages/super-admin/warehouse-management/index` | 仓库管理 | 仓库和考勤规则管理 |
| `/pages/super-admin/driver-warehouse-assignment/index` | 司机仓库分配 | 为司机分配工作仓库 |
| `/pages/profile/index` | 个人中心 | 用户个人信息管理（tabBar） |
| `/pages/admin-dashboard/index` | 用户管理 | 超级管理员用户管理页面 |

---

## 技术栈

- **前端框架**：Taro + React + TypeScript
- **样式方案**：Tailwind CSS
- **后端服务**：Supabase（数据库 + 认证）
- **状态管理**：React Hooks
- **包管理器**：pnpm

---

## 项目结构

```
├── src/
│   ├── app.config.ts               # Taro应用配置，定义路由和tabBar
│   ├── app.tsx                     # 应用入口，配置AuthProvider
│   ├── app.scss
│   ├── assets/
│   │   └── images/                 # 图片资源
│   │       ├── selected/           # tabBar选中态图标
│   │       └── unselected/         # tabBar未选中态图标
│   ├── client/
│   │   └── supabase.ts             # Supabase客户端配置
│   ├── db/                         # 数据库操作
│   │   ├── api.ts                  # 数据库API封装
│   │   └── types.ts                # 数据库类型定义
│   ├── pages/                      # 页面目录
│   │   ├── login/                  # 登录页
│   │   ├── driver/                 # 司机端
│   │   │   ├── index.tsx           # 司机工作台
│   │   │   ├── clock-in/           # 上下班打卡
│   │   │   └── attendance/         # 当月考勤
│   │   ├── manager/                # 管理员工作台
│   │   ├── super-admin/            # 超级管理员控制台
│   │   ├── profile/                # 个人中心
│   │   └── admin-dashboard/        # 用户管理
│   └── types/                      # TypeScript类型定义
└── supabase/
    └── migrations/                 # 数据库迁移文件
        ├── 01_create_profiles_table.sql
        ├── 02_create_test_accounts.sql
        ├── 03_create_auth_test_users.sql
        ├── 04_fix_test_accounts_password.sql
        ├── 05_create_attendance_table.sql
        ├── 06_create_warehouse_and_attendance_rules.sql
        ├── 07_simplify_attendance_system.sql
        └── 08_create_driver_warehouses.sql
```

---

## 数据库设计

### profiles 表（用户档案）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，用户ID |
| phone | text | 手机号（唯一） |
| email | text | 邮箱（唯一） |
| name | text | 用户姓名 |
| role | user_role | 用户角色（driver/manager/super_admin） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### attendance_records 表（考勤记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，记录ID |
| user_id | uuid | 用户ID（外键） |
| warehouse_id | uuid | 仓库ID（外键） |
| clock_in_time | timestamptz | 上班打卡时间 |
| clock_out_time | timestamptz | 下班打卡时间 |
| work_date | date | 工作日期 |
| work_hours | numeric | 工作时长（小时） |
| status | text | 状态（normal/late/early/absent） |
| notes | text | 备注 |
| created_at | timestamptz | 创建时间 |

### warehouses 表（仓库信息）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，仓库ID |
| name | text | 仓库名称 |
| is_active | boolean | 是否启用 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### attendance_rules 表（考勤规则）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，规则ID |
| warehouse_id | uuid | 仓库ID（外键） |
| work_start_time | time | 上班时间 |
| work_end_time | time | 下班时间 |
| late_threshold | integer | 迟到阈值（分钟） |
| early_threshold | integer | 早退阈值（分钟） |
| require_clock_out | boolean | 是否需要打下班卡 |
| is_active | boolean | 是否启用 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### driver_warehouses 表（司机仓库关联）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，关联ID |
| driver_id | uuid | 司机ID（外键 -> profiles.id） |
| warehouse_id | uuid | 仓库ID（外键 -> warehouses.id） |
| created_at | timestamptz | 创建时间 |
| 唯一约束 | (driver_id, warehouse_id) | 防止重复分配 |

---

## 安装和运行

```bash
# 安装依赖
pnpm install

# 代码检查
pnpm run lint

# 开发环境运行（微信小程序）
pnpm run dev:weapp

# 开发环境运行（H5）
pnpm run dev:h5

# 构建生产版本
pnpm run build:weapp
pnpm run build:h5
```

---

## 设计风格

- **主色调**：深蓝色 (#1E3A8A)
- **辅助色**：橙色 (#F97316)
- **背景色**：浅灰色 (#F8FAFC)
- **圆角**：8px
- **布局**：卡片式布局，轻微阴影效果
- **图标**：Material Design Icons (mdi)

---

## 环境变量

在 `.env` 文件中配置以下变量：

```
TARO_APP_SUPABASE_URL=your_supabase_url
TARO_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
TARO_APP_NAME=车队管家
TARO_APP_APP_ID=app-7cdqf07mbu9t
```

---

## 相关文档

- 📖 [登录指南](docs/LOGIN_GUIDE.md) - 详细的登录功能说明和测试账号
- 📖 [仓库考勤系统使用指南](docs/WAREHOUSE_ATTENDANCE_GUIDE.md) - 仓库管理和打卡功能说明
- 📖 [快速开始指南](docs/QUICK_START.md) - 快速体验打卡功能

---

## 版本历史

### v2.1.0 (2025-11-06)
- ✅ 新增司机仓库分配功能
- ✅ 支持一个司机分配到多个仓库
- ✅ 司机端显示所属仓库列表
- ✅ 打卡时只显示司机被分配的仓库
- ✅ 创建司机仓库关联表（driver_warehouses）
- ✅ 新增司机仓库分配管理页面

### v2.0.0 (2025-11-06)
- ✅ 简化考勤系统，移除GPS定位功能
- ✅ 改为仓库选择打卡方式
- ✅ 新增"是否需要打下班卡"设置
- ✅ 优化仓库管理界面
- ✅ 简化数据库表结构

### v1.3.1 (2025-11-05)
- ✅ 添加完整的位置权限检查机制
- ✅ 实现智能权限引导和用户提示
- ✅ 优化权限拒绝后的处理流程
- ✅ 添加GPS状态检查功能
- ✅ 改进权限说明和用户体验

### v1.3.0 (2025-11-05)
- ✅ 实现智能定位系统，支持多重GPS调用
- ✅ 支持百度地图API和本机GPS定位自动切换
- ✅ 添加定位方式标识和用户提示
- ✅ 提高打卡成功率和系统可用性
- ✅ 优化容错机制和降级策略

### v1.2.1 (2025-11-05)
- ✅ 集成百度地图逆地理编码API
- ✅ 打卡地址从GPS坐标升级为详细地址
- ✅ 优化错误处理和用户提示
- ✅ 添加位置权限配置

### v1.2.0 (2025-11-05)
- ✅ 新增仓库管理功能
- ✅ 新增GPS定位范围限制
- ✅ 新增考勤规则配置
- ✅ 新增自动选择最近仓库
- ✅ 新增考勤状态自动判定

### v1.1.0 (2025-11-05)
- ✅ 新增考勤打卡功能
- ✅ 新增考勤记录查询
- ✅ 新增考勤统计分析

### v1.0.0 (2025-11-05)
- ✅ 基础用户认证系统
- ✅ 多角色权限管理
- ✅ 司机、管理员、超级管理员三端界面
