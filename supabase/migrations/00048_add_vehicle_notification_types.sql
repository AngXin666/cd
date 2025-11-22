/*
# 添加车辆审核相关的通知类型

## 问题描述
触发器函数 `send_vehicle_review_notifications()` 使用了以下通知类型：
- `vehicle_review_pending` - 车辆待审核
- `vehicle_review_approved` - 车辆审核通过
- `vehicle_review_need_supplement` - 车辆需要补录

但这些值在 `notification_type` 枚举中不存在，导致插入通知时报错：
```
invalid input value for enum notification_type: "vehicle_review_pending"
```

## 解决方案
向 `notification_type` 枚举添加缺失的车辆审核相关类型。

## 影响
- 添加 3 个新的枚举值到 notification_type
- 不影响现有的通知功能
- 使车辆审核通知功能正常工作
*/

-- 添加车辆审核相关的通知类型
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vehicle_review_pending';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vehicle_review_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vehicle_review_need_supplement';

-- 验证枚举值已添加
COMMENT ON TYPE notification_type IS '通知类型枚举 - 包含车辆审核相关类型';
