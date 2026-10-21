# PlacementHub Full-Stack Service Launcher
# Starts the AI Microservice (FastAPI :8000), Assessment Microservice (Node.js Express :5001), and Next.js Web Portal (:3000)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "           Starting PlacementHub Full-Stack Suite          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootPath = (Get-Item $PSScriptRoot).Parent.FullName
$AiPath = Join-Path $RootPath "services\ai"
$AssessmentPath = Join-Path $RootPath "services\assessment"
$WebPath = Join-Path $RootPath "apps\web"

# 1. Start PlacementHub AI Microservice
Write-Host "`n[1/3] Launching PlacementHub AI Microservice (FastAPI :8000)..." -ForegroundColor Yellow
$AiProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$AiPath'; if (Test-Path .venv\Scripts\uvicorn.exe) { .venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload } else { uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload }" -PassThru

Start-Sleep -Seconds 2

# 2. Start Assessment & Learning Node.js Microservice
Write-Host "[2/3] Launching Assessment & Learning Microservice (Node.js Express :5001)..." -ForegroundColor Yellow
$AssessmentProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$AssessmentPath'; npm run dev" -PassThru

Start-Sleep -Seconds 2

# 3. Start Next.js Web App
Write-Host "[3/3] Launching PlacementHub Web Application (Next.js :3000)..." -ForegroundColor Yellow
$WebProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$WebPath'; npm run dev" -PassThru

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  All 3 services launched in dedicated PowerShell windows! " -ForegroundColor Green
Write-Host "  - AI Microservice API:          http://localhost:8000/docs " -ForegroundColor Green
Write-Host "  - Assessment & Learning API:    http://localhost:5001/health" -ForegroundColor Green
Write-Host "  - Next.js Web Portal:           http://localhost:3000      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
