/*
# 使 vehicles 视图可插入

## 问题
- vehicles 视图是只读的,无法插入数据
- 旧代码仍在使用 insertVehicle API 向 vehicles 表插入数据
- 导致错误: "cannot insert into view 'vehicles'"

## 解决方案
- 创建 INSTEAD OF INSERT 触发器
- 自动将插入操作转换为对 vehicles_base 和 vehicle_records 的插入
- 保持向后兼容性

## 触发器逻辑
1. 检查车辆基本信息是否存在(根据车牌号)
2. 如果不存在,创建 vehicles_base 记录
3. 创建 vehicle_records 记录
4. 返回新创建的记录
*/

-- 创建插入触发器函数
CREATE OR REPLACE FUNCTION insert_vehicle_via_view()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_base_id UUID;
  v_vehicle_record_id UUID;
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
  
  -- 3. 返回新创建的记录(通过视图查询)
  RETURN (
    SELECT * FROM vehicles WHERE id = v_vehicle_record_id
  );
END;
$$ LANGUAGE plpgsql;

-- 创建 INSTEAD OF INSERT 触发器
DROP TRIGGER IF EXISTS instead_of_insert_vehicles ON vehicles;
CREATE TRIGGER instead_of_insert_vehicles
  INSTEAD OF INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION insert_vehicle_via_view();

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_vehicle_via_view()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新 vehicle_records 表
  UPDATE vehicle_records SET
    warehouse_id = NEW.warehouse_id,
    issue_date = NEW.issue_date,
    archive_number = NEW.archive_number,
    total_mass = NEW.total_mass,
    approved_passengers = NEW.approved_passengers,
    curb_weight = NEW.curb_weight,
    approved_load = NEW.approved_load,
    overall_dimension_length = NEW.overall_dimension_length,
    overall_dimension_width = NEW.overall_dimension_width,
    overall_dimension_height = NEW.overall_dimension_height,
    inspection_valid_until = NEW.inspection_valid_until,
    inspection_date = NEW.inspection_date,
    mandatory_scrap_date = NEW.mandatory_scrap_date,
    left_front_photo = NEW.left_front_photo,
    right_front_photo = NEW.right_front_photo,
    left_rear_photo = NEW.left_rear_photo,
    right_rear_photo = NEW.right_rear_photo,
    dashboard_photo = NEW.dashboard_photo,
    rear_door_photo = NEW.rear_door_photo,
    cargo_box_photo = NEW.cargo_box_photo,
    driving_license_main_photo = NEW.driving_license_main_photo,
    driving_license_sub_photo = NEW.driving_license_sub_photo,
    driving_license_sub_back_photo = NEW.driving_license_sub_back_photo,
    pickup_photos = NEW.pickup_photos,
    return_photos = NEW.return_photos,
    registration_photos = NEW.registration_photos,
    damage_photos = NEW.damage_photos,
    review_status = NEW.review_status,
    locked_photos = NEW.locked_photos,
    required_photos = NEW.required_photos,
    review_notes = NEW.review_notes,
    reviewed_at = NEW.reviewed_at,
    reviewed_by = NEW.reviewed_by,
    pickup_time = NEW.pickup_time,
    return_time = NEW.return_time,
    notes = NEW.notes,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- 更新 vehicles_base 表(如果需要)
  UPDATE vehicles_base SET
    brand = NEW.brand,
    model = NEW.model,
    color = NEW.color,
    vin = NEW.vin,
    vehicle_type = NEW.vehicle_type,
    owner_name = NEW.owner_name,
    use_character = NEW.use_character,
    register_date = NEW.register_date,
    engine_number = NEW.engine_number,
    updated_at = NOW()
  WHERE plate_number = NEW.plate_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建 INSTEAD OF UPDATE 触发器
DROP TRIGGER IF EXISTS instead_of_update_vehicles ON vehicles;
CREATE TRIGGER instead_of_update_vehicles
  INSTEAD OF UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_via_view();

-- 创建删除触发器函数
CREATE OR REPLACE FUNCTION delete_vehicle_via_view()
RETURNS TRIGGER AS $$
BEGIN
  -- 删除 vehicle_records 记录
  DELETE FROM vehicle_records WHERE id = OLD.id;
  
  -- 注意: 不删除 vehicles_base 记录,因为可能有其他录入记录
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 创建 INSTEAD OF DELETE 触发器
DROP TRIGGER IF EXISTS instead_of_delete_vehicles ON vehicles;
CREATE TRIGGER instead_of_delete_vehicles
  INSTEAD OF DELETE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION delete_vehicle_via_view();

-- 添加注释
COMMENT ON FUNCTION insert_vehicle_via_view() IS '视图插入触发器:自动将插入操作转换为对 vehicles_base 和 vehicle_records 的插入';
COMMENT ON FUNCTION update_vehicle_via_view() IS '视图更新触发器:自动更新 vehicles_base 和 vehicle_records';
COMMENT ON FUNCTION delete_vehicle_via_view() IS '视图删除触发器:只删除 vehicle_records,保留 vehicles_base';
