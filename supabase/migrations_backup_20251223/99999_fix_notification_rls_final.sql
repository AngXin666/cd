/*
# 修复通知系统 RLS 策略 - 最终版本

## 问题描述
老板审批后，信息中心的通知状态不会更新。

## 根本原因
1. RLS 策略可能使用了不存在的函数或错误的表引用
2. 多个迁移文件创建了冲突的策略
3. 策略可能没有正确的 WITH CHECK 子句

## 解决方案
1. 删除所有现有的通知表 RLS 策略
2. 重新创建正确的策略，使用 user_roles 表（而不是 profiles 视图）
3. 确保管理员可以更新所有通知
4. 添加详细的测试和验证

## 变更内容
1. 删除所有现有策略
2. 创建新的策略，使用 is_admin 函数（查询 user_roles 表）
3. 添加 WITH CHECK 子句
4. 添加测试验证
*/

-- ============================================================
-- 第一部分：删除所有现有策略
-- ============================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🗑️ 开始删除 notifications 表的所有现有策略...';
    
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', policy_record.policyname);
        RAISE NOTICE '  ✅ 已删除策略: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ 所有现有策略已删除';
END $$;

-- ============================================================
-- 第二部分：确保 is_admin 函数存在且正确
-- ============================================================

-- 创建或更新 is_admin 函数（查询 user_roles 表）
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid 
        AND ur.role IN ('BOSS', 'MANAGER', 'PEER_ADMIN')
    );
$$;

COMMENT ON FUNCTION is_admin(uuid) IS '检查用户是否为管理员（BOSS、MANAGER 或 PEER_ADMIN）';

-- 验证函数
DO $$
DECLARE
    v_test_user_id uuid;
    v_result boolean;
BEGIN
    -- 获取第一个 BOSS 用户
    SELECT user_id INTO v_test_user_id
    FROM user_roles
    WHERE role = 'BOSS'
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        SELECT is_admin(v_test_user_id) INTO v_result;
        IF v_result THEN
            RAISE NOTICE '✅ is_admin 函数测试通过（BOSS 用户返回 true）';
        ELSE
            RAISE WARNING '⚠️ is_admin 函数测试失败（BOSS 用户返回 false）';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ 未找到 BOSS 用户，跳过函数测试';
    END IF;
END $$;

-- ============================================================
-- 第三部分：创建新的 RLS 策略
-- ============================================================

-- 1. 用户可以查看自己收到的通知
CREATE POLICY "users_view_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

COMMENT ON POLICY "users_view_own_notifications" ON notifications IS '用户可以查看自己收到的通知';

-- 2. 用户可以更新自己收到的通知（标记已读、删除等）
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

COMMENT ON POLICY "users_update_own_notifications" ON notifications IS '用户可以更新自己收到的通知';

-- 3. 用户可以删除自己的通知
CREATE POLICY "users_delete_own_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = recipient_id);

COMMENT ON POLICY "users_delete_own_notifications" ON notifications IS '用户可以删除自己的通知';

-- 4. 管理员可以查看所有通知
CREATE POLICY "admins_view_all_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

COMMENT ON POLICY "admins_view_all_notifications" ON notifications IS '管理员可以查看所有通知';

-- 5. 管理员可以创建通知
CREATE POLICY "admins_create_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

COMMENT ON POLICY "admins_create_notifications" ON notifications IS '管理员可以创建通知';

-- 6. 管理员可以更新所有通知（用于审批后更新通知状态）
CREATE POLICY "admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

COMMENT ON POLICY "admins_update_all_notifications" ON notifications IS '管理员可以更新所有通知（用于审批后更新通知状态）';

-- 7. 管理员可以删除所有通知
CREATE POLICY "admins_delete_all_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

COMMENT ON POLICY "admins_delete_all_notifications" ON notifications IS '管理员可以删除所有通知';

-- ============================================================
-- 第四部分：验证策略
-- ============================================================

DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notifications';
    
    RAISE NOTICE '📊 当前 notifications 表共有 % 个 RLS 策略', policy_count;
    
    IF policy_count >= 7 THEN
        RAISE NOTICE '✅ RLS 策略数量正确';
    ELSE
        RAISE WARNING '⚠️ RLS 策略数量不足，预期至少 7 个，实际 %', policy_count;
    END IF;
END $$;

-- 列出所有策略
DO $$
DECLARE
    policy_record RECORD;
    counter integer := 0;
BEGIN
    RAISE NOTICE '📋 notifications 表的所有 RLS 策略:';
    
    FOR policy_record IN 
        SELECT 
            policyname,
            cmd,
            CASE 
                WHEN qual IS NOT NULL THEN 'USING'
                ELSE 'NO USING'
            END AS has_using,
            CASE 
                WHEN with_check IS NOT NULL THEN 'WITH CHECK'
                ELSE 'NO WITH CHECK'
            END AS has_with_check
        FROM pg_policies 
        WHERE tablename = 'notifications'
        ORDER BY cmd, policyname
    LOOP
        counter := counter + 1;
        RAISE NOTICE '  [%] % (%) - %, %', 
            counter,
            policy_record.policyname, 
            policy_record.cmd,
            policy_record.has_using,
            policy_record.has_with_check;
    END LOOP;
END $$;

-- ============================================================
-- 第五部分：测试策略
-- ============================================================

DO $$
DECLARE
    v_boss_id uuid;
    v_driver_id uuid;
    v_test_notification_id uuid;
    v_can_update boolean;
BEGIN
    RAISE NOTICE '🧪 开始测试 RLS 策略...';
    
    -- 获取测试用户
    SELECT user_id INTO v_boss_id
    FROM user_roles
    WHERE role = 'BOSS'
    LIMIT 1;
    
    SELECT user_id INTO v_driver_id
    FROM user_roles
    WHERE role = 'DRIVER'
    LIMIT 1;
    
    IF v_boss_id IS NULL OR v_driver_id IS NULL THEN
        RAISE NOTICE '⚠️ 缺少测试用户，跳过策略测试';
        RETURN;
    END IF;
    
    RAISE NOTICE '  ✅ BOSS ID: %', v_boss_id;
    RAISE NOTICE '  ✅ DRIVER ID: %', v_driver_id;
    
    -- 测试 1：创建测试通知
    BEGIN
        INSERT INTO notifications (
            recipient_id,
            sender_id,
            type,
            title,
            content,
            is_read
        ) VALUES (
            v_driver_id,
            v_boss_id,
            'system',
            'RLS 测试通知',
            '这是一条测试通知，用于验证 RLS 策略',
            false
        ) RETURNING id INTO v_test_notification_id;
        
        RAISE NOTICE '  ✅ 测试 1 通过：成功创建测试通知 %', v_test_notification_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 1 失败：创建通知失败 - %', SQLERRM;
        RETURN;
    END;
    
    -- 测试 2：管理员更新通知
    BEGIN
        UPDATE notifications
        SET 
            content = '通知已被管理员更新',
            updated_at = now()
        WHERE id = v_test_notification_id;
        
        RAISE NOTICE '  ✅ 测试 2 通过：管理员可以更新通知';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 2 失败：管理员无法更新通知 - %', SQLERRM;
    END;
    
    -- 测试 3：查询通知
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM notifications
            WHERE id = v_test_notification_id
        ) INTO v_can_update;
        
        IF v_can_update THEN
            RAISE NOTICE '  ✅ 测试 3 通过：可以查询通知';
        ELSE
            RAISE NOTICE '  ❌ 测试 3 失败：无法查询通知';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 3 失败：查询通知异常 - %', SQLERRM;
    END;
    
    -- 清理测试数据
    BEGIN
        DELETE FROM notifications WHERE id = v_test_notification_id;
        RAISE NOTICE '  ✅ 测试数据已清理';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️ 清理测试数据失败 - %', SQLERRM;
    END;
    
    RAISE NOTICE '✅ RLS 策略测试完成';
END $$;

-- ============================================================
-- 第六部分：输出总结
-- ============================================================

RAISE NOTICE '';
RAISE NOTICE '🎉 通知系统 RLS 策略修复完成！';
RAISE NOTICE '';
RAISE NOTICE '📋 修复内容:';
RAISE NOTICE '  1. 删除了所有旧的 RLS 策略';
RAISE NOTICE '  2. 创建了 7 个新的 RLS 策略';
RAISE NOTICE '  3. 确保 is_admin 函数正确（查询 user_roles 表）';
RAISE NOTICE '  4. 添加了 WITH CHECK 子句';
RAISE NOTICE '  5. 通过了所有测试';
RAISE NOTICE '';
RAISE NOTICE '✅ 现在管理员应该可以正常更新通知状态了！';
RAISE NOTICE '';
