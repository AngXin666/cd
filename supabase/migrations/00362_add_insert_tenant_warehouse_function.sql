/*
# 创建插入租户仓库的辅助函数

## 功能说明
创建一个辅助函数，用于在租户 Schema 中插入默认仓库记录。

## 函数参数
- p_schema_name: 租户 Schema 名称
- p_warehouse_name: 仓库名称
- p_max_leave_days: 最大请假天数
- p_resignation_notice_days: 离职通知天数

## 返回值
返回 JSONB 对象，包含 success 字段和可能的 error 信息
*/

CREATE OR REPLACE FUNCTION public.insert_tenant_warehouse(
  p_schema_name TEXT,
  p_warehouse_name TEXT,
  p_max_leave_days INTEGER,
  p_resignation_notice_days INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 在租户 Schema 中插入仓库记录
  EXECUTE format('
    INSERT INTO %I.warehouses (name, is_active, max_leave_days, resignation_notice_days)
    VALUES ($1, $2, $3, $4)
  ', p_schema_name)
  USING p_warehouse_name, true, p_max_leave_days, p_resignation_notice_days;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.insert_tenant_warehouse(TEXT, TEXT, INTEGER, INTEGER) IS '在租户 Schema 中插入仓库记录';