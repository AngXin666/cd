# Tasks Document

## Task 1: 后端 - 添加仓库类型枚举和映射

### Description
在后端 models.py 中添加 WarehouseType 枚举，并在 helpers.py 中添加类型到单位的映射函数。

### Files to Modify
- `fleet-manager/backend/models.py`
- `fleet-manager/backend/helpers.py`

### Requirements Addressed
- Requirement 1: 仓库类型定义

### Acceptance Criteria
- [x] WarehouseType 枚举包含 PIECE, POINT, WHOLE, DISTANCE 四个值
- [x] 类型到单位映射正确（piece→件, point→点, whole→车, distance→公里）
- [x] 类型到显示名称映射正确（piece→计件, point→点位, whole→整车, distance→距离）
- [x] get_warehouse_preset_unit() 函数正确返回预设单位
- [x] 代码包含完整注释

---

## Task 2: 后端 - 更新 Warehouse 模型

### Description
在 Warehouse 模型中添加 warehouse_type 字段，默认值为 PIECE。

### Files to Modify
- `fleet-manager/backend/models.py`

### Dependencies
- Task 1

### Requirements Addressed
- Requirement 1: 仓库类型定义

### Acceptance Criteria
- [x] Warehouse 模型包含 warehouse_type 字段
- [x] 字段类型为 WarehouseType 枚举
- [x] 默认值为 WarehouseType.PIECE
- [x] 字段包含描述信息
- [x] 代码包含完整注释

---

## Task 3: 后端 - 更新仓库相关 Schema

### Description
更新 WarehouseBase、WarehouseCreate、WarehouseUpdate、WarehouseResponse 等 Schema，添加 warehouse_type 和 preset_unit 字段。

### Files to Modify
- `fleet-manager/backend/schemas.py`

### Dependencies
- Task 1

### Requirements Addressed
- Requirement 7: API 接口更新

### Acceptance Criteria
- [x] WarehouseBase 包含 warehouse_type 字段
- [x] WarehouseCreate 支持设置 warehouse_type
- [x] WarehouseUpdate 支持更新 warehouse_type
- [x] WarehouseResponse 包含 warehouse_type 和 preset_unit
- [x] 导入 WarehouseType 枚举
- [x] 代码包含完整注释

---

## Task 4: 后端 - 更新仓库 API 端点

### Description
更新仓库相关的 API 端点，支持仓库类型的创建、更新和查询，并在响应中返回预设单位。

### Files to Modify
- `fleet-manager/backend/routers/warehouses.py` 或 `fleet-manager/backend/main.py`

### Dependencies
- Task 2
- Task 3

### Requirements Addressed
- Requirement 7: API 接口更新

### Acceptance Criteria
- [x] GET /warehouses 返回包含 warehouse_type 和 preset_unit
- [x] GET /warehouses/{id} 返回包含 warehouse_type 和 preset_unit
- [x] POST /warehouses 支持设置 warehouse_type
- [x] PUT /warehouses/{id} 支持更新 warehouse_type
- [x] 支持按 warehouse_type 筛选仓库
- [x] 代码包含完整注释

---

## Task 5: 后端 - 添加品类单位筛选 API

### Description
为品类 API 添加按单位筛选的功能，并添加获取仓库可用品类的端点。

### Files to Modify
- `fleet-manager/backend/routers/categories.py` 或 `fleet-manager/backend/main.py`

### Dependencies
- Task 1

### Requirements Addressed
- Requirement 4: 仓库品类关联
- Requirement 7: API 接口更新

### Acceptance Criteria
- [x] GET /categories 支持 unit 参数筛选
- [x] GET /warehouses/{id}/categories 返回匹配仓库类型的品类
- [x] 代码包含完整注释

---

## Task 6: 后端 - 添加计件记录单位验证

### Description
在创建计件记录时，验证品类单位是否与仓库类型匹配。

### Files to Modify
- `fleet-manager/backend/helpers.py`
- `fleet-manager/backend/routers/piece_work.py` 或 `fleet-manager/backend/main.py`

### Dependencies
- Task 1
- Task 2

### Requirements Addressed
- Requirement 3: 品类单位限制

### Acceptance Criteria
- [x] validate_category_unit_for_warehouse() 函数实现
- [x] 创建计件记录时调用验证函数
- [x] 单位不匹配时返回 400 错误和明确的错误消息
- [x] 代码包含完整注释

---

## Task 7: 后端 - 更新统计 API 返回单位信息

### Description
更新统计相关 API，在返回数据中包含单位信息，支持按仓库类型分组统计。

### Files to Modify
- `fleet-manager/backend/schemas.py`
- `fleet-manager/backend/routers/statistics.py` 或 `fleet-manager/backend/main.py`

### Dependencies
- Task 1
- Task 2

### Requirements Addressed
- Requirement 6: 数据统计单位显示

### Acceptance Criteria
- [x] PieceWorkStatsResponse 包含 unit 字段
- [x] 统计 API 返回正确的单位信息
- [x] 支持按仓库分组统计，每组包含对应单位
- [x] 代码包含完整注释

---

## Task 8: 后端 - 数据迁移

### Description
为现有仓库数据添加默认的 warehouse_type 值（piece）。

### Files to Modify
- `fleet-manager/backend/database.py` 或创建迁移脚本

### Dependencies
- Task 2

### Requirements Addressed
- Requirement 5: 数据迁移

### Acceptance Criteria
- [x] 现有仓库默认设置为 "piece" 类型
- [x] 迁移不影响现有数据
- [x] 迁移可重复执行（幂等性）
- [x] 代码包含完整注释

---

## Task 9: 前端 - 添加仓库类型 TypeScript 定义

### Description
在前端类型定义文件中添加 WarehouseType 枚举和相关映射。

### Files to Modify
- `fleet-manager/frontend/src/api/types.ts`

### Requirements Addressed
- Requirement 1: 仓库类型定义

### Acceptance Criteria
- [x] WarehouseType 枚举定义
- [x] WAREHOUSE_TYPE_DISPLAY_NAMES 映射
- [x] WAREHOUSE_TYPE_UNITS 映射
- [x] getWarehouseTypeDisplayName() 函数
- [x] getWarehousePresetUnit() 函数
- [x] Warehouse 接口包含 warehouse_type 和 preset_unit
- [x] WarehouseCreate 和 WarehouseUpdate 接口更新
- [x] 代码包含完整注释

---

## Task 10: 前端 - 更新仓库编辑页面

### Description
在仓库编辑页面添加仓库类型选择器，显示预设单位。

### Files to Modify
- `fleet-manager/frontend/src/pages/boss/warehouses/edit.vue`

### Dependencies
- Task 9

### Requirements Addressed
- Requirement 2: 仓库编辑页面增强

### Acceptance Criteria
- [x] 显示仓库类型选择器（四个选项）
- [x] 选择类型时显示对应的预设单位
- [x] 新建仓库默认选择"计件"类型
- [x] 保存时提交 warehouse_type 字段
- [x] 加载时正确显示当前仓库类型
- [x] 代码包含完整注释

---

## Task 11: 前端 - 更新仓库列表页面

### Description
在仓库列表页面显示仓库类型和预设单位。

### Files to Modify
- `fleet-manager/frontend/src/pages/boss/warehouses/index.vue`

### Dependencies
- Task 9

### Requirements Addressed
- Requirement 2: 仓库编辑页面增强

### Acceptance Criteria
- [x] 列表项显示仓库类型标签
- [x] 列表项显示预设单位
- [x] 支持按仓库类型筛选（可选）
- [x] 代码包含完整注释

---

## Task 12: 前端 - 更新计件录入页面

### Description
在计件录入页面，根据选择的仓库类型筛选可用品类。

### Files to Modify
- `fleet-manager/frontend/src/pages/driver/piece-work/record.vue` 或相关页面

### Dependencies
- Task 5
- Task 9

### Requirements Addressed
- Requirement 3: 品类单位限制
- Requirement 4: 仓库品类关联

### Acceptance Criteria
- [x] 选择仓库后，只显示匹配单位的品类
- [x] 显示当前仓库的预设单位
- [x] 单位不匹配时给出提示
- [x] 代码包含完整注释

---

## Task 13: 前端 - 更新统计页面单位显示

### Description
在所有统计页面根据仓库类型自动显示对应单位。

### Files to Modify
- `fleet-manager/frontend/src/pages/boss/statistics/` 相关页面
- `fleet-manager/frontend/src/pages/manager/statistics/` 相关页面

### Dependencies
- Task 7
- Task 9

### Requirements Addressed
- Requirement 6: 数据统计单位显示

### Acceptance Criteria
- [x] 单仓库统计显示该仓库的预设单位
- [x] 多仓库汇总按类型分组显示单位
- [x] 数量后面显示正确的单位（如 "100 件"、"50 点"）
- [x] 代码包含完整注释

---

## Task 14: 测试 - 后端单元测试

### Description
为仓库类型相关功能编写单元测试。

### Files to Create
- `fleet-manager/backend/tests/test_warehouse_type.py`

### Dependencies
- Task 1 ~ Task 8

### Requirements Addressed
- 所有需求的验证

### Acceptance Criteria
- [x] 测试仓库类型枚举值
- [x] 测试类型到单位映射
- [x] 测试单位验证逻辑
- [x] 测试 API 端点
- [x] 所有测试通过

---

## Task 15: 测试 - 集成测试

### Description
编写端到端的集成测试，验证完整的仓库类型功能流程。

### Files to Create
- `fleet-manager/backend/tests/test_warehouse_type_integration.py`

### Dependencies
- Task 14

### Requirements Addressed
- 所有需求的验证

### Acceptance Criteria
- [x] 测试创建带类型的仓库
- [x] 测试更新仓库类型
- [x] 测试品类筛选
- [x] 测试计件记录单位验证
- [x] 测试统计单位显示
- [x] 所有测试通过

---

## Task Summary

| Task | 描述 | 依赖 | 状态 |
|------|------|------|------|
| 1 | 添加仓库类型枚举和映射 | - | [x] done |
| 2 | 更新 Warehouse 模型 | 1 | [x] done |
| 3 | 更新仓库相关 Schema | 1 | [x] done |
| 4 | 更新仓库 API 端点 | 2, 3 | [x] done |
| 5 | 添加品类单位筛选 API | 1 | [x] done |
| 6 | 添加计件记录单位验证 | 1, 2 | [x] done |
| 7 | 更新统计 API 返回单位信息 | 1, 2 | [x] done |
| 8 | 数据迁移 | 2 | [x] done |
| 9 | 前端仓库类型 TypeScript 定义 | - | [x] done |
| 10 | 更新仓库编辑页面 | 9 | [x] done |
| 11 | 更新仓库列表页面 | 9 | [x] done |
| 12 | 更新计件录入页面 | 5, 9 | [x] done |
| 13 | 更新统计页面单位显示 | 7, 9 | [x] done |
| 14 | 后端单元测试 | 1-8 | [x] done |
| 15 | 集成测试 | 14 | [x] done |

## Execution Order

建议按以下顺序执行任务：

### 阶段 1：后端基础（Task 1-3）
1. Task 1: 添加枚举和映射
2. Task 2: 更新模型
3. Task 3: 更新 Schema

### 阶段 2：后端 API（Task 4-8）
4. Task 4: 更新仓库 API
5. Task 5: 品类筛选 API
6. Task 6: 单位验证
7. Task 7: 统计 API
8. Task 8: 数据迁移

### 阶段 3：前端实现（Task 9-13）
9. Task 9: TypeScript 定义
10. Task 10: 仓库编辑页面
11. Task 11: 仓库列表页面
12. Task 12: 计件录入页面
13. Task 13: 统计页面

### 阶段 4：测试（Task 14-15）
14. Task 14: 单元测试
15. Task 15: 集成测试
