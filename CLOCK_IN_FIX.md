# 打卡功能修复说明

## 问题描述
用户在进行上班打卡时遇到以下错误：

### 错误1：缺少 clock_in_time 字段
```
null value in column "clock_in_time" of relation "attendance" violates not-null constraint
```

### 错误2：缺少 work_date 字段
```
null value in column "work_date" of relation "attendance" violates not-null constraint
```

## 问题原因
在创建打卡记录时，必需的字段没有被传入，导致数据库插入失败。

### 技术细节
1. **数据库约束**: `attendance` 表的 `clock_in_time` 和 `work_date` 字段都设置了 `NOT NULL` 约束
2. **类型定义缺失**: `AttendanceRecordInput` 接口中缺少 `clock_in_time` 字段
3. **调用时未传值**: 在调用 `createClockIn` 函数时，没有传入打卡时间和工作日期

## 解决方案

### 1. 更新类型定义
在 `src/db/types.ts` 中为 `AttendanceRecordInput` 接口添加 `clock_in_time` 字段：

```typescript
export interface AttendanceRecordInput {
  user_id: string
  warehouse_id?: string
  work_date?: string
  clock_in_time?: string  // 新增字段
  status?: AttendanceStatus
  notes?: string
}
```

### 2. 添加日期格式化函数
在 `src/pages/driver/clock-in/index.tsx` 中添加辅助函数：

```typescript
// 获取本地日期字符串（YYYY-MM-DD格式）
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

### 3. 修改打卡逻辑
在 `src/pages/driver/clock-in/index.tsx` 中，调用 `createClockIn` 时传入必需字段：

```typescript
// 创建打卡记录
const record = await createClockIn({
  user_id: user.id,
  warehouse_id: selectedWarehouse.id,
  work_date: getLocalDateString(now),      // 新增：工作日期
  clock_in_time: now.toISOString(),        // 新增：打卡时间
  status
})
```

## 修改的文件
1. `src/db/types.ts` - 添加 `clock_in_time` 字段到 `AttendanceRecordInput` 接口
2. `src/pages/driver/clock-in/index.tsx` - 添加日期格式化函数，在创建打卡记录时传入 `work_date` 和 `clock_in_time`

## 测试验证

### 测试步骤
1. 使用司机账号登录（admin2 / 123456 或 13800000003 / 123456）
2. 进入"考勤打卡"页面
3. 选择仓库（北京仓库）
4. 点击"上班打卡"按钮
5. 验证打卡成功并显示打卡时间

### 预期结果
- ✅ 打卡成功
- ✅ 显示打卡时间（格式：HH:MM:SS）
- ✅ 显示考勤状态（正常/迟到）
- ✅ 显示工作日期（格式：YYYY-MM-DD）
- ✅ 记录保存到数据库

## 相关功能
此修复同时确保了以下功能正常工作：
- 上班打卡
- 下班打卡
- 考勤记录查询
- 考勤统计
- 月度考勤报表

## 数据格式说明

### work_date 格式
- 格式：`YYYY-MM-DD`（例如：2025-01-15）
- 用途：标识考勤记录所属的工作日期
- 数据库类型：`DATE`

### clock_in_time 格式
- 格式：ISO 8601（例如：2025-01-15T09:00:00.000Z）
- 用途：记录精确的打卡时间戳
- 数据库类型：`TIMESTAMPTZ`（带时区的时间戳）

## 注意事项
- `work_date` 使用本地日期格式（YYYY-MM-DD），不包含时区信息
- `clock_in_time` 使用 ISO 8601 格式存储（`now.toISOString()`），包含时区信息
- 时间戳包含时区信息，确保跨时区使用的准确性
- 数据库中的时间字段类型为 `timestamptz`（带时区的时间戳）

## 后续建议
1. ✅ 已添加日期格式化函数，确保日期格式统一
2. 考虑在数据库层面添加默认值：
   - `work_date DEFAULT CURRENT_DATE`
   - `clock_in_time DEFAULT NOW()`
3. 在前端添加更详细的错误提示
4. 添加打卡时间的本地缓存，防止网络问题导致的数据丢失
5. 考虑添加打卡位置信息（GPS坐标）用于考勤验证

## 相关文档
- `LOGIN_FIX_FINAL.md` - 登录功能修复说明
- `TEST_ACCOUNTS.md` - 测试账号快速参考
- `README.md` - 项目整体说明
