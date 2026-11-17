import {t,fmt} from './i18n.js';
import {save} from './save.js';
import {MAPS} from './city.js';
import {SKINS} from './data.js';
import {RECIPES,INGREDIENTS,FESTIVAL_GOALS,ensureOffline,mapStickers,challengeFor,festivalInfo,craft,placeDecoration,claimFestival} from './offline.js';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const hex=n=>'#'+n.toString(16).padStart(6,'0');
const palettes=[['#86d9ac','#4c9c80'],['#e7af77','#98654c'],['#b7b9ff','#7077b5'],['#ffb4dc','#d375b2']];
export function decorationArt(recipe,x=0,y=0,size=100){
 if(!recipe)return '';
 const [a,b]=palettes[recipe.style],shape=recipe.shape;
 const body=shape===0?`<path d="M48 70V39M48 55l-18-9m18 3 18-13" stroke="${b}" stroke-width="7" fill="none"/><circle cx="48" cy="28" r="19" fill="${a}"/><circle cx="28" cy="41" r="12" fill="${a}"/><circle cx="68" cy="35" r="14" fill="${a}"/><path d="M27 65h44l-7 23H34z" fill="${b}"/><path d="M30 67h38" stroke="#fff5cf" stroke-width="4"/>`:shape===1?`<ellipse cx="50" cy="88" rx="37" ry="8" fill="#ffecc9"/><rect x="17" y="58" width="66" height="28" rx="7" fill="${b}"/><ellipse cx="50" cy="58" rx="33" ry="10" fill="${a}"/><rect x="28" y="35" width="44" height="24" rx="6" fill="${b}"/><ellipse cx="50" cy="35" rx="22" ry="8" fill="${a}"/><path d="M34 36v8m14-6v10m14-10v7" stroke="#fff2d7" stroke-width="6" stroke-linecap="round"/><path d="M50 29V15" stroke="#fff2d7" stroke-width="5"/><path d="M50 6q-12 14 0 14t0-14" fill="#ffd16f"/>`:`<path d="M26 86V30q24-24 48 0v56" stroke="${b}" stroke-width="10" fill="none"/><path d="M50 20v18" stroke="${b}" stroke-width="4"/><rect x="38" y="37" width="24" height="32" rx="9" fill="${a}"/><path d="M42 46h16m-16 9h16" stroke="#fff5c8" stroke-width="4"/><ellipse cx="25" cy="87" rx="14" ry="4" fill="${a}"/><ellipse cx="75" cy="87" rx="14" ry="4" fill="${a}"/>`;
 return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="90" rx="38" ry="7" fill="#17223a22"/>${body}</svg>`;
}
function plaza(o){return `<svg class="plaza" viewBox="0 0 520 300" role="img" aria-label="${esc(t('myPlaza'))}"><rect width="520" height="300" rx="22" fill="#b7dff0"/><circle cx="442" cy="49" r="24" fill="#fff0ac"/><path d="M0 130q95-65 190 0t190 0 140 0v170H0" fill="#82bfa8"/><ellipse cx="260" cy="235" rx="246" ry="62" fill="#e6d6b5"/><path d="M20 234h480M90 206l60 77m55-87 18 98m95-98-18 98m124-88-59 77" stroke="#c9b792" stroke-width="3"/>${o.placements.map((id,i)=>decorationArt(RECIPES.find(r=>r.id===id),55+(i%3)*145,99+Math.floor(i/3)*69,105)).join('')}</svg>`;}
export function openCollection(ui){
 const d=save.data;ensureOffline(d);save.write(false);
 const count=MAPS.reduce((n,m)=>n+mapStickers(d,m.id).owned.filter(Boolean).length,0);
 const cards=MAPS.map((m,i)=>{const s=mapStickers(d,m.id),skin=SKINS.find(s=>s.mastery===m.id);return `<article class="album-card"><header><b>${esc(t('map_'+m.id))}</b><span>★ ${s.stars}/9</span></header><div class="sticker-row">${s.owned.map((own,k)=>`<div class="sticker ${own?'owned':'locked'}" title="${esc(t('stickerNeed',{n:[1,5,9][k]}))}"><svg viewBox="0 0 70 76" aria-hidden="true"><path d="M35 3 64 18v36L35 73 6 54V18z" fill="${own?hex(skin.rim[k%skin.rim.length]):'#354765'}" stroke="#fff4ce" stroke-width="3"/><path d="M19 52V32h12v20m5 0V22h15v30" stroke="#1c2c4a" stroke-width="7"/><circle cx="52" cy="19" r="5" fill="#fff0b9"/></svg><small>${own?'★':'☆'} ${[1,5,9][k]}</small></div>`).join('')}</div><small>${esc(d.skins.includes(skin.id)?t('skinOwned'):t('masteryNeed',{map:t('map_'+m.id)}))}</small><button class="sbtn" data-world="${m.id}">${esc(t('expeditions'))}</button></article>`;}).join('');
 const m=ui.modal(t('album'),`<p class="offline-copy">${esc(t('albumD',{n:count}))}</p><div class="album-grid">${cards}</div>`);
 m.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>{ui.openExpeditions();const card=ui.mroot?.querySelectorAll('.exp-world')[MAPS.findIndex(m=>m.id===b.dataset.world)];card?.scrollIntoView({block:'start'});}));
}
export function openWorkshop(ui){
 const d=save.data;let selected=ui.decorSelected||null;
 const render=()=>{const o=ensureOffline(d);return `<p class="offline-copy">${esc(t('workshopD'))}</p>${plaza(o)}<div class="plaza-slots">${o.placements.map((id,i)=>`<button class="sbtn" data-slot="${i}" aria-label="${esc(t('placeSlot',{n:i+1}))}">${i+1} · ${id?'◆':'+'}</button>`).join('')}</div><p class="offline-copy">${esc(t('placingHint'))}</p><div class="pantry">${INGREDIENTS.map(k=>`<span>${esc(t('ing_'+k))} <b>${o.pantry[k]}</b></span>`).join('')}</div><div class="recipe-grid">${RECIPES.map(r=>{const own=o.crafted.includes(r.id),can=Object.entries(r.cost).every(([k,n])=>o.pantry[k]>=n);return `<article class="recipe ${selected===r.id?'selected':''}">${decorationArt(r)}<b>${esc(t('decor_'+r.id))}</b><small>${Object.entries(r.cost).map(([k,n])=>esc(t('ing_'+k))+' '+n).join(' · ')}</small><button class="sbtn" data-recipe="${r.id}" ${!own&&!can?'disabled':''}>${esc(own?(selected===r.id?t('chosen'):t('placeDecor')):t('craft'))}</button></article>`;}).join('')}</div><button class="sbtn" id="clear-slot">${esc(t('clearSlot'))}</button><p class="offline-copy">${esc(t('craftSkins'))}</p>`;};
 const m=ui.modal(t('workshop'),render());
 const bind=()=>{
 m.querySelectorAll('[data-recipe]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.recipe;if(d.offline.crafted.includes(id)){selected=id;ui.decorSelected=id;}else if(craft(d,id)){selected=id;ui.decorSelected=id;save.write();}redraw();}));
 m.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{if(placeDecoration(d,+b.dataset.slot,selected)){save.write();redraw();}}));
 m.querySelector('#clear-slot').addEventListener('click',()=>{selected=null;ui.decorSelected=null;redraw();});
 };
 const redraw=()=>{m.querySelector('.mbody').innerHTML=render();bind();};bind();ui.modalRefresh=redraw;
}
export function openFestival(ui){
 const d=save.data,info=festivalInfo();
 const render=()=>{const s=ensureOffline(d).season;return `<div class="festival-hero style-${info.style}"><b>${esc(t('festival_'+info.style))}</b><span>${esc(t('festivalDates',{a:info.id,b:info.ends}))}</span><strong>${s.points} / 360</strong><div class="bar"><i style="width:${s.points/3.6}%"></i></div></div><p class="offline-copy">${esc(t('festivalD'))}</p><div class="festival-goals">${FESTIVAL_GOALS.map(g=>`<p>${esc(t('fg_'+g.id))}<b>${Math.min(g.need,s.goals[g.id])} / ${g.need}</b><small>+${g.points} ◆ ${s.paid.includes(g.id)?'✓':''}</small></p>`).join('')}</div><div class="reward-track">${Array.from({length:12},(_,i)=>{const n=i+1,got=s.claimed.includes(n),ready=s.points>=n*30;return `<button class="reward-tier ${ready?'ready':''}" data-tier="${n}" ${got||!ready?'disabled':''}><b>${n}</b><span>${n===12?'◉':'◈'}</span><small>${esc(n===12?t('festivalSkin'):t('coinsTiny'))}</small><strong>${got?'✓':n*30+' ◆'}</strong></button>`;}).join('')}</div>`;};
 const m=ui.modal(t('festival'),render());const bind=()=>m.querySelectorAll('[data-tier]').forEach(b=>b.addEventListener('click',()=>{if(claimFestival(d,+b.dataset.tier)){save.write();m.querySelector('.mbody').innerHTML=render();bind();ui.refresh();}}));bind();
}
export function openDailyChallenge(ui){
 const l=challengeFor(),d=save.data,o=ensureOffline(d),best=o.daily[l.day];
 const m=ui.modal(t('dailyChallenge'),`<div class="challenge-card"><b>${esc(t('map_'+l.map))}</b><span>${l.day} · 2:00</span><p>${esc(t('dailyChallengeD',{n:l.target}))}</p><strong>${esc(t('personalBest',{n:fmt(best?.best||0)}))}</strong><small>${esc(best?.done?t('dailyPrizeTaken'):t('dailyPrize'))}</small><button class="btn big green" id="start-daily">${esc(t('play'))}</button></div>`);
 m.querySelector('#start-daily').addEventListener('click',()=>{ui.closeModal();ui.g.play(null,{daily:true});});
}
