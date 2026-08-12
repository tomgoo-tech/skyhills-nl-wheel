@echo off
cd /d "%~dp0"
echo Landing is available at http://localhost:8080/
py -m http.server 8080
