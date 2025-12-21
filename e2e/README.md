# 司机端 E2E 测试说明

## 概述

本测试套件用于测试司机端所有页面的导航流程，记录所有 API 调用和函数执行情况。

## 测试范围

### 司机端页面列表

| 序号 | 页面路径 | 功能说明 |
|------|---------|---------|
| 1 | `/pages/driver/index` | 司机工作台首页 |
| 2 | `/pages/driver/piece-work-entry/index` | 计件录入 |
| 3 | `/pages/driver/clock-in/index` | 考勤打卡 |
| 4 | `/pages/driver/leave/index` | 请假管理 |
| 5 | `/pages/driver/leave/apply/index` | 请假申请 |
| 6 | `/pages/driver/leave/resign/index` | 离职申请 |
| 7 | `/pages/driver/vehicle-list/index` | 车辆列表 |
| 8 | `/pages/driver/add-vehicle/index` | 添加车辆 |
| 9 | `/pages/driver/vehicle-detail/index` | 车辆详情 |
| 10 | `/pages/driver/edit-vehicle/index` | 编辑车辆 |
| 11 | `/pages/driver/return-vehicle/index` | 退车 |
| 12 | `/pages/driver/supplement-photos/index` | 补充照片 |
| 13 | `/pages/driver/piece-work/index` | 计件记录 |
| 14 | `/pages/driver/warehouse-stats/index` | 仓库统计 |
| 15 | `/pages/driver/attendance/index` | 考勤记录 |
| 16 | `/pages/driver/notifications/index` | 通知消息 |
| 17 | `/pages/driver/profile/index` | 司机资料 |
| 18 | `/pages/driver/license-ocr/index` | 驾照识别 |

## 运行测试

### 前置条件

1. **构建 H5 版本**
   ```bash
   pnpm taro build --type h5
   ```

2. **启动本地服务器**
   ```bash
   npx serve dist -l 8080 -s
   ```

3. **安装 Playwright**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

### 运行命令

```bash
# 运行所有 E2E 测试（headed 模式）
npm run test:e2e

# 运行司机端导航测试
npm run test:driver-nav

# 使用 UI 模式运行测试
npm run test:e2e:ui

# 查看测试报告
npm run test:e2e:report

# 使用 PowerShell 脚本运行
powershell -ExecutionPolicy Bypass -File scripts/run-e2e-test.ps1
```

## 测试内容

### 1. 完整页面导航流程测试

- 从登录页开始
- 登录测试账号（司机角色）
- 进入司机工作台
- 逐级进入每个子页面
- 逐级返回
- 记录所有 API 调用

### 2. 多次重复导航测试（校准数据）

- 重复 3 次导航流程
- 记录每次的 API 调用数
- 计算平均值、最大值、最小值
- 用于校准和对比

### 3. 车辆模块完整流程测试

- 进入车辆列表
- 添加车辆
- 查看车辆详情
- 编辑车辆
- 退车操作
- 返回首页

## 测试报告

测试完成后会生成以下报告：

- **HTML 报告**: `playwright-report/index.html`
- **JSON 结果**: `test-results/results.json`
- **Markdown 报告**: `test-results/driver-navigation-*.md`

## 记录的数据

### API 调用记录

- URL
- HTTP 方法
- 请求时间
- 响应状态码
- 响应时间
- 请求体
- 响应体
- Supabase 表名
- 操作类型（select/insert/update/delete）

### 页面访问记录

- 页面路径
- 页面标题
- 进入时间
- 退出时间
- 停留时长
- API 调用列表
- 错误列表
- 控制台日志

### 测试汇总

- 总页面数
- 已访问页面数
- 成功页面数
- 失败页面列表
- 总 API 调用次数
- 总测试时长

## 配置说明

### 测试账号

在 `e2e/driver-navigation.spec.ts` 中配置：

```typescript
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8080',
  testAccount: {
    username: 'driver1',
    password: 'test123456'
  },
  pageLoadTimeout: 10000,
  apiTimeout: 5000,
  repeatCount: 3,
  navigationDelay: 1000
}
```

### Playwright 配置

在 `playwright.config.ts` 中配置：

- 测试目录
- 浏览器/设备
- 超时时间
- 报告格式
- 截图/视频录制

## 注意事项

1. **必须使用 headed 模式**：根据项目规则，所有 Playwright 测试必须使用 headed 模式运行

2. **本地服务器端口**：必须使用 8080 端口，因为 Supabase CORS 已配置该端口

3. **测试账号**：确保测试账号存在且角色为司机

4. **网络环境**：测试需要访问 Supabase 后端服务

## 故障排除

### 登录失败

- 检查测试账号是否存在
- 检查账号角色是否为司机
- 检查 Supabase 服务是否正常

### 页面加载超时

- 增加 `pageLoadTimeout` 配置
- 检查网络连接
- 检查本地服务器是否正常运行

### API 调用失败

- 检查 Supabase 配置
- 检查 CORS 设置
- 查看浏览器控制台错误

## 扩展测试

如需添加新的测试页面，在 `DRIVER_PAGES` 配置中添加：

```typescript
'new-page': {
  path: '/pages/driver/new-page/index',
  title: '新页面',
  navigateFrom: 'home',
  navigateTo: []
}
```
