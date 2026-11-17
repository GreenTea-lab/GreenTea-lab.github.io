import {LANG,t,fmt} from './i18n.js';
import {IC} from './icons.js';
import {save} from './save.js';
import {audio} from './audio.js';
import {CITIES} from './levels.js';
import {positions} from './layouts.js';
import {dateKey,weekOf,claimWeek} from './collection.js';
import {journalRewards} from './journal-rewards.js';
import {QUESTS,TRIPS,DIFFICULTIES,activeTrip,availableTrips,knownLayouts,postalState,claimPostal} from './travel.js';
import {LETTERS} from './letters.js';
import {postcardURL} from './ui.js';
import {loadPostcardArt} from './postcard-art.js';
import {ROUTE_LAYOUT_META} from './route-layouts.js';
import {campaignGoal} from './campaign-goals.js';

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const names={mini:['Мини','Mini'],rows3:['Три ряда','Three rows'],plus:['Крест','Cross'],bricks:['Кирпичики','Bricks'],hill:['Холм','Hill'],pillow:['Подушка','Cushion'],window:['Окно','Window'],heart:['Сердце','Heart'],steps:['Ступени','Steps'],kremlin:['Башни','Towers'],pyramid:['Пирамида','Pyramid'],flower:['Цветок','Flower'],butterfly:['Бабочка','Butterfly'],ring:['Кольцо','Ring'],tower:['Башня','Tower'],bridge:['Мост','Bridge'],fan:['Веер','Fan'],anchor:['Якорь','Anchor'],star:['Звезда','Star'],boat:['Лодка','Boat'],teapot:['Чайник','Teapot'],cat:['Кот','Cat'],tree:['Дерево','Tree'],wave:['Волна','Wave'],crown:['Корона','Crown'],house:['Дом','House'],castle:['Замок','Castle'],turtle:['Черепаха','Turtle'],stairs:['Лестница','Stairway'],grand:['Большой','Grand'],twin:['Близнецы','Twins'],checker:['Клетка','Checker'],diamond:['Ромб','Diamond'],dome:['Купол','Dome'],pagoda:['Пагода','Pagoda'],pyramids:['Пирамиды','Pyramids'],spire:['Шпиль','Spire'],eiffel:['Париж','Paris'],mill:['Мельница','Windmill'],gondola:['Гондола','Gondola'],colosseum:['Колизей','Colosseum'],palm:['Пальма','Palm']};
const word=x=>LANG==='ru'?x.ru:x.en;
const mmss=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
function preview(lay){
  const p=positions(lay),xs=p.map(t=>t.x),ys=p.map(t=>t.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX+3,h=Math.max(...ys)-minY+3;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(lay)}">${p.slice().sort((a,b)=>a.z-b.z).map(t=>`<rect x="${t.x-minX+.2-t.z*.12}" y="${t.y-minY+.2-t.z*.12}" width="1.7" height="1.9" rx=".27" fill="${['#efe2c2','#fff4d7','#fffbed'][t.z%3]}" stroke="#8e9b7b" stroke-width=".1"/>`).join('')}</svg>`;
}

export const travelUI={
  tr(ru,en){return LANG==='ru'?ru:en;},
  postalReady(){const p=postalState(save.data);return QUESTS.filter(q=>!p.claimed[q.id]&&p.counts[q.id]>=q.goal).length;},
  journalReady(){return journalRewards(save.data).total;},
  layoutName(id){const m=ROUTE_LAYOUT_META[id],n=LANG==='ru'?0:1;return m?m.theme[n]+' · '+m.name[n]:names[id]?.[n]||id;},
  campaignBrief(first=false){
    const A=this.app,L=A.L,kind=L.mission||'clear',q=campaignGoal(A.game,L,A.missionIds);
    const instructions=kind==='mail'?this.tr('Соберите все шесть конвертов на плитках. Остальные плитки можно оставить.','Collect all six envelopes marked on tiles. Other tiles can remain.'):
      kind==='seals'?this.tr('Раскройте шесть плиток с красными печатями: освобождайте их сверху и с боков. Печать станет зелёной.','Reveal six tiles marked with red seals by freeing them from above and the sides. Their seals turn green.'):
      kind==='unlock'?this.tr('Найдите пару ключей, затем снимите все плитки с золотой меткой замка. Метки остаются после открытия замков.','Find the pair of keys, then remove every tile with a gold lock marker. The markers remain after unlocking.'):
      this.tr('Снимите все пары и откройте следующий вид города.','Match every pair to discover the next view of the city.');
    const m=this.modal(`${this.head(t('campaign_'+kind),!first)}<div class="mbody"><p class="itxt small">${esc(this.layoutName(L.lay))}</p><div class="campaign-preview">${preview(L.lay)}</div><p class="itxt">${esc(instructions)}</p>${kind!=='clear'?`<p class="itxt small">${esc(this.tr('Также снимите не менее '+q.minPairs+' пар. Оба условия показаны над полем.','Also match at least '+q.minPairs+' pairs. Both goals appear above the board.'))}</p>`:''}<button class="bigbtn green" data-campaign-go>${IC.play}<span class="bt">${esc(t('start'))}</span></button><button class="smallbtn" data-campaign-journal>${this.tr('Почтовые поручения','Postal tasks')}</button></div>`,'campaignm');
    m.querySelector('[data-campaign-go]').onclick=()=>{this.closeModal();if(first){save.data.tut['campaign_'+kind]=1;save.write(false);}};
    m.querySelector('[data-campaign-journal]').onclick=()=>this.journal('mail');
  },
  guideHTML(text){const src=window.__UI_ART__?.mira;return `<div class="mira-note">${src?`<img src="${src}" alt="${this.tr('Мира — подруга по переписке','Mira, your pen pal')}">`:IC.book}<div><b>${this.tr('Мира пишет…','A note from Mira…')}</b><p>${esc(text)}</p></div></div>`;},
  travelOptionsHTML(){return `<section class="travel-options"><b>${this.tr('Как будем играть?','How would you like to play?')}</b><div class="pace-options"><button class="midbtn ${save.data.settings.pace==='calm'?'on':''}" data-pace="calm">${this.tr('Спокойно','Relaxed')}</button><button class="midbtn ${save.data.settings.pace!=='calm'?'on':''}" data-pace="challenge">${this.tr('На результат','Challenge')}</button></div><p class="travel-help">${this.tr('Спокойно: без спешки, 3 звезды за пройденный расклад. На результат: звёзды за время. Рекорды режимов разделены.','Relaxed: no rush, 3 stars for finishing. Challenge: stars depend on time. Mode records are separate.')}</p><div class="zoom-options"><span>${this.tr('Размер поля','Board size')}</span><button class="midbtn" data-zoom="minus" aria-label="${this.tr('Уменьшить','Zoom out')}">−</button><b class="zoom-value">${Math.round(this.app.view.zoom*100)}%</b><button class="midbtn" data-zoom="plus" aria-label="${this.tr('Увеличить','Zoom in')}">+</button><button class="midbtn" data-zoom="reset">${this.tr('Целиком','Fit')}</button></div><p class="travel-help">${this.tr('Увеличьте кнопкой + или двумя пальцами. Двигайте увеличенное поле одним пальцем.','Use + or pinch to enlarge. Drag the enlarged board with one finger.')}</p></section>`;},
  bindTravelControls(el){
    el.querySelectorAll('[data-pace]').forEach(b=>b.onclick=()=>{audio.play('click');this.app.setPace(b.dataset.pace);el.querySelectorAll('[data-pace]').forEach(x=>x.classList.toggle('on',x.dataset.pace===save.data.settings.pace));});
    el.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{const z=b.dataset.zoom;this.app.setZoom(z==='reset'?1:this.app.view.zoom+(z==='plus'?.25:-.25));this.root.querySelectorAll('.zoom-value').forEach(x=>x.textContent=Math.round(this.app.view.zoom*100)+'%');});
    el.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{const lay=b.dataset.pin;this.app.toggleLayout(lay);const on=save.data.library.favorites.includes(lay);b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);b.title=this.tr('Мои расклады','My boards');});
  },
  updateTravelHUD(){
    if(!this.app.view)return;
    this.root.querySelectorAll('.zoom-value').forEach(e=>e.textContent=Math.round(this.app.view.zoom*100)+'%');
    const goal=this.root.querySelector('[data-board-goal]');
    if(goal&&this.app.game){
      if(this.app.mode==='level'&&this.app.L.mission){
        const q=campaignGoal(this.app.game,this.app.L,this.app.missionIds);
        goal.textContent=q.kind==='clear'?this.tr('Пары','Pairs')+' '+q.value+'/'+q.goal:(q.kind==='mail'?'✉':q.kind==='seals'?'◇':'⚿')+' '+q.value+'/'+q.goal+' · '+this.tr('пары ','pairs ')+Math.min(q.pairs,q.minPairs)+'/'+q.minPairs;
        goal.dataset.a='boardGoal';goal.title=t('campaign_'+q.kind);goal.setAttribute('aria-label',t('campaign_'+q.kind)+'. '+goal.textContent);
      }else if(this.app.mode==='trip')goal.textContent=this.goalText(this.app.goalState());
      else {const p=postalState(save.data);goal.textContent=this.tr('Конверты','Envelopes')+': '+(p.counts.letters||0)+'/3';}
      if(!this.app.L.mission)goal.title=this.tr('Снимайте плитки с конвертами. Поручения находятся в Дневнике.','Match tiles with envelopes. Find your postal tasks in the Journal.');
    }
    this.root.querySelectorAll('[data-pin]').forEach(b=>{const on=save.data.library.favorites.includes(b.dataset.pin);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  },
  goalText(q){return this.tr(q.kind==='mail'?'Собрать конверты':q.kind==='seals'?'Раскрыть плитки':'Снять пары',q.kind==='mail'?'Collect envelopes':q.kind==='seals'?'Reveal tiles':'Match pairs')+' · '+Math.min(q.goal,q.value)+' / '+q.goal;},
  journal(section='home'){
    const d=save.data,p=postalState(d),active=activeTrip();
    const rewards=journalRewards(d);
    const tabs=[['home','Обзор','Overview'],['mail','Почта','Mail'],['trips','Поездки','Trips'],['letters','Письма','Letters'],['shelf','Расклады','Boards']];
    if(!tabs.some(([id])=>id===section))section='home';
    let body='';
    if(section==='home'){
      body=this.guideHTML(this.tr('Я Мира. Буду присылать тебе письма из городов. Здесь лежат наши поручения, маленькие поездки и любимые расклады.','I’m Mira. I’ll send you letters from the cities. Here are our postal tasks, little journeys and favourite boards.'))+
        `<div class="journal-cards"><button data-jtab="mail">${IC.postcard}<b>${this.tr('Почтовые поручения','Postal tasks')}</b><span>${QUESTS.filter(q=>p.claimed[q.id]).length} / 3 · ${this.tr('марка за день','daily stamp')}</span></button><button data-jtab="trips">${IC.map}<b>${esc(word(active))}</b><span>${this.tr('Поездка недели · 7 остановок','Weekly journey · 7 stops')}</span></button><button data-jtab="letters">${IC.book}<b>${this.tr('Письма Миры','Letters from Mira')}</b><span>${Object.keys(d.letters).length} / 20</span></button><button data-jtab="shelf">${IC.tile}<b>${this.tr('Мои расклады','My boards')}</b><span>${d.library.favorites.length} ${this.tr('в коллекции','saved')}</span></button></div>${this.travelOptionsHTML()}<div class="travel-statistics"><span><b>${fmt(d.travelStats.wins)}</b>${this.tr('раскладов завершено после обновления','boards finished since the update')}</span><span><b>${Object.keys(d.postcards).length} / 80</b>${this.tr('городских открыток','city postcards')}</span><span><b>${Object.values(d.tripProgress).filter(x=>x.claimed).length} / 4</b>${this.tr('памятных поездок','special journeys')}</span><span><b>${fmt(d.stats.pairs)}</b>${this.tr('пар за всё время','all-time pairs')}</span></div>`;
      const ready=[];
      if(rewards.achievements)ready.push(`<button class="journal-reward-link" data-journal-ach>${IC.medal}<span>${this.tr('Награды за достижения','Achievement rewards')}</span><b>${rewards.achievements}</b></button>`);
      for(const week of rewards.weekly)ready.push(`<button class="journal-reward-link" data-journal-week="${week}">${IC.postcard}<span>${this.tr('Открытка недели','Weekly postcard')} · ${esc(this.dateName(week))}</span><b>+150</b></button>`);
      if(ready.length)body=`<section class="journal-reward-links" aria-label="${esc(t('rewardsReady',{n:rewards.achievements+rewards.weekly.length}))}">${ready.join('')}</section>`+body;
    }else if(section==='mail'){
      const stamps=Object.keys(p.stamps).sort().reverse();
      body=this.guideHTML(this.tr('Играем в любом режиме: заканчиваем расклады, находим пары и собираем конверты на плитках. За три поручения — марка и ещё 50 монет.','Play in any mode: finish boards, match pairs and collect the envelopes on tiles. Complete all three tasks for a stamp and 50 extra coins.'))+
        `<div class="postal-date">${esc(this.dateName(dateKey()))}</div><div class="postal-tasks">${QUESTS.map(q=>`<div class="postal-task"><div><b>${esc(word(q))}</b><span>${Math.min(q.goal,p.counts[q.id]||0)} / ${q.goal}</span><progress value="${p.counts[q.id]||0}" max="${q.goal}"></progress></div><button class="midbtn ${p.claimed[q.id]?'':'green'}" data-postal="${q.id}" ${p.claimed[q.id]||p.counts[q.id]<q.goal?'disabled':''}>${p.claimed[q.id]?'✓':IC.coin+' '+q.coins}</button></div>`).join('')}</div><p class="travel-help">${this.tr('Перемешивание и отмена не начисляют повторный прогресс за ту же пару.','Undoing and repeating the same pair does not count it twice.')}</p><h3 class="sect">${this.tr('Мой почтовый альбом','My stamp album')} · ${stamps.length}</h3>${stamps.length?`<div class="stamp-album">${stamps.slice(0,60).map((day,i)=>`<div class="daily-stamp" style="--stamp-hue:${(Date.parse(day)/86400000*37)%360}"><span>✦</span><b>${new Date(day+'T12:00:00').getDate()}</b><small>${esc(day.slice(0,7))}</small></div>`).join('')}</div>`:`<p class="itxt small">${this.tr('Первая марка появится за три выполненных поручения.','Finish all three tasks to collect your first stamp.')}</p>`}`;
    }else if(section==='trips'){
      const available=availableTrips();
      body=`<p class="itxt small">${this.tr('Поездка недели меняется по кругу: 4 маршрута. Открытые поездки остаются в архиве — завершайте их в своём темпе.','The weekly journey rotates through four routes. Opened journeys stay in the archive, so finish them at your own pace.')}</p><div class="trip-grid">${TRIPS.map((trip,i)=>{
        const record=d.tripProgress[trip.id]||{wins:[],claimed:false},open=available.some(x=>x.id===trip.id)||record.wins.length;
        return `<article class="trip-card ${open?'':'locked'}">${open?`<img src="${postcardURL(trip.city,360,0,'event:'+trip.id)}" data-city="${trip.city}" data-width="360" data-variant="0" data-edition="event:${trip.id}" alt="">`:`<div class="trip-locked-art">${IC.lock}</div>`}<small>${trip.id===active.id?this.tr('Поездка недели','This week'):open?this.tr('Архив поездок','Journey archive'):this.tr('Следующая поездка','Coming soon')}</small><b>${esc(word(trip))}</b><span>${record.wins.length} / 7 · ${this.tr('остановок','stops')}</span><button class="midbtn green" data-trip="${trip.id}" ${open?'':'disabled'}>${this.tr('Открыть маршрут','Open route')}</button>${record.claimed?`<button class="midbtn" data-tripcard="${trip.id}">${this.tr('Моя открытка','My postcard')}</button>`:''}</article>`;
      }).join('')}</div>`;
    }else if(section==='letters'){
      body=this.guideHTML(this.tr('В каждом городе я оставляю тебе короткое письмо. Можно прочитать сейчас или вернуться позже — путешествие подождёт.','I leave a short letter in every city. Read it now or come back later: the journey can wait.'))+
        `<div class="letter-list">${CITIES.map((c,i)=>`<button class="letter-item" data-letter="${i}" ${this.cityOpen(i)?'':'disabled'}>${IC.book}<span><b>${esc(t('c_'+c.id))}</b><small>${this.cityOpen(i)?esc(LETTERS[c.id][LANG==='ru'?0:1][0]):this.tr('Откроется вместе с городом','Unlocks with the city')}</small></span><i>${d.letters[c.id]?'✓':this.cityOpen(i)?'✦':'🔒'}</i></button>`).join('')}</div>`;
    }else if(section==='shelf'){
      const layouts=knownLayouts(d),fav=d.library.favorites,diff=this.practiceDifficulty||'normal';
      const filtered=layouts.filter(id=>!this.onlyFavorites||fav.includes(id)),pages=Math.max(1,Math.ceil(filtered.length/12));
      this.shelfPage=Math.max(0,Math.min(pages-1,this.shelfPage||0));
      body=`<p class="itxt small">${this.tr('Здесь появляются знакомые фигуры. Сохраните любимые звездой и выбирайте сложность для свободной игры.','Familiar shapes appear here. Star your favourites and choose a difficulty for free play.')}</p><div class="shelf-controls"><label>${this.tr('Сложность','Difficulty')}<select data-difficulty>${Object.entries(DIFFICULTIES).map(([id,x])=>`<option value="${id}" ${id===diff?'selected':''}>${esc(word(x))}</option>`).join('')}</select></label><button class="midbtn ${this.onlyFavorites?'on':''}" data-only-fav>${this.tr('Только мои','Favourites only')} · ${fav.length}</button></div><div class="layout-grid">${filtered.slice(this.shelfPage*12,(this.shelfPage+1)*12).map(id=>{
        const r=d.library.records[id+':'+diff];
        return `<article class="layout-card">${preview(id)}<div class="layout-card-title"><b>${esc(this.layoutName(id))}</b><button class="pin ${fav.includes(id)?'on':''}" data-favorite="${id}" aria-label="${this.tr('Сохранить расклад','Save board')}" aria-pressed="${fav.includes(id)}">${IC.star}</button></div><small>${r?this.tr('Побед: ','Wins: ')+r.wins+(r.best!==null?' · '+mmss(r.best):''):this.tr('Новый личный рекорд ждёт','A new personal best awaits')}</small><button class="midbtn green" data-practice="${id}">${this.tr('Играть','Play')}</button></article>`;
      }).join('')}</div>${this.onlyFavorites&&!fav.length?`<p class="itxt">${this.tr('Нажмите звезду у понравившейся фигуры.','Star a shape you enjoy.')}</p>`:''}`;
      if(pages>1)body+=`<div class="shelf-pagination"><button class="midbtn" data-shelf-page="${this.shelfPage-1}" ${this.shelfPage===0?'disabled':''}>←</button><span>${this.shelfPage+1} / ${pages} · ${filtered.length}</span><button class="midbtn" data-shelf-page="${this.shelfPage+1}" ${this.shelfPage===pages-1?'disabled':''}>→</button></div>`;
    }
    const navHTML=tabs.map(([id,ru,en])=>`<button data-jtab="${id}" role="tab" aria-selected="${id===section}" aria-controls="journal-panel" tabindex="${id===section?0:-1}" aria-label="${esc(this.tr(ru,en)+(rewards.tabs[id]?' · '+t('rewardsReady',{n:rewards.tabs[id]}):''))}" class="${id===section?'on':''}">${this.tr(ru,en)}${rewards.tabs[id]?`<span class="journal-tab-badge" aria-hidden="true">${rewards.tabs[id]}</span>`:''}</button>`).join('');
    let m=this.ml.querySelector('.journalm');
    const changed=m&&m.dataset.section!==section,focused=m?.querySelector('.journal-tabs')?.contains(document.activeElement);
    if(m){
      const content=m.querySelector('.journal-body'),scroll=content.scrollTop;
      content.getAnimations().forEach(a=>a.cancel());m.querySelector('.journal-tabs').innerHTML=navHTML;content.innerHTML=body;content.scrollTop=changed?0:scroll;
      if(changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches)content.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
    }else m=this.modal(`${this.head(this.tr('Путевой дневник','Travel journal'))}<nav class="journal-tabs" role="tablist" aria-label="${this.tr('Разделы дневника','Journal sections')}">${navHTML}</nav><div class="mbody journal-body" id="journal-panel" role="tabpanel">${body}</div>`,'journalm');
    m.dataset.section=section;
    if(focused)m.querySelector(`.journal-tabs [data-jtab="${section}"]`).focus({preventScroll:true});
    m.querySelectorAll('[data-jtab]').forEach(b=>b.onclick=()=>this.journal(b.dataset.jtab));
    m.querySelector('.journal-tabs').onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
      const i=tabs.findIndex(([id])=>id===section),j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
      this.journal(tabs[j][0]);this.ml.querySelector(`.journal-tabs [data-jtab="${tabs[j][0]}"]`).focus({preventScroll:true});
    };
    this.bindTravelControls(m);
    m.querySelectorAll('[data-journal-ach]').forEach(b=>b.onclick=()=>this.achievements(()=>this.journal('home')));
    m.querySelectorAll('[data-journal-week]').forEach(b=>b.onclick=()=>{if(claimWeek(d,b.dataset.journalWeek)){save.write();this.journal('home');this.refresh();this.toast(t('weeklyWon'));}});
    m.querySelectorAll('[data-postal]').forEach(b=>b.onclick=()=>{const stamped=!!p.stamps[dateKey()];if(claimPostal(d,b.dataset.postal)){save.write();audio.play('coin');this.journal('mail');this.refresh();if(!stamped&&p.stamps[dateKey()])this.toast(this.tr('Марка в альбом и ещё 50 монет!','A stamp for your album and 50 extra coins!'));}});
    m.querySelectorAll('[data-trip]').forEach(b=>b.onclick=()=>this.tripMap(b.dataset.trip));
    m.querySelectorAll('[data-tripcard]').forEach(b=>b.onclick=()=>this.tripPostcard(b.dataset.trip));
    m.querySelectorAll('[data-letter]').forEach(b=>b.onclick=()=>this.letter(+b.dataset.letter,()=>this.journal('letters')));
    m.querySelectorAll('[data-favorite]').forEach(b=>b.onclick=()=>{this.app.toggleLayout(b.dataset.favorite);this.journal('shelf');});
    m.querySelectorAll('[data-practice]').forEach(b=>b.onclick=()=>{this.closeModal();this.app.startPractice(b.dataset.practice,this.practiceDifficulty||'normal');});
    m.querySelectorAll('[data-shelf-page]').forEach(b=>b.onclick=()=>{this.shelfPage=+b.dataset.shelfPage;this.journal('shelf');});
    const difficulty=m.querySelector('[data-difficulty]');if(difficulty)difficulty.onchange=()=>{this.practiceDifficulty=difficulty.value;this.journal('shelf');};
    const only=m.querySelector('[data-only-fav]');if(only)only.onclick=()=>{this.onlyFavorites=!this.onlyFavorites;this.shelfPage=0;this.journal('shelf');};
  },
  letter(city,onClose){
    if(!this.cityOpen(city))return;
    const id=CITIES[city].id,text=LETTERS[id][LANG==='ru'?0:1];save.data.letters[id]=true;save.write();
    this.modal(`${this.head(this.tr('Письмо из города: ','A letter from ')+t('c_'+id))}<div class="mbody letter-body">${this.guideHTML(text[0])}<h3>${esc(text[0])}</h3><p>${esc(text[1])}</p><p>${esc(text[2])}</p><span class="letter-signature">${this.tr('До новой открытки! Мира','Until our next postcard! Mira')}</span><button class="bigbtn green" data-x><span class="bt">${this.tr('В путь','Let’s go')}</span></button></div>`,'letterm',onClose);
  },
  tripMap(id){
    const trip=TRIPS.find(t=>t.id===id);if(!trip)return;
    const r=save.data.tripProgress[id]||{wins:[]};
    const m=this.modal(`${this.head(word(trip))}<div class="mbody">${this.guideHTML(trip.intro[LANG==='ru'?0:1])}<div class="trip-stops">${Array.from({length:7},(_,i)=>`<button data-stop="${i}" class="${r.wins.includes(i)?'done':''}" ${i===0||r.wins.includes(i-1)?'':'disabled'}><b>${i+1}</b><span>${this.tr(i%3===1?'Конверты':i%3===2?'Печати':'Расклад',i%3===1?'Envelopes':i%3===2?'Seals':'Board')}</span>${r.wins.includes(i)?'✓':IC.play}</button>`).join('')}</div><p class="itxt small">${this.tr('7 остановок: отдельная открытка и 120 монет. Прогресс сохраняется, повторные награды за коллекцию не выдаются.','7 stops: a special postcard and 120 coins. Progress is saved; the collection reward can be claimed once.')}</p><button class="midbtn wide" data-archive>${this.tr('Все поездки','All journeys')}</button></div>`,'tripm');
    m.querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>{this.closeModal();this.app.startTrip(id,+b.dataset.stop);});m.querySelector('[data-archive]').onclick=()=>this.journal('trips');
  },
  tripBrief(){const m=this.modal(`${this.head(this.tr('Почтовая остановка','Postal stop'),false)}<div class="mbody">${this.guideHTML(this.goalText(this.app.goalState()))}<p class="itxt">${this.tr('Конверты отмечены на плитках. Печати раскрываются, когда плитка становится свободной. В тупике можно бесплатно перемешать поле.','Envelopes are marked on tiles. Sealed tiles reveal themselves when they become free. If you run out of moves, shuffle for free.')}</p><button class="bigbtn green" data-trip-go><span class="bt">${this.tr('Начать','Start')}</span></button></div>`,'tripbrief');m.querySelector('[data-trip-go]').onclick=()=>this.closeModal();},
  tripResult(r){
    const m=this.modal(`${this.head(this.tr('Письмо доставлено!','Letter delivered!'),false)}<div class="mbody"><div class="bicon">${IC.postcard}</div><h3>${this.tr('Остановка','Stop')} ${r.step+1} / 7</h3><div class="earn">${IC.coin}<b>+${r.coins}</b></div>${r.fresh?`<button class="bigbtn honey" data-tripcard="${r.id}"><span class="bt">${this.tr('Новая открытка','New postcard')}</span></button>`:''}${r.step<6?`<button class="bigbtn green" data-tripnext><span class="bt">${this.tr('Следующее письмо','Next letter')}</span></button>`:''}<button class="midbtn wide" data-tripmap>${this.tr('К маршруту','Route map')}</button><button class="midbtn wide" data-tripmenu>${this.tr('В меню','Menu')}</button></div>`,'result');
    const card=m.querySelector('[data-tripcard]');if(card)card.onclick=()=>this.tripPostcard(r.id,()=>this.tripResult({...r,fresh:false}));
    const next=m.querySelector('[data-tripnext]');if(next)next.onclick=()=>{this.closeModal();this.app.adBreak(()=>this.app.startTrip(r.id,r.step+1));};
    m.querySelector('[data-tripmap]').onclick=()=>{this.app.toMenu();this.tripMap(r.id);};m.querySelector('[data-tripmenu]').onclick=()=>this.app.toMenu();
  },
  async tripPostcard(id,onClose){
    const trip=TRIPS.find(t=>t.id===id);if(!trip||!save.data.tripProgress[id]?.claimed)return;
    await loadPostcardArt('events');
    this.modal(`${this.head(word(trip))}<div class="mbody"><img class="pcimg fresh" src="${postcardURL(trip.city,720,0,'event:'+id)}" data-city="${trip.city}" data-width="720" data-variant="0" data-edition="event:${id}" alt=""><p class="itxt">${this.tr('Семь писем нашли свои адреса. Эта открытка — память о нашей маленькой поездке.','Seven letters found their addresses. This postcard is a memory of our little journey.')}</p><button class="bigbtn green" data-x><span class="bt">${t('ok')}</span></button></div>`,'pcm',onClose);
  },
  practiceResult(r){
    const m=this.modal(`${this.head(this.tr('Расклад собран','Board complete'),false)}<div class="mbody"><h3>${esc(this.layoutName(r.lay))}</h3><p class="itxt">${r.calm?this.tr('Спокойная игра — в своём темпе','Relaxed play — at your own pace'):this.tr('Личный рекорд: ','Personal best: ')+mmss(r.best||0)}</p><div class="earn">${IC.coin}<b>+${r.coins}</b></div><button class="bigbtn green" data-practice-again><span class="bt">${this.tr('Новая партия','New game')}</span></button><button class="midbtn wide" data-shelf>${this.tr('Мои расклады','My boards')}</button><button class="midbtn wide" data-practice-menu>${this.tr('В меню','Menu')}</button></div>`,'result');
    m.querySelector('[data-practice-again]').onclick=()=>{this.closeModal();this.app.adBreak(()=>this.app.startPractice(r.lay,r.difficulty,false));};m.querySelector('[data-shelf]').onclick=()=>{this.app.toMenu();this.journal('shelf');};m.querySelector('[data-practice-menu]').onclick=()=>this.app.toMenu();
  },
};
