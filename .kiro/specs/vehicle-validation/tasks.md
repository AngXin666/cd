# Implementation Plan: Vehicle Validation Testing

## Overview

为车辆验证模块 (`utils/vehicle.ts`) 创建属性测试，验证 5 个核心函数的正确性。使用 Vitest + fast-check 进行属性测试。

## Tasks

- [x] 1. 创建车辆验证属性测试文件
  - 创建 `fleet-manager/frontend/src/utils/__tests__/vehicle.pbt.test.ts`
  - 设置测试框架和导入
  - 定义车辆数据生成器
  - _Requirements: 1.1-1.6, 2.1-2.4, 3.1-3.4, 4.1-4.4, 5.1-5.3_

- [x] 1.1 定义测试数据生成器
  - 创建有效车牌号生成器（非空、非纯空白）
  - 创建无效车牌号生成器（空字符串、纯空白）
  - 创建有效状态生成器（ACTIVE、PICKED_UP）
  - 创建无效状态生成器（RETURNED、REVIEWING）
  - 创建完整车辆对象生成器
  - _Requirements: 1.1-1.6_

- [x] 1.2 实现 isValidVehicle 属性测试
  - **Property 1: 有效车辆判断正确性**
  - **Property 2: 无效车牌必定无效**
  - **Property 3: 无效状态必定无效**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 1.3 实现 canReturnVehicle 属性测试
  - **Property 4: 可还车条件完整性**
  - **Property 5: 无效车辆不可还车**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 1.4 实现 isActiveVehicle 属性测试
  - **Property 6: 活跃车辆判断正确性**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 1.5 实现 getValidVehicles 属性测试
  - **Property 7: 有效车辆列表过滤正确性**
  - **Property 8: 过滤不增加元素**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 1.6 实现 getValidPlateNumbers 属性测试
  - **Property 9: 车牌号列表一致性**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 2. 运行测试并验证
  - 执行 `npm run test` 运行所有测试
  - 确保所有属性测试通过
  - 检查测试覆盖率

## Notes

- 测试文件位置: `fleet-manager/frontend/src/utils/__tests__/vehicle.pbt.test.ts`
- 使用 fast-check 进行属性测试，每个属性运行 100 次迭代
- 测试不需要 mock，直接测试纯函数逻辑

