/*
# 创建用户行为追踪系统

## 目标
建立用户行为追踪机制，记录用户对各功能模块的访问频率，用于智能数据加载和缓存优化。

## 表结构
1. user_behavior_logs - 用户行为日志表
2. user_feature_weights - 用户功能权重表
3. system_performance_metrics - 系统性能指标表

## 功能
- 记录用户访问行为
- 计算功能权重
- 监控系统性能
*/

-- ============================================
-- 1. 用户行为日志表
-- ============================================

CREATE TABLE IF NOT EXISTS user_behavior_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id text NOT NULL,
  feature_module text NOT NULL, -- 功能模块名称（如：dashboard, attendance, vehicles等）
  action_type text NOT NULL, -- 操作类型（view, create, update, delete等）
  page_path text, -- 页面路径
  duration_ms integer, -- 停留时长（毫秒）
  created_at timestamptz DEFAULT now(),
  
  -- 索引
  CONSTRAINT user_behavior_logs_boss_id_check CHECK (boss_id <> '')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_boss_user 
ON user_behavior_logs(boss_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_boss_feature 
ON user_behavior_logs(boss_id, feature_module);

CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_boss_created 
ON user_behavior_logs(boss_id, created_at DESC);

-- 启用 RLS
ALTER TABLE user_behavior_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "用户可以查看自己的行为日志" ON user_behavior_logs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    AND boss_id = get_current_user_boss_id()
  );

CREATE POLICY "用户可以创建自己的行为日志" ON user_behavior_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND boss_id = get_current_user_boss_id()
  );

CREATE POLICY "超级管理员可以查看所有行为日志" ON user_behavior_logs
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid()) 
    AND boss_id = get_current_user_boss_id()
  );

-- ============================================
-- 2. 用户功能权重表
-- ============================================

CREATE TABLE IF NOT EXISTS user_feature_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id text NOT NULL,
  feature_module text NOT NULL, -- 功能模块名称
  access_count integer DEFAULT 0, -- 访问次数
  last_access_at timestamptz, -- 最后访问时间
  weight_score numeric(10, 4) DEFAULT 0, -- 权重分数（0-100）
  cache_ttl integer DEFAULT 300000, -- 缓存时间（毫秒），默认5分钟
  updated_at timestamptz DEFAULT now(),
  
  -- 唯一约束
  UNIQUE(user_id, feature_module),
  CONSTRAINT user_feature_weights_boss_id_check CHECK (boss_id <> '')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_feature_weights_boss_user 
ON user_feature_weights(boss_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_feature_weights_boss_weight 
ON user_feature_weights(boss_id, weight_score DESC);

-- 启用 RLS
ALTER TABLE user_feature_weights ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "用户可以查看自己的功能权重" ON user_feature_weights
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    AND boss_id = get_current_user_boss_id()
  );

CREATE POLICY "用户可以更新自己的功能权重" ON user_feature_weights
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() 
    AND boss_id = get_current_user_boss_id()
  );

CREATE POLICY "超级管理员可以查看所有功能权重" ON user_feature_weights
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid()) 
    AND boss_id = get_current_user_boss_id()
  );

-- ============================================
-- 3. 系统性能指标表
-- ============================================

CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id text NOT NULL,
  metric_type text NOT NULL, -- 指标类型（page_load, api_response, cache_hit等）
  metric_name text NOT NULL, -- 指标名称
  metric_value numeric(10, 2) NOT NULL, -- 指标值
  unit text, -- 单位（ms, %, count等）
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL, -- 关联用户（可选）
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT system_performance_metrics_boss_id_check CHECK (boss_id <> '')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_boss_type 
ON system_performance_metrics(boss_id, metric_type);

CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_boss_created 
ON system_performance_metrics(boss_id, created_at DESC);

-- 启用 RLS
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "超级管理员可以查看所有性能指标" ON system_performance_metrics
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid()) 
    AND boss_id = get_current_user_boss_id()
  );

CREATE POLICY "系统可以创建性能指标" ON system_performance_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    boss_id = get_current_user_boss_id()
  );

-- ============================================
-- 4. 辅助函数
-- ============================================

-- 计算功能权重分数
CREATE OR REPLACE FUNCTION calculate_feature_weight(
  p_access_count integer,
  p_last_access_at timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_score numeric;
  v_time_decay numeric;
  v_days_since_access numeric;
  v_final_score numeric;
BEGIN
  -- 基础分数：基于访问次数（对数增长，避免过度偏向高频功能）
  v_base_score := LEAST(LOG(p_access_count + 1) * 10, 70);
  
  -- 时间衰减：最近访问的功能权重更高
  IF p_last_access_at IS NULL THEN
    v_time_decay := 0;
  ELSE
    v_days_since_access := EXTRACT(EPOCH FROM (now() - p_last_access_at)) / 86400;
    -- 30天内的访问有额外加分，超过30天开始衰减
    IF v_days_since_access <= 30 THEN
      v_time_decay := 30 - v_days_since_access;
    ELSE
      v_time_decay := GREATEST(30 - v_days_since_access, -20);
    END IF;
  END IF;
  
  -- 最终分数 = 基础分数 + 时间衰减分数
  v_final_score := GREATEST(v_base_score + v_time_decay, 0);
  v_final_score := LEAST(v_final_score, 100);
  
  RETURN v_final_score;
END;
$$;

-- 更新用户功能权重
CREATE OR REPLACE FUNCTION update_user_feature_weight(
  p_user_id uuid,
  p_feature_module text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_boss_id text;
  v_access_count integer;
  v_weight_score numeric;
  v_cache_ttl integer;
BEGIN
  -- 获取用户的 boss_id
  SELECT boss_id INTO v_boss_id
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_boss_id IS NULL THEN
    RETURN;
  END IF;
  
  -- 插入或更新功能权重
  INSERT INTO user_feature_weights (
    user_id,
    boss_id,
    feature_module,
    access_count,
    last_access_at,
    weight_score,
    updated_at
  )
  VALUES (
    p_user_id,
    v_boss_id,
    p_feature_module,
    1,
    now(),
    10, -- 初始权重
    now()
  )
  ON CONFLICT (user_id, feature_module)
  DO UPDATE SET
    access_count = user_feature_weights.access_count + 1,
    last_access_at = now(),
    updated_at = now();
  
  -- 重新计算权重分数
  SELECT 
    access_count,
    calculate_feature_weight(access_count, last_access_at)
  INTO v_access_count, v_weight_score
  FROM user_feature_weights
  WHERE user_id = p_user_id AND feature_module = p_feature_module;
  
  -- 根据权重分数计算缓存时间
  -- 高权重（80-100）：1分钟
  -- 中权重（50-80）：5分钟
  -- 低权重（0-50）：15分钟
  IF v_weight_score >= 80 THEN
    v_cache_ttl := 60000; -- 1分钟
  ELSIF v_weight_score >= 50 THEN
    v_cache_ttl := 300000; -- 5分钟
  ELSE
    v_cache_ttl := 900000; -- 15分钟
  END IF;
  
  -- 更新权重分数和缓存时间
  UPDATE user_feature_weights
  SET 
    weight_score = v_weight_score,
    cache_ttl = v_cache_ttl
  WHERE user_id = p_user_id AND feature_module = p_feature_module;
END;
$$;

-- 获取用户的高权重功能列表
CREATE OR REPLACE FUNCTION get_user_high_priority_features(
  p_user_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  feature_module text,
  weight_score numeric,
  cache_ttl integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    feature_module,
    weight_score,
    cache_ttl
  FROM user_feature_weights
  WHERE user_id = p_user_id
    AND boss_id = get_current_user_boss_id()
  ORDER BY weight_score DESC, last_access_at DESC
  LIMIT p_limit;
$$;