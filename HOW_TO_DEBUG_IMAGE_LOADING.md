# 如何调试个人信息页面图片加载问题

## 问题描述

您反馈司机个人信息页面的证件照片无法加载显示。我已经添加了详细的调试日志来帮助定位问题。

## 查看调试信息的步骤

### 方法1：使用微信开发者工具（推荐）

1. **打开微信开发者工具**
   - 启动微信开发者工具
   - 打开车队管家小程序项目

2. **进入司机个人信息页面**
   - 在模拟器中登录司机账号
   - 点击底部"我的"标签
   - 进入"个人信息"页面

3. **打开控制台**
   - 点击开发者工具底部的"Console"标签
   - 或使用快捷键 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

4. **查看日志输出**
   
   您应该能看到类似以下的日志：
   
   ```
   个人资料数据: {id: "xxx", name: "xxx", phone: "xxx", ...}
   驾驶证信息: {id: "xxx", driver_id: "xxx", ...}
   身份证正面路径: "user_id/id_card_front.jpg"
   身份证背面路径: "user_id/id_card_back.jpg"  
   驾驶证照片路径: "user_id/driving_license.jpg"
   原始图片路径: user_id/id_card_front.jpg
   使用的bucket: app-7cdqf07mbu9t_avatars
   生成的公共URL: https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/id_card_front.jpg
   ```

5. **检查图片加载结果**
   
   - 如果看到"图片加载成功"，说明图片正常加载
   - 如果看到"图片加载失败"，说明图片URL有问题

### 方法2：使用浏览器H5模式

1. **启动H5开发服务器**
   ```bash
   cd /workspace/app-7cdqf07mbu9t
   pnpm run dev:h5
   ```

2. **在浏览器中打开**
   - 访问 `http://localhost:10086`
   - 登录司机账号
   - 进入个人信息页面

3. **打开浏览器开发者工具**
   - 按 `F12` 键
   - 或右键点击页面 → 选择"检查"

4. **查看Console标签**
   - 点击"Console"标签
   - 查看日志输出

## 需要关注的关键信息

### 1. 图片路径是否存在

**日志关键字：** `身份证正面路径`、`身份证背面路径`、`驾驶证照片路径`

**正常情况：**
```
身份证正面路径: "550e8400-e29b-41d4-a716-446655440000/id_card_front_1234567890.jpg"
```

**异常情况：**
```
身份证正面路径: null
```

**如果是null：** 说明数据库中没有图片路径，需要先上传证件照片。

### 2. Bucket名称是否正确

**日志关键字：** `使用的bucket`

**正确的值：**
```
使用的bucket: app-7cdqf07mbu9t_avatars
```

**错误的值：**
```
使用的bucket: undefined_avatars
使用的bucket: app-7cdqf07mbu9t_driver_images
```

### 3. 图片URL是否正确生成

**日志关键字：** `生成的公共URL`

**正确的格式：**
```
生成的公共URL: https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/filename.jpg
```

**可以复制这个URL在浏览器中直接访问，验证图片是否存在。**

### 4. 图片加载状态

**日志关键字：** `图片加载成功`、`图片加载失败`

**成功：**
```
身份证正面图片加载成功
```

**失败：**
```
身份证正面图片加载失败: [Error details]
图片URL: https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/filename.jpg
```

## 常见问题诊断

### 情况A：所有路径都是null

**日志示例：**
```
身份证正面路径: null
身份证背面路径: null
驾驶证照片路径: null
```

**原因：** 数据库中没有图片数据

**解决方案：**
1. 进入"车辆管理"页面
2. 添加或编辑车辆信息
3. 上传证件照片
4. 保存后返回个人信息页面查看

### 情况B：路径存在但图片加载失败

**日志示例：**
```
身份证正面路径: "user_id/file.jpg"
使用的bucket: app-7cdqf07mbu9t_avatars
生成的公共URL: https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/file.jpg
身份证正面图片加载失败
```

**原因：** 图片文件不存在或无法访问

**解决方案：**
1. 复制控制台中的"生成的公共URL"
2. 在浏览器新标签页中打开这个URL
3. 如果显示404，说明文件不存在，需要重新上传
4. 如果显示403，说明权限问题，需要检查Storage配置

### 情况C：Bucket名称错误

**日志示例：**
```
使用的bucket: undefined_avatars
```

**原因：** 环境变量配置问题

**解决方案：**
1. 检查 `.env` 文件
2. 确认 `TARO_APP_APP_ID=app-7cdqf07mbu9t`
3. 重启开发服务器

## 截图示例

请在查看调试信息后，提供以下截图：

1. **控制台完整日志截图**
   - 包含所有"个人资料数据"、"驾驶证信息"、"图片路径"等日志
   - 包含"图片加载成功/失败"的日志

2. **页面显示截图**
   - 显示证件照片区域的当前状态

3. **如果有错误信息**
   - 截图完整的错误堆栈

## 提供反馈

查看调试信息后，请告诉我：

1. **图片路径的值**
   - 身份证正面路径是什么？
   - 身份证背面路径是什么？
   - 驾驶证照片路径是什么？

2. **Bucket名称**
   - 使用的bucket是什么？

3. **生成的URL**
   - 图片的公共URL是什么？
   - 在浏览器中访问这个URL能看到图片吗？

4. **加载状态**
   - 是显示"加载成功"还是"加载失败"？
   - 如果失败，错误信息是什么？

## 快速测试

如果您想快速测试图片功能是否正常，可以：

1. **上传新的证件照片**
   - 进入车辆管理
   - 选择一个车辆
   - 重新上传证件照片
   - 保存

2. **查看个人信息**
   - 返回个人信息页面
   - 查看证件照片是否显示
   - 查看控制台日志

3. **验证图片URL**
   - 复制控制台中的图片URL
   - 在浏览器中打开
   - 确认能否看到图片

## 详细调试文档

如需更详细的调试指南，请查看：
- `DEBUG_PROFILE_IMAGE_LOADING.md` - 完整的调试指南
- `BUGFIX_PROFILE_IMAGE_LOADING.md` - 之前的修复说明

## 联系支持

如果按照以上步骤仍无法解决问题，请提供：
- 控制台日志截图
- 页面显示截图
- 生成的图片URL
- 浏览器访问URL的结果

我会根据这些信息进一步分析和解决问题。
