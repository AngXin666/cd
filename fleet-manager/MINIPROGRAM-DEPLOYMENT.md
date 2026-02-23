# 车队管家 - 小程序部署指南

## 概述

将车队管家完整功能（老板端、车队长端、司机端）部署到微信小程序。

## 小程序信息

- **AppID**: wxf11a504cd3e01346
- **AppSecret**: bbc880134b2613fa0e495ac722bdad5c（请在部署后重置）
- **名称**: 车队管家

## 与 Android APP 的区别

| 功能 | Android APP | 小程序 |
|------|-------------|--------|
| 热更新 | ✅ 支持 wgt 热更新 | ❌ 不支持（由微信管理） |
| 实时通知 | ✅ SSE 推送 | ✅ SSE 推送 |
| 离线存储 | ✅ 无限制 | ⚠️ 10MB 限制 |
| 文件上传 | ✅ 无限制 | ⚠️ 10MB 限制 |
| 协议要求 | HTTP/HTTPS | ✅ 必须 HTTPS |

## 部署步骤

### 1. 修改代码（移除热更新）

需要修改以下文件：

#### 1.1 修改 `src/App.vue`

移除热更新检查代码：

```typescript
// 删除这行
import { checkUpdateOnLaunch } from '@/utils/update';

// 删除 onLaunch 中的这段代码
checkUpdateOnLaunch();
```

#### 1.2 删除热更新相关文件

```bash
# 删除热更新工具文件
rm frontend/src/utils/update.ts
```

#### 1.3 修改 `manifest.json`

已配置小程序 AppID：`wxf11a504cd3e01346`

### 2. 配置后端服务器域名

#### 2.1 确保后端使用 HTTPS

小程序要求所有网络请求必须使用 HTTPS 协议。

当前后端地址：`http://45.197.148.64:8000`

**需要配置 HTTPS：**

方案 1：使用 Nginx 反向代理 + Let's Encrypt 证书
```bash
# 在服务器上安装 Nginx 和 Certbot
sudo apt install nginx certbot python3-certbot-nginx

# 配置域名（需要先购买域名并解析到服务器）
# 假设域名为 api.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

方案 2：使用腾讯云 Serverless（推荐，免费）
- 自动提供 HTTPS 域名
- 无需管理服务器
- 完全免费（30 个用户在免费额度内）

#### 2.2 在微信小程序后台配置服务器域名

登录 [微信小程序后台](https://mp.weixin.qq.com/)：

1. 进入「开发」->「开发管理」->「开发设置」
2. 找到「服务器域名」配置
3. 添加以下域名：

```
request 合法域名：
https://your-backend-domain.com

uploadFile 合法域名：
https://your-backend-domain.com

downloadFile 合法域名：
https://your-backend-domain.com
```

### 3. 修改前端配置

修改 `frontend/.env.production`：

```bash
# 小程序生产环境配置
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

### 4. 构建小程序

```bash
cd frontend

# 安装依赖（如果还没安装）
npm install

# 构建小程序版本
npm run build:mp-weixin
```

构建产物在 `frontend/dist/build/mp-weixin` 目录。

### 5. 使用微信开发者工具

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具
3. 选择「导入项目」
4. 选择 `frontend/dist/build/mp-weixin` 目录
5. 填入 AppID：`wxf11a504cd3e01346`
6. 点击「导入」

### 6. 测试功能

在微信开发者工具中测试所有功能：

- [ ] 登录功能
- [ ] 老板端功能
- [ ] 车队长端功能
- [ ] 司机端功能
- [ ] 打卡功能
- [ ] 计件录入
- [ ] 请假申请
- [ ] 车辆管理
- [ ] 实时通知

### 7. 上传代码

1. 在微信开发者工具中点击「上传」
2. 填写版本号和项目备注
3. 上传成功后，代码会出现在微信小程序后台

### 8. 提交审核

1. 登录 [微信小程序后台](https://mp.weixin.qq.com/)
2. 进入「版本管理」
3. 找到刚上传的版本
4. 点击「提交审核」
5. 填写审核信息：
   - 功能描述：车队管理系统，包含考勤打卡、计件管理、请假审批、车辆管理等功能
   - 测试账号：提供测试账号和密码
6. 等待审核（通常 1-7 天）

### 9. 发布上线

审核通过后：
1. 在「版本管理」中点击「发布」
2. 用户即可在微信中搜索「车队管家」使用

## 推荐部署方案：腾讯云 Serverless

### 优势

- ✅ 完全免费（30 个用户在免费额度内）
- ✅ 自动提供 HTTPS 域名（无需备案）
- ✅ 无需管理服务器
- ✅ 自动扩缩容
- ✅ 与微信小程序无缝集成

### 部署步骤

详见 `SERVERLESS-DEPLOYMENT.md`（待创建）

## 常见问题

### Q1: 小程序提示"不在以下 request 合法域名列表中"

A: 需要在微信小程序后台配置服务器域名白名单。

### Q2: 小程序无法使用 HTTP 协议

A: 小程序强制要求 HTTPS，需要为后端配置 SSL 证书。

### Q3: 热更新功能如何处理？

A: 小程序不支持热更新，所有更新都需要通过微信审核发布。

### Q4: 数据库需要备案吗？

A: 不需要。数据库是后端内部连接，使用 IP 地址即可。

### Q5: Android APP 和小程序可以共存吗？

A: 可以！它们是两个独立的客户端，共用同一个后端服务。

## 后续维护

### 更新流程

1. 修改代码
2. 构建小程序：`npm run build:mp-weixin`
3. 使用微信开发者工具上传
4. 提交审核
5. 审核通过后发布

### 版本管理

建议使用语义化版本号：
- 主版本号：重大功能变更
- 次版本号：新增功能
- 修订号：Bug 修复

例如：1.0.0 -> 1.1.0 -> 1.1.1

## 联系方式

如有问题，请联系技术支持。
