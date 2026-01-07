# Tasks

## Task 1: 创建报表类型定义

- [x] 在 `fleet-manager/frontend/src/types/report.ts` 创建报表相关类型
  - [x] 定义 `ReportPeriodType` 枚举（daily/weekly/monthly）
  - [x] 定义 `WarehouseStatItem` 接口
  - [x] 定义 `DriverStatItem` 接口
  - [x] 定义 `DateRange` 接口

## Task 2: 创建报表工具函数

- [x] 在 `fleet-manager/frontend/src/utils/report.ts` 创建日期计算函数
  - [x] 实现 `calculateDateRange(periodType, baseDate)` 函数
  - [x] 实现 `navigatePrevious(periodType, currentDate)` 函数
  - [x] 实现 `navigateNext(periodType, currentDate)` 函数
  - [x] 实现 `formatPeriodLabel(periodType, date)` 函数
  - [x] 实现 `canNavigateNext(periodType, currentDate)` 函数

## Task 3: 创建后端报表 API

- [x] 在 `fleet-manager/backend/routers/report.py` 创建报表路由
  - [x] 实现 `GET /api/report/warehouses` 仓库统计列表接口
  - [x] 实现 `GET /api/report/warehouse/{id}/drivers` 司机统计列表接口
  - [x] 实现 `GET /api/report/driver/{id}/records` 计件记录列表接口
  - [x] 添加权限验证（老板/车队长）
  - [x] 车队长只能查看管辖仓库数据
- [x] 在 `fleet-manager/backend/main.py` 注册报表路由

## Task 4: 创建前端报表 API

- [x] 在 `fleet-manager/frontend/src/api/report.ts` 创建 API 封装
  - [x] 实现 `getWarehouseStats(params)` 函数
  - [x] 实现 `getWarehouseDriverStats(warehouseId, params)` 函数
  - [x] 实现 `getDriverRecords(driverId, params)` 函数
- [x] 在 `fleet-manager/frontend/src/api/index.ts` 导出报表 API

## Task 5: 创建报表主页

- [x] 在 `fleet-manager/frontend/src/pages/common/report/index.vue` 创建报表主页
  - [x] 实现标签页切换（日报/周报/月报）
  - [x] 实现日期导航（上一天/周/月、下一天/周/月）
  - [x] 实现仓库卡片列表展示
  - [x] 实现点击仓库卡片跳转到仓库详情页
  - [x] 实现加载状态和空数据提示
- [x] 在 `fleet-manager/frontend/src/pages.json` 注册报表主页路由

## Task 6: 创建仓库详情页

- [x] 在 `fleet-manager/frontend/src/pages/common/report/warehouse.vue` 创建仓库详情页
  - [x] 显示仓库名称和当前周期
  - [x] 实现司机卡片列表展示
  - [x] 实现点击司机卡片跳转到司机详情页
  - [x] 实现加载状态和空数据提示
- [x] 在 `fleet-manager/frontend/src/pages.json` 注册仓库详情页路由

## Task 7: 创建司机详情页

- [x] 在 `fleet-manager/frontend/src/pages/common/report/driver.vue` 创建司机详情页
  - [x] 显示司机姓名、仓库名称和当前周期
  - [x] 显示统计汇总（总件数、总金额）
  - [x] 实现计件记录列表展示
  - [x] 实现加载状态和空数据提示
- [x] 在 `fleet-manager/frontend/src/pages.json` 注册司机详情页路由

## Task 8: 添加报表入口

- [x] 在 `fleet-manager/frontend/src/pages/boss/stats/index.vue` 添加报表入口按钮
- [x] 在 `fleet-manager/frontend/src/pages/manager/stats/index.vue` 添加报表入口按钮
- [x] 实现点击跳转到报表主页

## Task 9: 测试和验证

- [x] 测试老板端报表功能
  - [x] 验证可以查看所有仓库数据
  - [x] 验证日报/周报/月报切换正常
  - [x] 验证日期导航正常
  - [x] 验证三级钻取流程正常
- [x] 测试车队长端报表功能
  - [x] 验证只能查看管辖仓库数据
  - [x] 验证功能与老板端一致
- [x] 验证数据计算正确性
  - [x] 验证仓库统计数据正确
  - [x] 验证司机统计数据正确
  - [x] 验证排序正确（按件数降序）
