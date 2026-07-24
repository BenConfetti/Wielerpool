param(
  [ValidateSet("tour-2026", "vuelta-2026")]
  [string]$Round = "tour-2026",
  [int]$Port = 8125
)

$root = $PSScriptRoot
$url = "http://127.0.0.1:$Port/frontend/?round=$Round"
Write-Host "Wielerpool starten: $url"
Start-Process $url
python -m http.server $Port --bind 127.0.0.1 --directory $root