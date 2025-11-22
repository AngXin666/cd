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
6. [x] 修复 `api.ts` 中的 `upsertCategoryPrice` 函数
7. [x] 修复 `api.ts` 中的 `batchUpsertCategoryPrices` 函数
8. [x] 修复 `api.ts` 中的 `getWarehouseCategoriesWithDetails` 函数
9. [x] 修复 `api.ts` 中的 `getCategoryPrice` 函数
10. [x] 修复 `api.ts` 中的 `getCategoryPriceForDriver` 函数
11. [x] 修复 `pages/super-admin/category-management/index.tsx` 页面
12. [x] 修复 `pages/manager/warehouse-categories/index.tsx` 页面
13. [x] 修复 `pages/super-admin/warehouse-edit/index.tsx` 页面
14. [x] 修复 `pages/driver/piece-work-entry/index.tsx` 页面
15. [x] 修复 `pages/driver/piece-work/index.tsx` 页面
16. [x] 修复 `pages/driver/warehouse-stats/index.tsx` 页面
17. [x] 修复 `pages/manager/data-summary/index.tsx` 页面

## 关键修复内容

### 1. 字段名映射
- `name` → `category_name`
- `category_id` → 移除（使用 `id`）
- `driver_price` → `unit_price`
- `driver_with_vehicle_price` → `upstairs_price`
- 新增：`sorting_unit_price`

### 2. UI 字段映射
- "纯司机" → "单价"
- "带车司机" → "上楼"
- 新增："分拣"

### 3. 价格模型变更
**旧模型**：根据司机类型选择价格
- driver_price（纯司机价格）
- driver_with_vehicle_price（带车司机价格）

**新模型**：根据工作类型选择价格
- unit_price（单价）
- upstairs_price（上楼价格）
- sorting_unit_price（分拣单价）

**兼容性处理**：
- 在 `driver/piece-work-entry` 页面中，保持根据司机类型选择价格的逻辑
- 映射关系：纯司机 → unit_price，带车司机 → upstairs_price

### 4. 数据库设计说明
- `category_prices` 表本身就是品类表，不需要额外的 `category_id` 外键
- 每个品类都属于一个仓库（`warehouse_id`）
- 品类名称在同一仓库内唯一（`UNIQUE(warehouse_id, category_name)`）

## 修复完成
所有品类相关的 TypeScript 错误已修复。剩余的 lint 错误与品类系统无关。
