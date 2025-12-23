/*
# 创建车辆审核通知触发器

## 功能说明
自动为车辆审核流程创建通知：
1. 司机提交审核时 -> 通知所有管理员和超级管理员
2. 审核通过时 -> 通知司机，并通知其他管理员
3. 需补录时 -> 仅通知司机

## 通知规则
- 首次提交审核：通知所有管理员与超级管理员
- 审核通过：
  - 通知司机
  - 如果是普通管理员审核：额外通知超级管理员
  - 如果是超级管理员审核：额外通知管辖该仓库的普通管理员
- 需补录：仅通知司机

## 触发器
- trigger_vehicle_review_notifications: 监听 vehicles 表的 review_status 变化
*/

-- 创建通知发送函数
CREATE OR REPLACE FUNCTION send_vehicle_review_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id uuid;
  v_driver_name text;
  v_license_plate text;
  v_reviewer_id uuid;
  v_reviewer_role user_role;
  v_warehouse_id uuid;
  v_manager_id uuid;
  v_admin_id uuid;
BEGIN
  -- 获取车辆相关信息
  SELECT 
    COALESCE(v.user_id, v.driver_id),
    p.name,
    COALESCE(v.plate_number, v.license_plate),
    v.reviewed_by,
    v.warehouse_id
  INTO 
    v_driver_id,
    v_driver_name,
    v_license_plate,
    v_reviewer_id,
    v_warehouse_id
  FROM vehicles v
  LEFT JOIN profiles p ON p.id = COALESCE(v.user_id, v.driver_id)
  WHERE v.id = NEW.id;

  -- 获取审核人角色
  IF v_reviewer_id IS NOT NULL THEN
    SELECT role INTO v_reviewer_role
    FROM profiles
    WHERE id = v_reviewer_id;
  END IF;

  -- 场景1: 司机提交审核（pending_review）
  IF NEW.review_status = 'pending_review' AND (OLD.review_status IS NULL OR OLD.review_status != 'pending_review') THEN
    -- 通知所有管理员
    FOR v_manager_id IN 
      SELECT id FROM profiles WHERE role = 'manager'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        v_manager_id,
        'vehicle_review_pending',
        '新车辆待审核',
        '司机 ' || COALESCE(v_driver_name, '未知') || ' 提交了车辆 ' || COALESCE(v_license_plate, '未知车牌') || ' 的审核申请',
        NEW.id
      );
    END LOOP;

    -- 通知所有超级管理员
    FOR v_admin_id IN 
      SELECT id FROM profiles WHERE role = 'super_admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        v_admin_id,
        'vehicle_review_pending',
        '新车辆待审核',
        '司机 ' || COALESCE(v_driver_name, '未知') || ' 提交了车辆 ' || COALESCE(v_license_plate, '未知车牌') || ' 的审核申请',
        NEW.id
      );
    END LOOP;

  -- 场景2: 审核通过（approved）
  ELSIF NEW.review_status = 'approved' AND (OLD.review_status IS NULL OR OLD.review_status != 'approved') THEN
    -- 通知司机
    IF v_driver_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        v_driver_id,
        'vehicle_review_approved',
        '车辆审核已通过',
        '您的车辆 ' || COALESCE(v_license_plate, '未知车牌') || ' 已通过审核',
        NEW.id
      );
    END IF;

    -- 如果是普通管理员审核，通知所有超级管理员
    IF v_reviewer_role = 'manager' THEN
      FOR v_admin_id IN 
        SELECT id FROM profiles WHERE role = 'super_admin'
      LOOP
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (
          v_admin_id,
          'vehicle_review_approved',
          '车辆审核动态',
          '管理员已通过车辆 ' || COALESCE(v_license_plate, '未知车牌') || ' 的审核',
          NEW.id
        );
      END LOOP;
    END IF;

    -- 如果是超级管理员审核，通知管辖该仓库的普通管理员
    IF v_reviewer_role = 'super_admin' AND v_warehouse_id IS NOT NULL THEN
      FOR v_manager_id IN 
        SELECT DISTINCT mw.manager_id
        FROM manager_warehouses mw
        INNER JOIN profiles p ON p.id = mw.manager_id
        WHERE mw.warehouse_id = v_warehouse_id
        AND p.role = 'manager'
      LOOP
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (
          v_manager_id,
          'vehicle_review_approved',
          '车辆审核动态',
          '超级管理员已通过车辆 ' || COALESCE(v_license_plate, '未知车牌') || ' 的审核',
          NEW.id
        );
      END LOOP;
    END IF;

  -- 场景3: 需补录（need_supplement）
  ELSIF NEW.review_status = 'need_supplement' AND (OLD.review_status IS NULL OR OLD.review_status != 'need_supplement') THEN
    -- 仅通知司机
    IF v_driver_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        v_driver_id,
        'vehicle_review_need_supplement',
        '车辆信息需补录',
        '您的车辆 ' || COALESCE(v_license_plate, '未知车牌') || ' 需要补录信息，请重新提交。原因：' || COALESCE(NEW.review_notes, '无'),
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_vehicle_review_notifications ON vehicles;
CREATE TRIGGER trigger_vehicle_review_notifications
AFTER INSERT OR UPDATE OF review_status
ON vehicles
FOR EACH ROW
EXECUTE FUNCTION send_vehicle_review_notifications();
