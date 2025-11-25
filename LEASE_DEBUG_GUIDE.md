# 租期管理功能调试指南

## 问题描述

用户反馈了两个问题：
1. **减少租期按钮不显示**：在租期管理页面中看不到"减少租期"按钮
2. **添加租期月数错误**：无论选择几个月，实际只添加1个月

## 调试步骤

### 1. 检查减少租期按钮显示

**位置**：`src/pages/lease-admin/lease-list/index.tsx` 第 516-530 行

**代码确认**：
```tsx
{/* 操作按钮 */}
<View className="flex flex-row gap-2">
  <Button
    className="flex-1 bg-orange-500 text-white py-1 rounded break-keep text-xs"
    size="mini"
    onClick={() => handleShowReduceForm(lease.id)}>
    减少租期
  </Button>
  <Button
    className="flex-1 bg-red-500 text-white py-1 rounded break-keep text-xs"
    size="mini"
    onClick={() => handleDelete(lease.id)}>
    删除租期
  </Button>
</View>
```

**检查要点**：
- 按钮代码已存在
- 需要展开租户的租期列表才能看到按钮
- 确认是否正确展开了租期列表

**操作流程**：
1. 进入租期管理页面（`/pages/lease-admin/lease-list/index`）
2. 点击某个老板账号卡片，展开租期列表
3. 如果有租期记录，应该能看到每个租期卡片下方有两个按钮：
   - 橙色的"减少租期"按钮
   - 红色的"删除租期"按钮

### 2. 检查添加租期月数问题

**已添加调试日志**：

#### 前端日志（`src/pages/lease-admin/lease-list/index.tsx` 第 155-165 行）
```tsx
console.log('添加租期 - 选中的索引:', selectedDurationIndex)
console.log('添加租期 - 选中的时长:', selectedDuration)
console.log('添加租期 - 提交的数据:', input)
```

#### 后端日志（`src/db/api.ts` 第 7159-7166 行）
```tsx
console.log('createLease 接收到的参数:', input)
console.log('计算的结束日期:', endDate.toISOString().split('T')[0])
console.log('租期创建成功')
```

### 3. 查看控制台日志

**在小程序开发者工具中**：
1. 打开微信开发者工具
2. 打开控制台（Console）
3. 进入租期管理页面
4. 点击"添加租期"
5. 选择租期时长（例如：3个月）
6. 点击"确认添加"
7. 查看控制台输出的日志

**预期日志输出**：
```
添加租期 - 选中的索引: 1
添加租期 - 选中的时长: {label: '3个月', value: 3}
添加租期 - 提交的数据: {tenant_id: 'xxx', start_date: '2025-11-26', duration_months: 3, expire_action: 'suspend_all'}
createLease 接收到的参数: {tenant_id: 'xxx', start_date: '2025-11-26', duration_months: 3, expire_action: 'suspend_all'}
计算的结束日期: 2026-02-26
租期创建成功
```

**如果日志显示 duration_months 始终为 1**：
- 说明选择器状态没有正确更新
- 检查 `handleShowDurationPicker` 函数是否正确调用
- 检查 `setSelectedDurationIndex` 是否正确设置

**如果日志显示正确的 duration_months，但数据库中是 1**：
- 说明数据库插入有问题
- 检查数据库表结构
- 检查是否有触发器或默认值覆盖了输入

### 4. 数据库验证

**查询租期记录**：
```sql
SELECT id, tenant_id, start_date, end_date, duration_months, status, expire_action, created_at
FROM leases
ORDER BY created_at DESC
LIMIT 10;
```

**检查要点**：
- `duration_months` 字段的值是否正确
- `end_date` 是否根据 `duration_months` 正确计算
- 例如：start_date = '2025-11-26', duration_months = 3, 则 end_date 应该是 '2026-02-26'

## 可能的问题原因

### 问题1：减少租期按钮不显示

**可能原因**：
1. 租期列表没有展开
2. 该租户没有租期记录
3. 页面缓存问题

**解决方案**：
1. 确保点击租户卡片展开租期列表
2. 先添加一个租期，然后查看是否显示按钮
3. 刷新页面或重新进入

### 问题2：添加租期月数错误

**可能原因**：
1. 选择器状态没有正确更新
2. ActionSheet 的 tapIndex 没有正确传递
3. 数据库有默认值或触发器覆盖

**解决方案**：
1. 查看控制台日志，确认选择器的值
2. 如果前端日志正确，检查数据库
3. 如果数据库也正确，可能是显示问题

## 测试步骤

### 测试添加租期功能

1. 进入租期管理页面
2. 点击某个老板账号的"添加租期"按钮
3. 点击"租期时长"选择框
4. 在弹出的 ActionSheet 中选择"3个月"
5. 点击"到期后操作"选择框
6. 选择一个到期操作
7. 点击"确认添加"
8. 查看控制台日志
9. 展开租期列表，查看新添加的租期
10. 确认租期时长是否为3个月
11. 确认结束日期是否正确（当前日期 + 3个月）

### 测试减少租期功能

1. 确保某个老板账号有租期记录
2. 展开该租户的租期列表
3. 找到一个租期卡片
4. 确认卡片下方有两个按钮："减少租期"和"删除租期"
5. 点击"减少租期"按钮
6. 应该展开减少租期表单
7. 选择要减少的月数（例如：1个月）
8. 点击"确认减少"
9. 查看租期是否正确减少

## 联系方式

如果问题仍然存在，请提供：
1. 控制台日志截图
2. 租期管理页面截图
3. 数据库查询结果

这将帮助我们更快地定位和解决问题。
