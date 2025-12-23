/*
# 添加仓库分配和司机类型变更的通知类型

## 新增通知类型
- `warehouse_assigned` - 仓库分配（司机被分配到新仓库）
- `warehouse_unassigned` - 仓库取消分配（司机被取消仓库分配）
- `driver_type_changed` - 司机类型变更（司机类型被修改）

## 使用场景
1. 仓库分配/取消：
   - 司机被分配到新仓库 → 通知司机
   - 司机被取消仓库分配 → 通知司机
   - 普通管理员操作 → 同时通知超级管理员
   - 超级管理员操作 → 通知该仓库的普通管理员

2. 司机类型变更：
   - 司机类型被修改 → 通知司机
   - 普通管理员操作 → 同时通知超级管理员
   - 超级管理员操作 → 通知管辖该司机的普通管理员

## 影响
- 添加 3 个新的枚举值到 notification_type
- 不影响现有的通知功能
*/

-- 添加仓库和司机类型相关的通知类型
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'warehouse_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'warehouse_unassigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'driver_type_changed';

-- 验证枚举值已添加
COMMENT ON TYPE notification_type IS '通知类型枚举 - 包含仓库分配和司机类型变更相关类型';
