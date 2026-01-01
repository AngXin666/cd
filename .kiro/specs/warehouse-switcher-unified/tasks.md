# Implementation Plan: 统一仓库切换器逻辑

## Overview

创建统一的仓库过滤工具函数，然后逐步重构各页面使用这些工具函数，最后清理冗余代码。

## Tasks

- [x] 1. 创建仓库过滤工具函数
  - [x] 1.1 创建 `utils/warehouse.ts` 文件
    - 定义 `WarehouseFilterOptions` 接口
    - 实现 `filterWarehousesWithData` 函数
    - 实现 `filterWarehousesWithDrivers` 函数
    - 实现 `filterWarehousesWithDataOrDrivers` 函数
    - 实现 `shouldShowWarehouseSwitcher` 函数
    - 实现 `getWarehouseDriverCount` 函数
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 1.2 编写属性测试
    - **Property 1: 仓库切换器显示条件正确性**
    - **Property 2: 有数据仓库过滤正确性**
    - **Property 3: 有司机仓库过滤正确性**
    - **Property 4: 有数据或司机仓库过滤正确性**
    - **Validates: Requirements 1.1-1.3, 2.1-2.3, 3.1-3.4, 5.1-5.2**

- [x] 2. Checkpoint - 确保工具函数测试通过
  - 运行测试确保所有属性测试通过
  - 如有问题请询问用户

- [x] 3. 重构老板端用户管理页面
  - [x] 3.1 重构 `/pages/boss/users/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithDrivers` 过滤仓库
    - 使用 `shouldShowWarehouseSwitcher` 判断显示
    - 移除原有的 `warehouseOptions` 计算属性中的冗余逻辑
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. 重构车队长端司机管理页面
  - [x] 4.1 重构 `/pages/manager/drivers/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithDrivers` 过滤仓库
    - 使用 `shouldShowWarehouseSwitcher` 判断显示
    - _Requirements: 5.1, 5.2_

- [x] 5. 重构司机端首页
  - [x] 5.1 重构 `/pages/driver/index/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithData` 过滤仓库
    - 使用 `shouldShowWarehouseSwitcher` 判断显示
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. 重构司机端计件记录页面
  - [x] 6.1 重构 `/pages/driver/piece-work/list.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithData` 过滤仓库选项
    - _Requirements: 2.1_

- [x] 7. 重构车队长端首页
  - [x] 7.1 重构 `/pages/manager/index/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithDataOrDrivers` 过滤仓库
    - 传递过滤后的仓库给 WarehouseSwitcher 组件
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. 重构老板端首页
  - [x] 8.1 重构 `/pages/boss/index/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithDataOrDrivers` 过滤仓库
    - 传递过滤后的仓库给 WarehouseSwitcher 组件
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. 重构老板端考勤管理页面
  - [x] 9.1 重构 `/pages/boss/attendance/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithDataOrDrivers` 过滤仓库
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10. 重构车队长端数据统计页面
  - [x] 10.1 重构 `/pages/manager/stats/index.vue`
    - 导入工具函数
    - 使用 `filterWarehousesWithData` 过滤仓库选项
    - _Requirements: 2.1_

- [x] 11. 清理冗余代码
  - [x] 11.1 清理各页面中重复的仓库过滤逻辑
    - 移除不再使用的本地过滤函数
    - 移除不再使用的计算属性
    - 确保导入语句整洁
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Final Checkpoint - 构建并验证
  - 运行 `npm run build:h5` 确保构建成功
  - 手动测试各页面仓库切换器行为
  - 确保所有测试通过

## Notes

- 任务按依赖顺序排列，先创建工具函数，再逐步重构各页面
- 每个页面重构后应立即测试，确保功能正常
- 清理冗余代码时要小心，确保不破坏现有功能
