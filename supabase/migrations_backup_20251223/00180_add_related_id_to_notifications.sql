/*
# 添加 related_id 字段到通知表

## 变更说明
添加 `related_id` 字段到通知表，用于关联通知到具体的业务对象（如请假申请、车辆审核等）。

## 变更内容
1. 添加 `related_id` 字段（可选，uuid 类型）
2. 为 `related_id` 创建索引，提高查询效率

## 影响范围
- 通知表增加一个可选字段
- 不影响现有数据和功能
- 支持通知关联到具体业务对象
*/

-- 添加 related_id 字段
ALTER TABLE notifications 
ADD COLUMN related_id uuid;

-- 为 related_id 创建索引
CREATE INDEX idx_notifications_related_id ON notifications(related_id);

-- 添加字段注释
COMMENT ON COLUMN notifications.related_id IS '关联的业务对象ID（如请假申请ID、车辆审核ID等）';
