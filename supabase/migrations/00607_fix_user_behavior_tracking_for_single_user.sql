/*
# 修复用户行为追踪系统以支持单用户架构

## 目标
更新用户行为追踪系统以适配单用户架构（去除 boss_id，使用 users 表）

## 修改
1. 删除旧表（如果存在）
2. 创建新的用户行为追踪表
3. 更新辅助函数
*/

-- ============================================
-- 1. 删除旧表（如果存在）
-- ============================================

DROP TABLE IF EXISTS system_performance_metrics CASCADE;
DROP TABLE IF EXISTS user_feature_weights CASCADE;
DROP TABLE IF EXISTS user_behavior_logs CASCADE;

-- 删除旧函数
DROP FUNCTION IF EXISTS calculate_feature_weight CASCADE;
DROP FUNCTION IF EXISTS update_user_feature_weight CASCADE;
DROP FUNCTION IF EXISTS get_user_high_priority_features CASCADE;

-- ============================================
-- 2. 用户行为日志表
-- ============================================

CREATE TABLE user_behavior_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_module text NOT NULL, -- 功能模块名称（如：dashboard, attendance, vehicles等）
  action_type text NOT NULL, -- 操作类型（view, create, update, delete等）
  page_path text, -- 页面路径
  duration_ms integer, -- 停留时长（毫秒）
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_user_behavior_logs_user ON user_behavior_logs(user_id);
CREATE INDEX idx_user_behavior_logs_feature ON user_behavior_logs(feature_module);
CREATE INDEX idx_user_behavior_logs_created ON user_behavior_logs(created_at DESC);

-- 启用 RLS
ALTER TABLE user_behavior_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "用户可以查看自己的行为日志" ON user_behavior_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "用户可以创建自己的行为日志" ON user_behavior_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有行为日志" ON user_behavior_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('BOSS', 'PEER_ADMIN')
    )
  );

-- ============================================
-- 3. 用户功能权重表
-- ============================================

CREATE TABLE user_feature_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_module text NOT NULL, -- 功能模块名称
  access_count integer DEFAULT 0, -- 访问次数
  last_access_at timestamptz, -- 最后访问时间
  weight_score numeric(10, 4) DEFAULT 0, -- 权重分数（0-100）
  cache_ttl integer DEFAULT 300000, -- 缓存时间（毫秒），默认5分钟
  updated_at timestamptz DEFAULT now(),
  
  -- 唯一约束
  UNIQUE(user_id, feature_module)
);

-- 创建索引
CREATE INDEX idx_user_feature_weights_user ON user_feature_weights(user_id);
CREATE INDEX idx_user_feature_weights_weight ON user_feature_weights(weight_score DESC);
CREATE INDEX idx_user_feature_weights_module ON user_feature_weights(feature_module);

-- 启用 RLS
ALTER TABLE user_feature_weights ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "用户可以查看自己的功能权重" ON user_feature_weights
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的功能权重" ON user_feature_weights
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有功能权重" ON user_feature_weights
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('BOSS', 'PEER_ADMIN')
    )
  );

-- ============================================
-- 4. 系统性能指标表
-- ============================================

CREATE TABLE system_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL, -- 指标类型（page_load, api_response, cache_hit等）
  metric_name text NOT NULL, -- 指标名称
  metric_value numeric(10, 2) NOT NULL, -- 指标值
  unit text, -- 单位（ms, %, count等）
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- 关联用户（可选）
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_system_performance_metrics_type ON system_performance_metrics(metric_type);
CREATE INDEX idx_system_performance_metrics_created ON system_performance_metrics(created_at DESC);
CREATE INDEX idx_system_performance_metrics_user ON system_performance_metrics(user_id) WHERE user_id IS NOT NULL;

-- 启用 RLS
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "管理员可以查看所有性能指标" ON system_performance_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('BOSS', 'PEER_ADMIN')
    )
  );

CREATE POLICY "系统可以创建性能指标" ON system_performance_metrics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- 5. 辅助函数
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
  v_frequency_score numeric;
  v_recency_score numeric;
  v_hours_since_access numeric;
  v_days_since_access numeric;
  v_final_score numeric;
BEGIN
  -- 频率得分：平方根增长（0-50分）
  v_frequency_score := LEAST(SQRT(p_access_count) * 5, 50);
  
  -- 时效性得分：小时级衰减（0-50分）
  IF p_last_access_at IS NULL THEN
    v_recency_score := 0;
  ELSE
    v_hours_since_access := EXTRACT(EPOCH FROM (now() - p_last_access_at)) / 3600;
    v_days_since_access := v_hours_since_access / 24;
    
    -- 1小时内：50分
    IF v_hours_since_access < 1 THEN
      v_recency_score := 50;
    -- 24小时内：45-50分
    ELSIF v_hours_since_access < 24 THEN
      v_recency_score := 50 - (v_hours_since_access - 1) * 5 / 23;
    -- 7天内：30-45分
    ELSIF v_days_since_access <= 7 THEN
      v_recency_score := 45 - (v_days_since_access - 1) * 15 / 6;
    -- 30天内：10-30分
    ELSIF v_days_since_access <= 30 THEN
      v_recency_score := 30 - (v_days_since_access - 7) * 20 / 23;
    -- 超过30天：逐渐衰减
    ELSE
      v_recency_score := GREATEST(10 - (v_days_since_access - 30) * 0.2, 0);
    END IF;
  END IF;
  
  -- 最终分数 = 频率得分 + 时效性得分
  v_final_score := v_frequency_score + v_recency_score;
  v_final_score := LEAST(GREATEST(v_final_score, 0), 100);
  
  RETURN v_final_score;
END;
$$;

-- 计算缓存TTL
CREATE OR REPLACE FUNCTION calculate_cache_ttl(p_weight_score numeric)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  -- 6档TTL策略
  IF p_weight_score >= 90 THEN RETURN 30000;   -- 30秒
  ELSIF p_weight_score >= 80 THEN RETURN 60000;   -- 1分钟
  ELSIF p_weight_score >= 60 THEN RETURN 180000;  -- 3分钟
  ELSIF p_weight_score >= 40 THEN RETURN 300000;  -- 5分钟
  ELSIF p_weight_score >= 20 THEN RETURN 600000;  -- 10分钟
  ELSE RETURN 900000;  -- 15分钟
  END IF;
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
  v_access_count integer;
  v_weight_score numeric;
  v_cache_ttl integer;
BEGIN
  -- 插入或更新功能权重
  INSERT INTO user_feature_weights (
    user_id,
    feature_module,
    access_count,
    last_access_at,
    weight_score,
    updated_at
  )
  VALUES (
    p_user_id,
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
    calculate_feature_weight(access_count, last_access_at),
    calculate_cache_ttl(calculate_feature_weight(access_count, last_access_at))
  INTO v_access_count, v_weight_score, v_cache_ttl
  FROM user_feature_weights
  WHERE user_id = p_user_id AND feature_module = p_feature_module;
  
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
  ORDER BY weight_score DESC, last_access_at DESC
  LIMIT p_limit;
$$;
