# 热更新发布指南

## 版本 1.0.5 - 修复通知中心跳转问题

### 修复内容
- 修复老板和车队长工作台点击通知中心没响应的问题
- 从 tabBar 页面列表中移除 `/pages/notifications/index`（通知中心不是 tabBar 页面）

### 发布步骤

#### 1. 版本号已更新 ✅
- manifest.json: 1.0.4 → 1.0.5 (104 → 105)
- update.ts: 版本常量已同步更新

#### 2. 生成 wgt 热更新包

**方法 A: 使用 HBuilderX（推荐）**
1. 在 HBuilderX 中打开项目
2. 选择菜单：发行 → 原生App-制作应用wgt包
3. 等待打包完成，wgt 文件会生成在 `unpackage/release/` 目录

**方法 B: 使用命令行**
```bash
cd fleet-manager/frontend
npm run build:app
# 然后手动将 dist/build/app 目录打包为 .wgt 文件
cd dist/build/app
zip -r ../../../FleetManager-v1.0.5.wgt *
```

#### 3. 上传 wgt 包到服务器

```bash
# 启动后端服务（如果还没启动）
cd fleet-manager/backend
source venv/bin/activate  # Mac/Linux
python main.py

# 使用 API 上传 wgt 包
curl -X POST "http://localhost:8000/api/app/version/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@FleetManager-v1.0.5.wgt"

# 响应示例：
# {
#   "success": true,
#   "url": "/uploads/app_updates/20250105120000_abc123.wgt",
#   "filename": "20250105120000_abc123.wgt",
#   "file_size": 1234567,
#   "md5": "abc123def456...",
#   "update_type": "wgt"
# }
```

#### 4. 发布新版本

使用上一步返回的信息发布新版本：

```bash
curl -X POST "http://localhost:8000/api/app/version" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version_name": "1.0.5",
    "version_code": 105,
    "platform": "android",
    "update_type": "wgt",
    "download_url": "/uploads/app_updates/20250105120000_abc123.wgt",
    "file_size": 1234567,
    "md5": "abc123def456...",
    "description": "修复通知中心跳转问题\n- 修复老板和车队长工作台点击通知中心没响应\n- 优化页面跳转逻辑",
    "is_force_update": false,
    "min_compatible_version": 100
  }'
```

#### 5. 测试热更新

1. 在手机上打开旧版本 APP (1.0.4)
2. 等待 2 秒，应该会自动弹出更新提示
3. 或者在个人中心点击"检查更新"
4. 点击"立即更新"下载并安装 wgt 包
5. 重启 APP 后验证通知中心跳转是否正常

### 验证清单

- [ ] 版本号已更新到 1.0.5
- [ ] wgt 包已生成
- [ ] wgt 包已上传到服务器
- [ ] 新版本已发布到数据库
- [ ] 旧版本 APP 能检测到更新
- [ ] 热更新下载和安装成功
- [ ] 重启后通知中心跳转正常

### 回滚方案

如果热更新出现问题，可以：
1. 在数据库中将 1.0.5 版本的 `is_active` 设置为 `false`
2. 用户会回退到 1.0.4 版本
3. 或者发布新的修复版本 1.0.6

### 注意事项

1. **热更新限制**：
   - 只能更新前端资源（HTML/CSS/JS）
   - 不能更新原生插件和配置
   - 不能更新 manifest.json 中的权限配置

2. **兼容性**：
   - `min_compatible_version: 100` 表示最低兼容 1.0.0 版本
   - 如果用户版本低于 100，会提示整包更新

3. **强制更新**：
   - 当前设置为可选更新 (`is_force_update: false`)
   - 如果需要强制更新，设置为 `true`

## 相关文件

- 前端版本配置: `fleet-manager/frontend/src/manifest.json`
- 热更新服务: `fleet-manager/frontend/src/utils/update.ts`
- 后端 API: `fleet-manager/backend/routers/app_version.py`
- 修复的文件:
  - `fleet-manager/frontend/src/pages/boss/index/index.vue`
  - `fleet-manager/frontend/src/pages/manager/index/index.vue`
