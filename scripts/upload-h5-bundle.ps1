# 上传H5更新包到Supabase Storage
# 用于 @capawesome/capacitor-live-update 热更新

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.1",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectUrl = "https://wxvrwkpkioalqdsfswwu.supabase.co",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24"
)

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "上传H5更新包 v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$BucketName = "h5-app"
$ZipFile = "h5-bundles\v$Version-bundle.zip"

# 检查zip文件
if (-not (Test-Path $ZipFile)) {
    Write-Host "Error: $ZipFile 不存在" -ForegroundColor Red
    Write-Host "请先运行: .\scripts\create-h5-bundle.ps1 -Version $Version" -ForegroundColor Yellow
    exit 1
}

Write-Host "上传文件: $ZipFile" -ForegroundColor Yellow

try {
    $FileBytes = [System.IO.File]::ReadAllBytes($ZipFile)
    $RemotePath = "v$Version/bundle.zip"
    $Url = "$ProjectUrl/storage/v1/object/$BucketName/$RemotePath"
    
    $Headers = @{
        "Authorization" = "Bearer $ServiceRoleKey"
        "Content-Type" = "application/zip"
        "x-upsert" = "true"
    }
    
    $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $FileBytes -ErrorAction Stop
    Write-Host "上传成功!" -ForegroundColor Green
    
    $PublicUrl = "$ProjectUrl/storage/v1/object/public/$BucketName/$RemotePath"
    Write-Host ""
    Write-Host "Bundle URL: $PublicUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "更新数据库中的h5_url为:" -ForegroundColor Yellow
    Write-Host $PublicUrl -ForegroundColor White
}
catch {
    Write-Host "上传失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
