@echo off
echo === Git 分支列表 ===
git branch -a
echo.
echo === 当前分支 ===
git branch --show-current
echo.
echo === 远程仓库 ===
git remote -v
