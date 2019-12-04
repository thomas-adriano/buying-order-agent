@echo off

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

call npm i -g npm
cd bin
call npm i -g pm2
call pm2 start
start pm2 monit

cd..
pause