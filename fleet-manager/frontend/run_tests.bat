@echo off
cd /d "%~dp0"
call npx vitest run
pause
