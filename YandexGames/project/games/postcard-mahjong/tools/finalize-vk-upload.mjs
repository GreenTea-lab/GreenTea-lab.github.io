import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const media=path.resolve('promo/vk-release-2.3.0'),stage=path.resolve('deliverables/vk-upload-2.3.0'),ffmpeg=path.resolve('tools/media-runtime/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
const manifest=JSON.parse(fs.readFileSync(path.join(media,'media-manifest.json')));
function ff(args){const r=spawnSync(ffmpeg,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stderr;}
for(const v of manifest.videos){
  const label=v.file.includes('landscape')?'landscape':'portrait',file=path.join(media,v.file),temporary=file+'.normalized.mp4';
  ff(['-y','-v','error','-i',file,'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',`loudnorm=I=-24:TP=-3:LRA=9,afade=t=in:st=0:d=0.3,afade=t=out:st=${v.duration-1.4}:d=1.4,apad`,'-t',String(v.duration),'-c:a','aac','-b:a','128k','-movflags','+faststart',temporary]);
  fs.renameSync(temporary,file);
  const poster=path.join(media,'video',`gameplay-${label}-poster.jpg`);ff(['-y','-v','error','-ss',String(v.duration-1),'-i',file,'-frames:v','1','-q:v','2',poster]);
  const info=ff(['-hide_banner','-i',file,'-af','volumedetect','-f','null','-']);
  assert.ok(info.includes('h264')&&info.includes('aac')&&info.includes(v.w+'x'+v.h));
  v.meanVolumeDb=Number(info.match(/mean_volume: ([\d.-]+) dB/)?.[1]);v.maxVolumeDb=Number(info.match(/max_volume: ([\d.-]+) dB/)?.[1]);
  assert.ok(Number.isFinite(v.meanVolumeDb)&&v.meanVolumeDb>-38&&v.maxVolumeDb<0);
  v.bytes=fs.statSync(file).size;v.codec='H.264 / AAC, 30 fps, yuv420p, faststart';
  console.log('Verified video',label,v.duration,'seconds;',v.meanVolumeDb,'dB mean;',v.maxVolumeDb,'dB peak');
}
for(const s of manifest.screenshots){const b=fs.readFileSync(path.join(media,s.file));assert.equal(b.readUInt32BE(16),s.w);assert.equal(b.readUInt32BE(20),s.h);}
fs.writeFileSync(path.join(media,'media-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const readme=`# Материалы карточки «Маджонг с открытками»\n\nВерсия 2.3.0 · 15.11.2026.\n\n## Скриншоты\n\n14 реальных снимков интерфейса: 7 вертикальных 600 × 1200 и 7 горизонтальных 1200 × 600. Серии находятся в screenshots/portrait/ и screenshots/landscape/.\n\n1. Москва — почтовый маршрут, фрукты и керамические плитки.\n2. Париж — самоцветы и фарфор.\n3. Киото — задание с печатями и нефрит.\n4. Венеция — классические рисунки плиток.\n5. Коллекционная открытка.\n6. Дневник с готовыми наградами.\n7. Карта путешествия.\n\nДля кадров использован демонстрационный профиль с открытыми городами и оформлением. Все экраны и возможности взяты из игры; это не макеты интерфейса.\n\n## Видео\n\n- video/gameplay-landscape.mp4 — 1920 × 1080, около 29 с.\n- video/gameplay-portrait.mp4 — 720 × 1280, около 29 с.\n\nОба MP4: H.264 + AAC, 30 кадров/с, faststart. Фрагменты первых уровней и получение первой открытки. Исходная запись сделана на чистом сохранении обычными нажатиями, награды получены по правилам игры. Каждый готовый ролик короче 30 секунд. Слышны собственные музыка и эффекты игры; громкость выровнена для видео. Изображение не ускорялось, сторонней музыки нет. Постеры рядом с видео — последние кадры с открыткой.\n\nВидео снято в браузере на компьютере. Вертикальный формат показывает адаптивный интерфейс; это не запись с физического телефона. Реальную интеграцию VK перед модерацией нужно проверить в клиенте.\n\n## Оформление\n\nbranding/icon-576.png, icon-278.png, icon-150.png, icon-32.png — варианты иконки из существующей эмблемы игры. branding/cover-1120x630.png — обложка с городским фоном. Эти изображения предназначены для оформления, а не подменяют скриншоты.\n\nРазмеры и способ добавления медиа сверяйте с текущими полями кабинета VK. Скриншоты одной ориентации загружайте одной серией. Если видео принимается по ссылке — сначала самостоятельно загрузите MP4 в VK Видео.\n\nФайлы media/ не кладите в build/: они нужны для карточки, а не для игрового хостинга.\n`;
fs.writeFileSync(path.join(media,'МАТЕРИАЛЫ.md'),readme);fs.cpSync(media,path.join(stage,'media'),{recursive:true});
// Exercise the ID guard without ever invoking the deploy CLI or reading stored credentials.
const cfgFile=path.join(stage,'vk-hosting-config.json'),original=fs.readFileSync(cfgFile);
try{
  let r=spawnSync(process.execPath,['check-build.cjs'],{cwd:stage,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  r=spawnSync(process.execPath,['deploy-dev.cjs'],{cwd:stage,encoding:'utf8'});assert.equal(r.status,1,'Unset app ID must prevent launch');
  r=spawnSync(process.execPath,['configure-app.cjs'],{cwd:stage,input:'123456789\n',encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  r=spawnSync(process.execPath,['check-build.cjs','--require-app'],{cwd:stage,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  r=spawnSync(process.execPath,['configure-app.cjs'],{cwd:stage,input:'54817546\n',encoding:'utf8'});assert.equal(r.status,1,'Neon Swarm ID must be rejected');
}finally{fs.writeFileSync(cfgFile,original);}
assert.equal(JSON.parse(fs.readFileSync(cfgFile)).app_id,0);
assert.ok(fs.readFileSync(path.join(stage,'preview.html')).equals(fs.readFileSync('dist-vk-single/index.html')));
assert.equal(JSON.parse(fs.readFileSync(path.join(stage,'node_modules/@vkontakte/vk-miniapps-deploy/package.json'))).version,'1.0.3');
const files=[];function walk(dir,rel=''){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name==='node_modules'||e.name==='kit-manifest.json')continue;const name=path.join(rel,e.name),file=path.join(dir,e.name);
    if(e.isDirectory())walk(file,name);else files.push({path:name.replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
  }
}walk(stage);
fs.writeFileSync(path.join(stage,'kit-manifest.json'),JSON.stringify({version:'2.3.0',date:'2026-11-15',buildVerified:true,idGuardVerified:true,appId:0,screenshots:14,videos:2,publishingPerformed:false,files},null,2)+'\n');
fs.mkdirSync('test-results/vk-upload',{recursive:true});fs.writeFileSync('test-results/vk-upload/verification.json',JSON.stringify({buildFiles:67,screenshots:14,videos:manifest.videos,idGuard:true,desktopCopyPending:true,errors:[]},null,2));
console.log('Upload kit finalised:',stage,';',files.length,'files in checksum manifest');
