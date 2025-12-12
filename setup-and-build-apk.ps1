# APK自动构建脚本
# 功能：自动检测/安装Java环境并构建APK

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  车队管家 APK 自动构建脚本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  需要管理员权限来安装Java环境" -ForegroundColor Yellow
    Write-Host "正在请求管理员权限..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# 1. 检查Java环境
Write-Host "📋 步骤 1/5: 检查Java环境..." -ForegroundColor Green
$javaInstalled = $false
try {
    $javaVersion = java -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Java已安装: $($javaVersion[0])" -ForegroundColor Green
        $javaInstalled = $true
    }
} catch {
    Write-Host "❌ Java未安装" -ForegroundColor Red
}

# 2. 安装Java（如果需要）
if (-not $javaInstalled) {
    Write-Host "📦 步骤 2/5: 安装Java JDK 17..." -ForegroundColor Green
    
    # 使用Chocolatey安装Java（如果有的话）
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    if ($chocoInstalled) {
        Write-Host "使用Chocolatey安装Java..." -ForegroundColor Yellow
        choco install temurin17 -y
    } else {
        Write-Host "正在下载Java JDK 17..." -ForegroundColor Yellow
        $jdkUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jdk_x64_windows_hotspot_17.0.9_9.msi"
        $jdkInstaller = "$env:TEMP\OpenJDK17.msi"
        
        try {
            Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkInstaller -UseBasicParsing
            Write-Host "开始安装Java JDK 17..." -ForegroundColor Yellow
            Start-Process msiexec.exe -ArgumentList "/i `"$jdkInstaller`" /quiet /norestart" -Wait
            Remove-Item $jdkInstaller -Force
            Write-Host "✅ Java安装完成" -ForegroundColor Green
        } catch {
            Write-Host "❌ Java下载失败: $_" -ForegroundColor Red
            Write-Host "请手动安装Java JDK 17: https://adoptium.net/zh-CN/temurin/releases/" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # 配置JAVA_HOME环境变量
    $javaPath = "C:\Program Files\Eclipse Adoptium\jdk-17.0.9.9-hotspot"
    if (Test-Path $javaPath) {
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaPath, [System.EnvironmentVariableTarget]::Machine)
        $env:JAVA_HOME = $javaPath
        $env:PATH = "$javaPath\bin;$env:PATH"
        Write-Host "✅ JAVA_HOME已配置: $javaPath" -ForegroundColor Green
    } else {
        # 查找Java安装目录
        $possiblePaths = @(
            "C:\Program Files\Eclipse Adoptium\jdk-*",
            "C:\Program Files\Java\jdk-*",
            "C:\Program Files\AdoptOpenJDK\jdk-*"
        )
        foreach ($path in $possiblePaths) {
            $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                [Environment]::SetEnvironmentVariable("JAVA_HOME", $found.FullName, [System.EnvironmentVariableTarget]::Machine)
                $env:JAVA_HOME = $found.FullName
                $env:PATH = "$($found.FullName)\bin;$env:PATH"
                Write-Host "✅ JAVA_HOME已配置: $($found.FullName)" -ForegroundColor Green
                break
            }
        }
    }
} else {
    Write-Host "✅ 步骤 2/5: Java环境已就绪" -ForegroundColor Green
}

# 3. 验证Java环境
Write-Host "📋 步骤 3/5: 验证Java环境..." -ForegroundColor Green
Start-Sleep -Seconds 2
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
try {
    $javaCheck = java -version 2>&1
    Write-Host "✅ Java版本验证通过" -ForegroundColor Green
    Write-Host $javaCheck[0] -ForegroundColor Gray
} catch {
    Write-Host "❌ Java环境配置失败" -ForegroundColor Red
    Write-Host "请重新打开PowerShell窗口后再次运行此脚本" -ForegroundColor Yellow
    pause
    exit 1
}

# 4. 构建H5项目
Write-Host "📦 步骤 4/5: 构建H5项目..." -ForegroundColor Green
Set-Location -Path $PSScriptRoot
pnpm run build:h5
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ H5构建失败" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✅ H5构建完成" -ForegroundColor Green

# 5. 同步到Android
Write-Host "📦 步骤 5/5: 同步代码到Android并构建APK..." -ForegroundColor Green
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 代码同步失败" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✅ 代码同步完成" -ForegroundColor Green

# 6. 构建APK
Write-Host "🔨 构建APK中，请稍候..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\android"
.\gradlew assembleDebug --no-daemon

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  ✅ APK构建成功！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    $apkPath = "$PSScriptRoot\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "📱 APK文件位置:" -ForegroundColor Cyan
        Write-Host $apkPath -ForegroundColor Yellow
        Write-Host ""
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "📊 文件大小: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
        Write-Host ""
        
        # 复制APK到项目根目录
        $destPath = "$PSScriptRoot\车队管家.apk"
        Copy-Item $apkPath $destPath -Force
        Write-Host "✅ APK已复制到项目根目录: 车队管家.apk" -ForegroundColor Green
        
        # 打开文件位置
        Write-Host ""
        Write-Host "正在打开APK文件位置..." -ForegroundColor Yellow
        explorer.exe "/select,$destPath"
    }
} else {
    Write-Host ""
    Write-Host "❌ APK构建失败" -ForegroundColor Red
    Write-Host "请查看上方错误信息" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
pause
