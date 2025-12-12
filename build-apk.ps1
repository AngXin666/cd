# APK Build Script
Write-Host '=====================================' -ForegroundColor Cyan
Write-Host '  APK Auto Build Script' -ForegroundColor Cyan
Write-Host '=====================================' -ForegroundColor Cyan

# Check Java
Write-Host 'Step 1/4: Checking Java...' -ForegroundColor Green
$javaInstalled = $false
try {
    $javaVersion = java -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'Java is installed' -ForegroundColor Green
        $javaInstalled = $true
    }
} catch {
    Write-Host 'Java not found' -ForegroundColor Red
}

if (-not $javaInstalled) {
    Write-Host 'Please install Java JDK 17 from: https://adoptium.net' -ForegroundColor Yellow
    exit 1
}

# Build H5
Write-Host 'Step 2/4: Building H5...' -ForegroundColor Green
pnpm run build:h5

# Sync to Android
Write-Host 'Step 3/4: Syncing to Android...' -ForegroundColor Green
npx cap sync android

# Build APK
Write-Host 'Step 4/4: Building APK...' -ForegroundColor Green
Set-Location android
.\gradlew assembleDebug --no-daemon

if ($LASTEXITCODE -eq 0) {
    Write-Host 'APK built successfully!' -ForegroundColor Green
    $apkPath = 'app\build\outputs\apk\debug\app-debug.apk'
    if (Test-Path $apkPath) {
        Copy-Item $apkPath '..\VehicleManager.apk' -Force
        Write-Host 'APK copied to: VehicleManager.apk' -ForegroundColor Green
        explorer.exe '/select,..\VehicleManager.apk'
    }
}
