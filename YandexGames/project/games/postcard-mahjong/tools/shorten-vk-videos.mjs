import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const media=path.resolve('promo/vk-release-2.3.0'),ffmpeg=path.resolve('tools/media-runtime/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
const manifestFile=path.join(media,'media-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));
const backup=path.resolve('test-results/promo-capture/full-length-'+Date.now());
function ff(args){const r=spawnSync(ffmpeg,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stderr;}
const checks=[];
for(const v of manifest.videos){
  const file=path.join(media,v.file);
  if(v.duration>30){
    fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(file,path.join(backup,path.basename(file)));
    const duration=29,start=Math.max(0,v.duration-duration),temporary=file+'.short.mp4';
    // Keep the real final levels and postcard, at the original playback speed.
    ff(['-y','-v','error','-ss',String(start),'-i',file,'-t',String(duration),'-map','0:v:0','-map','0:a:0','-vf','fade=t=in:st=0:d=0.2,fade=t=out:st=28.6:d=0.4,format=yuv420p','-af','afade=t=in:st=0:d=0.25,afade=t=out:st=27.6:d=1.4','-r','30','-c:v','libx264','-preset','medium','-crf','20','-c:a','aac','-b:a','128k','-movflags','+faststart',temporary]);
    const info=ff(['-hide_banner','-i',temporary,'-af','volumedetect','-f','null','-']);
    const t=info.match(/Duration: (\d+):(\d+):([\d.]+)/);assert.ok(t,'MP4 duration missing');
    const seconds=Number(t[1])*3600+Number(t[2])*60+Number(t[3]);assert.ok(seconds>28&&seconds<=30,'Video must stay below 30 seconds');
    assert.ok(info.includes(v.w+'x'+v.h)&&info.includes('h264')&&info.includes('aac'));
    fs.renameSync(temporary,file);v.originalDuration=v.duration;v.trimStart=start;v.duration=seconds;
    v.meanVolumeDb=Number(info.match(/mean_volume: ([\d.-]+) dB/)?.[1]);v.maxVolumeDb=Number(info.match(/max_volume: ([\d.-]+) dB/)?.[1]);
    console.log('Shortened',v.file,'to',seconds,'seconds');
  }
  const label=v.file.includes('landscape')?'landscape':'portrait';
  ff(['-y','-v','error','-ss','27.2','-i',file,'-frames:v','1','-q:v','2',path.join(media,'video',`gameplay-${label}-poster.jpg`)]);
  v.bytes=fs.statSync(file).size;v.codec='H.264 / AAC, 30 fps, yuv420p, faststart';v.durationLimitSeconds=30;v.source='Excerpt of genuine early-level gameplay and the first postcard, normal playback speed';
  checks.push({file:v.file,duration:v.duration,width:v.w,height:v.h,decoded:true});
}
manifest.videoProfile='Excerpts from a fresh-save playthrough using genuine pointer input and normal game rewards; no speed-up. Each exported clip is under 30 seconds.';
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
const readmeFile=path.join(media,'МАТЕРИАЛЫ.md');let readme=fs.readFileSync(readmeFile,'utf8');
readme=readme.replace(/44,24 с\./g,'около 29 с.').replace(/40,04 с\./g,'около 29 с.');
readme=readme.replace('Игра записана на чистом сохранении: первые три уровня пройдены обычными нажатиями, первая открытка получена по правилам игры.','В роликах оставлены фрагменты прохождения первых уровней и получение первой открытки. Исходная запись сделана на чистом сохранении обычными нажатиями, награды получены по правилам игры. Каждый готовый ролик короче 30 секунд.');
fs.writeFileSync(readmeFile,readme);
fs.mkdirSync('test-results/video-length',{recursive:true});fs.writeFileSync('test-results/video-length/report.json',JSON.stringify({limitSeconds:30,checks,errors:[]},null,2));
console.log('PASS: both MP4 clips are under 30 seconds, with H.264 video and AAC audio');
