# 打卡功能修复说明

## 问题描述
用户在进行上班打卡时遇到以下错误：
```
null value in column "clock_in_time" of relation "attendance" violates not-null constraint
```

## 问题原因
在创建打卡记录时，`clock_in_time` 字段没有被传入，导致数据库插入失败。

### 技术细节
1. **数据库约束**: `attendance` 表的 `clock_in_time` 字段设置了 `NOT NULL` 约束
2. **类型定义缺失**: `AttendanceRecordInput` 接口中缺少 `clock_in_time` 字段
3. **调用时未传值**: 在调用 `createClockIn` 函数时，没有传入打卡时间

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

### 2. 修改打卡逻辑
在 `src/pages/driver/clock-in/index.tsx` 中，调用 `createClockIn` 时传入当前时间：

```typescript
// 创建打卡记录
const record = await createClockIn({
  user_id: user.id,
  warehouse_id: selectedWarehouse.id,
  clock_in_time: now.toISOString(),  // 新增：传入打卡时间
  status
})
```

## 修改的文件
1. `src/db/types.ts` - 添加 `clock_in_time` 字段到 `AttendanceRecordInput` 接口
2. `src/pages/driver/clock-in/index.tsx` - 在创建打卡记录时传入 `clock_in_time`

## 测试验证

### 测试步骤
1. 使用司机账号登录（admin2 / 123456）
2. 进入"考勤打卡"页面
3. 选择仓库
4. 点击"上班打卡"按钮
5. 验证打卡成功并显示打卡时间

### 预期结果
- ✅ 打卡成功
- ✅ 显示打卡时间
- ✅ 显示考勤状态（正常/迟到）
- ✅ 记录保存到数据库

## 相关功能
此修复同时确保了以下功能正常工作：
- 上班打卡
- 下班打卡
- 考勤记录查询
- 考勤统计

## 注意事项
- `clock_in_time` 使用 ISO 8601 格式存储（`now.toISOString()`）
- 时间戳包含时区信息，确保跨时区使用的准确性
- 数据库中的时间字段类型为 `timestamptz`（带时区的时间戳）

## 后续建议
1. 考虑在数据库层面添加默认值：`DEFAULT NOW()`
2. 在前端添加更详细的错误提示
3. 添加打卡时间的本地缓存，防止网络问题导致的数据丢失
