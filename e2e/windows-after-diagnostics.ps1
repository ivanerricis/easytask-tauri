# Diagnostics run AFTER a failed wdio session on Windows: where did the WebView2 browser write DevToolsActivePort
# (msedgedriver waits for that file in the --user-data-dir it passes) and which arguments did it launch the app with.
# Never fails the job; saved to e2e/output/windows-after-diagnostics.txt (uploaded as a CI artifact).
$ErrorActionPreference = "Continue"
$out = Join-Path $PSScriptRoot "output"
New-Item -ItemType Directory -Force $out | Out-Null
Start-Transcript -Path (Join-Path $out "windows-after-diagnostics.txt") -Force | Out-Null

Write-Host "=== identity ==="
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
Write-Host "user: $($identity.Name); elevated (Administrator): $($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"
Write-Host "E2E_EDGE_ARGS='$env:E2E_EDGE_ARGS'"

Write-Host "=== DevToolsActivePort files ==="
foreach ($root in @($env:TEMP, $env:LOCALAPPDATA, $env:APPDATA)) {
    try {
        Get-ChildItem -Path $root -Filter DevToolsActivePort -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "$($_.FullName)  (last write $($_.LastWriteTime))"
            Get-Content $_.FullName -TotalCount 2 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
        }
    } catch { Write-Host "cannot scan ${root}: $($_.Exception.Message)" }
}

Write-Host "=== WebView2 user data folders of the app ==="
foreach ($folder in @("$env:LOCALAPPDATA\com.ivanerricis.easytask", "$env:LOCALAPPDATA\EasyTask")) {
    if (Test-Path $folder) {
        Write-Host $folder
        Get-ChildItem $folder -Force -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $($_.Name)  ($($_.LastWriteTime))" }
        $ebweb = Join-Path $folder "EBWebView"
        if (Test-Path $ebweb) { Get-ChildItem $ebweb -Force -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "      EBWebView/$($_.Name)" } }
    }
}

Write-Host "=== msedgedriver launch lines (full) ==="
Get-ChildItem (Join-Path $out "msedgedriver-*.log") -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "--- $($_.Name)"
    Select-String -Path $_.FullName -Pattern "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS|Launching Microsoft Edge|Failed to connect|user-data-dir|DevToolsActivePort|remote-debugging" |
        ForEach-Object { Write-Host $_.Line }
}

Write-Host "=== processes (with command lines) ==="
Get-CimInstance Win32_Process |
    Where-Object { $_.Name -match 'EasyTask|msedgewebview2|msedgedriver|tauri-driver' } |
    ForEach-Object { Write-Host "$($_.ProcessId) <- $($_.ParentProcessId)  $($_.Name)`n    $($_.CommandLine)" }

Stop-Transcript | Out-Null
