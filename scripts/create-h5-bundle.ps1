# 创建H5更新包 (zip格式)
# 用于 @capawesome/capacitor-live-update 热更新

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.1"
)

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "创建H5更新包 v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 检查dist目录
if (-not (Test-Path "dist")) {
    Write-Host "Error: dist目录不存在，请先运行 npm run build:h5" -ForegroundColor Red
    exit 1
}

# 创建输出目录
$OutputDir = "h5-bundles"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# 创建zip文件
$ZipFile = "$OutputDir\v$Version-bundle.zip"
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}

Write-Host "正在打包 dist -> $ZipFile" -ForegroundColor Yellow

# 使用PowerShell压缩
Compress-Archive -Path "dist\*" -DestinationPath $ZipFile -Force

if (Test-Path $ZipFile) {
    $Size = (Get-Item $ZipFile).Length / 1MB
    Write-Host "打包完成: $ZipFile ($([math]::Round($Size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "打包失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "下一步: 上传 $ZipFile 到 Supabase Storage" -ForegroundColor Yellow
