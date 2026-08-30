# 월간 사진 라이브러리 보충 작업 실행 (Windows 작업 스케줄러에서 호출)
$ErrorActionPreference = "Continue"
$repoDir = "C:\Users\kkssm\Desktop\Claudecode\InstaCardnews"
$promptFile = Join-Path $repoDir "local-export\library-topup-prompt.md"
$logDir = Join-Path $repoDir "local-export\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("topup-{0}.log" -f (Get-Date -Format "yyyy-MM-dd_HHmm"))

$prompt = Get-Content -Raw -Encoding UTF8 $promptFile
Set-Location $repoDir

& "C:\Users\kkssm\AppData\Roaming\npm\claude.cmd" -p $prompt --permission-mode bypassPermissions *> $logFile

Write-Output "Log written to $logFile"
