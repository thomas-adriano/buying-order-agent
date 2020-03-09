@echo off

IF "%1" == "--update" (set UPDATE_TOOLS=true) else (set UPDATE_TOOLS=false)

choco -v
IF %ERRORLEVEL% NEQ 0 (
    echo errorlevel %ERRORLEVEL%
    @"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
)

call npm -v
IF %ERRORLEVEL% NEQ 0 (
    echo errorlevel %ERRORLEVEL%
    choco install nodejs
)

call pm2 -v
IF %ERRORLEVEL% NEQ 0 (
    echo errorlevel %ERRORLEVEL%
    call npm i -g pm2
)

if "%UPDATE_TOOLS%" == "true" (
    call npm i -g npm
    call npm i -g pm2
)

start pm2 monit
timeout /t 5 /nobreak
call pm2 start

cd..
pause