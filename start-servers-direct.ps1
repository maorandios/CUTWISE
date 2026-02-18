# Direct server startup without profile interference
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/c", "cd /d C:\CUTWISE\api && venv\Scripts\python.exe run.py" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Frontend..." -ForegroundColor Green  
Start-Process cmd -ArgumentList "/c", "cd /d C:\CUTWISE\web && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Servers started!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5180" -ForegroundColor Cyan








