@echo off
echo === Git 中的车辆管理文件 ===
git ls-files src/pages/boss/vehicle src/pages/boss/vehicles src/pages/driver/vehicle src/pages/manager/vehicle
echo.
echo === 当前目录中的车辆管理文件 ===
dir /s /b src\pages\boss\vehicle 2>nul
dir /s /b src\pages\boss\vehicles 2>nul
dir /s /b src\pages\driver\vehicle 2>nul
dir /s /b src\pages\manager\vehicle 2>nul
echo.
echo === Git diff 统计 ===
git diff --stat HEAD -- src/pages/boss/vehicle src/pages/boss/vehicles src/pages/driver/vehicle src/pages/manager/vehicle
