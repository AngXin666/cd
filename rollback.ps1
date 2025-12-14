# 回滚到指定版本
$ErrorActionPreference = "Stop"

Write-Host "正在回滚到版本 a9b2f428..." -ForegroundColor Yellow

# 禁用 git 分页器
$env:GIT_PAGER = ""

# 执行回滚
try {
    & git reset --hard a9b2f428
    Write-Host "回滚成功！" -ForegroundColor Green
    Write-Host "当前版本：" -ForegroundColor Cyan
    & git log -1 --oneline
} catch {
    Write-Host "回滚失败：$_" -ForegroundColor Red
    exit 1
}
