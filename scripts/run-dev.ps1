# Start PostgreSQL (Docker), then API and UI in new PowerShell windows.
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required for the bundled database. Install Docker Desktop, or start PostgreSQL yourself."
    exit 1
}

docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Waiting for PostgreSQL..."
for ($i = 0; $i -lt 45; $i++) {
    docker compose exec -T db pg_isready -U adas -d adas_validation 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
}

$backend = Join-Path $Root "backend"
$frontend = Join-Path $Root "frontend"

Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
    "-NoExit", "-Command",
    "python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8088"
)
Start-Sleep -Milliseconds 500
Start-Process powershell -WorkingDirectory $frontend -ArgumentList @(
    "-NoExit", "-Command",
    "npm run dev"
)

Write-Host ""
Write-Host "Started new windows for API and UI."
Write-Host "  API:  http://127.0.0.1:8088/docs"
Write-Host "  UI:   http://localhost:5173 (check Vite for actual port)"
Write-Host "  DB:   localhost:5432  user=adas  password=adas  database=adas_validation"
