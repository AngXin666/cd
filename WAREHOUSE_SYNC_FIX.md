# 司机仓库分配同步问题修复

## 问题描述
#
#

ager/staff-management/index.tsx`
- 超级管理端：`src/pages/super-admin/driver-warehouse-assignment/index.tsx`
- 使用 `setDriverWarehouses` API 正确保存到数据库

 **数据库API**
- `setDriverWarehouses`: 先删除旧分配，再插入新分配
- `getDriverWarehouses`: 从 `driver_warehouses` 表读取数据
- 包含详细的日志输出用于调试

 **司机端自动刷新**
- 计件录入页面：有 `useDidShow` 钩子
- 打卡页面：有 `useDidShow` 钩子 + 下拉刷新
- 计件查看页面：有 `useDidShow` 钩子 + 下拉刷新

 **数据库权限**
- RLS已被禁用（migration 31），不存在权限问题

### 2. 最可能的原因

**仓库被禁用导致司机端看不到**

st activeWarehouses = allWarehouses.filter((w) => w.is_active)
```

`is_active = false`），司机端将无法看到这些仓库。

### 3. 其他可能原因

1. **司机端未刷新页面**
   - 司机需要重新进入页面才能触发 `useDidShow` 钩子
   - 如果司机一直停留在同一个页面，不会自动刷新

2. **小程序缓存问题**
   - 小程序可能缓存了旧数据
   - 需要完全退出小程序后重新进入

3. **网络延迟**
   - 数据库更新和前端读取之间可能存在短暂延迟

## 解决方案

### 修改1: 普通管理端 - 增强成功提示

**文件**: `src/pages/manager/staff-management/index.tsx`

**修改内容**:
```typescript
// 保存成功后显示详细的提示信息
const warehouseNames = warehouses
  .filter((w) => selectedWarehouseIds.includes(w.id))
  .map((w) => w.name)
  .join('、')

const message = selectedWarehouseIds.length > 0
  ? `已为 ${driverName} 分配仓库：${warehouseNames}。司机需要重新进入页面才能看到更新。`
  : `已清空 ${driverName} 的仓库分配。`

await Taro.showModal({
  title: '分配成功',
  content: message,
  showCancel: false,
  confirmText: '知道了'
})
```

**改进点**:
- ✅ 显示分配的仓库名称，让管理员确认分配结果
- ✅ 明确提示司机需要重新进入页面
- ✅ 使用模态对话框代替简单的 Toast，确保管理员看到提示

### 修改2: 超级管理端 - 增强成功提示

**文件**: `src/pages/super-admin/driver-warehouse-assignment/index.tsx`

**修改内容**:
```typescript
// 保存成功后显示详细的提示信息
const warehouseNames = warehouses
  .filter((w) => selectedWarehouseIds.includes(w.id))
  .map((w) => w.name)
  .join('、')

const message = selectedWarehouseIds.length > 0
  ? `已为 ${selectedDriver.name} 分配仓库：${warehouseNames}。\n\n司机需要重新进入页面才能看到更新。`
  : `已清空 ${selectedDriver.name} 的仓库分配。`

await Taro.showModal({
  title: '分配成功',
  content: message,
  showCancel: false,
  confirmText: '知道了'
})
```

**改进点**:
- ✅ 显示分配的仓库名称
- ✅ 明确提示司机需要重新进入页面
- ✅ 使用模态对话框确保提示被看到

## 使用指南

### 管理员操作步骤

1. **分配仓库**
   - 普通管理端：进入"员工管理" → "司机分配"标签
   - 超级管理端：进入"司机仓库分配"页面
   - 选择司机，勾选要分配的仓库
   - 点击"保存"按钮

2. **确认分配结果**
   - 查看弹出的成功提示对话框
   - 确认显示的仓库名称是否正确
   - 注意提示信息：司机需要重新进入页面

3. **通知司机**
   - 告知司机已完成仓库分配
   - 提醒司机重新进入小程序或刷新页面

### 司机操作步骤

1. **刷新数据**
   - 方法1：完全退出小程序，重新进入
   - 方法2：切换到其他页面，再返回
   - 方法3：在支持下拉刷新的页面（打卡、计件查看）下拉刷新

2. **验证仓库**
   - 进入"计件录入"或"打卡"页面
   - 查看仓库选择器中是否显示新分配的仓库
   - 如果没有显示，尝试完全退出小程序后重新进入

## 调试指南

### 如果司机端仍然看不到仓库

#### 步骤1: 检查数据库
```sql
-- 查看司机的仓库分配
SELECT dw.*, w.name as warehouse_name, w.is_active
FROM driver_warehouses dw
JOIN warehouses w ON dw.warehouse_id = w.id
WHERE dw.driver_id = '司机ID';
```

**检查点**:
- 是否有记录？如果没有，说明分配未保存成功
- `is_active` 是否为 `true`？如果为 `false`，司机端会过滤掉

#### 步骤2: 检查仓库状态
```sql
-- 查看所有仓库的状态
SELECT id, name, is_active
FROM warehouses
ORDER BY name;
```

**检查点**:
- 分配的仓库是否被禁用？
- 如果被禁用，需要先启用仓库

#### 步骤3: 查看控制台日志

**管理端**:
1. 打开浏览器开发者工具
2. 分配仓库并保存
3. 查看控制台是否有错误

**司机端**:
1. 打开浏览器开发者工具
2. 进入计件录入或打卡页面
3. 查找 "=== getDriverWarehouses 调用 ===" 日志
4. 查看返回的仓库数据

#### 步骤4: 清除缓存
```bash
# 小程序端
1. 完全退出小程序
2. 微信 → 我 → 设置 → 通用 → 存储空间 → 清理缓存
3. 重新进入小程序

# H5端
1. 清除浏览器缓存
2. 刷新页面
```

## 技术细节

### 数据流程

```

    ↓
 setDriverWarehouses(driverId, warehouseIds)
    ↓
> driver_warehouses 记录
    ↓
 driver_warehouses 记录
    ↓
 ↓

    ↓
 ↓
 useDidShow 钩子
    ↓
 getDriverWarehouses(driverId)
    ↓
'EOF''EOF'
    ↓
false)
    ↓

```

### 关键代码位置

**管理端**:
- 普通管理端：`src/pages/manager/staff-management/index.tsx` (第293-344行)
- 超级管理端：`src/pages/super-admin/driver-warehouse-assignment/index.tsx` (第64-103行)

**数据库API**:
- `setDriverWarehouses`: `src/db/api.ts` (第923-980行)
- `getDriverWarehouses`: `src/db/api.ts` (第739-768行)

**司机端**:
- 计件录入：`src/pages/driver/piece-work-entry/index.tsx` (第79-167行)
- 打卡：`src/pages/driver/clock-in/index.tsx` (第36-82行)
- 计件查看：`src/pages/driver/piece-work/index.tsx` (第78-125行)

## 测试建议

### 测试场景1: 正常分配
1. 管理员分配启用的仓库给司机
2. 司机退出小程序后重新进入
3. 验证司机端能看到新分配的仓库

### 测试场景2: 分配被禁用的仓库
1. 管理员分配被禁用的仓库给司机
2. 司机端应该看不到这个仓库
3. 管理员启用仓库后，司机刷新页面应该能看到

### 测试场景3: 清空仓库分配
1. 管理员清空司机的所有仓库分配
2. 司机端应该显示"暂无可用仓库"提示

### 测试场景4: 多仓库分配
1. 管理员同时分配多个仓库给司机
2. 验证成功提示中显示所有仓库名称
3. 司机端能看到所有分配的仓库

## 预期效果

### 管理端
- ✅ 保存成功后显示详细的提示对话框
- ✅ 提示中包含分配的仓库名称
- ✅ 明确告知司机需要重新进入页面

### 司机端
- ✅ 重新进入页面后自动加载最新数据
- ✅ 只显示启用的仓库
- ✅ 如果没有可用仓库，显示友好提示

## 总结

**司机侧**: 已有自动刷新机制，只需重新进入页面即可





---

**修复时间**: 2025-11-05
**修复版本**: v2.4.3
**影响范围**: 普通管理端、超级管理端
