-- 第四部分：删除boss_full_access策略模板

DELETE FROM permission_strategies
WHERE strategy_name = 'boss_full_access';