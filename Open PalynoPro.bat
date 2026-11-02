@echo off
rem PalynoPro - abre el servidor local en el puerto 9940.
rem Copyright (C) 2026  Luis Angel Barrera-Guzman. Software libre bajo la GPL v3 o posterior; ver LICENSE.
rem La app tambien abre con doble clic en index.html, sin servidor.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "server.ps1" -Port 9940
