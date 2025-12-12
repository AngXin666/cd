/*
# 添加 vehicles 视图的更新触发器

## 问题
- 尝试更新 vehicles 视图时失败
- 错误：cannot update view "vehicles"
- 原因：vehicles 是一个复杂视图（连接多个表），PostgreSQL 不允许直接更新

## 解决方案
- 创建 INSTEAD OF UPDATE 触发器
- 将更新操作分发到正确的底层表
- vehicles_base 表的字段更新到 vehicles_base
- vehicle_records 表的字段更新到 vehicle_records

## 更新逻辑
1. 更新 vehicles_base 表（车辆基本信息）
2. 更新 vehicle_records 表（车辆记录信息）
*/

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION public.update_vehicle()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_base_id UUID;
BEGIN
  -- 1. 获取车辆基本信息ID
  SELECT vehicle_id INTO v_base_id
  FROM vehicle_records
  WHERE id = NEW.id;

  -- 2. 更新 vehicles_base 表（如果字段被修改）
  IF v_base_id IS NOT NULL THEN
    UPDATE vehicles_base
    SET
      plate_number = COALESCE(NEW.plate_number, plate_number),
      vehicle_type = COALESCE(NEW.vehicle_type, vehicle_type),
      brand = COALESCE(NEW.brand, brand),
      model = COALESCE(NEW.model, model),
      color = COALESCE(NEW.color, color),
      vin = COALESCE(NEW.vin, vin),
      owner_name = COALESCE(NEW.owner_name, owner_name),
      use_character = COALESCE(NEW.use_character, use_character),
      register_date = COALESCE(NEW.register_date, register_date),
      engine_number = COALESCE(NEW.engine_number, engine_number),
      ownership_type = COALESCE(NEW.ownership_type, ownership_type),
      lessor_name = COALESCE(NEW.lessor_name, lessor_name),
      lessor_contact = COALESCE(NEW.lessor_contact, lessor_contact),
      lessee_name = COALESCE(NEW.lessee_name, lessee_name),
      lessee_contact = COALESCE(NEW.lessee_contact, lessee_contact),
      monthly_rent = COALESCE(NEW.monthly_rent, monthly_rent),
      lease_start_date = COALESCE(NEW.lease_start_date, lease_start_date),
      lease_end_date = COALESCE(NEW.lease_end_date, lease_end_date),
      rent_payment_day = COALESCE(NEW.rent_payment_day, rent_payment_day),
      updated_at = now()
    WHERE id = v_base_id;
  END IF;

  -- 3. 更新 vehicle_records 表
  UPDATE vehicle_records
  SET
    driver_id = COALESCE(NEW.user_id, driver_id),
    warehouse_id = COALESCE(NEW.warehouse_id, warehouse_id),
    notes = COALESCE(NEW.notes, notes),
    issue_date = COALESCE(NEW.issue_date, issue_date),
    archive_number = COALESCE(NEW.archive_number, archive_number),
    total_mass = COALESCE(NEW.total_mass, total_mass),
    approved_passengers = COALESCE(NEW.approved_passengers, approved_passengers),
    curb_weight = COALESCE(NEW.curb_weight, curb_weight),
    approved_load = COALESCE(NEW.approved_load, approved_load),
    overall_dimension_length = COALESCE(NEW.overall_dimension_length, overall_dimension_length),
    overall_dimension_width = COALESCE(NEW.overall_dimension_width, overall_dimension_width),
    overall_dimension_height = COALESCE(NEW.overall_dimension_height, overall_dimension_height),
    inspection_valid_until = COALESCE(NEW.inspection_valid_until, inspection_valid_until),
    inspection_date = COALESCE(NEW.inspection_date, inspection_date),
    mandatory_scrap_date = COALESCE(NEW.mandatory_scrap_date, mandatory_scrap_date),
    left_front_photo = COALESCE(NEW.left_front_photo, left_front_photo),
    right_front_photo = COALESCE(NEW.right_front_photo, right_front_photo),
    left_rear_photo = COALESCE(NEW.left_rear_photo, left_rear_photo),
    right_rear_photo = COALESCE(NEW.right_rear_photo, right_rear_photo),
    dashboard_photo = COALESCE(NEW.dashboard_photo, dashboard_photo),
    rear_door_photo = COALESCE(NEW.rear_door_photo, rear_door_photo),
    cargo_box_photo = COALESCE(NEW.cargo_box_photo, cargo_box_photo),
    driving_license_main_photo = COALESCE(NEW.driving_license_main_photo, driving_license_main_photo),
    driving_license_sub_photo = COALESCE(NEW.driving_license_sub_photo, driving_license_sub_photo),
    driving_license_sub_back_photo = COALESCE(NEW.driving_license_sub_back_photo, driving_license_sub_back_photo),
    pickup_time = COALESCE(NEW.pickup_time, pickup_time),
    return_time = COALESCE(NEW.return_time, return_time),
    pickup_photos = COALESCE(NEW.pickup_photos, pickup_photos),
    return_photos = COALESCE(NEW.return_photos, return_photos),
    registration_photos = COALESCE(NEW.registration_photos, registration_photos),
    damage_photos = COALESCE(NEW.damage_photos, damage_photos),
    review_status = COALESCE(NEW.review_status, review_status),
    review_notes = COALESCE(NEW.review_notes, review_notes),
    reviewed_at = COALESCE(NEW.reviewed_at, reviewed_at),
    reviewed_by = COALESCE(NEW.reviewed_by, reviewed_by),
    required_photos = COALESCE(NEW.required_photos, required_photos),
    locked_photos = COALESCE(NEW.locked_photos, locked_photos),
    updated_at = now()
  WHERE id = NEW.id;

  -- 4. 返回更新后的记录
  SELECT * INTO NEW
  FROM vehicles
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

-- 创建 INSTEAD OF UPDATE 触发器
DROP TRIGGER IF EXISTS vehicles_update_trigger ON vehicles;
CREATE TRIGGER vehicles_update_trigger
  INSTEAD OF UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle();
