# 今日达标率调试指南

## 问题描述
用户反馈：今日达标率显示为 0%

## 调试步骤

### 步骤 1：打开浏览器控制台
1. 在浏览器中打开小程序
2. 按 F12 打开开发者工具
3. 切换到 Console（控制台）标签页

### 步骤 2：进入计件报表页面
1. 登录管理员或超级管理员账号
2. 点击"计件报表"标签
3. 查看控制台输出的调试信息

### 步骤 3：查看调试日志

#### 3.1 每日指标计算日志
查找以下日志：
```
📊 每日指标计算： {
  currentWarehouseIndex: 0,
  warehouseName: "好惠购",
  daily_target: 300,
  finalTarget: 300
}
```

**检查项**：
- `daily_target` 是否为 300（或其他非 0 值）
- `finalTarget` 是否为 300（或其他非 0 值）
- 如果为 0 或 null，说明仓库的 daily_target 字段没有正确设置

#### 3.2 今日达标率计算日志
查找以下日志：
```
今天达标率计算：开始 {
  todayQuantity: 2400,
  totalQuantity: 12000,
  dailyTarget: 300,
  todayDrivers: 10
}
```

**检查项**：
- `todayQuantity`：今天完成的件数
- `dailyTarget`：每日指标（应该是 300 或其他非 0 值）
- `todayDrivers`：今天出勤的司机数

#### 3.3 达标率计算完成日志
查找以下日志：
```
今天达标率计算：完成 {
  todayQuantity: 2400,
  todayDriversCount: 10,
  todayTotalTarget: 3000,
  rate: "80.0%"
}
```

**检查项**：
- `todayTotalTarget`：今天总目标（= dailyTarget × todayDrivers）
- `rate`：达标率百分比

#### 3.4 今天有计件记录的司机数日志
查找以下日志：
```
计算今天有计件记录的司机数： {
  today: "2025-11-05",
  totalRecords: 150,
  todayRecords: 25
}

今天有计件记录的司机ID： ["uuid1", "uuid2", ...]
今天有计件记录的司机数： 8
```

**检查项**：
- `today`：今天的日期（格式：YYYY-MM-DD）
- `todayRecords`：今天的计件记录数
- 司机数：今天有计件记录的司机数量

### 步骤 4：常见问题诊断

#### 问题 1：daily_target 为 0 或 null
**症状**：
```
📊 每日指标计算： {
  daily_target: null,
  finalTarget: 0
}
```

**原因**：仓库的 daily_target 字段没有设置

**解决方案**：
1. 进入超级管理员端
2. 点击"仓库管理"
3. 编辑仓库，设置"每日指标数"（例如：300）
4. 保存

或者运行 SQL：
```sql
UPDATE warehouses 
SET daily_target = 300 
WHERE daily_target IS NULL;
```

#### 问题 2：todayDrivers 为 0
**症状**：
```
今天达标率计算：开始 {
  todayDrivers: 0
}
```

**原因**：今天没有司机打卡

**解决方案**：
1. 确认今天是否有司机打卡
2. 检查考勤记录表 `attendance_records`
3. 如果需要，添加测试打卡记录

#### 问题 3：todayQuantity 为 0
**症状**：
```
今天达标率计算：开始 {
  todayQuantity: 0
}
```

**原因**：今天没有计件记录

**解决方案**：
1. 确认今天是否有计件记录
2. 检查计件记录表 `piece_work_records`
3. 如果需要，添加测试计件记录

#### 问题 4：日期格式不匹配
**症状**：
```
计算今天有计件记录的司机数： {
  today: "2025-11-05",
  todayRecords: 0
}
```
但实际上数据库中有今天的记录

**原因**：日期格式不匹配或时区问题

**解决方案**：
1. 检查 `getLocalDateString()` 函数的实现
2. 确认数据库中的 `work_date` 字段格式
3. 检查时区设置

### 步骤 5：验证修复

修复后，应该看到以下日志：

```
📊 每日指标计算： {
  currentWarehouseIndex: 0,
  warehouseName: "好惠购",
  daily_target: 300,
  finalTarget: 300
}

今天达标率计算：开始 {
  todayQuantity: 2400,
  totalQuantity: 12000,
  dailyTarget: 300,
  todayDrivers: 10
}

今天达标率计算：完成 {
  todayQuantity: 2400,
  todayDriversCount: 10,
  todayTotalTarget: 3000,
  rate: "80.0%"
}
```

页面显示：
- 今天达标率：80.0%
- 完成 2400 / 3000 件

## 数据验证 SQL

### 检查仓库的 daily_target
```sql
SELECT id, name, daily_target 
FROM warehouses 
ORDER BY created_at;
```

### 检查今天的出勤记录
```sql
SELECT COUNT(DISTINCT user_id) as today_drivers
FROM attendance_records
WHERE DATE(check_in_time AT TIME ZONE 'Asia/Shanghai') = CURRENT_DATE;
```

### 检查今天的计件记录
```sql
SELECT 
  COUNT(*) as record_count,
  COUNT(DISTINCT user_id) as driver_count,
  SUM(quantity) as total_quantity
FROM piece_work_records
WHERE work_date = CURRENT_DATE;
```

### 检查特定仓库的今天数据
```sql
SELECT 
  w.name as warehouse_name,
  w.daily_target,
  COUNT(DISTINCT ar.user_id) as today_drivers,
  COUNT(DISTINCT pwr.user_id) as drivers_with_records,
  COALESCE(SUM(pwr.quantity), 0) as total_quantity
FROM warehouses w
LEFT JOIN profiles p ON p.warehouse_id = w.id
LEFT JOIN attendance_records ar ON ar.user_id = p.id 
  AND DATE(ar.check_in_time AT TIME ZONE 'Asia/Shanghai') = CURRENT_DATE
LEFT JOIN piece_work_records pwr ON pwr.user_id = p.id 
  AND pwr.work_date = CURRENT_DATE
WHERE w.id = 'warehouse-uuid-here'
GROUP BY w.id, w.name, w.daily_target;
```

## 快速测试

### 添加测试数据

#### 1. 设置仓库每日指标
```sql
UPDATE warehouses 
SET daily_target = 300 
WHERE name = '好惠购';
```

#### 2. 添加今天的打卡记录
```sql
-- 假设有 10 个司机打卡
INSERT INTO attendance_records (user_id, check_in_time, status)
SELECT 
  id,
  NOW(),
  'present'
FROM profiles
WHERE role = 'driver'
LIMIT 10;
```

#### 3. 添加今天的计件记录
```sql
-- 假设每个司机完成 240 件
INSERT INTO piece_work_records (user_id, work_date, quantity, unit_price)
SELECT 
  id,
  CURRENT_DATE,
  240,
  1.5
FROM profiles
WHERE role = 'driver'
LIMIT 10;
```

### 预期结果
- 每日指标：300 件/人
- 出勤司机：10 人
- 总目标：3000 件
- 完成件数：2400 件
- 达标率：80.0%

## 总结

通过以上调试步骤，可以快速定位今日达标率显示为 0 的原因：
1. 检查每日指标是否设置
2. 检查今天是否有出勤记录
3. 检查今天是否有计件记录
4. 检查日期格式是否匹配

修复后，达标率应该正常显示。

## 修复日期
2025-11-05
