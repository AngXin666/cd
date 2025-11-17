# 隐藏司机端租赁信息修复说明

## 问题
司机端可以看到车辆的租赁信息，包括租赁方、承租方、月租金等敏感信息。这些信息应该只有超级管理员才能看到。

## 需求
- 司机端车辆列表：隐藏租赁信息
- 司机端车辆详情：隐藏租赁信息卡片和编辑功能
- 超级管理员端：保留租赁信息的查看和编辑功能

## 租赁信息包括
1. **车辆归属类型** (ownership_type)
   - 公司车
   - 个人车

2. **租赁方信息**
   - 租赁方名称 (lessor_name)
   - 租赁方联系方式 (lessor_contact)

3. **承租方信息**
   - 承租方名称 (lessee_name)
   - 承租方联系方式 (lessee_contact)

4. **租金信息**
   - 月租金 (monthly_rent)
   - 每月租金缴纳日 (rent_payment_day)

5. **租期信息**
   - 租赁开始日期 (lease_start_date)
   - 租赁结束日期 (lease_end_date)

## 修复内容

### 1. 司机端车辆列表 (src/pages/driver/vehicle-list/index.tsx)
**删除内容**：
- 删除整个租赁信息卡片区块（第470-525行）
- 包括所有租赁信息的显示

**修改位置**：
```typescript
// ❌ 删除的代码
{/* 租赁信息 - 始终显示 */}
<View className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
  <View className="flex items-center mb-2">
    <View className="i-mdi-file-document-outline text-base text-amber-600 mr-1"></View>
    <Text className="text-xs font-bold text-amber-800">租赁信息</Text>
  </View>
  {/* ... 租赁信息详情 ... */}
</View>
```

### 2. 司机端车辆详情 (src/pages/driver/vehicle-detail/index.tsx)
**删除内容**：
1. 删除租赁信息表单接口 `LeaseFormData`
2. 删除租赁信息相关的状态：
   - `isEditingLease`
   - `leaseForm`
3. 删除租赁信息相关的函数：
   - `handleStartEditLease()` - 开始编辑租赁信息
   - `handleCancelEditLease()` - 取消编辑租赁信息
   - `handleSaveLeaseInfo()` - 保存租赁信息
4. 删除租赁信息卡片UI（第401-621行）
   - 查看模式的租赁信息显示
   - 编辑模式的租赁信息表单
5. 删除不需要的导入：
   - `Input` 组件
   - `Picker` 组件
   - `updateVehicle` 函数
   - `OwnershipType` 类型

**修改前的导入**：
```typescript
import {Image, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import {deleteVehicle, getVehicleById, updateVehicle} from '@/db/api'
import type {OwnershipType, Vehicle} from '@/db/types'
```

**修改后的导入**：
```typescript
import {Image, ScrollView, Text, View} from '@tarojs/components'
import {deleteVehicle, getVehicleById} from '@/db/api'
import type {Vehicle} from '@/db/types'
```

## 验证测试

### 测试场景1：司机端车辆列表
**操作**：司机登录后查看车辆列表
**预期结果**：
- ✅ 显示车辆基本信息（车牌号、品牌、型号等）
- ✅ 显示提车/还车时间
- ❌ 不显示租赁信息卡片

### 测试场景2：司机端车辆详情
**操作**：司机点击车辆查看详情
**预期结果**：
- ✅ 显示车辆基本信息
- ✅ 显示提车/还车照片
- ✅ 显示行驶证照片
- ❌ 不显示租赁信息卡片
- ❌ 不显示"编辑租赁信息"按钮

### 测试场景3：超级管理员端
**操作**：超级管理员查看车辆信息
**预期结果**：
- ✅ 可以查看所有租赁信息
- ✅ 可以编辑租赁信息
- ✅ 功能不受影响

## 权限说明

### 司机端权限
- ✅ 查看车辆基本信息
- ✅ 添加车辆
- ✅ 编辑车辆基本信息
- ✅ 提车/还车操作
- ❌ 查看租赁信息
- ❌ 编辑租赁信息

### 超级管理员权限
- ✅ 查看所有车辆信息
- ✅ 查看租赁信息
- ✅ 编辑租赁信息
- ✅ 审核车辆
- ✅ 管理司机

## 相关文件
- `src/pages/driver/vehicle-list/index.tsx` - 司机端车辆列表
- `src/pages/driver/vehicle-detail/index.tsx` - 司机端车辆详情
- `src/pages/super-admin/vehicle-management/index.tsx` - 超级管理员车辆管理（保留租赁信息功能）

## 修改时间
2025-11-18

## 注意事项
1. 超级管理员端的租赁信息功能保持不变
2. 数据库中的租赁信息字段保持不变，只是前端隐藏
3. 司机端仍然可以在添加车辆时填写基本信息，但不包括租赁信息
