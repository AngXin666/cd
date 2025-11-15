# 车辆管理审核流程详细说明

## 概述

本文档详细说明车辆管理审核流程的设计、实现和使用方法。该系统建立了从司机录入到超级管理员审核的闭环车辆管理流程，重点强化图片审核机制。

---

## 核心功能

### 1. 审核状态管理

系统定义了四种审核状态，确保车辆信息的完整性和准确性：

#### 录入中 (drafting)
- **说明**：司机正在填写车辆信息，尚未提交审核
- **操作权限**：
  - 司机可以编辑所有信息
  - 司机可以保存草稿
  - 司机可以提交审核
- **状态转换**：
  - 点击"提交审核" → 待审核

#### 待审核 (pending_review)
- **说明**：司机已提交车辆信息，等待管理员审核
- **操作权限**：
  - 司机不能修改信息
  - 管理员可以审核图片
  - 管理员可以锁定图片
  - 管理员可以标记需补录
- **状态转换**：
  - 管理员点击"审核通过" → 审核通过
  - 管理员点击"要求补录" → 需补录

#### 需补录 (need_supplement)
- **说明**：管理员审核后发现部分图片不符合要求，需要司机补充
- **操作权限**：
  - 司机只能重新上传被标记的图片
  - 司机不能修改已锁定的图片
  - 司机不能修改车辆基本信息
- **状态转换**：
  - 司机完成补录并提交 → 待审核

#### 审核通过 (approved)
- **说明**：所有信息符合要求，管理员审核通过
- **操作权限**：
  - 司机可以进行后续操作（如还车）
  - 司机不能修改车辆信息
  - 管理员不能再次审核
- **状态转换**：
  - 无（终态）

---

## 图片审核机制

### 图片锁定功能

#### 目的
- 保护符合要求的图片，防止被误删
- 确保司机补录时不会修改已审核通过的图片

#### 数据结构
```typescript
interface LockedPhotos {
  pickup_photos?: number[]      // 已锁定的提车照片索引
  return_photos?: number[]      // 已锁定的还车照片索引
  registration_photos?: number[] // 已锁定的行驶证照片索引
}
```

#### 示例
```json
{
  "pickup_photos": [0, 1],
  "registration_photos": [0]
}
```
表示：提车照片的第0张和第1张已锁定，行驶证照片的第0张已锁定。

### 图片补录标记

#### 目的
- 明确告知司机哪些图片需要重新上传
- 系统自动记录需补拍项

#### 数据结构
```typescript
required_photos: string[]  // 需要补录的图片列表
```

#### 格式
```typescript
['pickup_photos_0', 'pickup_photos_1', 'registration_photos_0']
```
表示：提车照片第0张、第1张，行驶证照片第0张需要补录。

---

## 用户操作流程

### 司机端操作流程

#### 1. 录入车辆信息
1. 进入"车辆列表"页面
2. 点击"添加车辆"按钮
3. 填写车辆基本信息（车牌号、品牌、型号、颜色）
4. 拍摄或选择照片：
   - 提车照片（至少1张）
   - 行驶证照片（至少1张）
5. 选择操作：
   - **保存草稿**：保存信息但不提交审核，状态为"录入中"
   - **提交审核**：提交给管理员审核，状态变为"待审核"

#### 2. 查看审核状态
1. 在"车辆列表"页面查看车辆审核状态
2. 状态显示：
   - 🟡 录入中：可以继续编辑
   - 🔵 待审核：等待管理员审核
   - 🟠 需补录：需要补充图片
   - 🟢 审核通过：可以进行后续操作

#### 3. 补录图片（需补录状态）
1. 点击"补录图片"按钮
2. 查看需要补录的图片列表
3. 对比显示：
   - 左侧：原图（不符合要求）
   - 右侧：新图（待上传）
4. 点击"点击上传"选择新图片
5. 确认所有需补录的图片都已选择
6. 点击"提交补录"按钮
7. 系统自动重新提交审核，状态变回"待审核"

#### 4. 还车操作（审核通过后）
1. 只有审核通过的车辆才能进行还车操作
2. 点击"还车"按钮
3. 拍摄还车照片
4. 提交还车信息

### 管理员操作流程

#### 1. 进入审核页面
1. 登录超级管理员账号
2. 在首页点击"车辆审核"按钮
3. 查看待审核车辆列表

#### 2. 查看车辆信息
1. 车辆列表显示：
   - 司机姓名和手机号
   - 车牌号
   - 车辆品牌和型号
   - 提交时间
2. 点击车辆卡片进入详细审核页面

#### 3. 审核图片
1. 查看车辆基本信息
2. 逐张审查照片：
   - **提车照片**：检查车辆外观、车牌清晰度等
   - **行驶证照片**：检查证件清晰度、信息完整性等
3. 对每张图片进行操作：
   - **符合要求**：点击"锁定"按钮（绿色锁图标）
   - **不符合要求**：点击"标记需补录"按钮（红色标记图标）
4. 已锁定的图片：
   - 显示绿色边框和锁图标
   - 可以点击"解锁"取消锁定
5. 已标记需补录的图片：
   - 显示红色边框和标记图标
   - 可以点击"取消标记"

#### 4. 提交审核结果
1. 审核完成后，选择操作：
   - **审核通过**：
     - 条件：所有图片都已锁定，没有标记需补录的图片
     - 点击"审核通过"按钮
     - 车辆状态变为"审核通过"
   - **要求补录**：
     - 条件：有图片被标记需补录
     - 填写审核备注（说明哪些图片不符合要求）
     - 点击"要求补录"按钮
     - 车辆状态变为"需补录"
     - 司机收到通知，需要补录图片

#### 5. 重新审核
1. 司机补录图片后，车辆状态变回"待审核"
2. 管理员再次进入审核页面
3. 查看补录的图片
4. 重复步骤3和步骤4

---

## 技术实现

### 数据库设计

#### vehicles 表结构
```sql
CREATE TYPE review_status AS ENUM ('drafting', 'pending_review', 'need_supplement', 'approved');

CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id),
  plate_number text NOT NULL,
  brand text,
  model text,
  color text,
  status vehicle_status DEFAULT 'picked_up',
  pickup_time timestamptz,
  return_time timestamptz,
  pickup_photos text[],
  return_photos text[],
  registration_photos text[],
  review_status review_status DEFAULT 'approved'::review_status,
  locked_photos jsonb DEFAULT '{}'::jsonb,
  required_photos text[] DEFAULT ARRAY[]::text[],
  review_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### API 函数

#### 司机端 API
- `getDriverVehicles(driverId)`: 获取司机的车辆列表
- `getVehicleById(vehicleId)`: 获取车辆详情
- `insertVehicle(vehicle)`: 添加车辆（保存草稿或提交审核）
- `submitVehicleForReview(vehicleId)`: 提交审核
- `getRequiredPhotos(vehicleId)`: 获取需要补录的图片列表
- `supplementPhoto(vehicleId, photoField, photoIndex, photoUrl)`: 补录图片

#### 管理端 API
- `getVehiclesPendingReview()`: 获取待审核车辆列表
- `lockPhoto(vehicleId, photoField, photoIndex)`: 锁定图片
- `unlockPhoto(vehicleId, photoField, photoIndex)`: 解锁图片
- `markPhotoAsRequired(vehicleId, photoField, photoIndex)`: 标记图片需要补录
- `approveVehicle(vehicleId, reviewerId)`: 审核通过
- `requestSupplement(vehicleId, reviewerId, notes)`: 要求补录

### 状态流转逻辑

```typescript
// 状态流转图
drafting → pending_review → approved
              ↓           ↑
         need_supplement ─┘
```

#### 状态转换规则
1. **drafting → pending_review**
   - 触发条件：司机点击"提交审核"
   - 前置条件：车辆信息完整，至少有提车照片和行驶证照片

2. **pending_review → approved**
   - 触发条件：管理员点击"审核通过"
   - 前置条件：所有图片都已锁定，没有标记需补录的图片

3. **pending_review → need_supplement**
   - 触发条件：管理员点击"要求补录"
   - 前置条件：有图片被标记需补录

4. **need_supplement → pending_review**
   - 触发条件：司机完成补录并提交
   - 前置条件：所有需补录的图片都已重新上传

---

## 最佳实践

### 司机端
1. **拍摄清晰的照片**：
   - 确保光线充足
   - 车牌号清晰可见
   - 行驶证信息完整
   - 避免模糊和反光

2. **及时补录**：
   - 收到"需补录"通知后，尽快补录图片
   - 仔细阅读审核备注，了解哪些图片不符合要求

3. **保存草稿**：
   - 如果暂时无法完成所有信息，可以先保存草稿
   - 稍后继续编辑并提交审核

### 管理员端
1. **仔细审核**：
   - 逐张检查每张图片
   - 确保车牌号与车辆信息一致
   - 确保行驶证信息清晰完整

2. **及时锁定**：
   - 对符合要求的图片及时锁定
   - 避免司机误删或修改

3. **明确备注**：
   - 在要求补录时，填写详细的审核备注
   - 说明哪些图片不符合要求，以及原因

4. **快速审核**：
   - 及时处理待审核车辆
   - 避免司机长时间等待

---

## 常见问题

### Q1: 为什么我不能修改已提交审核的车辆信息？
**A**: 为了确保审核的准确性，车辆信息一旦提交审核，就不能修改。如果需要修改，请联系管理员。

### Q2: 如何知道哪些图片需要补录？
**A**: 在"需补录"状态下，点击"补录图片"按钮，系统会显示所有需要补录的图片列表。

### Q3: 补录图片后，审核状态会自动变化吗？
**A**: 是的，补录完成并提交后，车辆状态会自动变回"待审核"，等待管理员重新审核。

### Q4: 管理员可以解锁已锁定的图片吗？
**A**: 可以。管理员可以点击"解锁"按钮取消锁定，但建议谨慎操作。

### Q5: 审核通过后，还能修改车辆信息吗？
**A**: 不能。审核通过后，车辆信息不能再修改。如果需要修改，请联系管理员。

---

## 总结

车辆管理审核流程通过清晰的状态流转和图片审核机制，确保了车辆信息的准确性和完整性。司机端和管理端的协同工作，实现了从录入到审核的闭环管理。

关键特性：
- ✅ 四种审核状态，清晰的状态流转
- ✅ 图片锁定功能，防止误删
- ✅ 图片补录机制，确保信息准确
- ✅ 审核备注功能，明确沟通
- ✅ 完善的权限控制，保障数据安全
