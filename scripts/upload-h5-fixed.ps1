# Supabase Storage Upload Script - 修复版
# 正确设置Content-Type以支持H5热更新

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectUrl = "https://wxvrwkpkioalqdsfswwu.supabase.co",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24"
)

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Supabase Storage Upload (Fixed MIME)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$BucketName = "h5-app"
$BasePath = "v$Version"

# MIME类型映射
$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif" = "image/gif"
    ".svg" = "image/svg+xml"
    ".ico" = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf" = "font/ttf"
    ".eot" = "application/vnd.ms-fontobject"
    ".map" = "application/json"
}

function Get-MimeType {
    param([string]$FilePath)
    $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
    if ($MimeTypes.ContainsKey($ext)) {
        return $MimeTypes[$ext]
    }
    return "application/octet-stream"
}

function Upload-File {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    $FileName = Split-Path $LocalPath -Leaf
    $FullRemotePath = "$BasePath/$RemotePath"
    $ContentType = Get-MimeType -FilePath $LocalPath
    
    Write-Host "  $FileName -> $FullRemotePath [$ContentType]" -ForegroundColor Gray
    
    try {
        $FileBytes = [System.IO.File]::ReadAllBytes($LocalPath)
        $Url = "$ProjectUrl/storage/v1/object/$BucketName/$FullRemotePath"
        
        $Headers = @{
            "Authorization" = "Bearer $ServiceRoleKey"
            "Content-Type" = $ContentType
            "x-upsert" = "true"
        }
        
        $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $FileBytes -ErrorAction Stop
        return $true
    }
    catch {
        Write-Host "    Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 检查dist文件夹
if (-not (Test-Path "dist")) {
    Write-Host "Error: dist folder not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`nUploading to: $BucketName/$BasePath" -ForegroundColor Yellow

$SuccessCount = 0
$FailCount = 0

# 上传所有文件
Get-ChildItem "dist" -File -Recurse | ForEach-Object {
    $RelativePath = $_.FullName.Substring((Resolve-Path "dist").Path.Length + 1).Replace('\', '/')
    if (Upload-File -LocalPath $_.FullName -RemotePath $RelativePath) {
        $SuccessCount++
    } else {
        $FailCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Success: $SuccessCount | Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Yellow" } else { "Green" })
Write-Host "H5 URL: $ProjectUrl/storage/v1/object/public/$BucketName/$BasePath/" -ForegroundColor Cyan
