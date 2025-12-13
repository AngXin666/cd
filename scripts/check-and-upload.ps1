# Supabase Storage Upload Script with Bucket Check
# 检查bucket并上传文件

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

# 检查dist文件夹
if (-not (Test-Path "dist")) {
    Write-Host "Error: dist folder not found" -ForegroundColor Red
    exit 1
}

# 步骤1：检查bucket是否存在
Write-Host "Step 1: Checking if bucket exists..." -ForegroundColor Yellow
try {
    $Headers = @{
        "Authorization" = "Bearer $ServiceRoleKey"
        "apikey" = $ServiceRoleKey
    }
    
    $BucketUrl = "$ProjectUrl/storage/v1/bucket/$BucketName"
    $BucketResponse = Invoke-RestMethod -Uri $BucketUrl -Method Get -Headers $Headers -ErrorAction Stop
    Write-Host "  ✓ Bucket '$BucketName' exists" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Bucket '$BucketName' does not exist" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the bucket first:" -ForegroundColor Yellow
    Write-Host "1. Open: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets" -ForegroundColor White
    Write-Host "2. Click 'New bucket'" -ForegroundColor White
    Write-Host "3. Name: h5-app" -ForegroundColor White
    Write-Host "4. Check 'Public bucket'" -ForegroundColor White
    Write-Host "5. Click 'Create'" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 步骤2：列出所有文件
Write-Host "Step 2: Listing files to upload..." -ForegroundColor Yellow
$FilesToUpload = @()
Get-ChildItem "dist" -File -Recurse | ForEach-Object {
    $RelativePath = $_.FullName.Substring((Resolve-Path "dist").Path.Length + 1).Replace('\', '/')
    $FilesToUpload += @{
        LocalPath = $_.FullName
        RemotePath = "v$Version/$RelativePath"
        Size = $_.Length
    }
    Write-Host "  - $RelativePath ($([math]::Round($_.Length/1KB, 2)) KB)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Total files: $($FilesToUpload.Count)" -ForegroundColor Cyan
Write-Host ""

# 步骤3：上传文件
Write-Host "Step 3: Uploading files..." -ForegroundColor Yellow
$SuccessCount = 0
$FailCount = 0

foreach ($File in $FilesToUpload) {
    $FileName = Split-Path $File.LocalPath -Leaf
    Write-Host "  Uploading: $FileName" -ForegroundColor Gray
    
    try {
        # 读取文件
        $FileContent = [System.IO.File]::ReadAllBytes($File.LocalPath)
        
        # 上传URL
        $UploadUrl = "$ProjectUrl/storage/v1/object/$BucketName/$($File.RemotePath)"
        
        # 请求头
        $UploadHeaders = @{
            "Authorization" = "Bearer $ServiceRoleKey"
            "Content-Type" = "application/octet-stream"
            "x-upsert" = "true"
        }
        
        # 上传
        $Response = Invoke-RestMethod -Uri $UploadUrl -Method Post -Headers $UploadHeaders -Body $FileContent -ErrorAction Stop
        Write-Host "    ✓ Success" -ForegroundColor Green
        $SuccessCount++
    }
    catch {
        Write-Host "    ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "H5 URL: $ProjectUrl/storage/v1/object/public/$BucketName/v$Version/" -ForegroundColor Cyan
} else {
    Write-Host "Some files failed to upload." -ForegroundColor Red
    Write-Host "This might be because:" -ForegroundColor Yellow
    Write-Host "  1. The bucket is not public" -ForegroundColor White
    Write-Host "  2. File permissions issue" -ForegroundColor White
    Write-Host "  3. Network issue" -ForegroundColor White
}

Write-Host ""
