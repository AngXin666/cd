/*
# 为现有仓库设置默认每日指标

## 1. 数据更新
- 为所有 daily_target 为 NULL 的仓库设置默认值 300 件

## 2. 说明
- 默认每日指标设置为 300 件，这是一个合理的初始值
- 管理员可以在仓库管理页面修改这个值
- 这样可以确保达标率计算正常工作

*/

-- 为所有 daily_target 为 NULL 的仓库设置默认值 300
UPDATE warehouses 
SET daily_target = 300 
WHERE daily_target IS NULL;
