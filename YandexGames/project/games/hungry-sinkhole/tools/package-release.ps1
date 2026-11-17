$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$gameRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$deliveryRoot=Join-Path $gameRoot 'deliverables'
$kitRoot=Join-Path $deliveryRoot 'vk-upload-2.3.0'
function Write-Archive($Target,$Base,$Files){
  $full=[IO.Path]::GetFullPath($Target)
  if(-not $full.StartsWith($deliveryRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Archive outside deliverables'}
  if(Test-Path -LiteralPath $full){Remove-Item -LiteralPath $full -Force}
  $zip=[IO.Compression.ZipFile]::Open($full,[IO.Compression.ZipArchiveMode]::Create)
  try{foreach($file in ($Files|Sort-Object FullName -Unique)){
    $entry=[IO.Path]::GetRelativePath($Base,$file.FullName).Replace('\','/')
    if($entry.StartsWith('../')){throw 'Archive entry outside source'}
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal)|Out-Null
  }}finally{$zip.Dispose()}
  [pscustomobject]@{file=[IO.Path]::GetFileName($full);bytes=(Get-Item -LiteralPath $full).Length;sha256=(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()}
}
$buildRoot=Join-Path $gameRoot 'dist-vk'
$records=@(Write-Archive (Join-Path $deliveryRoot 'hungry-sinkhole-vk-2.3.0.zip') $buildRoot (Get-ChildItem -LiteralPath $buildRoot -Recurse -File))
Copy-Item -LiteralPath (Join-Path $deliveryRoot 'hungry-sinkhole-vk-2.3.0.zip') -Destination (Join-Path $kitRoot 'build.zip') -Force
$sourceFiles=@()
foreach($folder in @('src','static','art')){$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot $folder) -Recurse -File}
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'test') -Recurse -File
$sourceFiles+=Get-ChildItem -LiteralPath (Join-Path $gameRoot 'tools') -File
$sourceFiles+=Get-ChildItem -LiteralPath $gameRoot -File|Where-Object{$_.Extension -eq '.md' -or $_.Name -in @('package.json','package-lock.json','build.mjs')}
$records+=Write-Archive (Join-Path $deliveryRoot 'hungry-sinkhole-source-2.3.0.zip') $gameRoot $sourceFiles
$kitFiles=Get-ChildItem -LiteralPath $kitRoot -Recurse -File|Where-Object{$_.FullName -notmatch '[\\/]node_modules[\\/]'}
$records+=Write-Archive (Join-Path $deliveryRoot 'hungry-sinkhole-vk-kit-2.3.0.zip') $kitRoot $kitFiles
$records|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $deliveryRoot 'archives-2.3.0.json') -Encoding utf8
$records|Format-Table file,bytes
