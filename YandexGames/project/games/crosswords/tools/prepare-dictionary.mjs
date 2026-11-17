// Reproducible, local extraction. Source examples/quotations are never imported.
import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
const dir='tools/dictionaries/';
const norm=s=>s.replace(/[\u0300\u0301]/g,'').toUpperCase().replace(/Ё/g,'Е');
const badTags=/obsolete|archaic|dialect|vulgar|offensive|derogatory|pejorative|slang|form-of|abbreviation|diminutive|disparaging/;
const badText=/неценз|бранн|вульг|обсцен|секс|полов(ой|ого|ая|ые|ых)|порног|проститу|эротич|педофил|наркот|фаши|нацист|расист|изнасил|мастур|испражн|какаш|хуй|пизд|ёб|ебан|говн|залуп|манда\b|шлюх|бля[дт]|nigger|faggot|fuck|cunt|penis|vagina|sexual|intercourse|pornograph|masturbat|prostitut|narcotic|racial slur|sperm|genital|ejaculat|terroris|feces|faeces|excrement|vulva|anus|rectum|copulat/i;
function clean(s,word,lang){
  s=s.replace(/\s*\[\d+\]/g,'').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  if(s.length>190)s=s.split(';')[0].trim();
  if(s.length<12||s.length>190||badText.test(s+' '+word)||/[{}<>◆]|https?:|\[\[|\]\]/.test(s))return null;
  if(/^(результат|процесс|действие|признак|свойство|состояние|место|орудие|приспособление|участник|объект) (такого|таких|этого|этих|данного|указанного)|^(the |a )?(result|act|process|state) of (this|that|such)|половом акте|физиол.*половой/i.test(s))return null;
  if(/\b(такого действия|таких действий|этому действию|этому признаку|указанному действию)\b/i.test(s))return null;
  s=s.replace(/\s*[—–-]\s*$/,'');
  if(lang==='ru'&&/то же,? что|устар\.|обл\.|диал\.|жарг\.|бран\.|презр\.|неодобр\.|уменьш|ласк\.|увеличит|сокр\.|мн\. ч\.|форма (именит|родит|датель|винит|творит|предлож)|местоимени|предмет речи|по значению|соотносится|соотносительный/i.test(s))return null;
  if(lang==='ru'&&/^(см\.|см |действие по|свойство по|форма |множественное|женск|женщина|лицо женского|жена |дочь |житель|жительница|урожен)/i.test(s))return null;
  if(lang==='en'&&/^(alternative|plural|past|misspelling|obsolete|variant|a variant|an obsolete)/i.test(s))return null;
  const nw=norm(word);const ns=norm(s);
  // Reject clues that disclose the answer or an obvious same-stem derivation.
  const stem=nw.slice(0,nw.length>6?nw.length-2:nw.length);
  if(ns.includes(stem))return null;
  return s[0].toUpperCase()+s.slice(1).replace(/\.$/,'');
}
function freq(lang){return new Map(fs.readFileSync(dir+lang+'-frequency.txt','utf8').split(/\r?\n/).map((s,i)=>[norm(s.split(' ')[0]),i+1]));}
const output={};
for(const lang of ['ru','en']){
  const ranks=freq(lang),words=new Map();
  if(lang==='ru'){
    let lines=0;
    const input=fs.createReadStream(dir+'ru-extract.jsonl.gz').pipe(zlib.createGunzip());
    for await(const line of readline.createInterface({input,crlfDelay:Infinity})){
      const d=JSON.parse(line);lines++;
      if(d.lang_code!=='ru'||d.pos!=='noun'||d.word!==d.word.toLowerCase()||!/^[а-яё]{3,12}$/.test(d.word)||badTags.test((d.tags||[]).join(' ')))continue;
      const word=norm(d.word);
      for(const sense of d.senses||[]){
        if(sense.form_of||sense.alt_of||badTags.test((sense.tags||[]).join(' ')))continue;
        if(/устар|обл\.|бран|вульг|диал|жарг|сниж|презр|неодобр|ласк|уменьш|редк\./i.test((sense.raw_tags||[]).join(' ')))continue;
        const clue=clean((sense.glosses||[]).join('; '),word,lang);if(!clue)continue;
        const row=[word,clue,ranks.get(word)||10000000,d.word];
        if(!words.has(word))words.set(word,row);
        break;
      }
    }
    console.log('Russian source rows:',lines);
  }else{
    const synsets=new Map();
    for(const line of fs.readFileSync(dir+'WordNet-3.0/dict/data.noun','utf8').split('\n')){
      if(!/^\d/.test(line))continue;
      const [data,gloss]=line.split(' | ');if(!gloss)continue;
      synsets.set(data.slice(0,8),gloss.split('; "')[0]);
    }
    for(const line of fs.readFileSync(dir+'WordNet-3.0/dict/index.noun','utf8').split('\n')){
      if(!/^[a-z]/.test(line))continue;
      const fields=line.trim().split(/\s+/),raw=fields[0];if(!/^[a-z]{3,12}$/.test(raw))continue;
      const ptr=Number(fields[3]);const offsetStart=6+ptr;
      const word=norm(raw);
      for(const off of fields.slice(offsetStart)){
        const clue=clean(synsets.get(off)||'',word,lang);if(clue){words.set(word,[word,clue,ranks.get(word)||10000000,off]);break;}
      }
    }
  }
  const rows=[...words.values()].sort((a,b)=>a[2]-b[2]||a[0].localeCompare(b[0]));
  fs.writeFileSync(dir+lang+'-bank.json',JSON.stringify(rows));
  output[lang]={count:rows.length,frequent:rows.filter(r=>r[2]<50000).length,lengths:Object.fromEntries(Array.from({length:10},(_,i)=>[i+3,rows.filter(r=>r[0].length===i+3).length]))};
}
fs.writeFileSync(dir+'extraction-report.json',JSON.stringify(output,null,2));console.log(output);
