@echo off
REM 恢复主项目页面代码到临时目录
REM 从 8b413ca3 提交之前恢复 src/pages 目录

echo === 列出主项目页面文件 ===
git ls-tree -r --name-only 8b413ca3^ -- src/pages

echo.
echo === 恢复主项目页面到 docs/main-project-pages ===
mkdir docs\main-project-pages 2>nul

REM 恢复整个 src/pages 目录
git checkout 8b413ca3^ -- src/pages

echo.
echo === 完成 ===
echo 主项目页面已恢复到 src/pages 目录
