# Sobe o backend do AvaTEA carregando todas as variáveis do .env

# Limpa variáveis que podem ter sobrado de sessões anteriores
Remove-Item Env:OPENAI_BASE_URL   -ErrorAction SilentlyContinue
Remove-Item Env:OPENAI_API_KEY    -ErrorAction SilentlyContinue
Remove-Item Env:OPENAI_MODEL      -ErrorAction SilentlyContinue
Remove-Item Env:ELEVENLABS_API_KEY  -ErrorAction SilentlyContinue
Remove-Item Env:ELEVENLABS_VOICE_ID -ErrorAction SilentlyContinue

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERRO: arquivo .env nao encontrado em $envFile" -ForegroundColor Red
    exit 1
}

# Carrega cada linha do .env como variavel de ambiente do processo atual
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and $line -notmatch '^\s*#') {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $key   = $parts[0].Trim()
            $value = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

Write-Host ""
Write-Host "AvaTEA Backend" -ForegroundColor Cyan
Write-Host "  Modelo : $env:OPENAI_MODEL" -ForegroundColor Gray
Write-Host "  Voz    : $env:ELEVENLABS_VOICE_ID" -ForegroundColor Gray
Write-Host "  Porta  : $env:PORT" -ForegroundColor Gray
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "src")
python apiv2.py
