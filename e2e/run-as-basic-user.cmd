@echo off
rem Runs the e2e suite with a limited ("Basic User") token even when started from an elevated shell.
rem WebView2 does not open its remote debugging port in an elevated process, so msedgedriver cannot attach.
rem Usage (from any shell, elevated or not):  runas /trustlevel:0x20000 "\"<repo>\e2e\run-as-basic-user.cmd\""
rem Output goes to %TEMP%\e2e-basic-user.log
cd /d "%~dp0.."
if "%E2E_SKIP_BUILD%"=="" set E2E_SKIP_BUILD=1
call npm run e2e > "%TEMP%\e2e-basic-user.log" 2>&1
echo exit code %ERRORLEVEL% >> "%TEMP%\e2e-basic-user.log"
