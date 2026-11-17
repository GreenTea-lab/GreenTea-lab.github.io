import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const version=JSON.parse(fs.readFileSync('package.json')).version,dir='promo/vk-'+version;
const media=JSON.parse(fs.readFileSync(dir+'/manifest.json'));
const ffmpeg='../postcard-mahjong/tools/media-runtime/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe';
const report={version,screenshots:[],videos:[]};
if(media.errors.length||media.screenshots.length!==12||media.videos.length!==2)throw Error('Incomplete media capture');
for(const shot of media.screenshots){const b=fs.readFileSync(dir+'/'+shot.file),w=b.readUInt32BE(16),h=b.readUInt32BE(20);if(w!==shot.width||h!==shot.height)throw Error('Wrong screenshot dimensions: '+shot.file);report.screenshots.push({file:shot.file,width:w,height:h});}
for(const video of media.videos){
 const r=spawnSync(ffmpeg,['-hide_banner','-i',dir+'/'+video.file,'-af','volumedetect','-vn','-sn','-f','null','NUL'],{encoding:'utf8',windowsHide:true});
 if(r.status!==0)throw Error(r.stderr);
 const time=r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/),duration=Number(time?.[1])*3600+Number(time?.[2])*60+Number(time?.[3]);
 const mean=r.stderr.match(/mean_volume: ([^\r\n]+)/)?.[1],max=r.stderr.match(/max_volume: ([^\r\n]+)/)?.[1];
 if(!Number.isFinite(duration)||duration>=30||!mean||mean.includes('-inf'))throw Error('Invalid video/audio: '+video.file);
 report.videos.push({file:video.file,duration,mean,max,decoded:true});
}
fs.writeFileSync('test-results/media-validation.json',JSON.stringify(report,null,2)+'\n');console.log('MEDIA PASS',report.version,report.screenshots.length,'screenshots,',report.videos.length,'videos');
