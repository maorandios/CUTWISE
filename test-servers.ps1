# Quick Server Status Check
# Tests if backend and frontend are responding

Write-Host "Testing Server Status..." -ForegroundColor Cyan
Write-Host ""

# Test Backend
Write-Host "Backend (http://localhost:8000):" -NoNewline
try {
    $null = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($?) {
        Write-Host " ✓ Port is open" -ForegroundColor Green
    } else {
        Write-Host " ✗ Port is closed" -ForegroundColor Red
    }
} catch {
    Write-Host " ✗ Not responding" -ForegroundColor Red
}

# Test Frontend
Write-Host "Frontend (http://localhost:5180):" -NoNewline
try {
    $null = Test-NetConnection -ComputerName localhost -Port 5180 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($?) {
        Write-Host " ✓ Port is open" -ForegroundColor Green
    } else {
        Write-Host " ✗ Port is closed" -ForegroundColor Red
    }
} catch {
    Write-Host " ✗ Not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "Process Status:" -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*python*"} | 
    Select-Object ProcessName, Id, @{Name="CPU(s)";Expression={[math]::Round($_.CPU, 2)}}, @{Name="Memory(MB)";Expression={[math]::Round($_.WorkingSet/1MB, 2)}} | 
    Format-Table

Write-Host "If both ports are open, the servers are ready!" -ForegroundColor Green
Write-Host "Open your browser to: http://localhost:5180" -ForegroundColor Cyan

