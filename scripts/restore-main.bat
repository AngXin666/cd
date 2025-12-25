@echo off
echo === Restore main project pages from 8b6e91d0 ===
git checkout 8b6e91d0 -- src/pages

echo.
echo === Done - check src/pages ===
dir src\pages
