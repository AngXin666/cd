# 数据库快速参考

## 测试账号

| 角色 | 手机号 | 密码 | 登录账号 | 姓名 |
|------|--------|------|----------|------|
| 超级管理员 | 13800000001 | 123456 | admin | 超级管理员 |
| 管理员 | 13800000002 | 123456 | manager01 | 张经理 |
| 司机（纯司机） | 13800000003 | 123456 | driver01 | 李师傅 |
| 司机（带车司机） | 13800000004 | 123456 | driver02 | 王师傅 |

## 测试仓库

| 仓库名称 | 最大请假天数 | 离职提前通知天数 | 每日目标件数 |
|----------|--------------|------------------|--------------|
| 北京仓库 | 30 | 30 | 100 |
| 上海仓库 | 30 | 30 | 150 |

## 仓库分配

### 司机-仓库关联
- 李师傅 → 北京仓库
- 王师傅 → 北京仓库、上海仓库

### 管理员-仓库关联
- 张经理 → 北京仓库

## 考勤规则

| 仓库 | 上班时间 | 下班时间 | 迟到阈值（分钟） | 早退阈值（分钟） |
|------|----------|----------|------------------|------------------|
| 北京仓库 | 08:00 | 18:00 | 15 | 15 |
| 上海仓库 | 09:00 | 18:00 | 15 | 15 |

## 价格分类

### 北京仓库
| 分类名称 | 单价 | 上楼费 | 分拣单价 |
|----------|------|--------|----------|
| 标准件 | 1.5 | 0.5 | 0.3 |
| 大件 | 2.5 | 1.0 | 0.5 |
| 小件 | 1.0 | 0.3 | 0.2 |

### 上海仓库
| 分类名称 | 单价 | 上楼费 | 分拣单价 |
|----------|------|--------|----------|
| 标准件 | 1.8 | 0.6 | 0.4 |
| 大件 | 3.0 | 1.2 | 0.6 |
| 小件 | 1.2 | 0.4 | 0.3 |

## 数据库表结构

### 核心表
- **profiles** - 用户资料表
- **warehouses** - 仓库表

### 关联表
- **driver_warehouses** - 司机-仓库关联表
- **manager_warehouses** - 管理员-仓库关联表

### 业务表
- **attendance** - 考勤记录表
- **attendance_rules** - 考勤规则表
- **piece_work_records** - 计件记录表
- **category_prices** - 价格分类表
- **leave_applications** - 请假申请表
- **resignation_applications** - 离职申请表
- **vehicles** - 车辆表
- **vehicle_records** - 车辆记录表
- **driver_licenses** - 驾驶证表
- **feedback** - 反馈表

## 权限说明

### 超级管理员（super_admin）
- 可以访问所有数据
- 可以管理所有用户
- 可以管理所有仓库
- 可以查看和审批所有申请

### 管理员（manager）
- 只能访问自己负责仓库的数据
- 可以查看和管理自己负责仓库的司机
- 可以查看和审批自己负责仓库的申请
- 可以查看和管理自己负责仓库的考勤和计件记录

### 司机（driver）
- 只能访问自己的数据
- 可以查看自己的考勤记录
- 可以录入自己的计件记录
- 可以提交请假和离职申请
- 可以查看自己的车辆信息

## 常用 SQL 查询

### 查看所有用户
```sql
SELECT id, name, role, phone, login_account FROM profiles ORDER BY created_at;
```

### 查看所有仓库
```sql
SELECT id, name, is_active, max_leave_days, resignation_notice_days, daily_target FROM warehouses;
```

### 查看司机-仓库关联
```sql
SELECT 
  p.name as driver_name,
  w.name as warehouse_name
FROM driver_warehouses dw
JOIN profiles p ON dw.driver_id = p.id
JOIN warehouses w ON dw.warehouse_id = w.id;
```

### 查看管理员-仓库关联
```sql
SELECT 
  p.name as manager_name,
  w.name as warehouse_name
FROM manager_warehouses mw
JOIN profiles p ON mw.manager_id = p.id
JOIN warehouses w ON mw.warehouse_id = w.id;
```

### 查看考勤规则
```sql
SELECT 
  w.name as warehouse_name,
  ar.work_start_time,
  ar.work_end_time,
  ar.late_threshold,
  ar.early_threshold
FROM attendance_rules ar
JOIN warehouses w ON ar.warehouse_id = w.id
WHERE ar.is_active = true;
```

### 查看价格分类
```sql
SELECT 
  w.name as warehouse_name,
  cp.category_name,
  cp.unit_price,
  cp.upstairs_price,
  cp.sorting_unit_price
FROM category_prices cp
JOIN warehouses w ON cp.warehouse_id = w.id
WHERE cp.is_active = true
ORDER BY w.name, cp.category_name;
```

## 环境变量

```env
TARO_APP_SUPABASE_URL=https://backend.appmiaoda.com/projects/supabase244341780043055104
TARO_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TARO_APP_NAME=车队管家
TARO_APP_APP_ID=app-7cdqf07mbu9t
```

## 存储桶

### avatars
- 用途：用户头像
- 大小限制：1MB
- 允许的文件类型：image/jpeg, image/png, image/gif, image/webp

### vehicle_photos
- 用途：车辆照片
- 大小限制：1MB
- 允许的文件类型：image/jpeg, image/png, image/webp

## 注意事项

1. 所有密码均为 123456，请在生产环境中修改
2. 首个注册用户会自动成为超级管理员
3. 所有表都启用了 RLS，请确保权限配置正确
4. 测试数据仅用于开发和测试，请勿在生产环境中使用
