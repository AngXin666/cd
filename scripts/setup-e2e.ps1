# E2E 测试环境安装脚本
# 安装 Playwright 和相关依赖

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  E2E 测试环境安装脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 安装 @playwright/test
Write-Host "[步骤 1] 安装 @playwright/test..." -ForegroundColor Yellow
pnpm add -D @playwright/test

# 安装 Playwright 浏览器
Write-Host ""
Write-Host "[步骤 2] 安装 Playwright 浏览器..." -ForegroundColor Yellow
npx playwright install

# 验证安装
Write-Host ""
Write-Host "[步骤 3] 验证安装..." -ForegroundColor Yellow
npx playwright --version

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "运行测试命令：" -ForegroundColor Cyan
Write-Host "  npm run test:e2e        # 运行所有 E2E 测试" -ForegroundColor White
Write-Host "  npm run test:driver-nav # 运行司机端导航测试" -ForegroundColor White
Write-Host "  npm run test:e2e:ui     # 使用 UI 模式运行" -ForegroundColor White
