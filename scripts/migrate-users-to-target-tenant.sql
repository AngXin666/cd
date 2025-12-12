/*
# 将所有租户下的车队长和司机迁移到目标租户

## 目标
将所有租户下的车队长（manager）和司机（driver）迁移到手机号为 13800000001 的租户下

## 步骤
1. 查询目标租户（手机号 13800000001）的 ID
2. 统计需要迁移的用户数量
3. 更新所有车队长和司机的 boss_id 为目标租户 ID
4. 验证迁移结果

## 注意事项
- 只迁移车队长（role = 'manager'）和司机（role = 'driver'）
- 不迁移老板账号（role = 'super_admin'）
- 保留用户的其他信息不变
*/

-- 1. 查询目标租户信息
DO $$
DECLARE
  target_boss_id uuid;
  target_boss_name text;
  total_managers int;
  total_drivers int;
  affected_rows int;
BEGIN
  -- 获取目标租户 ID
  SELECT id, name INTO target_boss_id, target_boss_name
  FROM profiles
  WHERE phone = '13800000001' 
    AND role = 'super_admin' 
    AND main_account_id IS NULL;

  -- 检查目标租户是否存在
  IF target_boss_id IS NULL THEN
    RAISE EXCEPTION '❌ 未找到手机号为 13800000001 的租户（主账号）';
  END IF;

  RAISE NOTICE '✅ 找到目标租户：% (ID: %)', target_boss_name, target_boss_id;

  -- 统计需要迁移的车队长数量
  SELECT COUNT(*) INTO total_managers
  FROM profiles
  WHERE role = 'manager' 
    AND (boss_id IS NULL OR boss_id != target_boss_id);

  RAISE NOTICE '📊 需要迁移的车队长数量：%', total_managers;

  -- 统计需要迁移的司机数量
  SELECT COUNT(*) INTO total_drivers
  FROM profiles
  WHERE role = 'driver' 
    AND (boss_id IS NULL OR boss_id != target_boss_id);

  RAISE NOTICE '📊 需要迁移的司机数量：%', total_drivers;

  -- 如果没有需要迁移的用户，直接返回
  IF total_managers = 0 AND total_drivers = 0 THEN
    RAISE NOTICE '✅ 没有需要迁移的用户';
    RETURN;
  END IF;

  -- 开始迁移车队长
  IF total_managers > 0 THEN
    RAISE NOTICE '🚀 开始迁移车队长...';
    
    UPDATE profiles
    SET boss_id = target_boss_id,
        updated_at = NOW()
    WHERE role = 'manager' 
      AND (boss_id IS NULL OR boss_id != target_boss_id);
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '✅ 成功迁移 % 名车队长', affected_rows;
  END IF;

  -- 开始迁移司机
  IF total_drivers > 0 THEN
    RAISE NOTICE '🚀 开始迁移司机...';
    
    UPDATE profiles
    SET boss_id = target_boss_id,
        updated_at = NOW()
    WHERE role = 'driver' 
      AND (boss_id IS NULL OR boss_id != target_boss_id);
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '✅ 成功迁移 % 名司机', affected_rows;
  END IF;

  -- 验证迁移结果
  SELECT COUNT(*) INTO total_managers
  FROM profiles
  WHERE role = 'manager' AND boss_id = target_boss_id;

  SELECT COUNT(*) INTO total_drivers
  FROM profiles
  WHERE role = 'driver' AND boss_id = target_boss_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 迁移完成！';
  RAISE NOTICE '目标租户：% (ID: %)', target_boss_name, target_boss_id;
  RAISE NOTICE '当前车队长数量：%', total_managers;
  RAISE NOTICE '当前司机数量：%', total_drivers;
  RAISE NOTICE '========================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ 迁移失败：%', SQLERRM;
END $$;

-- 2. 验证迁移结果（查询目标租户下的所有用户）
SELECT 
  role,
  COUNT(*) as count
FROM profiles
WHERE boss_id = (
  SELECT id FROM profiles 
  WHERE phone = '13800000001' 
    AND role = 'super_admin' 
    AND main_account_id IS NULL
)
GROUP BY role
ORDER BY role;
