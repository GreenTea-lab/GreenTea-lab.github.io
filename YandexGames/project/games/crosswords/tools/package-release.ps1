$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$gameRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$deliverableRoot = Join-Path $gameRoot 'deliverables'
$version = (Get-Content -LiteralPath (Join-Path $gameRoot 'package.json') -Raw | ConvertFrom-Json).version
[IO.Directory]::CreateDirectory($deliverableRoot) | Out-Null

function Get-ProjectRelativePath([string]$BaseDirectory, [string]$FilePath) {
  $prefix = [IO.Path]::GetFullPath($BaseDirectory).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  $absolute = [IO.Path]::GetFullPath($FilePath)
  if (-not $absolute.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Relative path escaped directory' }
  return $absolute.Substring($prefix.Length)
}

function New-ProjectArchive([string]$Name, [string]$BaseDirectory, [string[]]$Files) {
  $archivePath = [IO.Path]::GetFullPath((Join-Path $deliverableRoot $Name))
  if (-not $archivePath.StartsWith($gameRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path escaped project' }
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath }
  $archive = [IO.Compression.ZipFile]::Open($archivePath, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($relative in $Files) {
      $sourcePath = [IO.Path]::GetFullPath((Join-Path $BaseDirectory $relative))
      if (-not $sourcePath.StartsWith($gameRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Source path escaped project' }
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $sourcePath, $relative.Replace('\','/'), [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $archive.Dispose() }
}

$buildRoot = Join-Path $gameRoot 'dist-vk'
$buildFiles = @(Get-ChildItem -LiteralPath $buildRoot -Recurse -File | ForEach-Object { Get-ProjectRelativePath $buildRoot $_.FullName })
New-ProjectArchive ('crosswords-vk-' + $version + '.zip') $buildRoot $buildFiles

$sourceFiles = @()
foreach ($directory in @('src','static','tools','test','promo')) {
  $sourceFiles += Get-ChildItem -LiteralPath (Join-Path $gameRoot $directory) -Recurse -File | ForEach-Object {
    $relative = (Get-ProjectRelativePath $gameRoot $_.FullName).Replace('\','/')
    if ($relative -notmatch '\.(gz|zip)$' -and $relative -notmatch '/WordNet-3.0/dict/' -and $relative -notmatch '-frequency\.txt$' -and $relative -notmatch '^test/out/') { $relative }
  }
}
$sourceFiles += @('package.json','package-lock.json','build.mjs','PROJECT.md','README.md','RELEASE_2_0.md','COMPETITORS.md','DICTIONARIES.md','ART.md','VK_RELEASE_GUIDE.md','LOCATIONS.md','UI_2_1_1.md','UI_2_1_2.md')
New-ProjectArchive ('crosswords-source-' + $version + '.zip') $gameRoot $sourceFiles

$mediaRoot = Join-Path $deliverableRoot ('media-' + $version)
$mediaFiles = @(Get-ChildItem -LiteralPath $mediaRoot -File | ForEach-Object { $_.Name })
New-ProjectArchive ('crosswords-media-' + $version + '.zip') $mediaRoot $mediaFiles
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-vk-single/index.html') -Destination (Join-Path $deliverableRoot ('crosswords-preview-' + $version + '.html')) -Force

$validationRoot = Join-Path $deliverableRoot ('validation-' + $version)
[IO.Directory]::CreateDirectory($validationRoot) | Out-Null
foreach ($reportFile in @('test-results/level-generation.json','test-results/daily-generation.json','test-results/release/report.json','test-results/locations/report.json','test-results/locations/content-preservation.json','test-results/layout/report.json')) {
  $name = if ($reportFile.EndsWith('release/report.json')) { 'browser-release.json' } elseif ($reportFile.EndsWith('locations/report.json')) { 'locations.json' } elseif ($reportFile.EndsWith('layout/report.json')) { 'layout.json' } else { [IO.Path]::GetFileName($reportFile) }
  Copy-Item -LiteralPath (Join-Path $gameRoot $reportFile) -Destination (Join-Path $validationRoot $name) -Force
}
$collectionReport = Join-Path $gameRoot '../../catalog/verification.json'
if (Test-Path -LiteralPath $collectionReport) { Copy-Item -LiteralPath $collectionReport -Destination (Join-Path $validationRoot 'collection.json') -Force }

$artifacts = @(('crosswords-vk-' + $version + '.zip'),('crosswords-source-' + $version + '.zip'),('crosswords-media-' + $version + '.zip'),('crosswords-preview-' + $version + '.html')) | ForEach-Object {
  $filePath = Join-Path $deliverableRoot $_
  [ordered]@{ file = $_; bytes = (Get-Item -LiteralPath $filePath).Length; sha256 = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$manifest = [ordered]@{
  version = $version; preparedOn = '2026-11-16'; uploadedToVK = $false
  levelsPerLanguage = [ordered]@{ classic=1000; scholars=1000; uniqueAnswers=17036; repeatedAnswers=0 }
  locations = [ordered]@{classic=20;scholars=20;levelsPerLocation=50;uniqueImages=40}
  artifacts = @($artifacts)
  build = @($buildFiles | ForEach-Object { [ordered]@{file=$_.Replace('\','/');sha256=(Get-FileHash -LiteralPath (Join-Path $buildRoot $_) -Algorithm SHA256).Hash.ToLowerInvariant()} })
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $deliverableRoot ('manifest-' + $version + '.json')) -Encoding utf8
$artifacts | ForEach-Object { [pscustomobject]$_ } | Format-Table file, bytes
