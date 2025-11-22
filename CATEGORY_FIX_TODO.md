# 品类系统修复任务清单

## 问题描述
数据库表 `category_prices` 的字段与 TypeScript 类型定义不匹配，导致创建品类失败。

## 数据库表结构（实际）
```sql
CREATE TABLE category_prices (
  id uuid PRIMARY KEY,
  warehouse_id uuid NOT NULL,
  category_name text NOT NULL,
  unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  upstairs_price numeric(10,2) DEFAULT 0 NOT NULL,
  sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)
```

## 修复进度

### ✅ 已完成
1. [x] 修复 `PieceWorkCategory` 类型定义
2. [x] 修复 `CategoryPrice` 类型定义（设为 PieceWorkCategory 的别名）
3. [x] 修复 `PieceWorkCategoryInput` 类型定义
4. [x] 修复 `CategoryPriceInput` 类型定义（设为 PieceWorkCategoryInput 的别名）
5. [x] 修复 `getAllCategories` 函数中的排序字段（name -> category_name）

### ⏳ 待修复
6. [ ] 修复 `api.ts` 中的 `upsertCategoryPrice` 函数
7. [ ] 修复 `api.ts` 中的 `batchUpsertCategoryPrices` 函数
8. [ ] 修复 `api.ts` 中的 `getWarehouseCategoriesWithDetails` 函数
9. [ ] 修复 `pages/super-admin/category-management/index.tsx` 页面
10. [ ] 修复 `pages/manager/warehouse-categories/index.tsx` 页面
11. [ ] 修复 `pages/super-admin/warehouse-edit/index.tsx` 页面

## 关键问题
1. **字段名不匹配**：
   - 代码使用：`name`, `category_id`, `driver_price`, `driver_with_vehicle_price`
   - 数据库实际：`category_name`, `warehouse_id`, `unit_price`, `upstairs_price`, `sorting_unit_price`

2. **逻辑问题**：
   - `category_prices` 表本身就是品类表，不需要额外的 `category_id` 外键
   - 每个品类都属于一个仓库（`warehouse_id`）
   - 品类名称在同一仓库内唯一（`UNIQUE(warehouse_id, category_name)`）

## 修复策略
1. 统一使用数据库实际字段名
2. 简化品类管理逻辑，移除不存在的 `category_id` 引用
3. 更新所有相关页面和 API 函数
