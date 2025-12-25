@echo off
echo === Check commit 8b413ca3^ tree ===
git ls-tree --name-only 8b413ca3^

echo.
echo === Check src directory ===
git ls-tree --name-only 8b413ca3^ src

echo.
echo === Check all files with pages ===
git ls-tree -r --name-only 8b413ca3^ | findstr pages
