import { LANG } from './i18n.js';
export function createRecordStory(record={}) {
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;
  const g=canvas.getContext('2d');
  const bg=g.createLinearGradient(0,0,720,1280);bg.addColorStop(0,'#1f6e5b');bg.addColorStop(1,'#123e36');g.fillStyle=bg;g.fillRect(0,0,720,1280);
  g.fillStyle='#fff9eb';g.beginPath();g.roundRect(44,170,632,940,32);g.fill();
  g.strokeStyle='#c7a56b';g.lineWidth=2;g.strokeRect(62,188,596,904);
  const text=(s,y,size,color='#234c40')=>{g.fillStyle=color;g.font=`700 ${size}px "PT Sans",Arial`;g.textAlign='center';g.fillText(s,360,y,550);};
  text(LANG==='ru'?'КРОССВОРДЫ':'CROSSWORDS',270,48);text(LANG==='ru'?'КЛАССИКА':'CLASSIC',319,30,'#927342');
  const word=LANG==='ru'?'СЛОВО':'WORDS';
  [...word].forEach((ch,i)=>{const x=140+i*90;g.fillStyle=i===2?'#ffc838':'#e2f2e5';g.beginPath();g.roundRect(x,390,80,86,8);g.fill();g.strokeStyle='#234c40';g.stroke();g.fillStyle='#234c40';g.font='700 50px "PT Sans"';g.textAlign='center';g.fillText(ch,x+40,449);});
  text(LANG==='ru'?'МОИ РЕЗУЛЬТАТЫ':'MY RESULTS',575,28,'#927342');
  text(String(Math.max(0,Math.floor(record.score||0))),690,100);
  text(LANG==='ru'?'очков':'points',740,28);
  text(`${record.solved||0} ${LANG==='ru'?'кроссвордов решено':'crosswords solved'}`,850,32);
  text(`${record.words||0} ${LANG==='ru'?'слов разгадано':'words solved'}`,905,30);
  text(LANG==='ru'?'Каждый день — новое открытие':'A new discovery every day',1020,25,'#927342');
  return canvas.toDataURL('image/png');
}
