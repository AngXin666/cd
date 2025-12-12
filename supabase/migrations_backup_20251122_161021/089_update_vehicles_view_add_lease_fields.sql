/*
# 更新vehicles视图，添加租赁管理字段

## 说明
vehicles_base表中新增的租赁管理字段添加到vehicles视图中，
ership_type - 车辆归属类型
- lessor_name - 租赁方名称
- lessor_contact - 租赁方联系方式
- lessee_name - 承租方名称
- lessee_contact - 承租方联系方式
- monthly_rent - 月租金
- lease_start_date - 租赁开始日期
- lease_end_date - 租赁结束日期
- rent_payment_day - 每月租金缴纳日
*/

-- 删除旧视图
DROP VIEW IF EXISTS vehicles;

-- 重新创建vehicles视图，添加租赁字段
CREATE VIEW vehicles AS
SELECT 
  vr.id,
  vr.driver_id AS user_id,
  vr.warehouse_id,
  vb.plate_number,
  vb.vehicle_type,
  vb.brand,
  vb.model,
  vb.color,
  NULL::date AS purchase_date,
  CASE
    WHEN vr.return_time IS NOT NULL THEN 'returned'::text
    WHEN vr.review_status = 'approved'::text THEN 'active'::text
    ELSE 'inactive'::text
  END AS status,
  vr.notes,
  vb.vin,
  vb.owner_name,
  vb.use_character,
  vb.register_date,
  vr.issue_date,
  vb.engine_number,
  vr.archive_number,
  vr.total_mass,
  vr.approved_passengers,
  vr.curb_weight,
  vr.approved_load,
  vr.overall_dimension_length,
  vr.overall_dimension_width,
  vr.overall_dimension_height,
  vr.inspection_valid_until,
  vr.inspection_date,
  vr.mandatory_scrap_date,
  vr.left_front_photo,
  vr.right_front_photo,
  vr.left_rear_photo,
  vr.right_rear_photo,
  vr.dashboard_photo,
  vr.rear_door_photo,
  vr.cargo_box_photo,
  NULL::text AS driving_license_photo,
  vr.driving_license_main_photo,
  vr.driving_license_sub_photo,
  vr.driving_license_sub_back_photo,
  vr.pickup_time,
  vr.return_time,
  vr.pickup_photos,
  vr.return_photos,
  vr.registration_photos,
  vr.damage_photos,
  vr.review_status,
  vr.locked_photos,
  vr.required_photos,
  vr.review_notes,
  vr.reviewed_at,
  vr.reviewed_by,
  -- 新增：租赁管理字段
  vb.ownership_type,
  vb.lessor_name,
  vb.lessor_contact,
  vb.lessee_name,
  vb.lessee_contact,
  vb.monthly_rent,
  vb.lease_start_date,
  vb.lease_end_date,
  vb.rent_payment_day,
  vr.created_at,
  vr.updated_at
FROM vehicle_records vr
JOIN vehicles_base vb ON vr.vehicle_id = vb.id;
