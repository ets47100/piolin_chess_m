// SPDX-License-Identifier: GPL-3.0-or-later
// Stockfish completo (varios hilos): se descarga una vez y se guarda en Cache Storage.
export const ENGINE_CACHE='piolin-engine-v1';
export const FULL_JS='engine/full/stockfish-19.js';
export const FULL_WASM='engine/full/stockfish-19.wasm';
export const FULL_BYTES=99076105;
const abs=path=>new URL(path,location.href).href;

export const canUseFullEngine=()=>typeof SharedArrayBuffer!=='undefined'&&self.crossOriginIsolated===true&&'caches' in self;

export async function fullEngineInstalled(){
  try{
    const cache=await caches.open(ENGINE_CACHE),hit=await cache.match(abs(FULL_WASM));
    if(!hit)return false;
    if(Number(hit.headers.get('content-length'))!==FULL_BYTES){await cache.delete(abs(FULL_WASM));return false;}
    return true;
  }catch{return false;}
}

export async function downloadFullEngine(onProgress=()=>{}){
  const cache=await caches.open(ENGINE_CACHE);
  const res=await fetch(abs(FULL_WASM),{cache:'no-store'});
  if(!res.ok||!res.body)throw Error('No se pudo descargar Stockfish completo ('+res.status+').');
  const reader=res.body.getReader();let received=0;
  const stream=new ReadableStream({
    async pull(controller){
      const {done,value}=await reader.read();
      if(done){
        if(received!==FULL_BYTES)controller.error(Error('Descarga incompleta de Stockfish completo.'));else controller.close();
        return;
      }
      received+=value.length;onProgress(received,FULL_BYTES);controller.enqueue(value);
    },
    cancel(reason){return reader.cancel(reason);}
  });
  await cache.put(abs(FULL_WASM),new Response(stream,{headers:{'content-type':'application/wasm','content-length':String(FULL_BYTES)}}));
  navigator.storage?.persist?.().catch(()=>{});
  if(!await fullEngineInstalled())throw Error('Stockfish completo no quedó guardado en el dispositivo.');
}

export function fullEngineOptions(){
  const cores=navigator.hardwareConcurrency||2,memory=navigator.deviceMemory||4;
  return {Threads:Math.max(1,Math.min(8,cores-1)),Hash:memory>=8?256:memory>=4?128:64};
}
