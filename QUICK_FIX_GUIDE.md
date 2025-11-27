# 司机请假通知问题快速修复指南

## 问题现象
司机提交请假后，日志显示 `bossId: null`，提示"未找到 boss_id，无法发送通知"。

## 快速诊断

### 步骤1：检查日志
打开浏览器开发者工具（F12），查看控制台日志：

```
🔍 调试信息 - 开始发送通知
  - bossId: null  // ❌ 如果是 null，说明司机的 boss_id 未设置
```

### 步骤2：检查数据库
执行以下 SQL 查询：

```sql
-- 查询司机的 boss_id
SELECT id, name, role, boss_id 
FROM profiles 
WHERE role = 'driver';
```

如果 `boss_id` 列显示 `NULL`，说明需要修复数据。

## 快速修复（3步）

### 第1步：查询老板 ID
```sql
SELECT id, name, role 
FROM profiles 
WHERE role = 'super_admin';
```

记下老板的 `id`，例如：`abc-123-def-456`

### 第2步：更新司机的 boss_id
```sql
-- 将所有司机的 boss_id 设置为老板的 ID
UPDATE profiles 
SET boss_id = 'abc-123-def-456'  -- 替换为第1步查到的老板 ID
WHERE role = 'driver' AND boss_id IS NULL;
```

### 第3步：验证修复
```sql
-- 检查是否还有 boss_id 为 NULL 的司机
SELECT id, name, role, boss_id 
FROM profiles 
WHERE role = 'driver' AND boss_id IS NULL;
```

应该返回 0 条记录。

## 自动修复脚本（推荐）

如果系统中只有一个老板，可以直接执行以下 SQL：

```sql
-- 自动将所有司机的 boss_id 设置为系统中唯一的老板 ID
UPDATE profiles 
SET boss_id = (
  SELECT id 
  FROM profiles 
  WHERE role = 'super_admin' 
  LIMIT 1
)
WHERE role = 'driver' AND boss_id IS NULL;
```

## 验证修复结果

### 1. 重新测试
1. 刷新页面（F5）
2. 以司机身份提交请假申请
3. 查看控制台日志

### 2. 预期日志
```
🔍 getCurrentUserBossId: 查询用户信息 {userId: "xxx"}
📋 getCurrentUserBossId: 用户信息 {userId: "xxx", name: "司机姓名", role: "driver", boss_id: "yyy"}
✅ getCurrentUserBossId: 返回 boss_id {bossId: "yyy"}  // ✅ 不再是 null

🔍 调试信息 - 开始发送通知
  - bossId: yyy  // ✅ 不再是 null
  
✅ 司机提交申请通知发送成功，共 n 条
```

### 3. 检查通知中心
- 老板账号的通知中心应该显示请假申请通知
- 车队长的通知中心应该显示请假申请通知
- 平级账号的通知中心应该显示请假申请通知

## 如果还是不行

请查看完整的修复文档：`NOTIFICATION_FIX_FINAL.md`

或者联系技术支持，提供以下信息：
1. 浏览器控制台的完整日志
2. 司机的 profile 数据（执行 SQL 查询结果）
3. 老板的 profile 数据（执行 SQL 查询结果）
