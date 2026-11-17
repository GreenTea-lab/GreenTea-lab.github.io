import { LANG, fmt } from './i18n.js';
import { CardArt } from './cards.js';
export function createRecordStory(record={}) {
  const cv=document.createElement('canvas');cv.width=720;cv.height=1280;
  const g=cv.getContext('2d'),ru=LANG==='ru';
  const grad=g.createLinearGradient(0,0,720,1280);grad.addColorStop(0,'#67d0dd');grad.addColorStop(1,'#174b67');
  g.fillStyle=grad;g.fillRect(0,0,720,1280);
  g.fillStyle='#fff9ec';g.beginPath();g.roundRect(42,210,636,870,40);g.fill();
  const text=(s,y,size,color='#3a2a1e')=>{g.font=`900 ${size}px Nunito, sans-serif`;g.fillStyle=color;g.textAlign='center';g.fillText(s,360,y,565);};
  text(ru?'ПАСЬЯНС':'CASTAWAY',295,42);text(ru?'РОБИНЗОНА':'SOLITAIRE',347,42);
  const art=new CardArt();art.setSize(112,1);
  for(let i=0;i<3;i++){g.save();g.translate(360+(i-1)*100,470);g.rotate((i-1)*.16);g.drawImage(art.face([1,12,13][i],i),-56,-78);g.restore();}
  text(ru?'МОЙ ЛИЧНЫЙ РЕЗУЛЬТАТ':'MY PERSONAL RECORD',645,25,'#8b7048');
  text(fmt(Math.max(0,Math.floor(Number(record.score)||0))),747,85);
  text(ru?'очков':'points',800,28,'#8b7048');
  text(ru?`Пройдено уровней: ${record.levels||0}`:`Levels completed: ${record.levels||0}`,890,28);
  text(ru?'Собирайте карты. Стройте остров.':'Play cards. Build your island.',1007,24);
  return cv.toDataURL('image/png');
}
