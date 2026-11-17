@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Загружаю новую версию Неонового Роя в VK...
node deploy-log.js
set "DEPLOY_EXIT=%ERRORLEVEL%"
echo.
if not "%DEPLOY_EXIT%"=="0" (
  echo ОШИБКА ЗАГРУЗКИ. Код завершения: %DEPLOY_EXIT%
  echo Обновление не подтверждено. Не считайте версию в VK обновлённой.
  echo Подробности сохранены в deploy_log.txt.
  pause
  exit /b %DEPLOY_EXIT%
)
echo Утилита завершила загрузку. Проверяю файлы на хостинге...
node check-hosting.cjs
set "CHECK_EXIT=%ERRORLEVEL%"
echo.
if not "%CHECK_EXIT%"=="0" (
  echo Проверка не подтвердила новую сборку. Смотрите сообщение выше.
) else (
  echo Новая сборка на хостинге подтверждена контрольной суммой.
)
pause
exit /b %CHECK_EXIT%
