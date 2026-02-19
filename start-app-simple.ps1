# Simple startup script without PowerShell profile interference
# Start backend
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd C:\CUTWISE\api; .\venv\Scripts\python.exe run.py" -WindowStyle Normal

# Wait for backend
Start-Sleep -Seconds 3

# Start frontend
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd C:\CUTWISE\web; npm run dev" -WindowStyle Normal

Write-Host "Servers starting..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5180" -ForegroundColor Cyan










