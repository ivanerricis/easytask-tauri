# Diagnostics for the Windows e2e job (run before wdio, after the debug build). Never fails the job:
# everything is printed and saved to e2e/output/windows-diagnostics.txt (uploaded as a CI artifact).
$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$out = Join-Path $PSScriptRoot "output"
New-Item -ItemType Directory -Force $out | Out-Null
Start-Transcript -Path (Join-Path $out "windows-diagnostics.txt") -Force | Out-Null

Write-Host "=== OS ==="
(Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber | Format-List | Out-String)
Write-Host "interactive session: $([Environment]::UserInteractive); session name: $env:SESSIONNAME"

Write-Host "=== WebView2 runtime / Edge versions ==="
$guidWebView2 = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$guidEdge = "{56EB18F8-B008-4CBD-B6D2-8C97FE7E9062}"
foreach ($hive in "HKLM:\SOFTWARE\WOW6432Node", "HKLM:\SOFTWARE", "HKCU:\SOFTWARE") {
    foreach ($entry in @(@("WebView2", $guidWebView2), @("Edge", $guidEdge))) {
        $key = "$hive\Microsoft\EdgeUpdate\Clients\$($entry[1])"
        $pv = (Get-ItemProperty $key -ErrorAction SilentlyContinue).pv
        if ($pv) { Write-Host "$($entry[0]) pv=$pv  ($key)" }
    }
}
Get-ChildItem "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d+\.' } | ForEach-Object { Write-Host "installed folder: $($_.FullName)" }

Write-Host "=== tauri-driver ==="
$driver = Join-Path $HOME ".cargo\bin\tauri-driver.exe"
Write-Host "$driver exists: $(Test-Path $driver)"
& cargo install --list | Select-String "tauri-driver"

Write-Host "=== processes that could conflict (before) ==="
Get-Process | Where-Object { $_.Name -match "EasyTask|msedgedriver|msedgewebview2|tauri-driver" } | Format-Table Name, Id, StartTime -AutoSize | Out-String
Write-Host "listeners on 4444:"
Get-NetTCPConnection -LocalPort 4444 -ErrorAction SilentlyContinue | Format-Table -AutoSize | Out-String

Write-Host "=== manual launch of the app ==="
$app = Join-Path $root "src-tauri\target\debug\EasyTask.exe"
Write-Host "$app exists: $(Test-Path $app)"
$dataDir = Join-Path ([IO.Path]::GetTempPath()) ("easytask-diag-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force $dataDir | Out-Null
$env:EASYTASK_DATA_DIR = $dataDir
Write-Host "EASYTASK_DATA_DIR=$env:EASYTASK_DATA_DIR"
$proc = Start-Process -FilePath $app -PassThru -RedirectStandardOutput (Join-Path $out "app-stdout.txt") -RedirectStandardError (Join-Path $out "app-stderr.txt")
Start-Sleep -Seconds 15
$proc.Refresh()
if ($proc.HasExited) {
    Write-Host "RESULT: the app EXITED after startup, exit code $($proc.ExitCode)"
} else {
    Write-Host "RESULT: the app is still running after 15 s (pid $($proc.Id)), main window handle: $($proc.MainWindowHandle), title: '$($proc.MainWindowTitle)'"
    Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Select-Object Id, @{n = "Parent"; e = { (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").ParentProcessId } } | Format-Table -AutoSize | Out-String
    Stop-Process -Id $proc.Id -Force
}
Write-Host "--- app stdout ---"; Get-Content (Join-Path $out "app-stdout.txt") -ErrorAction SilentlyContinue
Write-Host "--- app stderr ---"; Get-Content (Join-Path $out "app-stderr.txt") -ErrorAction SilentlyContinue
Write-Host "--- data dir ---"
Get-ChildItem $dataDir -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, Length | Format-Table -AutoSize | Out-String
Write-Host "--- $dataDir\logs\easytask.log ---"
Get-Content (Join-Path $dataDir "logs\easytask.log") -ErrorAction SilentlyContinue
Copy-Item (Join-Path $dataDir "logs") (Join-Path $out "manual-launch-logs") -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
# Only on a CI runner: on a developer machine other WebView2 hosts must not be killed
if ($env:CI) { Get-Process | Where-Object { $_.Name -match "EasyTask|msedgewebview2" } | Stop-Process -Force -ErrorAction SilentlyContinue }
Remove-Item Env:EASYTASK_DATA_DIR

Stop-Transcript | Out-Null
exit 0
