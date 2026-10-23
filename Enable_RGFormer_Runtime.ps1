$ErrorActionPreference = 'Stop'

$python = Join-Path (Get-Location).Path '.venv-rgformer\Scripts\python.exe'
$basicsrDir = Join-Path (Get-Location).Path 'backend\CodeFormer\basicsr'
$inferPath = Join-Path (Get-Location).Path 'backend\RGFormer\infer.py'

if (-not (Test-Path -LiteralPath $python)) {
    throw "RGFormer Python not found: $python. Run this script from the project root folder."
}
if (-not (Test-Path -LiteralPath (Join-Path $basicsrDir 'setup.py'))) {
    throw "CodeFormer's bundled BasicSR source not found at $basicsrDir. Check that backend\CodeFormer is present."
}
if (-not (Test-Path -LiteralPath $inferPath)) {
    throw "RGFormer infer.py not found: $inferPath. Run this script from the project root folder."
}

Write-Host 'Installing the local CodeFormer BasicSR package into .venv-rgformer...' -ForegroundColor Cyan
& $python -m pip install -e $basicsrDir
if ($LASTEXITCODE -ne 0) {
    throw 'BasicSR install failed. Copy the complete pip error from this terminal.'
}

$source = Get-Content -LiteralPath $inferPath -Raw
$registrationImport = 'from basicsr.archs.codeformer_arch import CodeFormer'
$anchor = 'from basicsr.utils.download_util import load_file_from_url'
if (-not $source.Contains($registrationImport)) {
    if (-not $source.Contains($anchor)) {
        throw "Could not find expected import line in infer.py: $anchor. No import patch was applied."
    }
    $source = $source.Replace($anchor, "$registrationImport`r`n$anchor")
    Set-Content -LiteralPath $inferPath -Value $source -Encoding utf8
    Write-Host 'Added CodeFormer architecture registration import to RGFormer infer.py.' -ForegroundColor Green
} else {
    Write-Host 'CodeFormer architecture registration import is already present.' -ForegroundColor Green
}

Write-Host 'Verifying BasicSR and CodeFormer architecture imports...' -ForegroundColor Cyan
& $python -c "from basicsr.utils.download_util import load_file_from_url; from basicsr.archs.codeformer_arch import CodeFormer; print('BasicSR and CodeFormer architecture imports OK')"
if ($LASTEXITCODE -ne 0) {
    throw 'Import verification failed. Send the complete traceback before trying inference again.'
}
Write-Host 'RGFormer runtime dependency setup finished. Next, restart the backend and retry once.' -ForegroundColor Green
