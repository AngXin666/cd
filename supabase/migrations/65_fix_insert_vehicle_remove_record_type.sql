/*
# 修复 insert_vehicle 触发器 - 移除 record_type 字段引用

## 问题
- insert_vehicle() 函数尝试访问 NEW.record_type
- 但 vehicles 视图中没有 record_type 字段
- 导致错误: record "new" has no field "record_type"

## 修复
- 移除对 NEW.record_type 的引用
- record_type 应该根据 pickup_time 和 return_time 自动判断
- 如果有 return_time 则为 'return'，否则为 'pickup'
*/

CREATE OR REPLACE FUNCTION public.insert_vehicle()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_base_id UUID;
  v_record_id UUID;
BEGIN
  -- 1. 检查vehicles_base中是否已存在该车牌号
  SELECT id INTO v_base_id
  FROM vehicles_base
  WHERE plate_number = NEW.plate_number;

  -- 2. 如果不存在，插入vehicles_base
  IF v_base_id IS NULL THEN
    INSERT INTO vehicles_base (
      plate_number,
      vehicle_type,
      brand,
      model,
      color,
      vin,
      owner_name,
      use_character,
      register_date,
      engine_number,
      ownership_type,
      lessor_name,
      lessor_contact,
      lessee_name,
      lessee_contact,
      monthly_rent,
      lease_start_date,
      lease_end_date,
      rent_payment_day
    ) VALUES (
      NEW.plate_number,
      NEW.vehicle_type,
      NEW.brand,
      NEW.model,
      NEW.color,
      NEW.vin,
      NEW.owner_name,
      NEW.use_character,
      NEW.register_date,
      NEW.engine_number,
      NEW.ownership_type,
      NEW.lessor_name,
      NEW.lessor_contact,
      NEW.lessee_name,
      NEW.lessee_contact,
      NEW.monthly_rent,
      NEW.lease_start_date,
      NEW.lease_end_date,
      NEW.rent_payment_day
    )
    RETURNING id INTO v_base_id;
  END IF;

  -- 3. 插入vehicle_records（移除 record_type 引用）
  INSERT INTO vehicle_records (
    vehicle_id,
    plate_number,
    driver_id,
    warehouse_id,
    record_type,  -- 根据 return_time 自动判断
    notes,
    issue_date,
    archive_number,
    total_mass,
    approved_passengers,
    curb_weight,
    approved_load,
    overall_dimension_length,
    overall_dimension_width,
    overall_dimension_height,
    inspection_valid_until,
    inspection_date,
    mandatory_scrap_date,
    left_front_photo,
    right_front_photo,
    left_rear_photo,
    right_rear_photo,
    dashboard_photo,
    rear_door_photo,
    cargo_box_photo,
    driving_license_main_photo,
    driving_license_sub_photo,
    driving_license_sub_back_photo,
    pickup_time,
    return_time,
    pickup_photos,
    return_photos,
    registration_photos,
    damage_photos,
    review_status,
    review_notes,
    reviewed_at,
    reviewed_by,
    required_photos,
    locked_photos
  ) VALUES (
    v_base_id,
    NEW.plate_number,
    NEW.user_id,
    NEW.warehouse_id,
    CASE WHEN NEW.return_time IS NOT NULL THEN 'return' ELSE 'pickup' END,  -- 自动判断
    NEW.notes,
    NEW.issue_date,
    NEW.archive_number,
    NEW.total_mass,
    NEW.approved_passengers,
    NEW.curb_weight,
    NEW.approved_load,
    NEW.overall_dimension_length,
    NEW.overall_dimension_width,
    NEW.overall_dimension_height,
    NEW.inspection_valid_until,
    NEW.inspection_date,
    NEW.mandatory_scrap_date,
    NEW.left_front_photo,
    NEW.right_front_photo,
    NEW.left_rear_photo,
    NEW.right_rear_photo,
    NEW.dashboard_photo,
    NEW.rear_door_photo,
    NEW.cargo_box_photo,
    NEW.driving_license_main_photo,
    NEW.driving_license_sub_photo,
    NEW.driving_license_sub_back_photo,
    NEW.pickup_time,
    NEW.return_time,
    NEW.pickup_photos,
    NEW.return_photos,
    NEW.registration_photos,
    NEW.damage_photos,
    COALESCE(NEW.review_status, 'drafting'),
    NEW.review_notes,
    NEW.reviewed_at,
    NEW.reviewed_by,
    COALESCE(NEW.required_photos, ARRAY[]::text[]),
    NEW.locked_photos
  )
  RETURNING id INTO v_record_id;

  -- 4. 返回插入的记录（通过视图查询）
  SELECT * INTO NEW
  FROM vehicles
  WHERE id = v_record_id;

  RETURN NEW;
END;
$function$;
