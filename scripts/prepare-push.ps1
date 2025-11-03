# Prepare and push to GitHub
# This script helps prepare the repository for pushing to GitHub

Write-Host "🚀 Preparing repository for GitHub push..." -ForegroundColor Cyan

# Check if git is available
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found in PATH" -ForegroundColor Red
    Write-Host "Please ensure Git is installed and in your PATH" -ForegroundColor Yellow
    exit 1
}

# Check current branch
$currentBranch = git branch --show-current
Write-Host " branch: $currentBranch" -ForegroundColor Cyan

# Check git status
Write-Host "`n📋 Checking git status..." -ForegroundColor Cyan
git status --short

# Show remote
Write-Host "`n🌐 Remote configuration:" -ForegroundColor Cyan
git remote -v

Write-Host "`n✅ Ready to push!" -ForegroundColor Green
Write-Host "`nTo push to GitHub, run:" -ForegroundColor Yellow
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Production-ready release: Full system implementation'" -ForegroundColor White
Write-Host "  git push origin $currentBranch" -ForegroundColor White

