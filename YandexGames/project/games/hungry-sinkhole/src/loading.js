const COPY={
 ru:{eyebrow:'ГОРОД ЖДЁТ ТЕБЯ',title:'Голодная Воронка',tagline:'Маленькая воронка. Большой аппетит.',connect:'Подключение',models:'Модели',city:'Город',tip:'Начни с мелочей — вырасти до небоскрёбов.',footer:'СЪЕШЬ ГОРОД ЦЕЛИКОМ!',stages:['Загружаем игру…','Подключаемся…','Загружаем твой прогресс…','Готовим модели и свет…','Заселяем город…','Город готов!']},
 en:{eyebrow:'THE CITY IS WAITING',title:'Hungry Sinkhole',tagline:'A little hole. A big appetite.',connect:'Connect',models:'Models',city:'City',tip:'Start small. Grow big enough to swallow skyscrapers.',footer:'SWALLOW THE WHOLE CITY!',stages:['Loading the game…','Connecting…','Loading your progress…','Preparing models and lighting…','Bringing the city to life…','Your city is ready!']},
};
let lang=(new URLSearchParams(location.search).get('vk_language')||navigator.language||'ru').startsWith('en')?'en':'ru';
// Two animation frames let the browser paint the stage before synchronous WebGL work.
const paint=()=>Promise.race([new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),new Promise(resolve=>setTimeout(resolve,80))]);
export async function loadingStage(stage,language){
 if(language)lang=language==='en'?'en':'ru';window.__loadingLang=lang;
 const loader=document.getElementById('loader');if(!loader)return;
 const copy=COPY[lang];for(const el of loader.querySelectorAll('[data-load-copy]'))el.textContent=copy[el.dataset.loadCopy];
 loader.dataset.stage=stage;
 document.getElementById('lt').textContent=copy.stages[stage];
 const bar=document.getElementById('loadbar');bar.style.setProperty('--load',[0,12,34,58,82,100][stage]+'%');bar.setAttribute('aria-valuenow',String(stage));bar.setAttribute('aria-valuetext',copy.stages[stage]);bar.setAttribute('aria-label',lang==='en'?'Startup stages':'Этапы запуска');
 await paint();
}
export async function finishLoading(){
 await loadingStage(5);
 const loader=document.getElementById('loader');if(!loader)return;
 loader.setAttribute('aria-busy','false');
 if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
  const done=new Promise(resolve=>loader.addEventListener('transitionend',resolve,{once:true}));
  loader.classList.add('is-ready');await Promise.race([done,new Promise(r=>setTimeout(r,350))]);
 }
 loader.remove();
}
