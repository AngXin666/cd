/*
# 删除非测试用户

## 目的
删除除了3个测试账号外的全部账号

## 保留的测试账号
- 最早创建的1个超级管理员
- 最早创建的1个普通管理员
- 最早创建的1个司机

## 删除顺序
1. 先删除 auth.users 表中的记录
2. 再删除 profiles 表中的记录

## 注意事项
- 此操作不可逆，请谨慎执行
- 建议先备份数据
*/

-- 临时表：保存要保留的用户ID
CREATE TEMP TABLE users_to_keep AS
(
  -- 保留最早创建的超级管理员
  SELECT id, created_at, role, 1 as priority
  FROM profiles
  WHERE role = 'super_admin'
  ORDER BY created_at ASC
  LIMIT 1
)
UNION ALL
(
  -- 保留最早创建的普通管理员
  SELECT id, created_at, role, 2 as priority
  FROM profiles
  WHERE role = 'manager'
  ORDER BY created_at ASC
  LIMIT 1
)
UNION ALL
(
  -- 保留最早创建的司机
  SELECT id, created_at, role, 3 as priority
  FROM profiles
  WHERE role = 'driver'
  ORDER BY created_at ASC
  LIMIT 1
);

-- 显示要保留的用户
DO $$
DECLARE
  keep_user RECORD;
BEGIN
  RAISE NOTICE '=== 要保留的测试账号 ===';
  FOR keep_user IN 
    SELECT p.id, p.phone, p.name, p.role, p.created_at
    FROM profiles p
    INNER JOIN users_to_keep k ON p.id = k.id
    ORDER BY p.created_at ASC
  LOOP
    RAISE NOTICE '保留: % - % - % - %', keep_user.role, keep_user.name, keep_user.phone, keep_user.created_at;
  END LOOP;
END $$;

-- 显示要删除的用户
DO $$
DECLARE
  delete_user RECORD;
  delete_count INT;
BEGIN
  SELECT COUNT(*) INTO delete_count
  FROM profiles p
  WHERE p.id NOT IN (SELECT id FROM users_to_keep);
  
  RAISE NOTICE '';
  RAISE NOTICE '=== 要删除的用户（共 % 个）===', delete_count;
  
  FOR delete_user IN 
    SELECT p.id, p.phone, p.name, p.role, p.created_at
    FROM profiles p
    WHERE p.id NOT IN (SELECT id FROM users_to_keep)
    ORDER BY p.created_at ASC
  LOOP
    RAISE NOTICE '删除: % - % - % - %', delete_user.role, delete_user.name, delete_user.phone, delete_user.created_at;
  END LOOP;
END $$;

-- 删除 auth.users 表中的非测试用户
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM users_to_keep);

-- 删除 profiles 表中的非测试用户
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM users_to_keep);

-- 显示删除结果
DO $$
DECLARE
  remaining_count INT;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM profiles;
  RAISE NOTICE '';
  RAISE NOTICE '=== 删除完成 ===';
  RAISE NOTICE '剩余用户数量: %', remaining_count;
END $$;

-- 清理临时表
DROP TABLE IF EXISTS users_to_keep;
