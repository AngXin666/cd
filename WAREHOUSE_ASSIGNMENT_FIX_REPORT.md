# 仓库分配功能错误修复报告

## 问题描述

在仓库分配功能中，插入数据时出现以下错误：

```
插入仓库分配失败: {
  code: "22P02",
  details: null,
  hint: null,
  message: "invalid input syntax for type uuid: \"BOSS_1764145957063_52128391\""
}
```

## 根本原因

数据库中存在两个字段用于标识租户：
1. `boss_id` - TEXT 类型，存储格式如 "BOSS_1764145957063_52128391"
2. `tenant_id` - uuid 类型，引用 profiles(id)

代码尝试将 TEXT 类型的 `boss_id` 值赋给 uuid 类型的 `tenant_id` 字段，导致类型不匹配错误。

## 修复方案

删除所有代码中对 `tenant_id` 字段的赋值，只使用 `boss_id` 字段进行租户隔离。

## 修复内容

### 修改的文件
- `src/db/api.ts`

### 修复的函数（共9处）

1. **insertAttendance** (第371-379行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

2. **insertWarehouse** (第702-711行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

3. **insertAttendanceRule** (第817-828行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

4. **insertWarehouseAssignment** (第1139-1143行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`
   - **这是导致错误的直接原因**

5. **insertPieceWorkRecord** (第1440-1444行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

6. **saveCategoryPrice** (第1716-1730行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

7. **batchSaveCategoryPrices** (第1761-1774行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

8. **insertLeaveApplication** (第1980-1990行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

9. **insertResignationApplication** (第2318-2327行)
   - 移除 `tenant_id: profile.boss_id` 赋值
   - 只保留 `boss_id: profile.boss_id`

10. **createUserWithAuth** (第4183-4189行)
    - 移除 `tenant_id: currentProfile.boss_id` 赋值
    - 只保留 `boss_id: currentProfile.boss_id`

## 验证结果

✅ 代码检查通过 (`pnpm run lint`)
✅ 所有 `tenant_id` 赋值已移除
✅ 保留了所有 `boss_id` 赋值用于租户隔离

## 影响范围

此修复影响以下功能模块：
- 考勤管理
- 仓库管理
- 考勤规则
- 仓库分配（主要问题）
- 计件记录
- 品类价格配置
- 请假申请
- 离职申请
- 用户创建

## 后续建议

1. **数据库清理**：考虑在未来的迁移中删除 `tenant_id` 字段，统一使用 `boss_id`
2. **RLS策略更新**：确保所有表的 RLS 策略都基于 `boss_id` 而不是 `tenant_id`
3. **查询优化**：检查所有查询语句，确保使用 `boss_id` 进行过滤

## 修复日期

2025-11-05

## 修复状态

✅ 已完成
