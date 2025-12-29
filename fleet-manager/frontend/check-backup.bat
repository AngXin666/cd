@echo off
echo === Backup 7353fda7 root ===
git ls-tree 7353fda7 --name-only
echo.
echo === All vue files in backup ===
git ls-tree -r 7353fda7 --name-only 2>nul
