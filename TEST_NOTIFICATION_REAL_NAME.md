# 通知显示真实姓名测试验证指南

## 测试目标

验证通知内容是否正确显示：
- ✅ 司机类型（纯司机/带车司机）
- ✅ 司机真实姓名（从行驶证获取）

## 测试环境

### 测试账号

**司机账号**：
- 手机号：13800000003
- 密码：123456
- 司机类型：带车司机
- profiles.name：司机（占位符）
- driver_licenses.id_card_name：邱吉兴（真实姓名）

**管理员账号**：
- 手机号：13800000001 或 13800000002
- 密码：123456

## 测试步骤

### 步骤 1：登录司机账号

1. 打开小程序
2. 使用司机账号登录（13800000003 / 123456）
3. 确认登录成功，进入司机端首页

### 步骤 2：提交请假申请

1. 点击"请假申请"
2. 填写请假信息：
   - 请假类型：事假
   - 开始日期：明天
   - 结束日期：明天
   - 请假事由：测试通知显示真实姓名
3. 点击"提交申请"
4. 等待提示"提交成功"

### 步骤 3：查看管理员通知

1. 退出司机账号
2. 登录管理员账号（13800000001 或 13800000002）
3. 点击右上角的通知图标（小铃铛）
4. 查看最新的通知内容

### 步骤 4：验证通知内容

**期望的通知内容**：
```
标题：新的请假申请
内容：带车司机 邱吉兴 提交了事假申请，请假时间：2025-11-26 至 2025-11-26（1天），事由：测试通知显示真实姓名
```

**验证要点**：
- ✅ 显示"带车司机"（司机类型）
- ✅ 显示"邱吉兴"（真实姓名，不是"司机"）
- ✅ 格式为"司机类型 真实姓名"

## 测试场景

### 场景 1：请假申请通知

**操作**：司机提交请假申请

**期望通知**：
```
带车司机 邱吉兴 提交了事假申请，请假时间：...
```

### 场景 2：离职申请通知

**操作**：司机提交离职申请

**步骤**：
1. 司机端 → 离职申请
2. 填写离职信息并提交
3. 管理员查看通知

**期望通知**：
```
带车司机 邱吉兴 提交了离职申请，期望离职日期：...
```

## 数据库验证

### 验证司机信息

```sql
-- 查看司机的基本信息
SELECT 
  p.id,
  p.phone,
  p.name AS profile_name,
  p.driver_type,
  dl.id_card_name AS real_name
FROM profiles p
LEFT JOIN driver_licenses dl ON p.id = dl.driver_id
WHERE p.phone = '13800000003';
```

**期望结果**：
```
phone: 13800000003
profile_name: 司机
driver_type: with_vehicle
real_name: 邱吉兴
```

### 验证通知内容

```sql
-- 查看最新的请假申请通知
SELECT 
  id,
  type,
  title,
  message,
  created_at
FROM notifications
WHERE type = 'leave_application_submitted'
ORDER BY created_at DESC
LIMIT 1;
```

**期望结果**：
```
message: 带车司机 邱吉兴 提交了事假申请，请假时间：...
```

## 常见问题

### Q1: 通知内容显示"带车司机 司机"

**原因**：
- 司机没有上传行驶证
- driver_licenses 表中没有该司机的记录
- id_card_name 字段为空

**解决方案**：
1. 司机端上传行驶证
2. 或者在 profiles 表中设置正确的 name 字段

### Q2: 通知内容显示"司机 邱吉兴"

**原因**：
- driver_type 字段为空
- 或者 driver_type 值不是 'pure' 或 'with_vehicle'

**解决方案**：
1. 检查 profiles 表的 driver_type 字段
2. 确保值为 'pure' 或 'with_vehicle'

### Q3: 通知内容显示"带车司机 未知"

**原因**：
- profiles.name 为空
- driver_licenses.id_card_name 为空

**解决方案**：
1. 司机上传行驶证
2. 或者在个人中心设置姓名

## 技术实现

### getDriverDisplayName 函数

```typescript
export async function getDriverDisplayName(userId: string): Promise<string> {
  // 获取司机的基本信息和行驶证信息
  const {data} = await supabase
    .from('profiles')
    .select(`
      name,
      driver_type,
      driver_licenses (
        id_card_name
      )
    `)
    .eq('id', userId)
    .maybeSingle()

  // 司机类型映射
  const driverTypeMap = {
    pure: '纯司机',
    with_vehicle: '带车司机'
  }

  const driverType = data.driver_type ? driverTypeMap[data.driver_type] || '司机' : '司机'

  // 优先使用行驶证上的真实姓名
  let driverName = '未知'
  if (data.driver_licenses && data.driver_licenses.length > 0) {
    driverName = data.driver_licenses[0].id_card_name || data.name || '未知'
  } else {
    driverName = data.name || '未知'
  }

  return `${driverType} ${driverName}`
}
```

### 姓名获取优先级

1. **第一优先**：`driver_licenses.id_card_name`
   - 来源：行驶证 OCR 识别
   - 最准确的真实姓名

2. **第二优先**：`profiles.name`
   - 来源：用户手动设置
   - 可能是昵称或占位符

3. **第三优先**：`"未知"`
   - 兜底值
   - 避免显示空白

## 测试检查清单

- [ ] 司机账号可以正常登录
- [ ] 可以提交请假申请
- [ ] 管理员可以收到通知
- [ ] 通知内容显示司机类型
- [ ] 通知内容显示真实姓名（邱吉兴）
- [ ] 不显示占位符"司机"
- [ ] 格式正确："带车司机 邱吉兴"
- [ ] 离职申请通知也正确显示

## 回归测试

### 其他通知类型

确保修改不影响其他通知类型：
- [ ] 请假审批通知
- [ ] 离职审批通知
- [ ] 仓库分配通知
- [ ] 系统通知

### 边界情况

- [ ] 没有行驶证的司机
- [ ] 没有设置姓名的司机
- [ ] 纯司机类型
- [ ] 带车司机类型

## 成功标准

✅ **测试通过条件**：
1. 通知内容显示"带车司机 邱吉兴"
2. 不显示"司机 司机"或"带车司机 司机"
3. 司机类型和姓名都正确显示
4. 格式清晰易读

## 相关文档

- `NOTIFICATION_DISPLAY_OPTIMIZATION.md` - 通知显示优化说明
- `NOTIFICATION_RLS_FIX.md` - 通知系统 RLS 权限修复
- `TEST_NOTIFICATION_FIX.md` - 通知系统修复验证指南

---

**文档创建时间**：2025-11-05  
**最后更新**：2025-11-05  
**状态**：✅ 待测试验证
