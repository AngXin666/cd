/*
# 修复 vehicles 视图插入触发器的返回值问题

## 问题
- 错误信息: "subquery must return only one column"
- 错误代码: 42601 (PostgreSQL 语法错误)
- 原因: RETURN 语句中的子查询返回了多列，但应该返回一个记录对象

## 解决方案
- 使用 SELECT INTO 将查询结果存储到变量中
- 然后返回该变量
- 或者直接构造返回记录
*/

-- 修复插入触发器函数
CREATE OR REPLACE FUNCTION insert_vehicle_via_view()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_base_id UUID;
  v_vehicle_record_id UUID;
  v_result RECORD;
BEGIN
  -- 1. 获取或创建车辆基本信息
  SELECT id INTO v_vehicle_base_id
  FROM vehicles_base
  WHERE plate_number = NEW.plate_number;
  
  -- 如果车辆不存在,创建新的车辆基本信息
  IF v_vehicle_base_id IS NULL THEN
    INSERT INTO vehicles_base (
      plate_number,
      brand,
      model,
      color,
      vin,
      vehicle_type,
      owner_name,
      use_character,
      register_date,
      engine_number
    ) VALUES (
      NEW.plate_number,
      NEW.brand,
      NEW.model,
      NEW.color,
      NEW.vin,
      NEW.vehicle_type,
      NEW.owner_name,
      NEW.use_character,
      NEW.register_date,
      NEW.engine_number
    )
    RETURNING id INTO v_vehicle_base_id;
  END IF;
  
  -- 2. 创建车辆录入记录
  INSERT INTO vehicle_records (
    vehicle_id,
    plate_number,
    driver_id,
    warehouse_id,
    record_type,
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
    pickup_photos,
    return_photos,
    registration_photos,
    damage_photos,
    review_status,
    locked_photos,
    required_photos,
    review_notes,
    reviewed_at,
    reviewed_by,
    pickup_time,
    return_time,
    recorded_at,
    notes
  ) VALUES (
    v_vehicle_base_id,
    NEW.plate_number,
    NEW.user_id,
    NEW.warehouse_id,
    CASE WHEN NEW.return_time IS NOT NULL THEN 'return' ELSE 'pickup' END,
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
    NEW.pickup_photos,
    NEW.return_photos,
    NEW.registration_photos,
    NEW.damage_photos,
    NEW.review_status,
    NEW.locked_photos,
    NEW.required_photos,
    NEW.review_notes,
    NEW.reviewed_at,
    NEW.reviewed_by,
    NEW.pickup_time,
    NEW.return_time,
    COALESCE(NEW.pickup_time, NOW()),
    NEW.notes
  )
  RETURNING id INTO v_vehicle_record_id;
  
  -- 3. 查询并返回新创建的记录
  SELECT * INTO v_result
  FROM vehicles 
  WHERE id = v_vehicle_record_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON FUNCTION insert_vehicle_via_view() IS '视图插入触发器:自动将插入操作转换为对 vehicles_base 和 vehicle_records 的插入（已修复返回值问题）';
