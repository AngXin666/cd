# 上传 APK 到 Supabase Storage

## 使用 Supabase Storage 托管 APK 文件

Supabase 提供免费的文件存储服务（Storage），可以用来托管 APK 文件供用户下载。

### 步骤一：在 Supabase 创建 Storage Bucket

1. **登录 Supabase 控制台**
   - 访问：https://supabase.com
   - 选择你的项目

2. **创建 Storage Bucket**
   - 点击左侧菜单 "Storage"
   - 点击 "Create a new bucket"
   - Bucket 名称：`apk-files`
   - 设置为 Public（公开访问）
   - 点击 "Create bucket"

3. **配置 Bucket 策略**
   - 选择刚创建的 `apk-files` bucket
   - 点击 "Policies"
   - 添加新策略：
     - Policy name: `Public read access`
     - Allowed operation: `SELECT`
     - Target roles: `public`
     - Policy definition: `true`
   - 点击 "Save policy"

### 步骤二：上传 APK 文件

#### 方式一：通过 Supabase 控制台上传（最简单）

1. 在 Storage 页面，选择 `apk-files` bucket
2. 点击 "Upload file"
3. 选择你的 APK 文件：
   ```
   fleet-manager/FleetManager-v1.0.11-debug.apk
   或
   fleet-manager/android-offline/FleetManager-release.apk
   ```
4. 上传完成后，点击文件获取公开 URL

#### 方式二：使用 Supabase CLI 上传

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 上传文件
supabase storage upload apk-files/FleetManager-v1.0.11.apk fleet-manager/FleetManager-v1.0.11-debug.apk --project-ref YOUR_PROJECT_REF
```

#### 方式三：使用 JavaScript/Node.js 上传

创建上传脚本：

**文件：`fleet-manager/scripts/upload-apk-to-supabase.js`**
```javascript
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase 配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-role-key'

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// APK 文件路径
const APK_PATH = path.join(__dirname, '../FleetManager-v1.0.11-debug.apk')
const APK_FILENAME = 'FleetManager-v1.0.11.apk'

async function uploadAPK() {
  try {
    console.log('开始上传 APK 到 Supabase Storage...')
    
    // 读取 APK 文件
    const fileBuffer = fs.readFileSync(APK_PATH)
    
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('apk-files')
      .upload(APK_FILENAME, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true // 如果文件已存在则覆盖
      })
    
    if (error) {
      throw error
    }
    
    console.log('✅ APK 上传成功！')
    
    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('apk-files')
      .getPublicUrl(APK_FILENAME)
    
    console.log('\n📱 APK 下载地址：')
    console.log(urlData.publicUrl)
    
    // 生成二维码（可选）
    console.log('\n💡 提示：')
    console.log('1. 将上面的 URL 分享给用户')
    console.log('2. 用户在手机浏览器打开即可下载安装')
    console.log('3. 或者生成二维码让用户扫描下载')
    
  } catch (error) {
    console.error('❌ 上传失败：', error.message)
    process.exit(1)
  }
}

// 执行上传
uploadAPK()
```

运行上传脚本：

```bash
# 安装依赖
npm install @supabase/supabase-js

# 设置环境变量
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"

# 运行脚本
node fleet-manager/scripts/upload-apk-to-supabase.js
```

### 步骤三：获取下载链接

上传成功后，你会得到一个公开 URL，类似：

```
https://your-project.supabase.co/storage/v1/object/public/apk-files/FleetManager-v1.0.11.apk
```

### 步骤四：分享 APK

#### 方式一：直接分享链接

将 URL 发送给用户：
- 微信/QQ 消息
- 邮件
- 短信

用户在手机浏览器打开链接即可下载安装。

#### 方式二：生成二维码

使用在线工具生成二维码：
- https://cli.im/（草料二维码）
- https://www.qrcode-monkey.com/

用户扫描二维码即可下载。

#### 方式三：在网页中嵌入下载按钮

如果你有网页，可以添加下载按钮：

```html
<!DOCTYPE html>
<html>
<head>
    <title>车队管家 - 下载</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #667eea;
            margin-bottom: 20px;
        }
        .download-btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .download-btn:hover {
            transform: scale(1.05);
        }
        .info {
            margin-top: 30px;
            text-align: left;
            line-height: 1.8;
        }
        .version {
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 车队管家</h1>
        <p>车队管理系统 Android 版</p>
        
        <a href="https://your-project.supabase.co/storage/v1/object/public/apk-files/FleetManager-v1.0.11.apk" 
           class="download-btn">
            📱 立即下载
        </a>
        
        <p class="version">版本：v1.0.11 | 大小：7.3 MB</p>
        
        <div class="info">
            <h3>功能特点：</h3>
            <ul>
                <li>✅ 考勤打卡</li>
                <li>✅ 计件录入</li>
                <li>✅ 请假审批</li>
                <li>✅ 车辆管理</li>
                <li>✅ 实时通知</li>
                <li>✅ 统计报表</li>
            </ul>
            
            <h3>安装说明：</h3>
            <ol>
                <li>点击"立即下载"按钮</li>
                <li>下载完成后打开 APK 文件</li>
                <li>允许安装未知来源应用</li>
                <li>按提示完成安装</li>
            </ol>
        </div>
    </div>
</body>
</html>
```

将这个 HTML 文件也上传到 Supabase Storage 或者部署到 Vercel/Netlify。

### 步骤五：更新 APK 版本

当你有新版本时：

1. 构建新的 APK
2. 重命名为新版本号（如 `FleetManager-v1.0.12.apk`）
3. 上传到 Supabase Storage
4. 更新下载链接

### Storage 使用限制

**Supabase 免费版限制：**
- 存储空间：2GB
- 带宽：50GB/月
- 文件大小：50MB/文件

你的 APK 大约 7.3MB，完全在限制范围内。

### 监控下载量

在 Supabase 控制台：
1. 点击 "Storage"
2. 选择 `apk-files` bucket
3. 点击文件查看统计信息

### 成本估算

**完全免费！**

Supabase 免费版提供：
- ✅ 2GB 存储空间
- ✅ 50GB 带宽/月
- ✅ 无限下载次数（在带宽限制内）

假设每个 APK 7.3MB：
- 50GB ÷ 7.3MB ≈ 6849 次下载/月

### 替代方案

如果 Supabase Storage 不够用，可以考虑：

1. **GitHub Releases**（免费，无限制）
   - 将 APK 上传到 GitHub Release
   - 用户可以直接下载

2. **蓝奏云**（免费，国内速度快）
   - https://www.lanzou.com
   - 上传 APK 获取分享链接

3. **奶牛快传**（免费，7天有效期）
   - https://cowtransfer.com
   - 适合临时分享

4. **Cloudflare R2**（免费 10GB）
   - https://www.cloudflare.com/products/r2/
   - 无出口流量费用

### 下一步

APK 上传成功后：

1. **测试下载链接**
   - 在手机浏览器打开链接
   - 确认可以正常下载

2. **分享给用户**
   - 发送下载链接
   - 或生成二维码

3. **配置热更新**
   - 在后端配置版本管理
   - 用户可以通过 APP 内更新

---

**需要帮助？**
- Supabase Storage 文档：https://supabase.com/docs/guides/storage
- 如有问题，请查看 Supabase 控制台的日志
