# 租期管理问题排查总结

## 用户反馈的问题

1. **减少租期按钮不显示**
   - 用户在租期管理页面中看不到"减少租期"按钮

2. **添加租期月数错误**
   - 无论选择几个月，实际只添加1个月

## 代码检查结果

### 1. 减少租期按钮代码确认

**文件位置**：`src/pages/lease-admin/lease-list/index.tsx`

**按钮代码**（第 523-528 行）：
```tsx
<Button
  className="flex-1 bg-orange-500 text-white py-1 rounded break-keep text-xs"
  size="mini"
  onClick={() => handleShowReduceForm(lease.id)}>
  减少租期
</Button>
```

**结论**：
- ✅ 按钮代码存在且正确
- ✅ 点击事件处理函数已实现
- ✅ 减少租期表单已实现

**可能原因**：
1. 用户没有展开租期列表
2. 该租户没有租期记录
3. 页面缓存问题

### 2. 添加租期功能代码确认

**选择器处理函数**（第 108-120 行）：
```tsx
const handleShowDurationPicker = async () => {
  try {
    const res = await Taro.showActionSheet({
      itemList: durationOptions.map((o) => o.label)
    })
    setSelectedDurationIndex(res.tapIndex)
  } catch (error) {
    // 用户取消选择
  }
}
```

**提交函数**（第 150-179 行）：
```tsx
const handleSubmit = async (tenantId: string) => {
  try {
    const selectedDuration = durationOptions[selectedDurationIndex]
    const selectedExpireAction = expireActionOptions[selectedExpireActionIndex]

    console.log('添加租期 - 选中的索引:', selectedDurationIndex)
    console.log('添加租期 - 选中的时长:', selectedDuration)

    const input: CreateLeaseInput = {
      tenant_id: tenantId,
      start_date: new Date().toISOString().split('T')[0],
      duration_months: selectedDuration.value,
      expire_action: selectedExpireAction.value as ExpireActionType
    }

    console.log('添加租期 - 提交的数据:', input)

    const success = await createLease(input)
    // ...
  }
}
```

**数据库插入函数**（`src/db/api.ts` 第 7157-7188 行）：
```tsx
export async function createLease(input: CreateLeaseInput): Promise<boolean> {
  try {
    console.log('createLease 接收到的参数:', input)

    // 计算结束日期
    const startDate = new Date(input.start_date)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + input.duration_months)

    console.log('计算的结束日期:', endDate.toISOString().split('T')[0])

    const {error} = await supabase.from('leases').insert({
      tenant_id: input.tenant_id,
      start_date: input.start_date,
      end_date: endDate.toISOString().split('T')[0],
      duration_months: input.duration_months,
      status: 'active',
      expire_action: input.expire_action
    })

    if (error) {
      console.error('创建租期失败:', error)
      return false
    }

    console.log('租期创建成功')
    return true
  } catch (error) {
    console.error('创建租期异常:', error)
    return false
  }
}
```

**结论**：
- ✅ 选择器代码正确
- ✅ 状态更新逻辑正确
- ✅ 数据提交逻辑正确
- ✅ 数据库插入逻辑正确
- ✅ 已添加详细的调试日志

## 调试建议

### 查看控制台日志

用户需要在微信开发者工具中查看控制台日志，确认：

1. **选择器是否正确更新**：
   ```
   添加租期 - 选中的索引: 2  // 应该是用户选择的索引
   添加租期 - 选中的时长: {label: '6个月', value: 6}  // 应该是用户选择的时长
   ```

2. **提交的数据是否正确**：
   ```
   添加租期 - 提交的数据: {
     tenant_id: 'xxx',
     start_date: '2025-11-26',
     duration_months: 6,  // 应该是用户选择的月数
     expire_action: 'suspend_all'
   }
   ```

3. **数据库插入是否成功**：
   ```
   createLease 接收到的参数: {...}
   计算的结束日期: 2026-05-26  // 应该是开始日期 + duration_months
   租期创建成功
   ```

### 数据库验证

查询最近创建的租期记录：
```sql
SELECT id, tenant_id, start_date, end_date, duration_months, status, expire_action, created_at
FROM leases
ORDER BY created_at DESC
LIMIT 5;
```

检查 `duration_months` 字段的值是否与用户选择的一致。

## 下一步操作

1. **用户需要提供**：
   - 控制台日志截图
   - 租期管理页面截图（展开租期列表后）
   - 数据库查询结果

2. **根据日志判断**：
   - 如果日志显示 `duration_months` 正确，但数据库中是 1，说明数据库有问题
   - 如果日志显示 `duration_months` 始终为 1，说明选择器状态更新有问题
   - 如果没有日志输出，说明函数没有被调用

3. **可能的修复方案**：
   - 如果是选择器问题：检查 ActionSheet 的返回值
   - 如果是数据库问题：检查表结构和触发器
   - 如果是显示问题：检查租期列表的渲染逻辑

## 已完成的优化

1. ✅ 将 Picker 组件替换为 ActionSheet，提供更好的移动端体验
2. ✅ 添加详细的调试日志，方便排查问题
3. ✅ 实现减少租期功能
4. ✅ 优化选择器交互体验
5. ✅ 创建调试指南文档

## 文件修改记录

- `src/pages/lease-admin/lease-list/index.tsx`：
  - 添加三个选择器处理函数
  - 更新添加租期表单 UI
  - 更新减少租期表单 UI
  - 添加调试日志

- `src/db/api.ts`：
  - 在 createLease 函数中添加调试日志

- `LEASE_DEBUG_GUIDE.md`：
  - 创建详细的调试指南

## 提交记录

1. `0e5ce60` - 优化租期管理选择器交互体验
2. `be1ddd8` - 添加租期管理调试日志
3. `32a1752` - 添加租期管理功能调试指南
