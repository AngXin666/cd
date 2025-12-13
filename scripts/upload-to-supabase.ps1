# Supabase Storage Upload Script
# 自动上传dist文件到Supabase Storage

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectUrl = "https://wxvrwkpkioalqdsfswwu.supabase.co",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24"
)

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Supabase Storage Upload" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BucketName = "h5-app"
$BasePath = "v$Version"

# 检查dist文件夹是否存在
if (-not (Test-Path "dist")) {
    Write-Host "Error: dist folder not found. Please run 'npm run build:h5' first." -ForegroundColor Red
    exit 1
}

Write-Host "Uploading files to Supabase Storage..." -ForegroundColor Yellow
Write-Host "Bucket: $BucketName" -ForegroundColor Gray
Write-Host "Path: $BasePath" -ForegroundColor Gray
Write-Host ""

# 函数：上传单个文件
function Upload-File {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    $FileName = Split-Path $LocalPath -Leaf
    $FullRemotePath = "$BasePath/$RemotePath"
    
    Write-Host "Uploading: $FileName -> $FullRemotePath" -ForegroundColor Gray
    
    try {
        # 使用 Get-Content 读取文件（避免权限问题）
        $FileBytes = Get-Content -Path $LocalPath -Encoding Byte -ReadCount 0
        $Url = "$ProjectUrl/storage/v1/object/$BucketName/$FullRemotePath"
        
        $Headers = @{
            "Authorization" = "Bearer $ServiceRoleKey"
            "Content-Type" = "application/octet-stream"
            "x-upsert" = "true"
        }
        
        $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $FileBytes -ErrorAction Stop
        Write-Host "  ✓ Success" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  URL: $Url" -ForegroundColor DarkGray
        return $false
    }
}

# 上传所有文件
$SuccessCount = 0
$FailCount = 0

# 上传 js 文件
Write-Host "`n[1/2] Uploading JS files..." -ForegroundColor Yellow
Get-ChildItem "dist\js" -File -Recurse | ForEach-Object {
    $RelativePath = $_.FullName.Substring((Resolve-Path "dist").Path.Length + 1).Replace('\', '/')
    if (Upload-File -LocalPath $_.FullName -RemotePath $RelativePath) {
        $SuccessCount++
    } else {
        $FailCount++
    }
}

# 上传 static 文件
Write-Host "`n[2/2] Uploading static files..." -ForegroundColor Yellow
Get-ChildItem "dist\static" -File -Recurse | ForEach-Object {
    $RelativePath = $_.FullName.Substring((Resolve-Path "dist").Path.Length + 1).Replace('\', '/')
    if (Upload-File -LocalPath $_.FullName -RemotePath $RelativePath) {
        $SuccessCount++
    } else {
        $FailCount++
    }
}

# 总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Upload Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Success: $SuccessCount files" -ForegroundColor Green
Write-Host "Failed: $FailCount files" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($FailCount -eq 0) {
    Write-Host "All files uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step:" -ForegroundColor Yellow
    Write-Host "Execute the SQL file: deploy-h5-v$Version.sql" -ForegroundColor White
    Write-Host "URL: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "H5 URL: $ProjectUrl/storage/v1/object/public/$BucketName/$BasePath/" -ForegroundColor Cyan
} else {
    Write-Host "Some files failed to upload. Please check the errors above." -ForegroundColor Red
}

Write-Host ""
