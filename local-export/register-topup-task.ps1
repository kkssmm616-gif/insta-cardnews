$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\kkssm\Desktop\Claudecode\InstaCardnews\local-export\run-library-topup.ps1"' -WorkingDirectory "C:\Users\kkssm\Desktop\Claudecode\InstaCardnews"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date -Hour 10 -Minute 30 -Second 0) -RepetitionInterval (New-TimeSpan -Days 30) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "InstaCardnews-MonthlyLibraryTopup" -Action $action -Trigger $trigger -Settings $settings -Description "월 1회 경제 뉴스 사진 라이브러리에 신규 사진 보충 (Claude Code 비대화형 실행)" -Force
Get-ScheduledTask -TaskName "InstaCardnews-MonthlyLibraryTopup" | Select-Object TaskName, State
