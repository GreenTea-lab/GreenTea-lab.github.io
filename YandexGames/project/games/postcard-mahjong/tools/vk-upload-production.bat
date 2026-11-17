@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Установите Node.js 18 или новее и откройте файл снова.
 pause
 exit /b 1
)
node check-build.cjs --require-app
if errorlevel 1 (
 node configure-app.cjs
 if errorlevel 1 exit /b 1
)
if not exist "node_modules\@vkontakte\vk-miniapps-deploy\bin\vk-miniapps-deploy" (
 call npm ci --ignore-scripts --no-audit --no-fund
 if errorlevel 1 exit /b 1
)
echo Обычная выкладка: обновление основных ссылок VK.
echo Update prod URLs = Yes, Update dev URLs = Yes.
call npm run deploy
set "POSTCARD_DEPLOY_EXIT=%ERRORLEVEL%"
if not "%POSTCARD_DEPLOY_EXIT%"=="0" echo Загрузка завершилась с ошибкой. Смотрите сообщение выше.
pause
exit /b %POSTCARD_DEPLOY_EXIT%
