@echo off
chcp 65001 >nul
cd /d "%~dp0"
node check-hosting.cjs
set "CHECK_EXIT=%ERRORLEVEL%"
pause
exit /b %CHECK_EXIT%
