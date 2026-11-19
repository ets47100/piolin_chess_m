// SPDX-License-Identifier: GPL-3.0-or-later
import { Chessground } from '@lichess-org/chessground';
import { Chess } from 'chess.js';
import { newDocument,validateDocument,positionAt,importText,exportPgn,parseBackup,legalDests,pvToSan,validateEngineFen } from './model.js';
import { LocalStore } from './storage.js';
import { LocalEngine } from './engine.js';
const $=id=>document.getElementById(id);
const store=new LocalStore();let storeReady=false,doc=newDocument(),board,dirtyTimer,saveTail=Promise.resolve(),saveSequence=0;
let enabled=false,pumping=false,pending=null,analysisSerial=0,scheduleTimer,lastResult=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const example='[Event "Miniatura de ejemplo"]\n[White "Blancas"]\n[Black "Negras"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function engineStatus(text){
  $('engine-status').textContent=text;
  const failed=engine?.dead;
  $('engine-dot').className='status-dot'+(failed?' error':engine?.ready?'':' loading');
  $('retry-engine').hidden=!failed;
}
let engine=new LocalEngine({onStatus:engineStatus});
function showError(error){toast(error.message||String(error));}
function download(name,text,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function markDirty(){
  $('save-status').textContent=storeReady?'Guardando…':'Sin guardado: exporta una copia';
  clearTimeout(dirtyTimer);dirtyTimer=setTimeout(()=>flushSave().catch(showError),150);
}
async function flushSave(){
  clearTimeout(dirtyTimer);dirtyTimer=null;
  if(!storeReady)return;
  const serial=++saveSequence;
  doc.updatedAt=new Date().toISOString();const snapshot=structuredClone({...doc,id:'draft'});
  const work=saveTail.catch(()=>{}).then(()=>store.put(snapshot));saveTail=work;
  try{await work;if(serial===saveSequence)$('save-status').textContent='✓ Sesión guardada';}
  catch(e){$('save-status').textContent='No se pudo guardar: exporta una copia';throw e;}
}
function resetEvaluation(){
  lastResult=null;$('score-explanation').textContent='Evaluación para blancas';$('score').textContent='—';$('rail-score').textContent='—';$('eval-white').style.height='50%';
  $('depth-reached').textContent='Sin análisis de esta posición';$('pv').textContent='Pulsa Analizar para evaluar esta posición.';
  board?.setAutoShapes([]);
}
function render(){
  const chess=positionAt(doc),history=chess.history({verbose:true}),last=history.at(-1);
  board.set({fen:chess.fen(),orientation:doc.orientation,turnColor:chess.turn()==='w'?'white':'black',
    lastMove:last?[last.from,last.to]:undefined,check:chess.inCheck(),
    movable:{free:false,color:chess.turn()==='w'?'white':'black',dests:legalDests(chess)}});
  $('game-title').value=doc.title;$('notes').value=doc.notes;$('depth').value=String(doc.depth||14);
  const flipped=doc.orientation==='black';$('top-player').textContent=flipped?'Blancas':'Negras';$('bottom-player').textContent=flipped?'Negras':'Blancas';
  $('turn-status').textContent=chess.isCheckmate()?'Jaque mate':chess.isStalemate()?'Ahogado':chess.isDraw()?'Tablas':`Juegan ${chess.turn()==='w'?'blancas':'negras'}${chess.inCheck()?' · jaque':''}`;
  $('first').disabled=$('prev').disabled=doc.cursor===0;$('next').disabled=$('last').disabled=doc.cursor===doc.moves.length;
  $('ply-label').textContent=doc.cursor===0?'Inicio':`${doc.cursor} / ${doc.moves.length}`;
  renderMoves();resetEvaluation();
  const cached=doc.analyses?.[chess.fen()];if(cached){lastResult=cached;showEvaluation(cached.fen,cached.evaluation,cached.bestMove);$('depth-reached').textContent+=' · guardado';}
  scheduleAnalysis();
}
function renderMoves(){
  if(!doc.moves.length){$('moves').innerHTML='<p class="empty-moves">Tu siguiente idea empieza aquí.<small>Mueve una pieza o carga una partida.</small></p>';return;}
  const fields=doc.initialFen.split(' '),start=(Number(fields[5])-1)*2+(fields[1]==='b'?1:0),rows=new Map();
  doc.moves.forEach((san,i)=>{
    const absolute=start+i,num=Math.floor(absolute/2)+1;if(!rows.has(num))rows.set(num,['','']);
    rows.get(num)[absolute%2]=`<button class="move-button${doc.cursor===i+1?' selected':''}" data-ply="${i+1}" aria-label="Ir a ${escape(san)}">${escape(san)}</button>`;
  });
  $('moves').innerHTML=[...rows].map(([n,ms])=>`<div class="move-row"><span class="move-num">${n}.</span>${ms[0]||'<span></span>'}${ms[1]||'<span></span>'}</div>`).join('');
  $('moves').querySelector('.selected')?.scrollIntoView({block:'nearest'});
}
function jump(cursor){doc.cursor=Math.max(0,Math.min(doc.moves.length,cursor));render();markDirty();}
async function choosePromotion(){
  $('promotion-dialog').showModal();
  return new Promise(resolve=>{
    const dialog=$('promotion-dialog');
    const click=e=>{
      const promotion=e.target.closest('[data-promotion]')?.dataset.promotion;
      if(!promotion&&e.target.id!=='cancel-promotion')return;
      dialog.removeEventListener('click',click);dialog.removeEventListener('cancel',cancel);dialog.close();resolve(promotion||null);
    };
    const cancel=e=>{e.preventDefault();dialog.removeEventListener('click',click);dialog.removeEventListener('cancel',cancel);dialog.close();resolve(null);};
    dialog.addEventListener('click',click);dialog.addEventListener('cancel',cancel);
  });
}
async function onMove(from,to){
  try{
    const chess=positionAt(doc),candidates=chess.moves({verbose:true}).filter(m=>m.from===from&&m.to===to);
    if(!candidates.length){render();return;}
    let promotion;
    if(candidates.some(m=>m.promotion)){render();promotion=await choosePromotion();if(!promotion)return;}
    if(doc.cursor<doc.moves.length&&!confirm('Jugar aquí sustituirá la continuación de la sesión actual. Las partidas guardadas en biblioteca se conservan. ¿Continuar?')){render();return;}
    const move=chess.move({from,to,promotion});doc.moves=doc.moves.slice(0,doc.cursor);doc.moves.push(move.san);doc.cursor=doc.moves.length;
    render();markDirty();
  }catch(e){render();showError(e);}
}
function showEvaluation(fen,info,bestMove){
  if(!info)return;
  const sign=fen.split(' ')[1]==='w'?1:-1,value=info.value*sign;
  const bound=info.bound==='exact'?'':(info.bound==='lower'?(sign===1?'≥':'≤'):(sign===1?'≤':'≥'));
  const label=info.type==='mate'?`#${value}`:`${value>=0?'+':''}${(value/100).toFixed(2)}`;
  $('score').textContent=bound+label;$('rail-score').textContent=label;
  $('score-explanation').textContent=info.type==='mate'?(value===0?`Jaque mate · ganan ${sign===1?'negras':'blancas'}`:`Mate para ${value>0?'blancas':'negras'} en ${Math.abs(value)}`):'Evaluación para blancas';
  const percentage=info.type==='mate'?(value===0?(sign===1?0:100):(value>0?100:0)):Math.max(4,Math.min(96,50+Math.tanh(value/400)*46));
  $('eval-white').style.height=percentage+'%';$('depth-reached').textContent='Profundidad '+info.depth;
  const pv=pvToSan(fen,info.pv);$('pv').textContent=pv||'Sin variante publicada para esta posición.';
  const move=bestMove||info.pv[0];
  board.setAutoShapes(move&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)?[{orig:move.slice(0,2),dest:move.slice(2,4),brush:'paleGreen'}]:[]);
}
function toggleButton(){
  $('engine-toggle').textContent=enabled?'Pausar':'Analizar';$('engine-toggle').classList.toggle('running',enabled);
  $('engine-toggle').setAttribute('aria-label',enabled?'Pausar análisis':'Iniciar análisis');
}
function scheduleAnalysis(){
  clearTimeout(scheduleTimer);if(!enabled)return;
  const serial=++analysisSerial;
  const fen=validateEngineFen(positionAt(doc).fen());pending={fen,depth:Number($('depth').value),serial};
  if(pumping)engine.stop().catch(showError);
  scheduleTimer=setTimeout(()=>pump().catch(showError),120);
}
async function pump(){
  if(pumping||!enabled)return;pumping=true;
  try{
    await engine.init();
    while(enabled&&pending){
      const request=pending;pending=null;
      engineStatus('Calculando en tu dispositivo…');
      const result=await engine.analyze(request.fen,request.depth,info=>{
        if(enabled&&request.serial===analysisSerial&&request.fen===positionAt(doc).fen())showEvaluation(request.fen,info);
      });
      if(enabled&&request.serial===analysisSerial&&result.fen===positionAt(doc).fen()){
        lastResult=result;
        if(result.evaluation){doc.analyses??={};doc.analyses[result.fen]=result;const keys=Object.keys(doc.analyses);while(keys.length>32)delete doc.analyses[keys.shift()];markDirty();}
        showEvaluation(result.fen,result.evaluation,result.bestMove);
        engineStatus('Stockfish 19 completo · análisis terminado');
      }
    }
  }catch(e){
    if(e.name!=='AbortError'){enabled=false;pending=null;engineStatus(e.message);showError(e);}
  }finally{pumping=false;toggleButton();if(enabled&&pending)setTimeout(()=>pump().catch(showError),0);}
}
async function updateLibrary(){
  if(!storeReady)return;
  const games=(await store.all()).filter(g=>g.id!=='draft').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  $('library-count').textContent=String(games.length);
  $('library-list').innerHTML=games.length?games.map(g=>`<div class="library-item"><div class="library-description"><strong>${escape(g.title)}</strong><small>${g.moves.length} medias jugadas · ${escape(new Date(g.updatedAt).toLocaleDateString('es-ES'))}</small></div><button data-open="${escape(g.id)}">Abrir</button><button class="delete-button" data-delete="${escape(g.id)}" aria-label="Eliminar ${escape(g.title)}">×</button></div>`).join(''):'<p>Todavía no hay partidas. Usa «Guardar en biblioteca» para añadir la primera.</p>';
}
async function makeBackup(){
  if(!storeReady)throw Error('El almacenamiento no está disponible. Exporta al menos el PGN actual.');
  await flushSave();
  const games=(await store.all()).filter(g=>g.id!=='draft');
  return JSON.stringify({application:'piolin_chess',schema:1,exportedAt:new Date().toISOString(),draft:structuredClone(doc),games},null,2);
}
function action(id,fn){$(id).addEventListener('click',()=>Promise.resolve().then(fn).catch(showError));}
action('flip',()=>{doc.orientation=doc.orientation==='white'?'black':'white';render();markDirty();});
action('first',()=>jump(0));action('prev',()=>jump(doc.cursor-1));action('next',()=>jump(doc.cursor+1));action('last',()=>jump(doc.moves.length));
$('moves').addEventListener('click',e=>{const ply=e.target.closest('[data-ply]')?.dataset.ply;if(ply)jump(Number(ply));});
$('game-title').addEventListener('input',()=>{doc.title=$('game-title').value;markDirty();});
$('notes').addEventListener('input',()=>{doc.notes=$('notes').value;markDirty();});
action('new-game',async()=>{await flushSave();if(!confirm('¿Abrir una sesión nueva? Guarda primero en biblioteca si quieres conservar esta partida.'))return;doc=newDocument();render();await flushSave();});
action('analysis-tab',()=>{$('library-dialog').close();$('board').scrollIntoView({block:'center',behavior:'smooth'});});
action('import-open',()=>{$('import-error').textContent='';$('import-dialog').showModal();});
action('load-example',()=>{$('import-text').value=example;});
$('pgn-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('El PGN supera 2 MB.');$('import-text').value=await file.text();}catch(err){$('import-error').textContent=err.message;}finally{e.target.value='';}});
action('import-confirm',async()=>{
  try{
    const imported=importText($('import-text').value);
    if((doc.moves.length||doc.notes)&&!confirm('Cargar sustituirá la sesión actual. Las partidas de biblioteca se conservan. ¿Continuar?'))return;
    doc=imported;render();await flushSave();$('import-dialog').close();toast('Partida cargada y guardada en la sesión.');
  }catch(e){$('import-error').textContent='No se pudo cargar: '+e.message;}
});
action('export-pgn',()=>download('piolin_partida.pgn',exportPgn(doc),'application/x-chess-pgn'));
action('library-open',async()=>{if(!storeReady)throw Error('No hay almacenamiento disponible.');await updateLibrary();$('library-dialog').showModal();});
action('save-library',async()=>{
  if(!storeReady)throw Error('No se puede guardar: exporta el PGN.');
  await flushSave();const entry={...structuredClone(doc),id:doc.libraryId||crypto.randomUUID(),updatedAt:new Date().toISOString()};delete entry.libraryId;
  await store.put(entry);doc.libraryId=entry.id;await flushSave();await updateLibrary();
  navigator.storage?.persist?.().catch(()=>{});toast('Partida guardada en tu biblioteca.');
});
$('library-list').addEventListener('click',e=>{(async()=>{
  const id=e.target.closest('[data-open]')?.dataset.open,del=e.target.closest('[data-delete]')?.dataset.delete;
  if(id){if((doc.moves.length||doc.notes)&&!confirm('¿Abrir esta partida y sustituir la sesión actual?'))return;const game=validateDocument(await store.get(id));doc={...game,id:'draft',libraryId:game.id};render();await flushSave();$('library-dialog').close();}
  if(del&&confirm('¿Eliminar esta partida de la biblioteca?')){await store.remove(del);if(doc.libraryId===del){delete doc.libraryId;markDirty();}await updateLibrary();}
})().catch(showError);});
action('backup-export',async()=>{download('piolin_copia_'+new Date().toISOString().slice(0,10)+'.json',await makeBackup());toast('Copia exportada. Consérvala fuera del navegador.');});
action('backup-import',()=>$('backup-file').click());
$('backup-file').addEventListener('change',e=>{(async()=>{
  const file=e.target.files[0];if(!file)return;if(file.size>20000000)throw Error('La copia supera 20 MB.');
  if(!storeReady)throw Error('No hay almacenamiento disponible.');
  const backup=parseBackup(await file.text());
  if(!confirm(`Restaurar reemplazará la biblioteca y la sesión actuales por ${backup.games.length} partidas. Se descargará antes una copia de seguridad de lo actual. ¿Continuar?`))return;
  download('piolin_antes_de_restaurar.json',await makeBackup());
  await store.restore(backup);doc=backup.draft;render();await updateLibrary();$('save-status').textContent='✓ Copia restaurada';toast('Biblioteca y sesión restauradas.');
})().catch(showError).finally(()=>e.target.value='');});
action('help-open',()=>$('help-dialog').showModal());
action('engine-toggle',async()=>{
  enabled=!enabled;toggleButton();
  if(enabled)scheduleAnalysis();else{pending=null;analysisSerial++;clearTimeout(scheduleTimer);await engine.stop();engineStatus('Stockfish completo · en pausa');}
});
$('depth').addEventListener('change',()=>{doc.depth=Number($('depth').value);markDirty();scheduleAnalysis();});
action('retry-engine',async()=>{
  enabled=false;pending=null;analysisSerial++;engine.destroy();engine=new LocalEngine({onStatus:engineStatus});$('engine-toggle').disabled=true;
  await engine.init();$('engine-toggle').disabled=false;$('retry-engine').hidden=true;toggleButton();
});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;
  if(e.key==='ArrowLeft'){e.preventDefault();jump(doc.cursor-1);}if(e.key==='ArrowRight'){e.preventDefault();jump(doc.cursor+1);}
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){flushSave().catch(showError);if(enabled){enabled=false;pending=null;analysisSerial++;clearTimeout(scheduleTimer);toggleButton();engine.stop().catch(()=>{});engineStatus('Análisis pausado al salir de la aplicación.');}}
});
window.addEventListener('pagehide',()=>{flushSave().catch(()=>{});});
window.addEventListener('beforeunload',()=>engine.destroy());
async function start(){
  $('origin-warning').hidden=location.protocol!=='file:';
  board=Chessground($('board'),{fen:doc.initialFen,orientation:'white',coordinates:true,
    animation:{enabled:true,duration:160},movable:{free:false,color:'white',dests:legalDests(new Chess()),events:{after:onMove}},
    drawable:{enabled:true,visible:true},premovable:{enabled:false}});
  try{await store.open();storeReady=true;const saved=await store.get('draft');if(saved)doc=validateDocument(saved);$('save-status').textContent=saved?'✓ Sesión recuperada':'✓ Guardado local preparado';await updateLibrary();}
  catch(e){$('save-status').textContent='No se pudo recuperar: exporta antes de cambiar';toast('Datos locales: '+e.message);}
  render();
  engine.init().then(()=>{$('engine-toggle').disabled=false;engineStatus('Stockfish 19 completo · motor preparado');}).catch(e=>{engineStatus(e.message);showError(e);});
}
start().catch(showError);
