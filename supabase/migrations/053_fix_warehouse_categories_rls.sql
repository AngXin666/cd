/*
# 修复说明：category_prices 表已启用 RLS

## 检查结果
经过检查，发现：
- 表名为 category_prices（不是 warehouse_categories）
- RLS 已经启用 ✅
- 已有 4 个策略保护数据安全

## 结论
此表无需修复，RLS 策略已正确配置。
*/

-- 此迁移文件仅用于记录，无需执行任何操作
-- category_prices 表的 RLS 已经正确启用
