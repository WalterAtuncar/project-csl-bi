@echo off
REM Simple wrapper to run npm build via CMD
npm run build
exit /b %ERRORLEVEL%