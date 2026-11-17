param([string]$Tag = 'personal-records', [string]$ReleaseDate = '2026-11-15')
$ErrorActionPreference = 'Stop'
if ($Tag -notmatch '^[a-z0-9-]+$' -or $ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$') { throw 'Invalid release name' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$gameRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$deliveryRoot = Join-Path $gameRoot 'deliverables'
New-Item -ItemType Directory -Path $deliveryRoot -Force | Out-Null

function New-ReleaseArchive($Name, $Base, $Files) {
  $target = Join-Path $deliveryRoot $Name
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
  $archive = [IO.Compression.ZipFile]::Open($target, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($file in ($Files | Sort-Object FullName -Unique)) {
      $entry = [IO.Path]::GetRelativePath($Base, $file.FullName).Replace('\', '/')
      if ($entry.StartsWith('../') -or [IO.Path]::IsPathRooted($entry)) { throw 'Source outside release root' }
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $archive.Dispose() }
  $check = [IO.Compression.ZipFile]::OpenRead($target)
  try { $count = $check.Entries.Count } finally { $check.Dispose() }
  return [pscustomobject]@{ file = $Name; bytes = (Get-Item -LiteralPath $target).Length; sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant(); entries = $count }
}

# Полка сохраняет стандартное автономное превью; отдельное VK-превью — свой адаптер.
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-single/index.html') -Destination (Join-Path $gameRoot 'preview/index.html') -Force
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-vk-single/index.html') -Destination (Join-Path $gameRoot 'preview-vk/index.html') -Force
$playName = "postcard-mahjong-play-$Tag-$ReleaseDate.html"
# Для проверки релиза VK автономный файл использует VK-адаптер без фиктивной рекламы.
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-vk-single/index.html') -Destination (Join-Path $deliveryRoot $playName) -Force
$sourceFiles = @()
foreach ($folder in @('src', 'static', 'test', 'tools', 'art/interface', 'art/tiles', 'art/skins', 'art/collections', 'art/postcards')) {
  $sourceFiles += Get-ChildItem -LiteralPath (Join-Path $gameRoot $folder) -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]|[\\/]pw-browsers[\\/]' }
}
$sourceFiles += Get-ChildItem -LiteralPath $gameRoot -File | Where-Object { $_.Extension -eq '.md' -or $_.Name -in @('package.json', 'package-lock.json', 'build.mjs') }
$sourceFiles += Get-Item -LiteralPath (Join-Path $gameRoot 'art/city-backgrounds/generation.json')
$manifest = @(
  (New-ReleaseArchive "postcard-mahjong-vk-ok-$Tag-$ReleaseDate.zip" (Join-Path $gameRoot 'dist-vk') (Get-ChildItem -LiteralPath (Join-Path $gameRoot 'dist-vk') -Recurse -File)),
  (New-ReleaseArchive "postcard-mahjong-source-$Tag-$ReleaseDate.zip" $gameRoot $sourceFiles),
  [pscustomobject]@{ file = $playName; bytes = (Get-Item -LiteralPath (Join-Path $deliveryRoot $playName)).Length; sha256 = (Get-FileHash -LiteralPath (Join-Path $deliveryRoot $playName) -Algorithm SHA256).Hash.ToLowerInvariant(); entries = $null }
)
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $deliveryRoot "manifest-$Tag.json") -Encoding utf8
$manifest | Format-Table file, bytes, entries
