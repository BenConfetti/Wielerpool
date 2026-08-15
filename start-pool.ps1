param(
  [ValidateSet("tour-2026", "vuelta-2026")]
  [string]$Round = "tour-2026",
  [int]$Port = 8125,
  [switch]$NoBrowser
)

$root = [IO.Path]::GetFullPath($PSScriptRoot)
$url = "http://127.0.0.1:$Port/frontend/?round=$Round"
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
  $listener.Start()
  Write-Host "Wielerpool draait op: $url"
  Write-Host "Druk op Ctrl+C om de lokale server te stoppen."
  if (-not $NoBrowser) { Start-Process $url }

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
    if (-not $requestPath) {
      $requestPath = "frontend/index.html"
    } elseif ($requestPath.EndsWith("/")) {
      $requestPath = "$($requestPath)index.html"
    }
    $filePath = [IO.Path]::GetFullPath((Join-Path $root $requestPath))

    if (-not $filePath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $body = [Text.Encoding]::UTF8.GetBytes("Bestand niet gevonden.")
    } else {
      $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentTypes = @{
        ".html" = "text/html; charset=utf-8"
        ".js" = "text/javascript; charset=utf-8"
        ".mjs" = "text/javascript; charset=utf-8"
        ".css" = "text/css; charset=utf-8"
        ".json" = "application/json; charset=utf-8"
        ".csv" = "text/csv; charset=utf-8"
        ".svg" = "image/svg+xml"
        ".png" = "image/png"
        ".jpg" = "image/jpeg"
        ".jpeg" = "image/jpeg"
      }
      $context.Response.ContentType = $contentTypes[$extension]
      if (-not $context.Response.ContentType) { $context.Response.ContentType = "application/octet-stream" }
      $body = [IO.File]::ReadAllBytes($filePath)
    }

    $context.Response.ContentLength64 = $body.Length
    $context.Response.OutputStream.Write($body, 0, $body.Length)
    $context.Response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
