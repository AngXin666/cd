# 系统功能更新和测试任务清单

## 任务概述
完成车辆表优化后，需要更新所有相关代码并测试系统功能。

---

## 一、车辆管理模块更新 ⏳

### 1.1 API层更新（src/db/api.ts）
- [ ] `getDriverVehicles()` - 查询司机车辆（只需核心信息）
- [ ] `getAllVehiclesWithDrivers()` - 查询所有车辆（根据需求决定是否JOIN）
- [ ] `getVehicleById()` - 查询车辆详情（需要JOIN vehicle_documents）
- [ ] `getVehicleWithDriverDetails()` - 查询车辆详情（需要JOIN vehicle_documents）
- [ ] `getVehiclesByDriverId()` - 查询司机车辆（只需核心信息）
- [ ] `insertVehicle()` - 创建车辆（同时创建vehicle和vehicle_document）
- [ ] `updateVehicle()` - 更新车辆（分别更新两个表）
- [ ] `deleteVehicle()` - 删除车辆（CASCADE自动处理）
- [ ] `returnVehicle()` - 还车（更新vehicle_documents表）
- [ ] `getVehicleByPlateNumber()` - 根据车牌号查询
- [ ] `submitVehicleForReview()` - 提交审核
- [ ] `getPendingReviewVehicles()` - 查询待审核车辆
- [ ] `lockPhoto()` - 锁定照片（更新vehicle_documents表）
- [ ] `unlockPhoto()` - 解锁照片（更新vehicle_documents表）
- [ ] `approveVehicle()` - 审核通过
- [ ] `lockVehiclePhotos()` - 锁定车辆照片
- [ ] `requireSupplement()` - 要求补充
- [ ] `getRequiredPhotos()` - 获取必需照片

### 1.2 车辆记录API更新（src/db/vehicleRecordsApi.ts）
- [ ] 检查是否需要vehicle_documents表的数据
- [ ] 如需要，添加JOIN查询

### 1.3 页面组件更新
- [ ] `src/pages/super-admin/vehicle-review-detail/index.tsx`
- [ ] `src/pages/super-admin/vehicle-management/index.tsx`

---

## 二、权限查询模块 ✅

### 2.1 权限表优化（已完成）
- [x] 在users表中添加role字段
- [x] 删除4个冗余权限表（roles、user_roles、permissions、role_permissions）
- [x] 更新RLS函数直接查询users表
- [x] 更新代码中的查询语句

### 2.2 权限功能测试
- [ ] 测试BOSS权限
- [ ] 测试MANAGER权限
- [ ] 测试DISPATCHER权限
- [ ] 测试DRIVER权限
- [ ] 测试权限切换

---

## 三、人员管理模块 ⏳

### 3.1 API检查（src/db/api.ts）
- [ ] `getUsers()` - 查询用户列表
- [ ] `getUserById()` - 查询用户详情
- [ ] `getUserWithRole()` - 查询用户及角色
- [ ] `getUsersByRole()` - 按角色查询用户
- [ ] `createUserWithRole()` - 创建用户
- [ ] `updateUserWithRole()` - 更新用户
- [ ] `deleteUser()` - 删除用户

### 3.2 功能测试
- [ ] 测试用户列表查询
- [ ] 测试用户创建
- [ ] 测试用户更新
- [ ] 测试用户删除
- [ ] 测试角色分配

---

## 四、考勤管理模块 ⏳

### 4.1 API检查（src/db/api.ts）
- [ ] `getAttendanceRecords()` - 查询考勤记录
- [ ] `getAttendanceByUserId()` - 查询用户考勤
- [ ] `createAttendance()` - 创建考勤记录
- [ ] `updateAttendance()` - 更新考勤记录
- [ ] `getAttendanceRules()` - 查询考勤规则
- [ ] `updateAttendanceRules()` - 更新考勤规则

### 4.2 功能测试
- [ ] 测试考勤打卡
- [ ] 测试考勤记录查询
- [ ] 测试考勤统计
- [ ] 测试考勤规则管理

---

## 五、计件管理模块 ⏳

### 5.1 API检查（src/db/api.ts）
- [ ] `getPieceWorkRecords()` - 查询计件记录
- [ ] `getPieceWorkByUserId()` - 查询用户计件
- [ ] `createPieceWorkRecord()` - 创建计件记录
- [ ] `updatePieceWorkRecord()` - 更新计件记录
- [ ] `deletePieceWorkRecord()` - 删除计件记录
- [ ] `getCategoryPrices()` - 查询分类价格
- [ ] `updateCategoryPrice()` - 更新分类价格

### 5.2 功能测试
- [ ] 测试计件记录创建
- [ ] 测试计件记录查询
- [ ] 测试计件统计
- [ ] 测试分类价格管理

---

## 六、请假管理模块 ⏳

### 6.1 API检查（src/db/api.ts）
- [ ] `getLeaveApplications()` - 查询请假申请
- [ ] `getLeaveByUserId()` - 查询用户请假
- [ ] `createLeaveApplication()` - 创建请假申请
- [ ] `updateLeaveApplication()` - 更新请假申请
- [ ] `approveLeave()` - 审批请假
- [ ] `rejectLeave()` - 拒绝请假

### 6.2 功能测试
- [ ] 测试请假申请创建
- [ ] 测试请假申请查询
- [ ] 测试请假审批
- [ ] 测试请假统计

---

## 七、离职管理模块 ⏳

### 7.1 API检查（src/db/api.ts）
- [ ] `getResignationApplications()` - 查询离职申请
- [ ] `getResignationByUserId()` - 查询用户离职
- [ ] `createResignationApplication()` - 创建离职申请
- [ ] `updateResignationApplication()` - 更新离职申请
- [ ] `approveResignation()` - 审批离职
- [ ] `rejectResignation()` - 拒绝离职

### 7.2 功能测试
- [ ] 测试离职申请创建
- [ ] 测试离职申请查询
- [ ] 测试离职审批
- [ ] 测试离职统计

---

## 八、通知系统模块 ⏳

### 8.1 API检查（src/db/notificationApi.ts）
- [ ] `getNotifications()` - 查询通知列表
- [ ] `getUnreadNotifications()` - 查询未读通知
- [ ] `createNotification()` - 创建通知
- [ ] `markAsRead()` - 标记为已读
- [ ] `markAllAsRead()` - 全部标记为已读
- [ ] `deleteNotification()` - 删除通知

### 8.2 功能测试
- [ ] 测试通知创建
- [ ] 测试通知查询
- [ ] 测试通知标记已读
- [ ] 测试通知删除

---

## 九、统计功能模块 ⏳

### 9.1 API检查
- [ ] 用户统计
- [ ] 车辆统计
- [ ] 考勤统计
- [ ] 计件统计
- [ ] 请假统计
- [ ] 离职统计

### 9.2 功能测试
- [ ] 测试各类统计报表
- [ ] 测试数据准确性
- [ ] 测试性能

---

## 十、代码质量检查 ⏳

### 10.1 Lint检查
- [ ] 运行 `pnpm run lint`
- [ ] 修复所有错误
- [ ] 修复所有警告

### 10.2 TypeScript类型检查
- [ ] 检查类型定义
- [ ] 修复类型错误

---

## 十一、集成测试 ⏳

### 11.1 端到端测试
- [ ] 测试完整的业务流程
- [ ] 测试用户交互
- [ ] 测试数据一致性

### 11.2 性能测试
- [ ] 测试查询性能
- [ ] 对比优化前后的性能
- [ ] 验证性能提升

---

## 执行优先级

### P0（最高优先级）- 立即执行
1. 车辆管理API更新（核心功能）
2. Lint检查和修复
3. 权限功能测试

### P1（高优先级）- 今天完成
1. 人员管理功能测试
2. 考勤管理功能测试
3. 通知系统功能测试

### P2（中优先级）- 明天完成
1. 计件管理功能测试
2. 请假管理功能测试
3. 离职管理功能测试
4. 统计功能测试

### P3（低优先级）- 后续完成
1. 性能测试
2. 文档更新

---

## 当前状态

**已完成：**
- ✅ 权限表优化（users表role字段）
- ✅ 车辆表优化（vehicles + vehicle_documents）
- ✅ 类型定义更新

**进行中：**
- ⏳ 车辆管理API更新

**待开始：**
- ⏳ 其他模块功能测试

---

**创建时间**：2025-11-05  
**最后更新**：2025-11-05  
**总体进度**：10%
