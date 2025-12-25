# 车辆照片录入功能修改任务

## 任务概述

将 fleet-manager Vue 项目的车辆管理功能与主项目（Taro/React）对齐，实现完整的车辆照片录入流程。

## 角色权限说明

| 角色 | 录入车辆 | 分配车辆 | 还车录入 | 查看所有车辆 |
|------|---------|---------|---------|-------------|
| 司机 | ✅ | ❌ | ✅ | ❌（仅自己的） |
| 车队长/调度 | ✅ | ✅ | ✅ | ✅（本仓库） |
| 老板 | ✅ | ✅ | ✅ | ✅（所有仓库） |

## ⚠️ 执行进度跟踪

### 已完成 ✅
- [x] 任务 1：创建 StepIndicator 组件 (`fleet-manager/frontend/src/components/StepIndicator.vue`)
- [x] 任务 2：创建 PhotoCapture 组件 (`fleet-manager/frontend/src/components/PhotoCapture.vue`)
- [x] 任务 3：更新 API 类型定义 (`fleet-manager/frontend/src/api/types.ts`)
- [x] 任务 4：添加图片上传工具函数 (`fleet-manager/frontend/src/utils/imageUpload.ts`)
- [x] 任务 5：添加草稿保存工具函数 (`fleet-manager/frontend/src/utils/draftUtils.ts`)
- [x] 更新 API 模块添加还车和分配函数 (`fleet-manager/frontend/src/api/index.ts`)
- [x] 任务 6：重写添加车辆页面（3步骤流程）(`fleet-manager/frontend/src/pages/driver/vehicle/add.vue`)
- [x] 任务 7：创建还车页面 (`fleet-manager/frontend/src/pages/driver/vehicle/return.vue`)
- [x] 任务 9：更新路由配置 (`fleet-manager/frontend/src/pages.json`) - 添加还车页面路由
- [x] 任务 10：车辆列表页面已有还车按钮 (`fleet-manager/frontend/src/pages/driver/vehicle/list.vue`)
- [x] 任务 11：车队长/调度端车辆管理页面 (`fleet-manager/frontend/src/pages/manager/vehicle/list.vue`)
- [x] 任务 12：老板端车辆管理页面 (`fleet-manager/frontend/src/pages/boss/vehicle/list.vue`)
- [x] 任务 13：更新所有角色的路由配置

### 待完成 ⏳
- [ ] 任务 8：更新后端 API（还车、分配、图片上传端点）- 可能需要后端开发支持
- [ ] 本地测试验证

## 当前状态分析

### 主项目功能（src/pages/driver/add-vehicle/index.tsx）
- **3步骤流程**：行驶证识别 → 车辆照片 → 驾驶员证件
- **行驶证照片**：主页、副页、副页背页（3张）+ OCR识别
- **车辆照片**：7个角度（左前、右前、左后、右后、仪表盘、后门、货箱）
- **驾驶员证件**：身份证正面 + 驾驶证主页/副页 + OCR识别
- **车损照片**：可选，最多9张
- **草稿保存/恢复**：自动保存进度
- **步骤指示器**：显示当前进度

### 主项目还车功能（src/pages/driver/return-vehicle/index.tsx）
- **车辆照片**：7个角度（与提车相同）
- **车损照片**：可选，最多9张
- **车损责任提醒**：还车前必须联系车队长核实

### Vue 项目当前状态（fleet-manager/frontend/src/pages/driver/vehicle/add.vue）
- 只有基本的 OCR 行驶证识别
- 缺少3步骤流程
- 缺少车辆照片拍摄
- 缺少驾驶员证件录入
- 缺少车损照片
- 缺少草稿保存功能

## 修改任务清单

### 任务 1：创建 StepIndicator 组件
- [ ] 创建 `fleet-manager/frontend/src/components/StepIndicator.vue`
- [ ] 支持步骤标题和描述
- [ ] 支持当前步骤高亮
- [ ] 支持步骤完成状态

### 任务 2：创建 PhotoCapture 组件
- [ ] 创建 `fleet-manager/frontend/src/components/PhotoCapture.vue`
- [ ] 支持拍照/相册选择
- [ ] 支持照片预览
- [ ] 支持删除照片
- [ ] 支持自定义标题和提示

### 任务 3：更新 API 类型定义
- [ ] 更新 `fleet-manager/frontend/src/api/types.ts`
- [ ] 添加车辆照片字段（7个角度）
- [ ] 添加行驶证照片字段（3张）
- [ ] 添加驾驶员证件字段
- [ ] 添加车损照片字段

### 任务 4：添加图片上传工具函数
- [ ] 创建 `fleet-manager/frontend/src/utils/imageUpload.ts`
- [ ] 实现图片压缩
- [ ] 实现图片上传到后端
- [ ] 实现唯一文件名生成

### 任务 5：添加草稿保存工具函数
- [ ] 创建 `fleet-manager/frontend/src/utils/draftUtils.ts`
- [ ] 实现草稿保存到本地存储
- [ ] 实现草稿恢复
- [ ] 实现草稿删除

### 任务 6：重写添加车辆页面
- [ ] 重写 `fleet-manager/frontend/src/pages/driver/vehicle/add.vue`
- [ ] 实现3步骤流程
- [ ] 步骤1：行驶证识别（3张照片 + OCR）
- [ ] 步骤2：车辆照片（7个角度）
- [ ] 步骤3：驾驶员证件（身份证 + 驾驶证 + OCR）
- [ ] 添加车损照片（可选）
- [ ] 实现草稿保存/恢复
- [ ] 实现表单验证
- [ ] 实现提交功能

### 任务 7：创建还车页面
- [ ] 创建 `fleet-manager/frontend/src/pages/driver/vehicle/return.vue`
- [ ] 显示车辆基本信息
- [ ] 拍摄7个角度车辆照片
- [ ] 添加车损照片（可选）
- [ ] 车损责任提醒弹窗
- [ ] 实现草稿保存/恢复
- [ ] 实现提交功能

### 任务 8：更新后端 API
- [ ] 添加还车 API 端点
- [ ] 添加图片上传 API 端点
- [ ] 更新车辆创建 API 支持所有照片字段

### 任务 9：更新路由配置
- [ ] 更新 `fleet-manager/frontend/src/pages.json`
- [ ] 添加还车页面路由

### 任务 10：更新车辆列表页面
- [ ] 更新 `fleet-manager/frontend/src/pages/driver/vehicle/list.vue`
- [ ] 添加还车按钮
- [ ] 添加补录照片按钮

### 任务 11：车队长/调度端车辆管理
- [ ] 创建 `fleet-manager/frontend/src/pages/manager/vehicle/list.vue`
- [ ] 创建 `fleet-manager/frontend/src/pages/manager/vehicle/add.vue`（复用司机端组件）
- [ ] 创建 `fleet-manager/frontend/src/pages/manager/vehicle/assign.vue`（分配车辆给司机）
- [ ] 支持查看本仓库所有车辆
- [ ] 支持录入车辆并分配给司机
- [ ] 支持还车录入

### 任务 12：老板端车辆管理
- [ ] 创建 `fleet-manager/frontend/src/pages/boss/vehicle/list.vue`
- [ ] 创建 `fleet-manager/frontend/src/pages/boss/vehicle/add.vue`（复用司机端组件）
- [ ] 创建 `fleet-manager/frontend/src/pages/boss/vehicle/assign.vue`（分配车辆）
- [ ] 支持查看所有仓库车辆
- [ ] 支持按仓库筛选
- [ ] 支持录入车辆并分配

### 任务 13：更新路由配置（所有角色）
- [ ] 更新 `fleet-manager/frontend/src/pages.json`
- [ ] 添加车队长端车辆管理路由
- [ ] 添加老板端车辆管理路由

---

## 📋 详细执行指南

### 任务 7：创建还车页面（下一个任务）

**文件**: `fleet-manager/frontend/src/pages/driver/vehicle/return.vue`

**参考**: `src/pages/driver/return-vehicle/index.tsx`（主项目）

**实现要点**:
1. 接收车辆 ID 参数，加载车辆信息
2. 显示车辆基本信息（车牌、品牌、型号、提车时间）
3. 拍摄7个角度车辆照片（复用 PhotoCapture 组件）
4. 可选：车损特写照片（最多9张）
5. 车损责任提醒弹窗（还车前必须联系车队长核实）
6. 草稿自动保存/恢复
7. 提交时调用 `returnVehicle` API

**代码模板**:
```vue
<template>
  <view class="return-vehicle-page">
    <!-- 车辆信息卡片 -->
    <!-- 7个角度照片 -->
    <!-- 车损特写照片 -->
    <!-- 提交按钮 -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PhotoCapture from '@/components/PhotoCapture.vue'
import { getVehicle, returnVehicle } from '@/api'
import { saveDraft, getDraft, deleteDraft } from '@/utils/draftUtils'
import { uploadImage } from '@/utils/imageUpload'
// ... 实现逻辑
</script>
```

---

### 任务 6：重写添加车辆页面（已完成 ✅）

**文件**: `fleet-manager/frontend/src/pages/driver/vehicle/add.vue`

**参考**: `src/pages/driver/add-vehicle/index.tsx`（主项目）

**实现要点**:
1. 3步骤流程：行驶证识别 → 车辆照片 → 驾驶员证件
2. 步骤1 - 行驶证识别：
   - 3张照片：主页、副页、副页背页
   - 每张照片拍摄后自动调用 OCR 识别
   - 识别结果自动填充表单
3. 步骤2 - 车辆照片：
   - 7个角度：左前、右前、左后、右后、仪表盘、后门、货箱
   - 可选：车损特写照片（最多9张）
4. 步骤3 - 驾驶员证件：
   - 身份证正面 + OCR
   - 驾驶证主页 + OCR
5. 草稿自动保存/恢复
6. 提交时上传所有照片

**使用组件**:
- `StepIndicator.vue` - 步骤指示器
- `PhotoCapture.vue` - 照片拍摄

**使用工具**:
- `draftUtils.ts` - 草稿保存
- `imageUpload.ts` - 图片上传

---

### 任务 7：创建还车页面

**文件**: `fleet-manager/frontend/src/pages/driver/vehicle/return.vue`

**参考**: `src/pages/driver/return-vehicle/index.tsx`（主项目）

**实现要点**:
1. 显示车辆基本信息（车牌、品牌、型号、提车时间）
2. 拍摄7个角度车辆照片
3. 可选：车损特写照片（最多9张）
4. 车损责任提醒弹窗
5. 草稿自动保存/恢复
6. 提交时调用 `returnVehicle` API

---

### 任务 8：更新后端 API

**文件**: `fleet-manager/backend/main.py` 或相关路由文件

**需要添加的端点**:
1. `PUT /vehicles/{id}/return` - 还车
2. `PUT /vehicles/{id}/assign` - 分配车辆
3. `GET /vehicles/all` - 获取所有车辆（管理员）
4. `GET /warehouses/{id}/vehicles` - 获取仓库车辆
5. `POST /api/upload/image` - 图片上传

---

### 任务 9-10：更新路由和列表页面

**路由文件**: `fleet-manager/frontend/src/pages.json`

**添加路由**:
```json
{
  "path": "pages/driver/vehicle/return",
  "style": { "navigationBarTitleText": "还车录入" }
}
```

**列表页面更新**: `fleet-manager/frontend/src/pages/driver/vehicle/list.vue`
- 添加"还车"按钮（状态为使用中时显示）
- 添加"补录照片"按钮（状态为需补录时显示）

---

### 任务 11-13：管理端车辆管理

**车队长/调度端**:
- `fleet-manager/frontend/src/pages/manager/vehicle/list.vue`
- `fleet-manager/frontend/src/pages/manager/vehicle/add.vue`
- `fleet-manager/frontend/src/pages/manager/vehicle/assign.vue`

**老板端**:
- `fleet-manager/frontend/src/pages/boss/vehicle/list.vue`
- `fleet-manager/frontend/src/pages/boss/vehicle/add.vue`
- `fleet-manager/frontend/src/pages/boss/vehicle/assign.vue`

**共享逻辑**: 可以复用司机端的添加车辆组件，增加分配功能

---

## 🔧 关键代码参考

### OCR 识别调用
```typescript
import { recognizeDrivingLicense } from '@/api'
import { readImageAsBase64 } from '@/utils/imageUpload'

async function handleOCR(photoPath: string) {
  const base64 = await readImageAsBase64(photoPath)
  const result = await recognizeDrivingLicense(base64)
  if (result.success && result.data) {
    // 填充表单
  }
}
```

### 草稿保存
```typescript
import { saveDraft, getDraft, deleteDraft } from '@/utils/draftUtils'

// 保存
await saveDraft('add', userId, draftData)

// 恢复
const draft = await getDraft('add', userId)

// 删除
await deleteDraft('add', userId)
```

### 图片上传
```typescript
import { uploadImage, uploadImages } from '@/utils/imageUpload'

// 单张上传
const url = await uploadImage(filePath, 'vehicle_left_front')

// 批量上传
const urls = await uploadImages(filePaths, 'vehicle', (current, total) => {
  console.log(`上传进度: ${current}/${total}`)
})
```

---

## 实现顺序

1. 任务 1-2：创建基础组件
2. 任务 3-5：更新类型和工具函数
3. 任务 6：重写添加车辆页面
4. 任务 7：创建还车页面
5. 任务 8-9：更新后端和路由
6. 任务 10：更新列表页面

## 验收标准

- [ ] 添加车辆支持3步骤流程
- [ ] 支持行驶证OCR识别（3张照片）
- [ ] 支持7个角度车辆照片拍摄
- [ ] 支持驾驶员证件OCR识别
- [ ] 支持车损照片上传
- [ ] 支持草稿保存/恢复
- [ ] 还车支持7个角度照片拍摄
- [ ] 还车支持车损照片上传
- [ ] 还车有责任提醒弹窗
- [ ] 所有功能本地测试通过


---

## 🔄 新会话继续执行指南

### 当前状态
- 任务 1-6 已完成
- 下一个任务：任务 7 - 创建还车页面

### 新会话启动命令
```
继续执行 fleet-manager/docs/VEHICLE-PHOTO-RECORDING-TASK.md 中的车辆照片录入任务。
当前进度：任务 1-6 已完成，请从任务 7（创建还车页面）开始继续。
```

### 需要读取的文件
1. `fleet-manager/docs/VEHICLE-PHOTO-RECORDING-TASK.md` - 任务文档
2. `src/pages/driver/return-vehicle/index.tsx` - 主项目还车页面参考
3. `fleet-manager/frontend/src/pages/driver/vehicle/add.vue` - 已完成的添加页面参考
4. `fleet-manager/frontend/src/components/PhotoCapture.vue` - 照片组件
5. `fleet-manager/frontend/src/utils/draftUtils.ts` - 草稿工具
6. `fleet-manager/frontend/src/api/index.ts` - API 函数

### 已创建的文件清单
```
fleet-manager/frontend/src/
├── components/
│   ├── StepIndicator.vue      ✅ 步骤指示器
│   └── PhotoCapture.vue       ✅ 照片拍摄组件
├── utils/
│   ├── draftUtils.ts          ✅ 草稿保存工具
│   └── imageUpload.ts         ✅ 图片上传工具
├── api/
│   ├── types.ts               ✅ 已更新（Vehicle、DriverLicense 等类型）
│   ├── index.ts               ✅ 已更新（returnVehicle、assignVehicle 等函数）
│   └── request.ts             ✅ 已更新（导出 getApiBaseUrl）
├── pages/driver/vehicle/
│   ├── add.vue                ✅ 已重写（3步骤流程）
│   ├── return.vue             ✅ 已创建（还车录入页面）
│   └── list.vue               ✅ 已有还车按钮
├── pages/manager/vehicle/
│   └── list.vue               ✅ 已创建（车队长车辆管理）
└── pages/boss/vehicle/
    └── list.vue               ✅ 已创建（老板端车辆管理）
```

### 剩余任务
- **任务 8**：后端 API 更新 - 需要后端开发支持，前端已准备好调用接口
- **本地测试**：待后端 API 就绪后进行完整测试
