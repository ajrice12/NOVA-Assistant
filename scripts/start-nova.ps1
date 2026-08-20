$ErrorActionPreference = "SilentlyContinue"
$NovaUrl = "https://nova-work-intelligence.ajrice444601.chatgpt.site"
$PollSeconds = 5

while ($true) {
  try {
    $response = Invoke-WebRequest -Uri $NovaUrl -Method Get -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      Start-Process -FilePath $NovaUrl
      exit 0
    }
  } catch {
    # Windows may still be connecting to Wi-Fi. Keep waiting quietly.
  }

  Start-Sleep -Seconds $PollSeconds
}
