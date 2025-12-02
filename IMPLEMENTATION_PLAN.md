# 车辆表优化实施计划

## 当前状态
- ✅ 数据库迁移完成（vehicles表22列 + vehicle_documents表48列）
- ✅ 类型定义更新完成
- ⏳ 代码更新进行中
- ❌ 测试验证未开始

## 错误统计
- TypeScript错误：185个
- 主要问题：VehicleInput接口不再包含vehicle_documents表的字段

---

## 阶段1：修复核心API函数 ⏳

### 优先级P0 - 立即修复

#### 1.1 车辆查询函数
- [ ] `getDriverVehicles()` - 修复查询条件bug + 只查核心信息
- [ ] `getAllVehiclesWithDrivers()` - 只查核心信息
- [ ] `getVehicleById()` - 添加JOIN vehicle_documents
- [ ] `getVehicleWithDriverDetails()` - 添加JOIN vehicle_documents
- [ ] `getVehiclesByDriverId()` - 只查核心信息
- [ ] `getVehicleByPlateNumber()` - 根据需求决定是否JOIN

#### 1.2 车辆创建函数
- [ ] `insertVehicle()` - 拆分为创建vehicle + 创建vehicle_document

#### 1.3 车辆更新函数
- [ ] `updateVehicle()` - 拆分为更新vehicle + 更新vehicle_document

#### 1.4 车辆删除函数
- [ ] `deleteVehicle()` - 验证CASCADE删除

#### 1.5 车辆审核函数
- [ ] `submitVehicleForReview()` - 检查字段位置
- [ ] `getPendingReviewVehicles()` - 根据需求决定是否JOIN
- [ ] `approveVehicle()` - 检查字段位置
- [ ] `requireSupplement()` - 检查字段位置

#### 1.6 照片管理函数
- [ ] `lockPhoto()` - 更新vehicle_documents表
- [ ] `unlockPhoto()` - 更新vehicle_documents表
- [ ] `lockVehiclePhotos()` - 更新vehicle_documents表
- [ ] `getRequiredPhotos()` - 从vehicle_documents表查询

#### 1.7 还车函数
- [ ] `returnVehicle()` - 更新vehicle_documents表

---

## 阶段2：修复页面组件 ⏳

### 优先级P1 - 今天完成

#### 2.1 司机端页面
- [ ] `src/pages/driver/add-vehicle/index.tsx` - 更新为使用VehicleInput + VehicleDocumentInput

#### 2.2 管理端页面
- [ ] `src/pages/super-admin/vehicle-review-detail/index.tsx` - 更新数据访问
- [ ] `src/pages/super-admin/vehicle-management/index.tsx` - 更新数据访问

#### 2.3 其他车辆相关页面
- [ ] 查找所有使用Vehicle类型的页面
- [ ] 更新数据访问方式

---

## 阶段3：测试所有功能 ⏳

### 优先级P1 - 今天完成

#### 3.1 车辆管理功能测试
- [ ] 车辆列表查询
- [ ] 车辆详情查询
- [ ] 车辆创建
- [ ] 车辆更新
- [ ] 车辆删除
- [ ] 车辆审核流程

#### 3.2 权限管理功能测试
- [ ] BOSS权限测试
- [ ] MANAGER权限测试
- [ ] DISPATCHER权限测试
- [ ] DRIVER权限测试

#### 3.3 人员管理功能测试
- [ ] 用户列表查询
- [ ] 用户创建
- [ ] 用户更新
- [ ] 用户删除
- [ ] 角色分配

#### 3.4 考勤管理功能测试
- [ ] 考勤打卡
- [ ] 考勤记录查询
- [ ] 考勤统计
- [ ] 考勤规则管理

#### 3.5 计件管理功能测试
- [ ] 计件记录创建
- [ ] 计件记录查询
- [ ] 计件统计
- [ ] 分类价格管理

#### 3.6 请假管理功能测试
- [ ] 请假申请创建
- [ ] 请假申请查询
- [ ] 请假审批
- [ ] 请假统计

#### 3.7 离职管理功能测试
- [ ] 离职申请创建
- [ ] 离职申请查询
- [ ] 离职审批
- [ ] 离职统计

#### 3.8 通知系统功能测试
- [ ] 通知创建
- [ ] 通知查询
- [ ] 通知标记已读
- [ ] 通知删除

#### 3.9 统计功能测试
- [ ] 用户统计
- [ ] 车辆统计
- [ ] 考勤统计
- [ ] 计件统计

---

## 阶段4：性能测试和优化 ⏳

### 优先级P2 - 明天完成

#### 4.1 性能测试
- [ ] 车辆列表查询性能（优化前后对比）
- [ ] 车辆详情查询性能
- [ ] 批量查询性能
- [ ] 统计查询性能

#### 4.2 性能优化
- [ ] 添加必要的索引
- [ ] 优化复杂查询
- [ ] 缓存策略

#### 4.3 性能报告
- [ ] 生成性能对比报告
- [ ] 验证40%性能提升目标

---

## 实施策略

### 阶段1实施步骤

#### 步骤1：修复getDriverVehicles()
```typescript
// 修复前
.eq('id', driverId)  // ❌ 错误

// 修复后
.eq('driver_id', driverId)  // ✅ 正确
```

#### 步骤2：修复getVehicleById()
```typescript
// 修复前
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('id', vehicleId)

// 修复后
const { data } = await supabase
  .from('vehicles')
  .select(`
    *,
    document:vehicle_documents(*)
  `)
  .eq('id', vehicleId)
```

#### 步骤3：修复insertVehicle()
```typescript
// 修复后
async function insertVehicle(
  vehicleInput: VehicleInput,
  documentInput?: VehicleDocumentInput
) {
  // 1. 创建vehicle
  const { data: vehicle } = await supabase
    .from('vehicles')
    .insert(vehicleInput)
    .select()
    .maybeSingle()
  
  if (!vehicle) return null
  
  // 2. 创建vehicle_document（如果有）
  if (documentInput) {
    await supabase
      .from('vehicle_documents')
      .insert({ ...documentInput, vehicle_id: vehicle.id })
  }
  
  return vehicle
}
```

#### 步骤4：修复updateVehicle()
```typescript
// 修复后
async function updateVehicle(
  vehicleId: string,
  vehicleUpdate?: VehicleUpdate,
  documentUpdate?: VehicleDocumentUpdate
) {
  // 1. 更新vehicle
  if (vehicleUpdate) {
    await supabase
      .from('vehicles')
      .update(vehicleUpdate)
      .eq('id', vehicleId)
  }
  
  // 2. 更新vehicle_document
  if (documentUpdate) {
    await supabase
      .from('vehicle_documents')
      .update(documentUpdate)
      .eq('vehicle_id', vehicleId)
  }
}
```

---

## 当前进度

**阶段1**：0% 完成（0/18个函数）  
**阶段2**：0% 完成（0/3个页面）  
**阶段3**：0% 完成（0/9个模块）  
**阶段4**：0% 完成（0/3个任务）

**总体进度**：0%

---

**创建时间**：2025-11-05  
**预计完成时间**：2025-11-06  
**负责人**：开发团队
