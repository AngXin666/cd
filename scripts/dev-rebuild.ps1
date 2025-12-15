# ============================================
# 快速重建脚本
# 修改代码后运行此脚本重新构建
# ============================================

Write-Host ""
Write-Host "[重建] 开始重新构建 H5..." -ForegroundColor Yellow

$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5

if ($LASTEXITCODE -eq 0) {
    Write-Host "[重建] 构建成功! 刷新浏览器即可看到更新" -ForegroundColor Green
} else {
    Write-Host "[重建] 构建失败!" -ForegroundColor Red
}
