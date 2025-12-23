/*
# 修复审计日志函数处理已删除用户的问题

## 问题描述
当删除用户时，级联删除可能会触发其他表的更新，这些更新会调用 `log_permission_change` 函数。
如果目标用户正在被删除，函数会尝试插入审计日志，但由于外键约束，会导致错误。

## 解决方案
修改 `log_permission_change` 函数，添加以下逻辑：
1. 检查目标用户是否存在
2. 如果目标用户不存在，不插入审计日志（静默失败）
3. 使用 EXCEPTION 处理块捕获外键约束错误

## 变更内容
1. 修改 `log_permission_change` 函数
2. 添加用户存在性检查
3. 添加异常处理

## 影响范围
- 删除用户时不会因为审计日志而失败
- 正常操作的审计日志不受影响
*/

CREATE OR REPLACE FUNCTION log_permission_change(
  p_action_type text,
  p_target_user_id uuid,
  p_old_value jsonb,
  p_new_value jsonb,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operator_role user_role;
  v_target_role user_role;
  v_target_exists boolean;
BEGIN
  -- 获取操作人角色
  SELECT role INTO v_operator_role
  FROM profiles
  WHERE id = auth.uid();

  -- 如果没有操作人，直接返回（可能是系统操作）
  IF v_operator_role IS NULL THEN
    RETURN;
  END IF;

  -- 检查目标用户是否存在
  IF p_target_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE id = p_target_user_id
    ) INTO v_target_exists;

    -- 如果目标用户不存在，不记录日志（用户可能正在被删除）
    IF NOT v_target_exists THEN
      RETURN;
    END IF;

    -- 获取目标用户角色
    SELECT role INTO v_target_role
    FROM profiles
    WHERE id = p_target_user_id;
  END IF;

  -- 尝试插入审计日志
  BEGIN
    INSERT INTO permission_audit_logs (
      operator_id,
      operator_role,
      action_type,
      target_user_id,
      target_user_role,
      old_value,
      new_value,
      description
    ) VALUES (
      auth.uid(),
      v_operator_role,
      p_action_type,
      p_target_user_id,
      v_target_role,
      p_old_value,
      p_new_value,
      p_description
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- 如果外键约束失败（用户正在被删除），静默失败
      RETURN;
    WHEN OTHERS THEN
      -- 其他错误也静默失败，不影响主操作
      RETURN;
  END;
END;
$$;

COMMENT ON FUNCTION log_permission_change IS 
'记录权限变更审计日志，如果目标用户不存在则静默失败';