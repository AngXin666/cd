# SafeAreaTop 集成部署指南

## 文档信息

| 项目 | 内容 |
|------|------|
| **版本** | 1.0.0 |
| **创建日期** | 2024-12-15 |
| **功能名称** | SafeAreaTop 顶部安全区域集成 |
| **部署类型** | H5 热更新 |
| **建议版本号** | 1.0.6 |

---

## 一、部署概述

### 1.1 功能说明

本次部署将 SafeAreaTop 组件集成到项目的所有 72 个页面中，解决页面内容与系统状态栏重叠的问题。

### 1.2 主要变更

| 变更类型 | 数量 | 说明 |
|----------|------|------|
| 新增组件使用 | 72 | 所有页面添加 SafeAreaTop |
| 修改页面文件 | 72 | 添加导入和组件使用 |
| 新增文档 | 3 | 组件文档、开发规范、迁移指南 |
| 新增脚本 | 3 | 扫描、测试、修复脚本 |

### 1.3 测试状态

| 测试类型 | 状态 | 详情 |
|----------|------|------|
| 单元测试 | ✅ 通过 | 8/8 测试用例全部通过 |
| TypeScript 编译 | ✅ 通过 | 无类型错误 |
| Lint 检查 | ✅ 通过 | 无代码规范错误 |
| H5 构建 | ✅ 通过 | 21.20s 完成 |
| 手动测试 | ✅ 通过 | 17/17 页面验证通过 |

---

## 二、部署前检查清单

### 2.1 代码检查

- [ ] 所有代码已提交到版本控制
- [ ] 代码审查已完成
- [ ] 所有测试通过
- [ ] 无未解决的冲突

### 2.2 构建检查

- [ ] 本地 H5 构建成功
- [ ] TypeScript 编译无错误
- [ ] Lint 检查无错误

### 2.3 环境检查

- [ ] Supabase 服务正常
- [ ] Storage bucket (h5-app) 可访问
- [ ] 数据库连接正常

### 2.4 文档检查

- [ ] 部署文档已准备
- [ ] 回滚计划已准备
- [ ] 相关人员已通知

---

## 三、部署步骤

### 3.1 方式一：使用自动化脚本（推荐）

```powershell
# 1. 构建 H5 代码
npm run build:h5

# 2. 运行部署脚本
node scripts/quick-deploy-h5.js 1.0.6 "SafeAreaTop顶部安全区域集成"
```

**脚本执行流程**：
1. 检查 dist 目录是否存在
2. 创建 bundle.zip 压缩包
3. 上传 bundle.zip 到 Supabase Storage
4. 上传其他文件到 Storage
5. 更新数据库版本记录

### 3.2 方式二：手动部署

#### 步骤 1：构建代码

```powershell
# 构建 H5 代码
npm run build:h5
```

#### 步骤 2：上传文件到 Supabase Storage

1. 打开 Supabase Dashboard：
   https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app

2. 创建新文件夹 `v1.0.6`

3. 进入 `v1.0.6` 文件夹

4. 上传 `dist` 目录下的所有文件和文件夹

#### 步骤 3：更新数据库版本记录

打开 Supabase SQL Editor：
https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

执行以下 SQL：

```sql
-- 将其他版本设为非激活
UPDATE h5_versions SET is_active = false;

-- 添加新版本
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.6',
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.6/',
  'SafeAreaTop顶部安全区域集成：解决页面内容与状态栏重叠问题',
  false,
  true
);

-- 验证版本记录
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
```

---

## 四、部署验证

### 4.1 自动验证

部署完成后，APP 会自动检测到新版本并提示更新。

### 4.2 手动验证

1. **打开 APP**
   - 应该弹出更新对话框
   - 显示版本号 1.0.6
   - 显示更新说明

2. **点击"立即更新"**
   - 下载并安装更新
   - 重启 APP

3. **验证页面显示**
   - 检查 Driver 首页
   - 检查 Manager 首页
   - 检查 Super Admin 首页
   - 确认内容不与状态栏重叠

### 4.3 验证清单

| 验证项 | 预期结果 | 实际结果 |
|--------|----------|----------|
| 更新提示 | 弹出更新对话框 | |
| 版本号 | 显示 1.0.6 | |
| 下载更新 | 成功下载 | |
| 页面显示 | 内容不与状态栏重叠 | |
| 滚动行为 | 正常滚动 | |
| 导航功能 | 正常跳转 | |

---

## 五、监控和反馈

### 5.1 监控指标

| 指标 | 监控方式 | 阈值 |
|------|----------|------|
| 更新成功率 | Supabase 日志 | > 95% |
| 页面加载时间 | 用户反馈 | < 3s |
| 错误报告 | 用户反馈 | 0 |

### 5.2 反馈收集

- 收集用户反馈
- 监控错误日志
- 记录问题和解决方案

---

## 六、相关资源

### 6.1 文档链接

| 文档 | 路径 |
|------|------|
| 需求文档 | `.kiro/specs/safe-area-top-integration/requirements.md` |
| 设计文档 | `.kiro/specs/safe-area-top-integration/design.md` |
| 任务列表 | `.kiro/specs/safe-area-top-integration/tasks.md` |
| 测试报告 | `.kiro/specs/safe-area-top-integration/TEST_REPORT.md` |
| 代码审查 | `.kiro/specs/safe-area-top-integration/CODE_REVIEW_SUMMARY.md` |
| 组件文档 | `src/components/SafeAreaTop/README.md` |
| 开发规范 | `docs/开发指南/新页面开发规范.md` |
| 迁移指南 | `docs/开发指南/SafeAreaTop集成迁移指南.md` |

### 6.2 脚本链接

| 脚本 | 路径 | 用途 |
|------|------|------|
| 部署脚本 | `scripts/quick-deploy-h5.js` | 自动化部署 |
| 扫描脚本 | `scripts/scan-pages-for-safe-area.js` | 扫描页面状态 |
| 测试脚本 | `scripts/test-safe-area-integration.js` | 集成测试 |
| 修复脚本 | `scripts/fix-safe-area-issues.js` | 自动修复问题 |

### 6.3 外部链接

| 资源 | URL |
|------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu |
| Storage Bucket | https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app |
| SQL Editor | https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql |

---

## 七、联系方式

### 7.1 技术支持

如遇到部署问题，请联系：
- 开发团队负责人
- 运维团队

### 7.2 紧急联系

如遇到紧急问题需要回滚，请参考回滚计划文档。

---

**文档维护**: 车队管家开发团队  
**最后更新**: 2024-12-15
