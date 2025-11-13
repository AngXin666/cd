/*
# 同步司机实名到profiles表

## 功能说明
当司机完成实名认证后，自动将profiles.name更新为实名（driver_licenses.id_card_name）。
这样可以确保所有地方都使用实名，而不是昵称。

## 实现方式
1. 创建触发器函数：当driver_licenses表插入或更新时，自动同步实名到profiles.name
2. 创建触发器：绑定到driver_licenses表的INSERT和UPDATE操作
3. 更新现有数据：将已实名司机的昵称更新为实名

## 注意事项
- 只有司机角色才会同步实名
- 如果id_card_name为空，不会更新profiles.name
- 触发器会在每次实名信息变更时自动执行
*/

-- 1. 创建触发器函数：同步实名到profiles表
CREATE OR REPLACE FUNCTION sync_driver_real_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 只有当id_card_name不为空时才同步
  IF NEW.id_card_name IS NOT NULL AND NEW.id_card_name != '' THEN
    -- 更新profiles表的name字段为实名
    UPDATE profiles
    SET name = NEW.id_card_name
    WHERE id = NEW.driver_id AND role = 'driver'::user_role;
    
    -- 记录日志（可选）
    RAISE NOTICE '已同步司机实名: driver_id=%, real_name=%', NEW.driver_id, NEW.id_card_name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. 创建触发器：在driver_licenses表插入或更新时触发
DROP TRIGGER IF EXISTS on_driver_license_sync_name ON driver_licenses;
CREATE TRIGGER on_driver_license_sync_name
  AFTER INSERT OR UPDATE OF id_card_name
  ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_driver_real_name();

-- 3. 更新现有数据：将已实名司机的昵称更新为实名
UPDATE profiles p
SET name = dl.id_card_name
FROM driver_licenses dl
WHERE p.id = dl.driver_id
  AND p.role = 'driver'::user_role
  AND dl.id_card_name IS NOT NULL
  AND dl.id_card_name != ''
  AND p.name != dl.id_card_name;  -- 只更新不一致的数据

-- 显示更新结果
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM profiles p
  INNER JOIN driver_licenses dl ON p.id = dl.driver_id
  WHERE p.role = 'driver'::user_role
    AND dl.id_card_name IS NOT NULL
    AND p.name = dl.id_card_name;
  
  RAISE NOTICE '已同步 % 位司机的实名到profiles表', updated_count;
END $$;
