import {Game} from './core.js';
import {save} from './save.js';
import {sdk} from './sdk.js';
import {audio} from './audio.js';
import {loadPostcardArt} from './postcard-art.js';
import {campaignTargets} from './campaign-goals.js';
import {validDifficulty,tripById,tripBoard,practiceBoard,knownLayouts,mailTiles,tripGoal,postalProgress,availableTrips} from './travel.js';

export const travelGame={
  travelBegin(){
    this.runId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
    this.sessionCalm=this.mode==='endless'&&typeof this.E?.calm==='boolean'?this.E.calm:save.data.settings.pace==='calm';
    this.mailIds=mailTiles(this.game);this.view.mailIds=new Set(this.mailIds);
    this.missionIds=this.mode==='level'?campaignTargets(this.game,this.L):[];
    this.view.goalIds=new Set(this.missionIds);this.view.campaignKind=this.mode==='level'?this.L.mission||'':'';
    if(this.mode==='level'&&this.L.mission==='mail'){this.mailIds=this.missionIds.slice();this.view.mailIds=new Set(this.mailIds);}
    this.sealedIds=this.game.tiles.filter(t=>t.hidden&&!t.seen).map(t=>t.id);
    this.view.tripEdition=this.mode==='trip'?'event:'+this.L.trip:'';
    if(this.mode==='trip')loadPostcardArt('events');
    this.view.bgCache.clear();
    this.view.setZoom(save.data.settings.zoom||1);this.view.panX=0;this.view.panY=0;
    if(this.L?.lay&&!save.data.library.seen.includes(this.L.lay)){save.data.library.seen.push(this.L.lay);}
  },
  travelSnapshot(){
    return {calm:!!this.sessionCalm,runId:this.runId,camera:this.view.cameraJSON(),sealedIds:this.mode==='trip'?this.sealedIds:undefined,missionIds:this.mode==='level'?this.missionIds:undefined};
  },
  checkpointTravel(cloud=true){
    const spec=this.mode==='trip'?{trip:this.L.trip,step:this.L.step}:{lay:this.L.lay,difficulty:this.L.difficulty,seed:this.L.seed};
    save.data.sessions[this.mode]={id:this.mode==='trip'?this.L.trip+':'+this.L.step:this.L.lay+':'+this.L.difficulty,spec,game:this.game.toJSON(),elapsed:this.elapsed,used:this.used,combo:this.combo,lastPair:this.lastPair,sel:this.st.sel,...this.travelSnapshot()};
    save.data.lastMode=this.mode;save.write(cloud);
  },
  travelResume(s){
    if(!s)return;
    if(typeof s.calm==='boolean')this.sessionCalm=s.calm;
    if(typeof s.runId==='string')this.runId=s.runId;
    if(Array.isArray(s.sealedIds))this.sealedIds=s.sealedIds.filter(i=>Number.isInteger(i)&&this.game.tiles[i]?.hidden);
    if(this.mode==='level'&&Array.isArray(s.missionIds)&&s.missionIds.length&&s.missionIds.every(i=>Number.isInteger(i)&&i>=0&&i<this.game.tiles.length)){
      this.missionIds=[...new Set(s.missionIds)];
      this.view.goalIds=new Set(this.missionIds);
      if(this.L.mission==='mail'){this.mailIds=this.missionIds.slice();this.view.mailIds=new Set(this.mailIds);}
    }
    if(s.camera){this.view.setZoom(s.camera.zoom);this.view.pan(s.camera.x||0,s.camera.y||0,true);}
    this.ui.scr.querySelector('.hud')?.classList.toggle('notimer',this.sessionCalm||save.data.settings.showTimer===false);
    this.ui.updateTravelHUD();
  },
  travelPair(a,b){
    const token=this.runId+':'+Math.min(a,b)+':'+Math.max(a,b);
    postalProgress(save.data,'pairs',1,token);
    const envelopes=Number(this.mailIds.includes(a))+Number(this.mailIds.includes(b));
    if(envelopes){
      if(postalProgress(save.data,'letters',envelopes,token))save.data.travelStats.letters+=envelopes;
      if(!save.data.tut.envelope){save.data.tut.envelope=1;this.ui.toast(this.ui.tr('Конверты идут в почтовые поручения. Откройте Дневник.','Envelopes count towards postal tasks. Open your Journal.'));}
    }
  },
  travelWin(){postalProgress(save.data,'boards',1,this.runId);save.data.travelStats.wins++;},
  goalState(){return tripGoal(this.game,this.L,this.mailIds,this.sealedIds);},
  tripSatisfied(){const q=this.goalState();return q.value>=q.goal;},
  startTrip(id,step=0,resume=true){
    const trip=tripById(id),record=save.data.tripProgress[id];
    if(!trip||!Number.isInteger(step)||step<0||step>=7)return;
    if(!availableTrips().some(t=>t.id===id)&&!record?.wins.length)return;
    if(step>0&&!record?.wins.includes(step-1))return;
    this.checkpoint();this.mode='trip';this.levelIdx=-1;this.L=tripBoard(id,step);
    const s=resume&&save.data.sessions.trip?.id===id+':'+step?save.data.sessions.trip:null;
    let game;try{if(s)game=this.snapshotGame(s.game);}catch{}
    if(!game?.left)game=new Game(this.L);
    this.begin(game,trip.city);this.resumeValues(s);this.checkpoint(false);
    this.ui.tripBrief();audio.setMood('endless');
  },
  finishTrip(){
    const d=save.data,id=this.L.trip,step=this.L.step;
    this.travelWin();sdk.gameplay(false);
    const record=d.tripProgress[id]||(d.tripProgress[id]={wins:[],claimed:false});
    const first=!record.wins.includes(step);if(first)record.wins.push(step);
    let coins=first?25:5,fresh=false;
    if(record.wins.length===7&&!record.claimed){record.claimed=true;coins+=120;fresh=true;}
    d.coins+=coins;d.sessions.trip=null;save.write();audio.play('win');
    this.showResult(()=>this.ui.tripResult({id,step,coins,fresh}));
  },
  startPractice(lay,difficulty='normal',resume=true){
    if(!knownLayouts(save.data).includes(lay)||!validDifficulty(difficulty))return;
    this.checkpoint();
    const s=resume&&save.data.sessions.practice?.id===lay+':'+difficulty?save.data.sessions.practice:null;
    const seed=s?.spec?.seed??Math.floor(Math.random()*1e9);
    this.mode='practice';this.levelIdx=-1;this.L=practiceBoard(lay,difficulty,seed);
    let game;try{if(s)game=this.snapshotGame(s.game);}catch{}
    if(!game?.left)game=new Game(this.L);
    this.begin(game,this.L.city);this.resumeValues(s);this.checkpoint(false);
    this.ui.banner(this.ui.tr('Свободная игра','Free play')+' · '+this.ui.layoutName(lay));
  },
  finishPractice(){
    this.travelWin();sdk.gameplay(false);
    const d=save.data,key=this.L.lay+':'+this.L.difficulty;
    const r=d.library.records[key]||(d.library.records[key]={wins:0,calmWins:0,best:null});
    const first=r.wins===0;r.wins++;
    if(this.sessionCalm)r.calmWins++;else r.best=r.best===null?Math.round(this.elapsed):Math.min(r.best,Math.round(this.elapsed));
    const coins=first?30:5;d.coins+=coins;d.sessions.practice=null;save.write();audio.play('win');
    this.showResult(()=>this.ui.practiceResult({lay:this.L.lay,difficulty:this.L.difficulty,coins,best:r.best,calm:this.sessionCalm}));
  },
  setPace(pace){
    if(!['calm','challenge'].includes(pace))return;
    save.data.settings.pace=pace;
    // Turning the clock back on does not turn a calm board into a timed record.
    if(this.state==='play'&&pace==='calm')this.sessionCalm=true;
    this.ui.scr.querySelector('.hud')?.classList.toggle('notimer',this.sessionCalm||save.data.settings.showTimer===false);
    if(this.state==='play'){this.ui._sec=-1;this.ui.tick();this.checkpoint();}
    save.write();this.ui.updateTravelHUD();
  },
  setZoom(value){
    this.cancelGesture?.();
    this.view.setZoom(value);save.data.settings.zoom=this.view.zoom;
    this.ui.updateTravelHUD();this.ui.layout(this.view.L);this.checkpoint(false);save.write(false);
  },
  toggleLayout(lay){
    if(!knownLayouts(save.data).includes(lay))return;
    const f=save.data.library.favorites,i=f.indexOf(lay);if(i<0)f.push(lay);else f.splice(i,1);
    save.write();this.ui.updateTravelHUD();
  },
};
