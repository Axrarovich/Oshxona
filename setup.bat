@echo off
setlocal

echo Installing dependencies...
call npm run install-all
if errorlevel 1 exit /b 1

echo Starting dev servers...
call npm run dev

