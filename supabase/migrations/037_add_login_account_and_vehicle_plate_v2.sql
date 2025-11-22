/*
# 添加登录账号和车牌号码字段

1. 修改内容
    - 在 `profiles` 表添加字段：
        - `login_account` (text, 唯一, 登录账号)
        - `vehicle_plate` (text, 车牌号码)
        - `join_date` (date, 入职时间，默认为创建时间的日期部分)

2. 说明
    - `login_account` 作为用户登录系统的唯一凭证
    - `vehicle_plate` 用于记录司机的车牌号码
    - `join_date` 用于记录员工入职时间
    - 暂时保留原有的角色类型，后续通过应用层处理角色显示
*/

-- 添加新字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_account text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_plate text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_date date;

-- 为现有用户生成默认登录账号（使用手机号或ID）
UPDATE profiles SET login_account = COALESCE(phone, id::text) WHERE login_account IS NULL;

-- 为现有用户设置入职时间（使用创建时间的日期部分）
UPDATE profiles SET join_date = created_at::date WHERE join_date IS NULL;

-- 更新触发器函数，为新用户自动设置登录账号和入职时间
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
BEGIN
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        SELECT COUNT(*) INTO user_count FROM profiles;
        INSERT INTO profiles (id, phone, email, login_account, join_date, role)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            COALESCE(NEW.phone, NEW.email, NEW.id::text),
            CURRENT_DATE,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
        );
    END IF;
    RETURN NEW;
END;
$$;
