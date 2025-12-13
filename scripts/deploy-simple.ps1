# H5 Hot Update Deployment Script
# Usage: .\scripts\deploy-simple.ps1 -Version "1.0.0" -ReleaseNotes "Initial version"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$ReleaseNotes = "Bug fixes and improvements",
    
    [Parameter(Mandatory=$false)]
    [bool]$ForceUpdate = $false
)

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "H5 Hot Update Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update version in package.json
Write-Host "Step 1: Updating version to $Version..." -ForegroundColor Yellow
npm version $Version --no-git-tag-version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update version" -ForegroundColor Red
    exit 1
}
Write-Host "Version updated successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Build H5
Write-Host "Step 2: Building H5..." -ForegroundColor Yellow
npm run build:h5
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Build completed" -ForegroundColor Green
Write-Host ""

# Step 3: Generate SQL
Write-Host "Step 3: Generating SQL..." -ForegroundColor Yellow
$h5Url = "https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v$Version/"
$forceUpdateStr = if ($ForceUpdate) { "true" } else { "false" }

$sql = @"
-- Add H5 version record
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '$Version',
  '$h5Url',
  '$ReleaseNotes',
  $forceUpdateStr,
  true
);

-- View all versions
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
"@

$sqlFile = "deploy-h5-v$Version.sql"
$sql | Out-File -FilePath $sqlFile -Encoding UTF8
Write-Host "SQL generated: $sqlFile" -ForegroundColor Green
Write-Host ""

# Step 4: Show next steps
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Upload files to Supabase Storage:" -ForegroundColor White
Write-Host "   URL: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app" -ForegroundColor Gray
Write-Host "   - Create folder: v$Version" -ForegroundColor Gray
Write-Host "   - Upload all files from 'dist' directory" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Execute SQL:" -ForegroundColor White
Write-Host "   URL: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql" -ForegroundColor Gray
Write-Host "   - Open file: $sqlFile" -ForegroundColor Gray
Write-Host "   - Copy and execute the SQL" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test:" -ForegroundColor White
Write-Host "   - Open your APP" -ForegroundColor Gray
Write-Host "   - Should see update dialog" -ForegroundColor Gray
Write-Host ""
Write-Host "H5 URL: $h5Url" -ForegroundColor Cyan
Write-Host ""
