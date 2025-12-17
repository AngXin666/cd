# Implementation Plan

- [x] 1. 修复仓库分配通知逻辑
  - [x] 1.1 修改 handleSaveWarehouseAssignment 函数，添加角色判断
    - 在发送通知给相关车队长之前，检查目标用户是否为司机
    - 如果目标用户是车队长或管理员，不发送通知给其他车队长
    - 文件：`src/pages/super-admin/user-management/index.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 修复权限配置跳转问题
  - [x] 2.1 修改 handleConfigPermission 函数，添加 userRole 参数
    - 在跳转 URL 中添加 `userRole=${targetUser.role}` 参数
    - 文件：`src/pages/super-admin/user-management/index.tsx`
    - _Requirements: 2.1, 2.2_

- [x] 3. 修改权限配置页面按钮文字
  - [x] 3.1 将保存按钮文字统一改为"变更权限"
    - 移除根据 currentPermission 状态切换文字的逻辑
    - 文件：`src/pages/super-admin/permission-config/index.tsx`
    - _Requirements: 3.1, 3.2_

- [x] 4. 本地测试验证
  - [x] 4.1 构建 H5 并启动本地服务器测试
    - 验证车队长仓库分配时司机不会收到通知
    - 验证权限配置按钮能正常跳转
    - 验证按钮文字显示为"变更权限"
