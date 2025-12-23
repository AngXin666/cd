-- 优化功能权重计算算法
-- 改进权重计算公式，引入最近活跃度和访问频率的平衡

-- 优化后的权重计算函数
CREATE OR REPLACE FUNCTION calculate_feature_weight(
  p_access_count integer,
  p_last_access_at timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_frequency_score numeric; -- 频率得分
  v_recency_score numeric;   -- 时效性得分
  v_days_since_access numeric;
  v_hours_since_access numeric;
  v_final_score numeric;
BEGIN
  -- 频率得分：使用平方根增长，避免极端偏向（0-50分）
  -- sqrt(x) * 5 的增长曲线更平滑，避免对数函数在低频时增长过快
  v_frequency_score := LEAST(SQRT(p_access_count) * 5, 50);
  
  -- 时效性得分：最近访问的功能权重更高（0-50分）
  IF p_last_access_at IS NULL THEN
    v_recency_score := 0;
  ELSE
    v_hours_since_access := EXTRACT(EPOCH FROM (now() - p_last_access_at)) / 3600;
    v_days_since_access := v_hours_since_access / 24;
    
    -- 细化时间衰减策略
    IF v_hours_since_access < 1 THEN
      -- 1小时内：满分50分
      v_recency_score := 50;
    ELSIF v_hours_since_access < 24 THEN
      -- 24小时内：45-50分，线性衰减
      v_recency_score := 50 - (v_hours_since_access - 1) * 5 / 23;
    ELSIF v_days_since_access <= 7 THEN
      -- 7天内：30-45分
      v_recency_score := 45 - (v_days_since_access - 1) * 15 / 6;
    ELSIF v_days_since_access <= 30 THEN
      -- 30天内：10-30分
      v_recency_score := 30 - (v_days_since_access - 7) * 20 / 23;
    ELSE
      -- 超过30天：最低10分（不完全归零，保留基础权重）
      v_recency_score := GREATEST(10 - (v_days_since_access - 30) * 0.2, 0);
    END IF;
  END IF;
  
  -- 最终分数 = 频率得分 + 时效性得分
  v_final_score := v_frequency_score + v_recency_score;
  v_final_score := LEAST(GREATEST(v_final_score, 0), 100);
  
  RETURN v_final_score;
END;
$$;

COMMENT ON FUNCTION calculate_feature_weight IS '
优化的权重计算算法：
- 频率得分（0-50分）：使用平方根增长，避免极端值
- 时效性得分（0-50分）：
  * 1小时内：50分
  * 24小时内：45-50分
  * 7天内：30-45分
  * 30天内：10-30分
  * 超过30天：逐渐衰减至0
- 总分范围：0-100分
';

-- 优化缓存TTL计算策略
CREATE OR REPLACE FUNCTION calculate_cache_ttl(p_weight_score numeric)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_ttl integer;
BEGIN
  -- 更细粒度的缓存时间策略
  IF p_weight_score >= 90 THEN
    v_ttl := 30000;  -- 30秒（超高频）
  ELSIF p_weight_score >= 80 THEN
    v_ttl := 60000;  -- 1分钟（高频）
  ELSIF p_weight_score >= 60 THEN
    v_ttl := 180000; -- 3分钟（中高频）
  ELSIF p_weight_score >= 40 THEN
    v_ttl := 300000; -- 5分钟（中频）
  ELSIF p_weight_score >= 20 THEN
    v_ttl := 600000; -- 10分钟（低频）
  ELSE
    v_ttl := 900000; -- 15分钟（极低频）
  END IF;
  
  RETURN v_ttl;
END;
$$;

COMMENT ON FUNCTION calculate_cache_ttl IS '
优化的缓存TTL计算策略：
- 90-100分：30秒（超高频使用，需要高实时性）
- 80-90分：1分钟（高频使用）
- 60-80分：3分钟（中高频）
- 40-60分：5分钟（中频）
- 20-40分：10分钟（低频）
- 0-20分：15分钟（极低频）
';

-- 更新 update_user_feature_weight 函数使用新的 TTL 计算
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
  
  -- 使用优化的 TTL 计算函数
  v_cache_ttl := calculate_cache_ttl(v_weight_score);
  
  -- 更新权重分数和缓存时间
  UPDATE user_feature_weights
  SET 
    weight_score = v_weight_score,
    cache_ttl = v_cache_ttl
  WHERE user_id = p_user_id AND feature_module = p_feature_module;
END;
$$;

COMMENT ON FUNCTION update_user_feature_weight IS '
更新用户功能权重：
- 自动记录访问次数和最后访问时间
- 使用优化的权重计算算法
- 根据权重分数动态计算缓存TTL
';
