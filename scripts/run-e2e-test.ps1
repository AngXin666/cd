# 司机端 E2E 测试运行脚本
# 用于运行页面导航测试并生成报告

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  司机端 E2E 测试运行脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已安装 Playwright
Write-Host "[步骤 1] 检查 Playwright 安装状态..." -ForegroundColor Yellow
$playwrightInstalled = npm list @playwright/test 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Playwright 未安装，正在安装..." -ForegroundColor Yellow
    npm install -D @playwright/test
    npx playwright install
} else {
    Write-Host "Playwright 已安装" -ForegroundColor Green
}

# 检查本地服务器是否运行
Write-Host ""
Write-Host "[步骤 2] 检查本地服务器状态..." -ForegroundColor Yellow
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
        Write-Host "本地服务器已运行 (http://localhost:8080)" -ForegroundColor Green
    }
} catch {
    Write-Host "本地服务器未运行" -ForegroundColor Yellow
}

if (-not $serverRunning) {
    Write-Host ""
    Write-Host "请先启动本地服务器：" -ForegroundColor Red
    Write-Host "  1. 构建 H5: pnpm taro build --type h5" -ForegroundColor White
    Write-Host "  2. 启动服务: npx serve dist -l 8080 -s" -ForegroundColor White
    Write-Host ""
    Write-Host "服务器启动后，重新运行此脚本" -ForegroundColor Yellow
    exit 1
}

# 运行测试
Write-Host ""
Write-Host "[步骤 3] 运行 E2E 测试..." -ForegroundColor Yellow
Write-Host ""

# 使用 headed 模式运行测试（根据项目规则）
npx playwright test --headed --project="Mobile Chrome"

# 检查测试结果
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  测试完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  测试失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

# 打开测试报告
Write-Host ""
Write-Host "[步骤 4] 打开测试报告..." -ForegroundColor Yellow
npx playwright show-report

Write-Host ""
Write-Host "测试报告位置: playwright-report/index.html" -ForegroundColor Cyan
Write-Host "测试结果位置: test-results/" -ForegroundColor Cyan
