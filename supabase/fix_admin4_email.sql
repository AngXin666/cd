-- ============================================
-- 直接修复admin4密码为123456
-- 在Supabase Dashboard SQL Editor中执行
-- ============================================

UPDATE auth.users 
SET email = '13800000004@phone.local',
    encrypted_password = crypt('123456', gen_salt('bf')),
    updated_at = NOW()
WHERE phone = '13800000004';

-- 验证
SELECT email, phone FROM auth.users WHERE phone = '13800000004';
