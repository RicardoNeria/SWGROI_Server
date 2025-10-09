<#
Script sencillo para agregar, commitear y pushear cambios. Pide mensaje y rama.
Uso:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare_commit.ps1 -Message "tu mensaje" -Branch main
#>
param(
    [Parameter(Mandatory=$true)][string]$Message,
    [Parameter(Mandatory=$false)][string]$Branch = 'main'
)

Write-Host "git add -A" -ForegroundColor Cyan
git add -A

Write-Host "git commit -m '$Message'" -ForegroundColor Cyan
git commit -m "$Message"

Write-Host "git push origin $Branch" -ForegroundColor Cyan
git push origin $Branch
