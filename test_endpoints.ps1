# Script de prueba de endpoints del sistema SWGROI
# Verifica que los endpoints de métricas y KPIs devuelvan datos correctos

$baseUrl = "http://localhost:8891"
$testResults = @()

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBA DE ENDPOINTS - SISTEMA SWGROI" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-Endpoint {
    param(
        [string]$name,
        [string]$url,
        [string]$expectedContentType = "application/json"
    )
    
    Write-Host "Probando: $name" -ForegroundColor Yellow
    Write-Host "URL: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -ErrorAction Stop
        $statusCode = $response.StatusCode
        $contentType = $response.Headers['Content-Type']
        
        if ($statusCode -eq 200) {
            Write-Host "✓ Status: $statusCode OK" -ForegroundColor Green
            
            if ($contentType -match $expectedContentType) {
                Write-Host "✓ Content-Type: $contentType" -ForegroundColor Green
                
                if ($expectedContentType -eq "application/json") {
                    try {
                        $json = $response.Content | ConvertFrom-Json
                        Write-Host "✓ JSON válido" -ForegroundColor Green
                        Write-Host "Datos recibidos:" -ForegroundColor Cyan
                        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
                        $testResults += [PSCustomObject]@{
                            Endpoint = $name
                            Status = "OK"
                            StatusCode = $statusCode
                            HasData = $true
                        }
                    } catch {
                        Write-Host "✗ JSON inválido: $_" -ForegroundColor Red
                        $testResults += [PSCustomObject]@{
                            Endpoint = $name
                            Status = "ERROR"
                            StatusCode = $statusCode
                            HasData = $false
                        }
                    }
                }
            } else {
                Write-Host "⚠ Content-Type esperado: $expectedContentType, recibido: $contentType" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✗ Status: $statusCode" -ForegroundColor Red
            $testResults += [PSCustomObject]@{
                Endpoint = $name
                Status = "ERROR"
                StatusCode = $statusCode
                HasData = $false
            }
        }
    } catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
        $testResults += [PSCustomObject]@{
            Endpoint = $name
            Status = "ERROR"
            StatusCode = "N/A"
            HasData = $false
        }
    }
    
    Write-Host "`n" -NoNewline
}

# Probar endpoints principales
Test-Endpoint -name "Indicadores del Menú" -url "$baseUrl/menu/indicadores"
Test-Endpoint -name "Información de Usuario" -url "$baseUrl/menu/usuario"
Test-Endpoint -name "Auditoría - Actividad Reciente" -url "$baseUrl/auditoria/ultimos?entidad=tickets&limit=3"
Test-Endpoint -name "Técnicos - Tickets" -url "$baseUrl/tecnicos"
Test-Endpoint -name "Avisos Públicos" -url "$baseUrl/avisos?page=1&pageSize=10"

# Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$testResults | Format-Table -AutoSize

$okCount = ($testResults | Where-Object { $_.Status -eq "OK" }).Count
$totalCount = $testResults.Count

Write-Host "`nResultado: $okCount/$totalCount endpoints funcionando correctamente`n" -ForegroundColor $(if ($okCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($okCount -lt $totalCount) {
    Write-Host "⚠ Asegúrate de que el servidor esté ejecutándose en $baseUrl" -ForegroundColor Yellow
    Write-Host "⚠ Verifica que la base de datos esté configurada y tenga datos" -ForegroundColor Yellow
}
