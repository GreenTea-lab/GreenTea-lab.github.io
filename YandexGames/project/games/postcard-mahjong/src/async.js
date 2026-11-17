export function bounded(promise, ms, fallback = null) {
  let timer;
  return Promise.race([Promise.resolve(promise).catch(()=>fallback),new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),ms);})]).finally(()=>clearTimeout(timer));
}
