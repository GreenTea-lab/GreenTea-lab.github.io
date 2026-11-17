import { IC } from './icons.js';
import { t, LANG, fmt } from './i18n.js';
import { save } from './save.js';
import { CITIES, PER, COUNT, STAGES, level } from './levels.js';
import { CARD_STEPS, cardKey, cityProgress, weekOf, weeklyState, claimWeek, dateKey } from './collection.js';
import { MATS, FRAMES, EFFECTS, FACE_SETS, FACE_DETAILS, SKIN_PRICE, SKIN_DETAILS } from './cosmetics.js';
import { STYLE_ORDER, tileURL, backURL } from './tiles.js';
import { postcardURL } from './ui.js';
import { audio } from './audio.js';
import {TRIPS} from './travel.js';
import {loadPostcardArt,postcardAsset,WEEKLY_THEMES} from './postcard-art.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const name=x=>LANG==='ru'?x.name:x.en;
const stars=n=>[0,1,2].map(i=>i<n?IC.star:IC.starEmpty).join('');

export const expansionUI={
  progressHTML(city,compact=false){
    const p=cityProgress(save.data,city),v=p.next<0?3:p.next,ratio=p.next<0?100:Math.min(100,Math.round(p.count/p.goal*100));
    const image=postcardURL(city,180,v);
    return `<div class="card-progress ${compact?'compact':''}"><div class="card-reveal"><img src="${image}" data-city="${city}" data-width="180" data-variant="${v}" alt=""><img src="${image}" data-city="${city}" data-width="180" data-variant="${v}" style="clip-path:inset(0 ${100-ratio}% 0 0)" alt=""></div><div class="progress-copy"><b>${esc(t(p.next<0?'cityComplete':'progressCard'))}</b><span>${p.count} / ${p.goal} · ${esc(t('card'+v))}</span><div class="stamp-track">${CARD_STEPS.map((n,i)=>`<i class="${save.data.postcards[cardKey(city,i)]?'stamped':''}">${n}</i>`).join('')}</div></div></div>`;
  },

  journey(){
    this.closeModal();const cur=save.current(COUNT);
    if(this.city===null)this.city=Math.floor(cur/PER);
    const c=this.city,C=CITIES[c],open=this.cityOpen(c);
    if(this.mapCity!==c){this.page=Math.floor((Math.floor(cur/PER)===c?cur%PER:0)/10);this.mapCity=c;}
    const pg=Math.max(0,Math.min(4,this.page||0));
    this.app.setCity(c);
    const cells=Array.from({length:10},(_,q)=>{
      const i=c*PER+pg*10+q,k=i%PER,lv=save.data.levels[i],op=save.open(i),fin=CARD_STEPS.includes(k+1);
      const L=level(i),tier=L.tier,label=t('difficulty_'+tier),mission=L.mission||'clear';
      return `<button class="lvl ${op?'':'locked'} ${lv?'done':''} ${i===cur?'cur':''} ${fin?'fin':''}" data-mission="${mission}" title="${esc(this.layoutName(L.lay)+' · '+t('campaign_'+mission))}" aria-label="${esc(t('levelN',{n:i+1})+' · '+label+' · '+t('campaign_'+mission))}" ${op?`data-a="level" data-i="${i}"`:''}><span class="ln">${i+1}</span><span class="level-difficulty ${tier}">${esc(label)}${mission==='mail'?' ✉':mission==='seals'?' ◇':mission==='unlock'?' ⚿':''}</span><span class="lst">${op?stars(lv?.stars||0):IC.lock}</span>${fin?`<span class="lfin">${IC.postcard}</span>`:''}</button>`;
    }).join('');
    this.scr.innerHTML=`<div class="levels"><div class="topbar"><button class="round" data-a="menu" aria-label="${esc(t('toMenu'))}">${IC.back}</button>${this.coinsChip()}</div><div class="lpanel journey-panel"><div class="chead"><button class="round small" data-a="cprev" ${c===0?'disabled':''} aria-label="previous">${IC.back}</button><div class="ctitle"><span class="cnum">${c+1} / ${STAGES} · 50 ${LANG==='ru'?'уровней':'levels'}</span><b>${esc(t('c_'+C.id))}</b></div><button class="round small flip" data-a="cnext" ${c===STAGES-1?'disabled':''} aria-label="next">${IC.back}</button></div><select class="city-select" aria-label="${esc(t('map'))}">${CITIES.map((C,i)=>`<option value="${i}" ${i===c?'selected':''}>${i+1}. ${esc(t('c_'+C.id))}${this.cityOpen(i)?'':' · 🔒'}</option>`).join('')}</select>${this.progressHTML(c)}<div class="map-pages">${Array.from({length:5},(_,i)=>`<button data-page="${i}" class="${i===pg?'on':''}">${c*PER+i*10+1}–${c*PER+i*10+10}</button>`).join('')}</div>${open?`<div class="lgrid">${cells}</div>`:`<p class="itxt">${IC.lock}${esc(t('cityLocked',{n:c*PER,city:t('c_'+CITIES[Math.max(0,c-1)].id)}))}</p>`}</div></div>`;
    this.bind(this.scr);
    const letter=document.createElement('button');letter.className='city-letter-link';letter.innerHTML=IC.book+this.tr('Письмо Миры из этого города','Mira’s letter from this city');letter.disabled=!open;letter.onclick=()=>this.letter(c,()=>this.journey());this.scr.querySelector('.journey-panel').insertBefore(letter,this.scr.querySelector('.map-pages'));
    this.scr.querySelector('select').onchange=e=>{this.city=+e.target.value;this.journey();};
    this.scr.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{this.page=+b.dataset.page;this.journey();});
  },

  album(){
    const d=save.data,total=Object.keys(d.postcards).length;
    const sections=CITIES.map((C,c)=>`<section class="album-city"><h3>${c+1}. ${esc(t('c_'+C.id))}</h3><div class="pgrid">${CARD_STEPS.map((n,v)=>d.postcards[cardKey(c,v)]?`<button class="pcard" data-a="pc" data-c="${c}" data-g="${v}"><img src="${postcardURL(c,280,v)}" data-city="${c}" data-width="280" data-variant="${v}" alt=""><span>${esc(t('card'+v))}</span></button>`:`<div class="pcard locked"><div class="pcq">${IC.lock}</div><span>${esc(t('card'+v))} · ${n}</span></div>`).join('')}</div></section>`).join('');
    const weeks=Object.keys(d.weeklyCards).sort().reverse();
    const weekly=weeks.map(w=>`<button class="pcard" data-week="${w}"><img src="${postcardURL(d.weeklyCards[w].city,280,2,w)}" data-city="${d.weeklyCards[w].city}" data-width="280" data-variant="2" data-edition="${w}" alt=""><span>${this.dateName(w)} · ${esc(t('weekly'))}</span></button>`).join('');
    const trips=TRIPS.filter(trip=>d.tripProgress[trip.id]?.claimed).map(trip=>`<button class="pcard" data-tripcard="${trip.id}"><img src="${postcardURL(trip.city,280,0,'event:'+trip.id)}" data-city="${trip.city}" data-width="280" data-variant="0" data-edition="event:${trip.id}" alt=""><span>${esc(LANG==='ru'?trip.ru:trip.en)}</span></button>`).join('');
    const m=this.modal(`${this.head(t('album'))}<div class="mbody"><p class="itxt small">${total} / 80 · ${esc(t('cityOf20'))}</p><h3 class="sect">${esc(t('weeklyAlbum'))}</h3>${weeks.length?`<div class="pgrid">${weekly}</div>`:`<p class="itxt small">${esc(t('weeklyEmpty'))}</p>`}${sections}</div>`,'albumm');
    m.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>this.weeklyCard(b.dataset.week));
    if(trips){const section=document.createElement('section');section.className='album-city';section.innerHTML=`<h3>${this.tr('Памятные поездки','Special journeys')}</h3><div class="pgrid">${trips}</div>`;m.querySelector('.mbody').insertBefore(section,m.querySelector('.album-city'));section.querySelectorAll('[data-tripcard]').forEach(b=>b.onclick=()=>this.tripPostcard(b.dataset.tripcard));}
  },

  async weeklyCard(week){
    if(claimWeek(save.data,week))save.write();
    const won=save.data.weeklyCards[week];if(!won)return this.dailyCal(week);
    await loadPostcardArt('weekly');
    this.modal(`${this.head(t('weekly'))}<div class="mbody"><p class="itxt small">${this.dateName(week)} — ${this.dateName(weeklyState(save.data,week).days[6])}</p><img class="pcimg fresh" src="${postcardURL(won.city,720,2,week)}" data-city="${won.city}" data-width="720" data-variant="2" data-edition="${week}" alt=""><p class="itxt">${esc(WEEKLY_THEMES[postcardAsset(won.city,2,week).index][LANG==='ru'?0:1])}</p><button class="bigbtn green" data-x><span class="bt">${esc(t('ok'))}</span></button></div>`,'pcm');
  },

  dailyCal(sel){
    const td=dateKey();sel=sel||td;
    const ym=sel.slice(0,7),week=weekOf(sel),ws=weeklyState(save.data,week),done=save.data.dc[sel]!==undefined||save.data.dailyWins[sel];
    const prev=new Date(week+'T12:00:00');prev.setDate(prev.getDate()-7);
    const next=new Date(week+'T12:00:00');next.setDate(next.getDate()+7);
    const earliest=new Date();earliest.setDate(earliest.getDate()-56);
    const m=this.modal(`${this.head(t('daily'))}<div class="mbody dailym"><div class="week-panel"><b>${esc(t('weekly'))} · ${ws.count} / 4</b><p>${esc(t('weeklyGoal'))}</p><div class="week-days">${ws.days.map(k=>`<button data-weekday="${k}" ${k>td?'disabled':''} class="${ws.completed.includes(k)?'done':''} ${k===sel?'sel':''}">${ws.completed.includes(k)?'✓':new Date(k+'T12:00:00').getDate()}</button>`).join('')}</div><div class="week-nav"><button data-prev ${week<=weekOf(dateKey(earliest))?'disabled':''} aria-label="${esc(t('previousWeek'))}">←</button><span>${this.dateName(week)}</span><button data-nextweek ${week>=weekOf(td)?'disabled':''} aria-label="${esc(t('nextWeek'))}">→</button></div>${ws.claimed||ws.count>=4?`<button class="midbtn honey wide" data-weekcard>${IC.postcard}${esc(t(ws.claimed?'openCard':'claimCard'))}</button>`:''}</div><button class="bigbtn green" data-go>${IC.play}<span class="bt">${esc(t(done?'dailyAgain':'play'))}</span><span class="bs">${esc(this.dateName(sel))}</span></button><b class="mname">${esc(this.monthName(ym))}</b>${this.calendarHTML(ym,sel)}${this.cupsHTML(ym)}</div>`,'dcm');
    m.querySelectorAll('[data-day],[data-weekday]').forEach(b=>b.onclick=()=>this.dailyCal(b.dataset.day||b.dataset.weekday));
    m.querySelector('[data-prev]').onclick=()=>this.dailyCal(dateKey(prev));
    m.querySelector('[data-nextweek]').onclick=()=>this.dailyCal(dateKey(next));
    const card=m.querySelector('[data-weekcard]');if(card)card.onclick=()=>this.weeklyCard(week);
    m.querySelector('[data-go]').onclick=()=>{this.closeModal();this.app.startDaily(sel);};
  },

  styles(){
    const d=save.data;
    const swatch=(kind,id,item)=>{
      if(kind==='faces')return `<div class="sprev face-preview">${['apple','grapes','cornflower'].map(f=>`<img src="${tileURL(d.style,f,112,id)}" alt="">`).join('')}</div>`;
      if(kind==='mat')return `<div class="decor-swatch mat-swatch" style="background:linear-gradient(125deg,${item.c.join(',')})"><i style="border-color:${item.accent}"></i></div>`;
      if(kind==='frame')return `<div class="decor-swatch frame-swatch" style="background:${item.c[0]};border-color:${item.c[1]}">${IC.postcard}</div>`;
      return `<div class="decor-swatch effect-swatch">${item.c.map(c=>`<i style="background:${c}">✦</i>`).join('')}</div>`;
    };
    const cards=(kind,catalog)=>Object.entries(catalog).map(([id,item])=>{
      const owned=kind==='skin'?d.styles.includes(id):d.owned[kind].includes(id),selected=kind==='skin'?d.style===id:kind==='faces'?d.faces===id:d.decor[kind]===id;
      const price=kind==='skin'?SKIN_PRICE[id]:item.price;
      const preview=kind==='skin'?`<div class="sprev skin-preview"><figure><img src="${tileURL(id,'apple',112)}" alt=""><figcaption>${LANG==='ru'?'Лицевая':'Front'}</figcaption></figure><figure><img src="${backURL(id,112)}" alt=""><figcaption>${LANG==='ru'?'Рубашка':'Back'}</figcaption></figure></div>`:swatch(kind,id,item);
      return `<div class="scard ${kind==='skin'?'skin-card':kind==='faces'?'face-card':''} ${selected?'on':''}">${preview}<b>${esc(kind==='skin'?t('st_'+id):name(item))}</b>${kind==='skin'||kind==='faces'?`<small class="skin-detail">${esc((kind==='skin'?SKIN_DETAILS:FACE_DETAILS)[id][LANG==='ru'?0:1])}</small>`:''}${selected?`<span class="sel">${esc(t('selected'))}</span>`:`<button class="midbtn ${owned?'green':'honey'}" data-decor="${kind}:${id}" ${!owned&&d.coins<price?'disabled':''}>${owned?esc(t('choose')):IC.coin+fmt(price)}</button>`}</div>`;
    }).join('');
    const groups=[['skin','bodiesTitle',Object.fromEntries(STYLE_ORDER.map(id=>[id,{}]))],['faces','facesTitle',FACE_SETS],['mat','mats',MATS],['frame','frames',FRAMES],['effect','effects',EFFECTS]];
    const m=this.modal(`${this.head(t('decor'))}<div class="mbody"><p class="itxt small">${esc(t('cosmeticsHint'))}</p>${groups.map(([kind,title,cat])=>`<h3 class="sect">${esc(t(title))}</h3><div class="scards ${kind==='skin'?'skin-grid':''}">${cards(kind,cat)}</div>`).join('')}</div>`,'stylesm');
    m.querySelectorAll('[data-decor]').forEach(b=>b.onclick=()=>{
      const [kind,id]=b.dataset.decor.split(':'),catalog={skin:SKIN_PRICE,faces:FACE_SETS,mat:MATS,frame:FRAMES,effect:EFFECTS}[kind],price=kind==='skin'?catalog[id]:catalog[id].price;
      const owned=kind==='skin'?d.styles:d.owned[kind];
      if(!owned.includes(id)){if(d.coins<price)return;d.coins-=price;owned.push(id);audio.play('buy');}
      if(kind==='skin')this.app.setStyle(id);else if(kind==='faces')this.app.setFaces(id);else this.app.setDecor(kind,id);
      const scroll=m.querySelector('.mbody').scrollTop;this.styles();this.ml.querySelector('.mbody').scrollTop=scroll;this.refresh();
    });
  },
};
