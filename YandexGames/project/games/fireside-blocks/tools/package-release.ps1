param([string]$ReleaseDate='2026-11-15',[string]$Tag='v2-5')
$ErrorActionPreference='Stop'
if($Tag -notmatch '^[a-z0-9-]+$' -or $ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$'){throw 'Invalid release tag/date'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$gameRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if(@(Get-ChildItem -LiteralPath (Join-Path $gameRoot 'dist-vk/rooms') -File -Filter '*.webp').Count -ne 48){throw 'Incomplete room backgrounds: release needs 48 full scenes'}
$deliveryRoot=Join-Path $gameRoot 'deliverables'
New-Item -ItemType Directory -Path $deliveryRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $gameRoot 'preview-vk') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-single/index.html') -Destination (Join-Path $gameRoot 'preview/index.html') -Force
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-vk-single/index.html') -Destination (Join-Path $gameRoot 'preview-vk/index.html') -Force
$playName="fireside-blocks-play-$Tag-$ReleaseDate.html"
Copy-Item -LiteralPath (Join-Path $gameRoot 'dist-vk-single/index.html') -Destination (Join-Path $deliveryRoot $playName) -Force
function New-ReleaseArchive($Name,$Base,$Files){
 $target=Join-Path $deliveryRoot $Name
 if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Force}
 $archive=[IO.Compression.ZipFile]::Open($target,[IO.Compression.ZipArchiveMode]::Create)
 try{
  foreach($file in ($Files | Sort-Object FullName -Unique)){
   $entry=[IO.Path]::GetRelativePath($Base,$file.FullName).Replace('\','/')
   if($entry.StartsWith('../') -or [IO.Path]::IsPathRooted($entry)){throw 'Source outside release root'}
   [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
 }finally{$archive.Dispose()}
 $check=[IO.Compression.ZipFile]::OpenRead($target)
 try{
  $entries=$check.Entries.FullName
  if($Name -like '*vk-ok*' -and (-not ($entries -contains 'index.html') -or -not ($entries -contains 'game.js'))){throw 'Missing entry point'}
  $count=$check.Entries.Count
 }finally{$check.Dispose()}
 return [pscustomobject]@{file=$Name;bytes=(Get-Item -LiteralPath $target).Length;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant();entries=$count}
}
$sourceFiles=@()
foreach($folder in @('src','static','test','tools','art')){$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot $folder) -Recurse -File}
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test-results/baseline') -File
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test-results/refinement') -File
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test-results/room') -File
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test-results/retention') -File
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test-results/personal-records') -File
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test-results/room-scenes') -File
foreach($folder in @('test-results/moderation','test-results/expansion')){$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot $folder) -File -Filter '*.json'}
$sourceFiles+=Get-ChildItem -LiteralPath $gameRoot -File | Where-Object {$_.Extension -eq '.md' -or $_.Name -in @('package.json','package-lock.json','build.mjs')}
$manifest=@(
 (New-ReleaseArchive "fireside-blocks-vk-ok-$Tag-$ReleaseDate.zip" (Join-Path $gameRoot 'dist-vk') (Get-ChildItem -LiteralPath (Join-Path $gameRoot 'dist-vk') -Recurse -File)),
 (New-ReleaseArchive "fireside-blocks-source-$Tag-$ReleaseDate.zip" $gameRoot $sourceFiles),
 [pscustomobject]@{file=$playName;bytes=(Get-Item -LiteralPath (Join-Path $deliveryRoot $playName)).Length;sha256=(Get-FileHash -LiteralPath (Join-Path $deliveryRoot $playName) -Algorithm SHA256).Hash.ToLowerInvariant();entries=$null}
)
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $deliveryRoot "manifest-$Tag.json") -Encoding utf8
$manifest | Format-Table file,bytes,entries
