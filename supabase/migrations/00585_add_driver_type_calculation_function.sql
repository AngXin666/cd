/*
# 添加司机类型计算函数

## 说明
根据司机的入职时间和是否带车，自动计算司机类型：
- 新纯司机：入职7天内，不带车
- 新带车司机：入职7天内，带车
- 纯司机：入职7天以上，不带车
- 带车司机：入职7天以上，带车

## 判断逻辑
1. 是否为"新"：根据 created_at 字段，入职7天内为"新"
2. 是否"带车"：根据 vehicles 表中是否有该司机的车辆记录

## 变更内容
1. 创建 get_driver_type_label 函数，返回司机类型标签
2. 创建 is_new_driver 函数，判断是否为新司机
3. 创建 has_vehicle 函数，判断司机是否带车
*/

-- 判断是否为新司机（入职7天内）
CREATE OR REPLACE FUNCTION is_new_driver(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE 
      WHEN u.created_at IS NULL THEN false
      WHEN (CURRENT_TIMESTAMP - u.created_at) <= INTERVAL '7 days' THEN true
      ELSE false
    END
  FROM users u
  WHERE u.id = p_user_id;
$$;

-- 判断司机是否带车
CREATE OR REPLACE FUNCTION has_vehicle(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.driver_id = p_driver_id
      AND v.is_active = true
  );
$$;

-- 获取司机类型标签
CREATE OR REPLACE FUNCTION get_driver_type_label(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_is_new boolean;
  v_has_vehicle boolean;
  v_is_driver boolean;
BEGIN
  -- 检查是否为司机
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = 'DRIVER'
  ) INTO v_is_driver;
  
  -- 如果不是司机，返回 NULL
  IF NOT v_is_driver THEN
    RETURN NULL;
  END IF;
  
  -- 判断是否为新司机
  v_is_new := is_new_driver(p_user_id);
  
  -- 判断是否带车
  v_has_vehicle := has_vehicle(p_user_id);
  
  -- 返回司机类型标签
  IF v_is_new AND v_has_vehicle THEN
    RETURN '新带车司机';
  ELSIF v_is_new AND NOT v_has_vehicle THEN
    RETURN '新纯司机';
  ELSIF NOT v_is_new AND v_has_vehicle THEN
    RETURN '带车司机';
  ELSE
    RETURN '纯司机';
  END IF;
END;
$$;