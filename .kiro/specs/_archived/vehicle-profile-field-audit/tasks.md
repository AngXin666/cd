# Implementation Plan

## 车辆管理与个人信息字段完整性审计

- [x] 1. 审计 TypeScript 类型定义
  - [x] 1.1 检查 Vehicle 接口与 vehicles 表字段一致性
    - 对比 `src/db/types.ts` 中的 Vehicle 接口与数据库 vehicles 表结构
    - 记录缺失或多余的字段
    - _Requirements: 1.1_
  - [x] 1.2 检查 VehicleDocument 接口与 vehicle_documents 表字段一致性
    - 对比 VehicleDocument 接口与数据库 vehicle_documents 表结构
    - 确保所有 46 个扩展字段都有定义
    - _Requirements: 1.2_
  - [x] 1.3 检查 DriverLicense 接口与 driver_licenses 表字段一致性
    - 对比 DriverLicense 接口与数据库 driver_licenses 表结构
    - 确保身份证和驾驶证字段完整
    - _Requirements: 3.1, 3.2_
  - [x] 1.4 检查 Profile 接口与 users 表字段一致性
    - 对比 Profile 接口与数据库 users 表结构
    - 确保基本信息、扩展字段、紧急联系人字段完整
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 1.5 修复发现的类型定义问题
    - 添加缺失的字段定义
    - 修正字段类型不匹配
    - 更新可选性标记
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 审计 API 层字段映射
  - [x] 2.1 检查 insertVehicle 函数字段映射
    - 确保所有 VehicleInput 字段都被正确映射到 vehicles 和 vehicle_documents 表
    - 检查核心字段和扩展字段的分离逻辑
    - _Requirements: 5.1_
  - [x] 2.2 检查 updateVehicle 函数字段映射
    - 确保所有 VehicleUpdate 字段都被正确映射
    - _Requirements: 5.2_
  - [x] 2.3 检查 getDriverVehicles 函数字段平铺逻辑
    - 确保从 vehicle_documents 获取的字段被正确平铺到 Vehicle 对象
    - 验证优先级规则：vehicle_documents 优先于 vehicles
    - _Requirements: 5.3_
  - [x] 2.4 检查 getVehicleById 函数字段平铺逻辑
    - 确保返回的 VehicleWithDocuments 对象包含所有必要字段
    - _Requirements: 5.4_
  - [x] 2.5 修复发现的字段映射问题
    - 添加缺失的字段映射
    - 修正字段平铺逻辑
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2.6 编写属性测试：车辆数据 Round-Trip 一致性
  - **Property 1: 车辆数据 Round-Trip 一致性**
  - **Validates: Requirements 5.1, 5.3, 5.4**
  - 使用 fast-check 生成随机 VehicleInput
  - 验证插入后查询返回的数据与输入一致

- [x] 3. 审计驾驶证相关功能
  - [x] 3.1 检查 upsertDriverLicense 函数字段映射
    - 确保所有 DriverLicenseInput 字段都被正确保存
    - _Requirements: 3.3_
  - [x] 3.2 检查 getDriverLicense 函数返回字段
    - 确保返回的 DriverLicense 对象包含所有字段
    - _Requirements: 3.1, 3.2_
  - [x] 3.3 修复发现的驾驶证字段问题
    - 添加缺失的字段映射
    - 确保身份证地址、驾驶证照片等关键字段正确保存
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.4 编写属性测试：驾驶证数据 Round-Trip 一致性
  - **Property 2: 驾驶证数据 Round-Trip 一致性**
  - **Validates: Requirements 3.3, 5.1**
  - 使用 fast-check 生成随机 DriverLicenseInput
  - 验证插入后查询返回的数据与输入一致

- [x] 4. 审计用户资料相关功能
  - [x] 4.1 检查 convertUserToProfile 函数字段映射
    - 确保所有 Profile 字段都被正确转换
    - 检查扩展字段是否被遗漏
    - _Requirements: 4.1, 4.4_
  - [x] 4.2 检查 getCurrentUserProfile 函数返回字段
    - 确保返回的 Profile 对象包含所有必要字段
    - _Requirements: 4.1_
  - [x] 4.3 修复发现的用户资料字段问题
    - 更新 convertUserToProfile 函数
    - 添加缺失的字段映射
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4.4 编写属性测试：Profile 转换完整性
  - **Property 5: Profile 转换完整性**
  - **Validates: Requirements 4.1, 4.4**
  - 验证 convertUserToProfile 返回的对象包含所有必要字段

- [x] 5. 审计数组字段处理
  - [x] 5.1 检查照片数组字段的序列化和反序列化
    - 验证 pickup_photos, return_photos, registration_photos, damage_photos 的处理
    - 确保数组类型在 TypeScript、API 和数据库中一致
    - _Requirements: 8.1_
  - [x] 5.2 检查 null 值和空数组的处理
    - 确保从数据库读取时正确处理 null 值
    - 确保空数组不会被错误转换
    - _Requirements: 8.2_
  - [x] 5.3 修复发现的数组处理问题
    - 统一数组处理逻辑
    - 确保 null 和空数组的正确处理
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 5.4 编写属性测试：照片数组字段 Round-Trip 一致性
  - **Property 3: 照片数组字段 Round-Trip 一致性**
  - **Validates: Requirements 8.1, 8.3**
  - 使用 fast-check 生成随机照片数组
  - 验证插入后查询返回的数组与输入一致

- [x] 6. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. 审计前端页面字段使用
  - [x] 7.1 检查车辆列表页面字段使用
    - 验证 `src/pages/driver/vehicle-list/index.tsx` 正确显示车辆照片和基本信息
    - _Requirements: 7.1_
  - [x] 7.2 检查添加车辆页面字段收集
    - 验证 `src/pages/driver/add-vehicle/index.tsx` 正确收集和提交所有必要字段
    - _Requirements: 7.3_
  - [x] 7.3 检查司机个人信息页面字段显示
    - 验证 `src/pages/manager/driver-profile/index.tsx` 正确显示身份证和驾驶证信息
    - 验证 `src/pages/driver/profile/index.tsx` 正确显示个人信息
    - _Requirements: 7.4_
  - [x] 7.4 修复发现的前端字段使用问题
    - 添加缺失的字段显示
    - 修正字段绑定错误
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. 审计数据库迁移文件
  - [x] 8.1 检查 vehicles 表结构完整性
    - 验证所有代码中使用的字段都在数据库中定义
    - _Requirements: 6.1_
  - [x] 8.2 检查 vehicle_documents 表结构完整性
    - 验证所有扩展字段都在数据库中定义
    - 参考 `00634_fix_vehicle_documents_structure.sql`
    - _Requirements: 6.2_
  - [x] 8.3 检查 driver_licenses 表结构完整性
    - 验证所有驾驶证相关字段都在数据库中定义
    - 参考 `00635_fix_driver_licenses_fields.sql`
    - _Requirements: 6.3_
  - [x] 8.4 检查 users 表结构完整性
    - 验证所有用户资料字段都在数据库中定义
    - _Requirements: 6.4_
  - [x] 8.5 创建缺失字段的迁移脚本（如需要）
    - 为发现的缺失字段创建迁移脚本
    - 使用幂等性语法确保可重复执行
    - _Requirements: 6.5_

- [x] 8.6 编写属性测试：字段平铺完整性
  - **Property 4: 字段平铺完整性**
  - **Validates: Requirements 5.3, 5.4**
  - 验证 getDriverVehicles 和 getVehicleById 返回的对象包含所有 vehicle_documents 字段

- [x] 9. 审计字段命名一致性
  - [x] 9.1 检查照片字段命名一致性
    - 确保前端、API 和数据库使用相同的字段名
    - _Requirements: 10.1_
  - [x] 9.2 检查时间字段命名一致性
    - 确保 pickup_time, return_time 等字段命名一致
    - _Requirements: 10.2_
  - [x] 9.3 检查审核字段命名一致性
    - 确保 review_status, reviewed_at, reviewed_by 等字段命名一致
    - _Requirements: 10.3_
  - [x] 9.4 修复发现的命名不一致问题
    - 统一字段命名
    - 更新相关代码
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. 生成审计报告
  - [x] 10.1 汇总所有发现的问题
    - 记录类型定义问题
    - 记录字段映射问题
    - 记录数据库结构问题
    - _Requirements: 1.5_
  - [x] 10.2 记录所有修复措施
    - 记录修改的文件和内容
    - 记录创建的迁移脚本
    - _Requirements: 1.5_

- [x] 11. Final Checkpoint - 确保所有测试通过
  - ✅ 所有 63 个测试用例通过（4 个测试文件）
  - ✅ TypeScript 类型检查完成（仅有 3 个图片导入类型声明问题，与审计任务无关）
  - Ensure all tests pass, ask the user if questions arise.
