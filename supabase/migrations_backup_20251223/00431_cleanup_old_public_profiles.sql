/*
# 清理旧的 public.profiles 数据

## 问题
- public.profiles 表中还有旧系统的用户数据
- 这些用户是在迁移到多租户系统之前创建的
- 需要清理这些旧数据和对应的 auth.users 记录

## 解决方案
1. 删除 public.profiles 表中的所有用户记录
2. 删除对应的 auth.users 记录
3. 保留 system_admins 表中的系统管理员

## 注意事项
- 此操作会删除所有旧系统的用户数据
- 系统管理员不会被删除
- 操作不可逆，请谨慎执行
*/

-- 删除 public.profiles 中的所有用户的 auth.users 记录
DO $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER := 0;
BEGIN
  -- 遍历所有 public.profiles 中的用户
  FOR v_user_id IN
    SELECT id FROM public.profiles
  LOOP
    -- 检查是否是系统管理员
    IF NOT EXISTS (
      SELECT 1 FROM public.system_admins WHERE id = v_user_id
    ) THEN
      -- 删除 auth.users 记录
      DELETE FROM auth.users WHERE id = v_user_id;
      v_deleted_count := v_deleted_count + 1;
      RAISE NOTICE '✅ 已删除用户: %', v_user_id;
    ELSE
      RAISE NOTICE 'ℹ️ 跳过系统管理员: %', v_user_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ 总共删除 % 个用户的 auth.users 记录', v_deleted_count;
END $$;

-- 删除 public.profiles 中的所有非系统管理员记录
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT id FROM public.system_admins
);

-- 验证清理结果
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as remaining_profiles,
  (SELECT COUNT(*) FROM public.system_admins) as system_admins;
