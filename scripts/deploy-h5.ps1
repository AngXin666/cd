# H5热更新部署脚本
# 用法: .\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "修复bug" -ForceUpdate $false

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$ReleaseNotes = "修复已知问题，优化用户体验",
    
    [Parameter(Mandatory=$false)]
    [bool]$ForceUpdate = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "H5热更新部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 更新package.json版本号
Write-Host "1. 更新版本号到 $Version..." -ForegroundColor Yellow
npm version $Version --no-git-tag-version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 更新版本号失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 版本号已更新" -ForegroundColor Green
Write-Host ""

# 2. 构建H5
Write-Host "2. 构建H5代码..." -ForegroundColor Yellow
npm run build:h5
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 构建完成" -ForegroundColor Green
Write-Host ""

# 3. 准备上传说明
Write-Host "3. 准备上传到Supabase Storage..." -ForegroundColor Yellow
Write-Host "   目标路径: h5-app/v$Version/" -ForegroundColor Gray
Write-Host "✅ 构建文件已准备好" -ForegroundColor Green
Write-Host ""

# 4. 生成SQL语句
Write-Host "4. 生成版本记录SQL..." -ForegroundColor Yellow
$h5Url = "https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v$Version/"
$forceUpdateStr = if ($ForceUpdate) { "true" } else { "false" }

$sql = @"
-- 添加H5版本记录
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '$Version',
  '$h5Url',
  '$ReleaseNotes',
  $forceUpdateStr,
  true
);

-- 查看所有版本
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
"@

$sqlFile = "deploy-h5-v$Version.sql"
$sql | Out-File -FilePath $sqlFile -Encoding UTF8
Write-Host "✅ SQL已生成: $sqlFile" -ForegroundColor Green
Write-Host ""

# 5. 显示下一步操作
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Yellow
Write-Host "1. 在Supabase Dashboard中执行SQL:" -ForegroundColor White
Write-Host "   打开: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql" -ForegroundColor Gray
Write-Host "   执行文件: $sqlFile" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 或者直接复制以下SQL执行:" -ForegroundColor White
Write-Host $sql -ForegroundColor Gray
Write-Host ""
Write-Host "3. 测试更新:" -ForegroundColor White
Write-Host "   - 打开APP" -ForegroundColor Gray
Write-Host "   - 应该会弹出更新对话框" -ForegroundColor Gray
Write-Host "   - 点击'立即更新'验证" -ForegroundColor Gray
Write-Host ""
Write-Host "H5 URL: $h5Url" -ForegroundColor Cyan
Write-Host ""
