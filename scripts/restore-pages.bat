@echo off
echo === List main project page files ===
git ls-tree -r --name-only 8b413ca3^ -- src/pages

echo.
echo === Restore main project pages ===
git checkout 8b413ca3^ -- src/pages

echo.
echo === Done ===
dir src\pages
