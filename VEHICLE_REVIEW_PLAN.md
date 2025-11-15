# 车辆管理审核流程实施方案

## 一、需求概述

建立从司机录入到超级管理员审核的闭环车辆管理流程，重点强化图片审核机制。

## 二、状态流转设计

### 审核状态枚举
```typescript
type ReviewStatus = 
  | 'drafting'          // 录入中 - 信息尚未提交
  | 'pending_review'    // 待审核 - 已提交，等待管理员审核
  | 'need_supplement'   // 需补录 - 管理员要求补充图片
  | 'approved'          // 审核通过 - 所有信息符合要求
```

### 状态流转逻辑
```
录入中 (drafting)
  ↓ [司机提交]
待审核 (pending_review)
  ↓ [管理员审核]
  ├─→ 审核通过 (approved) - 所有图片符合要求
  └─→ 需补录 (need_supplement) - 存在不符合要求的图片
       ↓ [司机补录并重新提交]
     待审核 (pending_review)
```

## 三、数据库设计

### 新增字段
```sql
-- 审核状态
review_status: 'drafting' | 'pending_review' | 'need_supplement' | 'approved'

-- 图片锁定信息（JSON对象）
-- 格式：{"pickup_photos": [0, 2], "return_photos": [1], "registration_photos": []}
locked_photos: jsonb

-- 需要补录的图片字段（JSON数组）
-- 格式：["pickup_photos_0", "pickup_photos_2", "return_photos_1"]
required_photos: text[]

-- 审核备注
review_notes: text

-- 审核时间
reviewed_at: timestamptz

-- 审核人ID
reviewed_by: uuid
```

## 四、功能模块设计

### 4.1 司机端功能

#### 车辆录入页面（提车/还车）
- **保存草稿**按钮：保存信息但不提交审核（状态：录入中）
- **提交审核**按钮：提交给管理员审核（状态：待审核）
- 显示当前审核状态标签
- 根据审核状态显示不同提示信息

#### 车辆列表页面
- 显示审核状态标签（不同颜色）
  - 录入中：灰色
  - 待审核：橙色
  - 需补录：红色
  - 审核通过：绿色
- 根据状态显示不同操作按钮
  - 录入中：继续录入、删除
  - 待审核：查看详情
  - 需补录：补录图片、查看详情
  - 审核通过：查看详情、还车（如果是提车状态）

#### 图片补录页面
- 只显示需要补录的图片项
- 已锁定的图片显示为只读（灰色遮罩 + 锁定图标）
- 显示管理员的审核备注
- 提交后状态自动变为"待审核"

### 4.2 超级管理端功能

#### 车辆信息审核列表页面（新建）
- 路径：`/pages/super-admin/vehicle-review/index.tsx`
- 显示所有"待审核"状态的车辆
- 列表信息：
  - 车牌号
  - 司机姓名
  - 提交时间
  - 车辆类型（提车/还车）
- 操作按钮：进入审核

#### 详细审核页面（新建）
- 路径：`/pages/super-admin/vehicle-review-detail/index.tsx`
- 显示车辆基本信息
- 图片审核区域：
  - 分组显示：提车照片、还车照片、行驶证照片
  - 每张图片提供操作按钮：
    - **锁定**：锁定图片，司机无法修改（显示锁定图标）
    - **删除**：删除图片，要求司机重新上传（图片变灰 + 删除标记）
  - 显示统计信息：
    - 已锁定图片数量
    - 需补录图片数量
- 审核备注输入框
- 操作按钮：
  - **通过审核**：所有图片符合要求，状态变为"审核通过"
  - **要求补录**：存在被删除的图片，状态变为"需补录"
  - **返回列表**

## 五、API 设计

### 5.1 司机端 API

```typescript
// 提交车辆审核
submitVehicleForReview(vehicleId: string): Promise<boolean>

// 获取需要补录的图片列表
getRequiredPhotos(vehicleId: string): Promise<string[]>

// 补录图片
supplementPhotos(vehicleId: string, photos: Record<string, string>): Promise<boolean>
```

### 5.2 管理端 API

```typescript
// 获取待审核车辆列表
getPendingReviewVehicles(): Promise<Vehicle[]>

// 锁定图片
lockPhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean>

// 删除图片（标记为需补录）
deletePhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean>

// 通过审核
approveVehicle(vehicleId: string, notes: string): Promise<boolean>

// 要求补录
requireSupplement(vehicleId: string, notes: string): Promise<boolean>
```

## 六、实施步骤

### 步骤 1：数据库迁移
- [ ] 创建 review_status 枚举类型
- [ ] 添加审核相关字段到 vehicles 表
- [ ] 设置默认值和约束

### 步骤 2：更新类型定义
- [ ] 更新 Vehicle 接口
- [ ] 添加 ReviewStatus 类型
- [ ] 添加图片锁定相关类型

### 步骤 3：实现 API 函数
- [ ] 实现司机端 API
- [ ] 实现管理端 API

### 步骤 4：修改司机端页面
- [ ] 修改车辆列表页面，显示审核状态
- [ ] 修改提车/还车录入页面，添加提交审核功能
- [ ] 创建图片补录页面

### 步骤 5：创建管理端页面
- [ ] 创建车辆审核列表页面
- [ ] 创建详细审核页面
- [ ] 更新超级管理端导航

### 步骤 6：测试验证
- [ ] 测试完整审核流程
- [ ] 测试图片锁定和删除功能
- [ ] 测试状态流转逻辑

## 七、用户操作流程

### 7.1 司机端操作流程

#### 场景1：首次提车录入
1. 司机进入"提车录入"页面
2. 填写车辆信息，上传照片
3. 点击"保存草稿"（状态：录入中）或直接点击"提交审核"（状态：待审核）
4. 等待管理员审核

#### 场景2：补录图片
1. 司机在车辆列表看到"需补录"状态
2. 点击"补录图片"按钮
3. 系统显示需要补录的图片项（已锁定的图片显示为只读）
4. 上传缺失的图片
5. 点击"重新提交"（状态：待审核）

### 7.2 管理端操作流程

#### 场景1：审核通过
1. 管理员进入"车辆信息审核"页面
2. 查看待审核车辆列表
3. 点击某辆车进入详细审核页面
4. 逐张审查图片，对符合要求的图片点击"锁定"
5. 所有图片审核完毕，填写审核备注
6. 点击"通过审核"（状态：审核通过）

#### 场景2：要求补录
1. 管理员进入详细审核页面
2. 发现部分图片不符合要求，点击"删除"
3. 填写审核备注，说明需要补录的原因
4. 点击"要求补录"（状态：需补录）
5. 司机收到通知，进行补录

## 八、UI 设计要点

### 状态标签颜色
- 录入中：`bg-gray-500`
- 待审核：`bg-orange-500`
- 需补录：`bg-red-500`
- 审核通过：`bg-green-500`

### 图片状态标识
- 正常图片：无标识
- 已锁定图片：右上角显示锁定图标 `i-mdi-lock`
- 已删除图片：灰色遮罩 + 删除图标 `i-mdi-delete`

### 操作按钮
- 锁定：蓝色按钮 `bg-blue-600`
- 删除：红色按钮 `bg-red-600`
- 通过审核：绿色按钮 `bg-green-600`
- 要求补录：橙色按钮 `bg-orange-600`

## 九、注意事项

1. **图片锁定机制**：已锁定的图片司机无法修改，确保审核通过的图片不被篡改
2. **状态流转控制**：严格控制状态流转逻辑，防止非法状态转换
3. **权限控制**：只有超级管理员可以进行审核操作
4. **通知机制**：状态变更时应通知相关用户（可选功能）
5. **审核记录**：保留审核历史记录，便于追溯（可选功能）
