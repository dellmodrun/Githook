@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，请先安装 Node.js。
  pause
  exit /b 1
)
start "Hatchmind Local Server" cmd /k "cd /d ""%~dp0"" && set HATCHMIND_PORT=4392 && node scripts\server.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4392/"

