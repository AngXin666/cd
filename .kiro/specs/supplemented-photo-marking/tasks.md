# Implementation Plan

## 补录照片标记功能

- [x] 1. 数据库和类型定义
  - [x] 1.1 创建数据库迁移文件，添加 supplemented_photos 字段到 vehicle_documents 表
    - 创建 `supabase/migrations/00049_add_supplemented_photos_field.sql`
    - 添加 JSONB 类型的 supplemented_photos 字段
    - 添加字段注释
    - _Requirements: 1.1, 3.1_
  - [x] 1.2 更新 TypeScript 类型定义
    - 在 `src/db/types.ts` 中添加 `SupplementedPhotoMeta` 接口
    - 在 `src/db/types.ts` 中添加 `SupplementedPhotos` 类型
    - 更新 `VehicleDocument` 接口，添加 `supplemented_photos` 字段
    - _Requirements: 1.1_

- [x] 2. API 层实现
  - [x] 2.1 修改 supplementPhoto 函数，记录补录元数据
    - 在 `src/db/api/vehicles.ts` 中修改 `supplementPhoto` 函数
    - 获取当前照片URL作为 original_url
    - 更新或创建 supplemented_photos 元数据
    - 累加 supplement_count
    - _Requirements: 1.1, 2.2, 3.1_
  - [x] 2.2 编写 supplementPhoto 函数的属性测试
    - **Property 1: 补录操作记录完整性**
    - **Validates: Requirements 1.1, 2.2**
  - [x] 2.3 新增 getSupplementedPhotos 函数
    - 在 `src/db/api/vehicles.ts` 中添加 `getSupplementedPhotos` 函数
    - 查询并返回 supplemented_photos 字段
    - 处理空值和异常情况
    - _Requirements: 3.2, 3.3_
  - [x] 2.4 编写 getSupplementedPhotos 函数的属性测试
    - **Property 4: 照片历史记录完整性**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. UI 组件实现
  - [x] 4.1 创建 SupplementedBadge 组件
    - 创建 `src/components/SupplementedBadge/index.tsx`
    - 创建 `src/components/SupplementedBadge/index.scss`
    - 显示"补录"文字徽章
    - 支持显示补录时间
    - 添加高亮样式
    - _Requirements: 1.2, 1.3_
  - [x] 4.2 修改审核详情页面，显示补录标记
    - 修改 `src/pages/super-admin/vehicle-review-detail/index.tsx`
    - 加载 supplemented_photos 数据
    - 在补录照片上显示 SupplementedBadge 组件
    - 添加补录照片高亮样式（橙色边框和阴影）
    - 添加已补录照片统计
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 4.3 编写 UI 组件的属性测试
    - **Property 2: 补录标记视觉一致性**
    - **Validates: Requirements 1.2, 1.3**

- [x] 5. 司机端展示
  - [x] 5.1 修改司机车辆详情页面，显示补录状态
    - 修改 `src/pages/driver/vehicle-detail/index.tsx`
    - 添加 supplementedPhotos 状态
    - 在加载车辆详情时获取补录元数据
    - 在提车、还车、行驶证、车损照片上显示补录标记
    - 添加橙色边框高亮效果
    - _Requirements: 2.3_
  - [x] 5.2 编写司机端展示的属性测试
    - **Property 3: 补录时间显示准确性**
    - **Validates: Requirements 1.4, 2.3**

- [x] 6. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
