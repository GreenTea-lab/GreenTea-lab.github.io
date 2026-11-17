import {LANG,t,fmt} from './i18n.js';
import {CITIES} from './levels.js';
import {drawCityArt} from './city-art.js';
import {bodySprite,faceSprite} from './tiles.js';

// Local Canvas artwork: no user identity, remote uploads or credentials are required.
export function createRecordStory(record={}){
  const cv=document.createElement('canvas');cv.width=720;cv.height=1280;
  const g=cv.getContext('2d');if(!g)throw Error('Story canvas unavailable');
  const score=Number.isFinite(record.score)?Math.max(0,Math.floor(record.score)):0,city=Number.isFinite(record.city)?Math.max(0,Math.min(19,Math.floor(record.city))):0;
  drawCityArt(g,CITIES[city].id,720,1280);
  const shade=g.createLinearGradient(0,0,0,1280);shade.addColorStop(0,'#183e3877');shade.addColorStop(.6,'#163b3144');shade.addColorStop(1,'#102e26cc');g.fillStyle=shade;g.fillRect(0,0,720,1280);
  function panel(x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
  panel(42,230,636,820,34,'#fff8e9ed');g.strokeStyle='#c6a36c';g.lineWidth=3;g.beginPath();g.roundRect(53,241,614,798,27);g.stroke();
  g.textAlign='center';g.textBaseline='middle';
  function text(s,y,size,color='#33584a',font='Nunito'){
    do{g.font=`800 ${size--}px ${font}, sans-serif`;}while(g.measureText(s).width>550&&size>16);
    g.fillStyle=color;g.fillText(s,360,y);
  }
  text(LANG==='ru'?'МАДЖОНГ':'POSTCARD',298,41);text(LANG==='ru'?'С ОТКРЫТКАМИ':'MAHJONG',347,34);
  const body=bodySprite('ivory',90),faces=['orange','tulip','pear'];
  for(let i=0;i<3;i++){
    g.save();g.translate(360+(i-1)*96,450+Math.abs(i-1)*10);g.rotate((i-1)*.11);
    g.drawImage(body,-45,-56,90,112);const face=faceSprite(faces[i],84);g.drawImage(face,-42,-42,84,84);g.restore();
  }
  text(LANG==='ru'?'МОЙ ЛИЧНЫЙ РЕКОРД':'MY PERSONAL BEST',585,26,'#8b7048');
  text(fmt(score),680,108);text(LANG==='ru'?'очков':'points',758,28,'#8b7048');
  text(record.calm?(LANG==='ru'?'Спокойный режим':'Relaxed mode'):(LANG==='ru'?'На результат':'Challenge mode'),831,30);
  text(t('c_'+CITIES[city].id),887,26,'#8b7048');
  g.strokeStyle='#cdb98c';g.lineWidth=1;g.beginPath();g.moveTo(152,933);g.lineTo(568,933);g.stroke();
  text(LANG==='ru'?'Собирайте пары и впечатления':'Match pairs. Collect memories.',982,26);
  return cv.toDataURL('image/png');
}
