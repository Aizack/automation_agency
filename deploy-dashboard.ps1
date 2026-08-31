# deploy-dashboard.ps1
# Builds the dashboard and deploys it to the running Docker container.
# Run from the project root: .\deploy-dashboard.ps1

Write-Host "=== Dashboard Deploy Script ===" -ForegroundColor Cyan

# Step 1: Build with explicit outDir
Write-Host "`n[1/3] Building dashboard..." -ForegroundColor Yellow
$buildOutput = ".\dashboard\dist_deploy"
Set-Location ".\dashboard"
npx vite build --outDir "./dist_deploy" 2>&1
Set-Location ".."

if (-not (Test-Path ".\dashboard\dist_deploy\index.html")) {
    Write-Host "ERROR: Build failed - index.html not found in dist_deploy" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful!" -ForegroundColor Green

# Step 2: Remove old assets from container
Write-Host "`n[2/3] Clearing old assets from container..." -ForegroundColor Yellow
docker exec agency_bot_app sh -c "rm -rf /app/dashboard/dist/assets && rm -f /app/dashboard/dist/index.html"
Write-Host "Old assets cleared." -ForegroundColor Green

# Step 3: Copy new build to container
Write-Host "`n[3/3] Deploying new build to container..." -ForegroundColor Yellow
docker cp ".\dashboard\dist_deploy\assets" agency_bot_app:/app/dashboard/dist/
docker cp ".\dashboard\dist_deploy\index.html" agency_bot_app:/app/dashboard/dist/index.html

Write-Host "`n=== Deploy complete! ===" -ForegroundColor Cyan
Write-Host "Refresh your browser (Ctrl+Shift+R) to see the changes." -ForegroundColor White

# Cleanup
Remove-Item ".\dashboard\dist_deploy" -Recurse -Force -ErrorAction SilentlyContinue
