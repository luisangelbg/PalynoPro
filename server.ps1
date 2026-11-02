# PalynoPro - servidor web local minimo.
# Copyright (C) 2026  Luis Angel Barrera-Guzman. Software libre bajo la GPL v3
# o posterior; ver LICENSE.
#
# Uso:  clic derecho > "Ejecutar con PowerShell"
#       (o:  powershell -ExecutionPolicy Bypass -File server.ps1)
# Luego abre  http://localhost:9940  en el navegador.
#
# PalynoPro calcula todo en JavaScript y trae sus ejemplos dentro, asi que el
# doble clic en index.html funciona igual. Este servidor solo hace falta para
# abrir la app desde otro equipo de la misma red.
#
# Para abrirla tambien desde un celular o una tableta en la MISMA red
# inalambrica, ejecuta este guion como administrador: asi el servidor escucha
# en toda la red y abajo imprime la direccion (algo como
# http://192.168.1.23:9940) para escribirla en el navegador del otro equipo.
# Si el sistema pregunta por el cortafuegos, permite el acceso en redes
# "Privadas". Sin permisos de administrador funciona solo en esta computadora.

param(
  [int]$Port = 9940,
  [string]$Root = $PSScriptRoot,
  [switch]$NoOpen
)

Add-Type -AssemblyName System.Web
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$listener = New-Object System.Net.HttpListener
$network = $false

# con permisos, toda la red; si no, solo esta computadora
if ($admin) {
  try { $listener.Prefixes.Add("http://+:$Port/"); $listener.Start(); $network = $true }
  catch { $listener = New-Object System.Net.HttpListener }
}
if (-not $network) {
  $listener.Prefixes.Add("http://localhost:$Port/")
  try { $listener.Start() }
  catch {
    Write-Host "No se pudo iniciar en el puerto $Port (quiza ya esta en uso). Prueba otro:  powershell -ExecutionPolicy Bypass -File server.ps1 -Port $($Port + 1)" -ForegroundColor Red
    exit 1
  }
}

$home0 = "http://localhost:$Port/"
Write-Host ""
Write-Host "  PalynoPro en marcha:  $home0" -ForegroundColor Green
if ($network) {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } |
    ForEach-Object { Write-Host "  Desde otro equipo de la misma red:  http://$($_.IPAddress):$Port/" -ForegroundColor Cyan }
} else {
  Write-Host "  (Solo en esta computadora. Para abrirla desde una tableta, ejecuta este guion" -ForegroundColor DarkYellow
  Write-Host "   como administrador: clic derecho > Ejecutar como administrador.)" -ForegroundColor DarkYellow
}
Write-Host "  Carpeta servida   :  $Root"
Write-Host "  Para detener      :  cierra esta ventana o pulsa Ctrl+C"
Write-Host ""
if (-not $NoOpen) { try { Start-Process $home0 } catch {} }

$types = @{
  ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".svg" = "image/svg+xml"; ".png" = "image/png"; ".jpg" = "image/jpeg"
  ".webp" = "image/webp"; ".ico" = "image/x-icon"; ".md" = "text/markdown; charset=utf-8"; ".csv" = "text/csv; charset=utf-8"
  ".tsv" = "text/tab-separated-values; charset=utf-8"; ".txt" = "text/plain; charset=utf-8"; ".pdf" = "application/pdf"
  ".zip" = "application/zip"; ".R" = "text/plain; charset=utf-8"
}
$base = [System.IO.Path]::GetFullPath($Root)

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [System.Web.HttpUtility]::UrlDecode($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
      $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
      # nada fuera de la carpeta de la app
      if (-not $full.StartsWith($base)) { $res.StatusCode = 403; continue }
      if ((Test-Path $full) -and (Get-Item $full).PSIsContainer) { $full = Join-Path $full "index.html" }
      if (Test-Path $full) {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full)
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
        $res.Headers.Add("Cache-Control", "no-cache")
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host ("  200  " + $rel)
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $rel")
        $res.OutputStream.Write($msg, 0, $msg.Length)
        Write-Host ("  404  " + $rel) -ForegroundColor DarkYellow
      }
    } catch {
      try { $res.StatusCode = 500 } catch {}
      Write-Host ("  ERR  " + $_.Exception.Message) -ForegroundColor Red
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
