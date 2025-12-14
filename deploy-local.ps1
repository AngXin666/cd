# 本地部署脚本
$ErrorActionPreference = "Stop"

Write-Host "开始构建 H5 项目..." -ForegroundColor Yellow

# 设置环境变量
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$env:GIT_PAGER = ""

# 构建项目
Write-Host "正在构建..." -ForegroundColor Cyan
npm run build:h5

if ($LASTEXITCODE -eq 0) {
    Write-Host "构建成功！" -ForegroundColor Green
    
    # 启动本地服务器
    Write-Host "启动本地服务器在 http://localhost:8080 ..." -ForegroundColor Cyan
    npx serve -s dist -l 8080
} else {
    Write-Host "构建失败！" -ForegroundColor Red
    exit 1
}
