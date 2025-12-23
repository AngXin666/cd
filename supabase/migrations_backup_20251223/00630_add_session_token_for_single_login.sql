-- ============================================================
-- 单点登录功能：添加 session_token 字段
-- 用于实现同一账号只能在一个设备登录
-- ============================================================

-- 1. 添加 session_token 字段到 users 表
-- session_token: 当前有效的会话令牌，登录时生成，用于验证会话有效性
-- session_created_at: 会话创建时间，用于判断会话是否过期
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_created_at TIMESTAMPTZ DEFAULT NULL;

-- 2. 创建更新会话令牌的函数
-- 登录时调用此函数，生成新的 session_token 并更新到数据库
-- 这会使旧设备的 session_token 失效
CREATE OR REPLACE FUNCTION update_user_session_token(
  p_user_id UUID,
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET 
    session_token = p_session_token,
    session_created_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- 3. 创建验证会话令牌的函数
-- 应用定期调用此函数检查当前会话是否有效
-- 返回 true 表示会话有效，false 表示会话已被其他设备踢掉
CREATE OR REPLACE FUNCTION verify_user_session_token(
  p_user_id UUID,
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_token TEXT;
BEGIN
  SELECT session_token INTO v_stored_token
  FROM users
  WHERE id = p_user_id;
  
  -- 如果数据库中没有 session_token，说明用户从未登录或已退出
  IF v_stored_token IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 比较 session_token 是否匹配
  RETURN v_stored_token = p_session_token;
END;
$$;

-- 4. 创建清除会话令牌的函数
-- 退出登录时调用此函数，清除 session_token
CREATE OR REPLACE FUNCTION clear_user_session_token(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET 
    session_token = NULL,
    session_created_at = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- 5. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token) WHERE session_token IS NOT NULL;

-- 6. 添加注释
COMMENT ON COLUMN users.session_token IS '当前有效的会话令牌，用于单点登录验证';
COMMENT ON COLUMN users.session_created_at IS '会话创建时间';
COMMENT ON FUNCTION update_user_session_token IS '更新用户会话令牌，登录时调用';
COMMENT ON FUNCTION verify_user_session_token IS '验证用户会话令牌是否有效';
COMMENT ON FUNCTION clear_user_session_token IS '清除用户会话令牌，退出登录时调用';
