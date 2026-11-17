$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$gameRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$artRoot = Join-Path $gameRoot 'static/locations'
[IO.Directory]::CreateDirectory($artRoot) | Out-Null
$sources = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'location-art-sources.json') -Raw | ConvertFrom-Json
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
function Save-JPEG($Image, [string]$Path, [long]$Quality) {
  $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
  try { $Image.Save($Path, $jpegCodec, $parameters) } finally { $parameters.Dispose() }
}
foreach ($item in $sources) {
  if ($item.id -notmatch '^(classic|scholar)-[a-z-]+$') { throw 'Invalid asset identifier' }
  $fullPath = Join-Path $artRoot ($item.id + '.jpg')
  $thumbPath = Join-Path $artRoot ($item.id + '-thumb.jpg')
  if ((Test-Path -LiteralPath $fullPath) -and (Test-Path -LiteralPath $thumbPath)) { continue }
  $sourceImage = [System.Drawing.Image]::FromFile($item.source)
  try {
    Save-JPEG $sourceImage $fullPath 82
    $thumb = New-Object System.Drawing.Bitmap(640,240)
    $graphics = [System.Drawing.Graphics]::FromImage($thumb)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $cropHeight = [single]($sourceImage.Width * 240 / 640)
      $cropY = [single](($sourceImage.Height - $cropHeight) * 0.43)
      $graphics.DrawImage($sourceImage, (New-Object System.Drawing.Rectangle(0,0,640,240)), [single]0, $cropY, [single]$sourceImage.Width, $cropHeight, [System.Drawing.GraphicsUnit]::Pixel)
      Save-JPEG $thumb $thumbPath 82
    } finally { $graphics.Dispose(); $thumb.Dispose() }
  } finally { $sourceImage.Dispose() }
  Write-Output ('Prepared ' + $item.id)
}
