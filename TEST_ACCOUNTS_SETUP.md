# 测试账号设置指南

## 测试账号列表

✅ **所有测试账号已经在数据库中创建完成，可以直接使用！**

| 账号 | 手机号 | 密码 | 角色 | 说明 |
|------|--------|------|------|------|
| admin | 13800000000 | admin123 | BOSS | 老板账号，拥有最高权限 |
| admin1 | 13800000001 | admin123 | DISPATCHER | 车队长账号，管理权限 |
| admin2 | 13800000002 | admin123 | DRIVER | 司机账号，基础权限 |
| admin3 | 13800000003 | admin123 | DISPATCHER | 平级账号，管理权限 |

## 使用方法

### 1. 登录测试

1. 打开登录页面
2. 点击对应的快速填充按钮：
   - "老板" → 填充 admin 账号
   - "车队长" → 填充 admin1 账号
   - "司机" → 填充 admin2 账号
   - "平级" → 填充 admin3 账号
3. 点击"登录"按钮

### 2. 角色跳转

登录后，系统会根据角色自动跳转到对应的工作台：

- **BOSS（老板）** → `/pages/super-admin/index`
- **DISPATCHER（车队长/平级）** → `/pages/manager/index`
- **DRIVER（司机）** → `/pages/driver/index`

### 3. 权限测试

#### BOSS 权限
- 查看所有数据
- 管理所有用户
- 管理所有车辆
- 管理所有仓库
- 查看所有考勤记录
- 审批所有请假申请
- 管理所有计件记录
- 发送通知

#### DISPATCHER 权限
- 查看分配给自己的数据
- 管理分配给自己的司机
- 管理分配给自己的车辆
- 查看考勤记录
- 审批请假申请
- 管理计件记录
- 发送通知

#### DRIVER 权限
- 查看自己的数据
- 查看自己的车辆信息
- 提交考勤记录
- 提交请假申请
- 提交计件记录
- 查看通知

## 数据库状态

### 已创建的表

1. **users** - 用户基本信息
2. **user_roles** - 用户角色
3. **departments** - 部门信息
4. **warehouses** - 仓库信息
5. **vehicles** - 车辆信息
6. **attendance_records** - 考勤记录
7. **leave_requests** - 请假申请
8. **piecework_records** - 计件记录
9. **notifications** - 通知消息

### 测试账号状态

所有测试账号已在数据库中创建：

```sql
-- 验证测试账号
SELECT 
  u.phone,
  u.name,
  ur.role,
  u.created_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.phone IN ('13800000000', '13800000001', '13800000002', '13800000003')
ORDER BY u.phone;
```

结果：
- ✅ admin (13800000000) - BOSS
- ✅ admin1 (13800000001) - DISPATCHER
- ✅ admin2 (13800000002) - DRIVER
- ✅ admin3 (13800000003) - DISPATCHER

## 注意事项

1. **密码安全**
   - 测试账号密码为 `admin123`
   - 生产环境请使用强密码

2. **角色权限**
   - BOSS 拥有最高权限
   - DISPATCHER 拥有管理权限
   - DRIVER 只能管理自己的数据

3. **数据隔离**
   - 每个角色只能访问自己权限范围内的数据
   - RLS 策略已启用，确保数据安全

4. **测试建议**
   - 先用 BOSS 账号登录，创建基础数据
   - 再用 DISPATCHER 账号测试管理功能
   - 最后用 DRIVER 账号测试基础功能

## 故障排除

### 登录失败

如果登录失败，请检查：

1. **手机号是否正确**
   - 确认手机号为 13800000000-13800000003

2. **密码是否正确**
   - 确认密码为 admin123

3. **账号是否已创建**
   - 运行上面的 SQL 查询验证账号状态

### 角色跳转失败

如果登录后跳转失败，请检查：

1. **角色是否正确**
   - 确认用户角色为 BOSS/DISPATCHER/DRIVER

2. **页面是否存在**
   - 确认对应的页面文件已创建
   - 确认路由已在 app.config.ts 中注册

3. **权限是否正确**
   - 确认 RLS 策略已启用
   - 确认用户有访问对应页面的权限

## 相关文档

- [登录首页修复报告](./LOGIN_FIX_REPORT.md)
- [数据库重构报告](./DATABASE_REFACTOR_REPORT.md)
- [TODO 列表](./TODO.md)
