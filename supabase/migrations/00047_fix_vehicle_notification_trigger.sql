/*
# 修复车辆审核通知触发器中的字段引用

## 问题
触发器函数 send_vehicle_review_notifications() 中使用了已删除的 license_plate 字段：
`COALESCE(v.plate_number, v.license_plate)`

## 解决方案
更新函数，只使用 plate_number 字段。

## 影响
- 更新 send_vehicle_review_notifications() 函数
- 不影响触发器的功能逻辑
*/

-- 重新创建通知发送函数
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
    v.plate_number,  -- 只使用 plate_number 字段
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

-- 注释：触发器本身不需要重新创建，因为它只是调用函数
COMMENT ON FUNCTION send_vehicle_review_notifications() IS '车辆审核通知触发器函数 - 已更新为使用 plate_number 字段';
