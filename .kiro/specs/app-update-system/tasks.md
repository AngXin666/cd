# H5热更新系统实现任务列表

**注意：已改为H5热更新方案，无需下载APK，用户无感知更新**

- [x] 1. 创建H5版本管理数据库表
  - 创建 `supabase/migrations/create_h5_versions.sql` 文件
  - 包含创建 `h5_versions` 表的SQL语句
  - 包含RLS策略（公开可读）
  - _Requirements: 1.1, 1.2_

- [x] 2. 实现H5版本检查服务
  - 创建 `src/services/h5UpdateService.ts`
  - 实现版本比较函数（比较 "1.0.0" 和 "1.0.1" 这样的版本号）
  - 实现从Supabase查询最新H5版本
  - 实现检查是否需要更新的函数
  - 实现应用H5更新（重新加载页面）
  - _Requirements: 2.1, 2.2, 5.4_

- [x] 3. 创建H5更新对话框
  - 创建 `src/components/H5UpdateDialog/index.tsx`
  - 显示版本号和更新说明
  - 强制更新时只显示"立即更新"按钮
  - 可选更新时显示"稍后"和"立即更新"按钮
  - _Requirements: 3.1, 3.2, 3.3, 7.1_

- [x] 4. 在应用启动时添加版本检查
  - 修改 `src/app.tsx` 在应用启动时检查H5版本
  - 有新版本时显示更新对话框
  - 点击"立即更新"重新加载应用
  - _Requirements: 2.1, 3.4, 4.1_

- [x] 5. 创建部署脚本和文档
  - 创建 `scripts/deploy-h5.ps1` 自动化部署脚本
  - 创建 `docs/h5-hot-update-guide.md` 使用文档
  - 包含完整的部署流程说明
  - _Requirements: 所有_

## 使用方法

### 首次设置

1. 在Supabase Dashboard执行SQL创建表：
   ```bash
   # 打开 supabase/migrations/create_h5_versions.sql
   # 复制内容到Supabase SQL编辑器执行
   ```

2. 在Supabase创建公开的Storage bucket：
   - 名称：`h5-app`
   - 公开访问：是

### 日常更新流程

每次修复bug或更新功能后：

```powershell
# 运行部署脚本
.\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "修复登录bug" -ForceUpdate $false
```

脚本会自动：
1. 更新版本号
2. 构建H5代码
3. 上传到Supabase Storage（如果安装了CLI）
4. 生成SQL语句

然后在Supabase Dashboard执行生成的SQL即可。

用户下次打开APP时会自动检测并应用更新！

详细文档：`docs/h5-hot-update-guide.md`
