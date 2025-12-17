# Implementation Plan

## 任务概述

将所有使用 `i-mdi-loading` 自定义加载样式的页面，统一改为使用 `showLoading/hideLoading` API。

---

- [x] 1. 替换 Super Admin 页面的加载样式
  - [x] 1.1 替换 `src/pages/super-admin/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 1.2 替换 `src/pages/super-admin/vehicle-rental-edit/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 1.3 替换 `src/pages/super-admin/vehicle-review-detail/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 1.4 替换 `src/pages/super-admin/vehicle-management/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 1.5 替换 `src/pages/super-admin/user-detail/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 1.6 替换 `src/pages/super-admin/user-management/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 1.7 替换 `src/pages/super-admin/staff-management/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_

- [x] 2. 替换 Manager 页面的加载样式
  - [x] 2.1 替换 `src/pages/manager/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 2.2 替换 `src/pages/manager/staff-management/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 2.3 替换 `src/pages/manager/driver-profile/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_

- [x] 3. 替换 Driver 页面的加载样式
  - [x] 3.1 替换 `src/pages/driver/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 3.2 替换 `src/pages/driver/vehicle-list/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 3.3 替换 `src/pages/driver/vehicle-detail/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 3.4 替换 `src/pages/driver/edit-vehicle/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 3.5 替换 `src/pages/driver/supplement-photos/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 3.6 替换 `src/pages/driver/return-vehicle/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 3.7 替换 `src/pages/driver/notifications/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_

- [x] 4. 替换 Common 页面的加载样式
  - [x] 4.1 替换 `src/pages/index/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_
  - [x] 4.2 替换 `src/pages/common/notifications/index.tsx` 的加载样式
    - 将自定义加载 UI 改为 showLoading/hideLoading API
    - _Requirements: 1.1, 4.3_

- [x] 5. Checkpoint - 验证所有修改
  - Ensure all tests pass, ask the user if questions arise.
