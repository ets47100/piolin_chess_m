// SPDX-License-Identifier: GPL-3.0-or-later
import { Chessground } from '@lichess-org/chessground';
import { Chess } from 'chess.js';
import { newDocument,validateDocument,positionAt,importText,exportPgn,parseBackup,legalDests,pvToSan,validateEngineFen,pgnHeader,APP_VERSION } from './model.js';
import { playerKey, studyGame } from './player-study.js';
import { setupStudy } from './study-view.js';
import { LocalStore } from './storage.js';
import { LocalEngine } from './engine.js';
import { FULL_JS,canUseFullEngine,fullEngineInstalled,downloadFullEngine,fullEngineOptions } from './engine-store.js';
const $=id=>document.getElementById(id);
$('app-version').textContent = 'v' + APP_VERSION;
const store=new LocalStore();let storeReady=false,doc=newDocument(),board,dirtyTimer,saveTail=Promise.resolve(),saveSequence=0;
let enabled=false,pumping=false,pending=null,analysisSerial=0,scheduleTimer,lastResult=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const example='[Event "Miniatura de ejemplo"]\n[White "Blancas"]\n[Black "Negras"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
const bot={active:false,color:'b',skill:10,thinking:false,serial:0,clock:null,times:{w:0,b:0},timed:false};
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function engineStatus(text){
  $('engine-status').textContent=text;
  const failed=engine?.dead;
  $('engine-dot').className='status-dot'+(failed?' error':engine?.ready?'':' loading');
  $('retry-engine').hidden=!failed;
}
let engineMode='lite',engine;
function makeEngine(mode){
  engineMode=mode;
  const full=mode==='full',options=full?fullEngineOptions():{Hash:32};
  const e=new LocalEngine({onStatus:text=>{if(e===engine)engineStatus(text);},
    url:full?FULL_JS:'engine/stockfish-19-lite-single.js',options,
    label:full?`Stockfish 19 completo · ${options.Threads} ${options.Threads===1?'hilo':'hilos'}`:'Stockfish 19 lite'});
  return e;
}
engine=makeEngine('lite');
async function useEngine(mode){
  engine.destroy();engine=makeEngine(mode);
  try{await engine.init();}
  catch(e){
    if(mode==='lite')throw e;
    engine=makeEngine('lite');await engine.init();engineStatus('No se pudo iniciar el motor completo; usando Stockfish lite.');
  }
}
async function ensureFullEngine(){
  if(!canUseFullEngine()){engineStatus(engine.label+' · el motor completo necesita instalar la app y recargar');return;}
  if(!await fullEngineInstalled()){
    try{await downloadFullEngine((got,total)=>engineStatus(`Descargando Stockfish completo (solo la primera vez)… ${Math.round(got/1048576)} de ${Math.round(total/1048576)} MB`));}
    catch(e){engineStatus('Usando Stockfish lite. '+e.message);return;}
  }
  await runExclusive(()=>useEngine('full'));
}
async function registerWorker(){
  if(!('serviceWorker' in navigator)||location.protocol==='file:')return false;
  try{
    await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;
    if(!self.crossOriginIsolated&&!sessionStorage.getItem('piolin-isolation-reload')){sessionStorage.setItem('piolin-isolation-reload','1');location.reload();return true;}
  }catch(e){console.warn('Service worker no disponible',e);}
  return false;
}
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
function renderPlayer(slot, white) {
  const label = white ? 'Blancas' : 'Negras';
  const name = pgnHeader(doc.sourcePgn || '', white ? 'White' : 'Black');
  const known = Boolean(name && name !== '?' && playerKey(name) !== playerKey(label));
  const studied = known && doc.studyPlayer && playerKey(name) === playerKey(doc.studyPlayer);
  const display = $(slot + '-player');
  display.textContent = known ? name : label;
  display.title = display.textContent;
  $(slot + '-caption').textContent = known ? label + (studied ? ' · Jugador en estudio' : '') : '';
  $(slot + '-avatar').textContent = white ? '♔' : '♚';
}
function render(){
  const chess=positionAt(doc),history=chess.history({verbose:true}),last=history.at(-1);
  board.set({fen:chess.fen(),orientation:doc.orientation,turnColor:chess.turn()==='w'?'white':'black',
    lastMove:last?[last.from,last.to]:undefined,check:chess.inCheck(),
    movable:{free:false,color:bot.active&&(chess.turn()===bot.color||doc.cursor<doc.moves.length)?undefined:chess.turn()==='w'?'white':'black',dests:legalDests(chess)}});
  if(bot.active&&chess.isGameOver())endBot();
  updateClocks();
  $('game-title').value=doc.title;$('notes').value=doc.notes;$('depth').value=String(doc.depth||14);
  const flipped=doc.orientation==='black';renderPlayer('top',flipped);renderPlayer('bottom',!flipped);
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
  const list=$('moves'),sel=list.querySelector('.selected');
  if(sel){ // desplaza solo la lista; scrollIntoView movía toda la página y ocultaba el tablero
    const l=list.getBoundingClientRect(),s=sel.getBoundingClientRect();
    if(s.top<l.top)list.scrollTop-=l.top-s.top;else if(s.bottom>l.bottom)list.scrollTop+=s.bottom-l.bottom;
  }
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
    render();markDirty();botMove().catch(showError);
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
        engineStatus(engine.label+' · análisis terminado');
      }
    }
  }catch(e){
    if(e.name!=='AbortError'){enabled=false;pending=null;engineStatus(e.message);showError(e);}
  }finally{pumping=false;toggleButton();if(enabled&&pending)setTimeout(()=>pump().catch(showError),0);}
}
async function updateLibrary(){
  if(!storeReady)return;
  const entries = await store.all();
  const games=entries.filter(g=>g.id!=='draft' && !g.role).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  $('library-count').textContent=String(games.length);
  $('lib-modal-count').textContent=String(games.length);
  $('library-studies').innerHTML = entries.filter(entry => entry.role)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(study => `<div class="library-item"><div class="library-description"><strong>${escape(study.name)}</strong><small>${study.role === 'profile' ? 'Mi perfil' : 'Rival'} · ${study.records.length} partidas analizadas</small></div><button data-study="${escape(study.id)}">Abrir estudio</button><button class="delete-button" data-remove-study="${escape(study.id)}" aria-label="Eliminar estudio">×</button></div>`).join('');
  $('library-list').innerHTML=games.length?games.map(g=>`<div class="library-item"><div class="library-description"><strong>${escape(g.title)}</strong><small>${g.moves.length} medias jugadas · ${escape(new Date(g.updatedAt).toLocaleDateString('es-ES'))}</small></div><button data-open="${escape(g.id)}">Abrir</button><button class="delete-button" data-delete="${escape(g.id)}" aria-label="Eliminar ${escape(g.title)}">×</button></div>`).join(''):'<p>Todavía no hay partidas. Usa «Guardar en biblioteca» para añadir la primera.</p>';
}
async function makeBackup(){
  if(!storeReady)throw Error('El almacenamiento no está disponible. Exporta al menos el PGN actual.');
  await flushSave();
  const entries=(await store.all()).filter(g=>g.id!=='draft');
  const games=entries.filter(g=>!g.role), studies=entries.filter(g=>g.role);
  return JSON.stringify({application:'piolin_chess',schema:1,exportedAt:new Date().toISOString(),draft:structuredClone(doc),games,studies},null,2);
}
function action(id,fn){$(id).addEventListener('click',()=>Promise.resolve().then(fn).catch(showError));}
action('flip',()=>{doc.orientation=doc.orientation==='white'?'black':'white';render();markDirty();});
action('first',()=>jump(0));action('prev',()=>jump(doc.cursor-1));action('next',()=>jump(doc.cursor+1));action('last',()=>jump(doc.moves.length));
$('moves').addEventListener('click',e=>{const ply=e.target.closest('[data-ply]')?.dataset.ply;if(ply)jump(Number(ply));});
$('game-title').addEventListener('input',()=>{doc.title=$('game-title').value;markDirty();});
$('notes').addEventListener('input',()=>{doc.notes=$('notes').value;markDirty();});
action('new-game',async()=>{await flushSave();if(!confirm('¿Abrir una sesión nueva? Guarda primero en biblioteca si quieres conservar esta partida.'))return;doc=newDocument();render();await flushSave();});
action('analysis-tab',()=>{$('library-dialog').close();$('board').scrollIntoView({block:'center',behavior:'smooth'});});
action('import-open',()=>{$('import-error').classList.add('error');$('import-error').textContent='';$('import-dialog').showModal();});
action('load-example',()=>{$('import-text').value=example;});
$('pgn-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('El PGN supera 2 MB.');$('import-text').value=await file.text();}catch(err){$('import-error').textContent=err.message;}finally{e.target.value='';}});
function markStudyPlayer(game, name) {
  if (!name || !game.sourcePgn) return;
  const key = playerKey(name);
  const white = pgnHeader(game.sourcePgn, 'White'), black = pgnHeader(game.sourcePgn, 'Black');
  if (playerKey(white) === key) game.studyPlayer = white;
  else if (playerKey(black) === key) {
    game.studyPlayer = black;
    game.orientation = 'black';
  }
}

async function importFromDialog(pgn, studyPlayer = '') {
  try {
    const imported = importText(pgn);
    if ((doc.moves.length || doc.notes) && !confirm('Cargar sustituirá la sesión actual. Las partidas de biblioteca se conservan. ¿Continuar?')) return;
    markStudyPlayer(imported, studyPlayer);
    doc = imported;
    render();
    await flushSave();
    $('import-dialog').close();
    toast('Partida cargada y guardada en la sesión.');
  } catch (error) {
    $('import-error').classList.add('error');
    $('import-error').textContent = 'No se pudo cargar: ' + error.message;
  }
}
action('import-confirm', () => importFromDialog($('import-text').value));
async function studyPgns(pgns, preferredPlayer, sourceDialog) {
  const games = [];
  let skipped = 0;
  for (const pgn of pgns) {
    try {
      const game = importText(pgn);
      if (!studyGame(game)) { skipped++; continue; }
      markStudyPlayer(game, preferredPlayer);
      games.push(game);
    } catch {
      skipped++;
    }
  }
  if (!games.length) throw Error('No hay partidas PGN con ambos jugadores identificados y jugadas válidas.');
  await openStudy({ preferredPlayer, games, skipped });
  sourceDialog.close();
  return `${games.length} partidas disponibles. ${skipped} omitidas.`;
}
document.addEventListener('piolin:open-online-game', event => {
  const { pgn, player } = event.detail;
  studyPgns([pgn], player, $('online-dialog')).catch(error => {
    $('online-status').textContent = error.message;
  });
});
document.addEventListener('piolin:study-pgn-batch', event => {
  const { pgns, player, resolve, reject } = event.detail;
  studyPgns(pgns, player, $('online-dialog')).then(resolve, reject);
});
action('import-batch', async () => {
  const output = $('import-error');
  try {
    const pgns = $('import-text').value.trim().split(/\r?\n\s*\r?\n(?=\[Event\s)/);
    await studyPgns(pgns, '', $('import-dialog'));
  } catch (error) {
    output.classList.add('error');
    output.textContent = error.message;
  }
});
const openStudy = setupStudy({
  load: () => storeReady ? store.all().then(entries => entries.filter(entry => entry.id !== 'draft')) : [],
  save: async study => {
    if (!storeReady) throw Error('La biblioteca no está disponible en este navegador.');
    await store.saveStudy(study, doc => studyGame(doc)?.key);
    await updateLibrary();
    navigator.storage?.persist?.().catch(() => {});
  },
  showError,
});
$('library-studies').addEventListener('click', event => {
  const id = event.target.closest('[data-study]')?.dataset.study;
  const remove = event.target.closest('[data-remove-study]')?.dataset.removeStudy;
  if (id) store.get(id).then(saved => openStudy({ preferredPlayer: saved.name, saved })).catch(showError);
  if (remove && confirm('¿Eliminar el estudio de la biblioteca?')) {
    store.remove(remove).then(updateLibrary).catch(showError);
  }
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
// Pausa el análisis en vivo, ejecuta fn con el motor libre y lo reanuda.
async function runExclusive(fn){
  const was=enabled;enabled=false;pending=null;analysisSerial++;clearTimeout(scheduleTimer);toggleButton();
  await engine.stop();while(pumping)await new Promise(r=>setTimeout(r,25));
  try{return await fn();}finally{if(was){enabled=true;toggleButton();scheduleAnalysis();}}
}
const formatClock=s=>{s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
function updateClocks(){
  $('clock-top').hidden=$('clock-bottom').hidden=!(bot.active&&bot.timed);
  if(!bot.timed)return;
  const flipped=doc.orientation==='black';
  $('clock-top').textContent=formatClock(bot.times[flipped?'w':'b']);$('clock-bottom').textContent=formatClock(bot.times[flipped?'b':'w']);
}
function endBot(message){
  bot.active=false;bot.serial++;clearInterval(bot.clock);$('mode-badge').textContent='ANÁLISIS';
  if(message)toast(message);
}
function botTurn(){const chess=positionAt(doc);return bot.active&&doc.cursor===doc.moves.length&&chess.turn()===bot.color&&!chess.isGameOver();}
async function botMove(){
  if(!botTurn()||bot.thinking)return;
  bot.thinking=true;const serial=++bot.serial;$('gm-advice-text').textContent='🤖 Piolín está pensando su jugada…';
  try{
    await runExclusive(async()=>{
      const fen=validateEngineFen(positionAt(doc).fen()),depth={1:4,5:7,10:10,15:13,20:16}[bot.skill]||10;
      engine.setOption('Skill Level',bot.skill);
      let result;
      try{result=await engine.analyze(fen,depth);}finally{if(!engine.dead)engine.setOption('Skill Level',20);}
      if(serial!==bot.serial||!botTurn()||!result.bestMove)return;
      const chess=positionAt(doc),move=chess.move({from:result.bestMove.slice(0,2),to:result.bestMove.slice(2,4),promotion:result.bestMove[4]});
      doc.moves.push(move.san);doc.cursor=doc.moves.length;render();markDirty();
      $('gm-advice-text').textContent=`🤖 Piolín ha jugado ${move.san}. ¡Es tu turno!`;
    });
  }catch(e){if(e.name!=='AbortError')throw e;}
  finally{bot.thinking=false;}
}
action('play-bot-open',()=>$('bot-dialog').showModal());
action('bot-start',async()=>{
  if(doc.moves.length&&!confirm('Empezar una partida nueva sustituirá la sesión actual. ¿Continuar?'))return;
  await engine.init();
  const human=$('bot-color').value==='b'?'b':'w',seconds=Number($('bot-time').value)||0;
  endBot();bot.color=human==='w'?'b':'w';bot.skill=Number($('bot-strength').value);bot.timed=seconds>0;bot.times={w:seconds,b:seconds};
  doc=newDocument();doc.orientation=human==='w'?'white':'black';doc.title='Partida vs Piolín (nivel '+({1:1,5:2,10:3,15:4,20:5}[bot.skill]||3)+')';
  bot.active=true;$('mode-badge').textContent='VS MÁQUINA';$('bot-dialog').close();
  clearInterval(bot.clock);
  if(bot.timed)bot.clock=setInterval(()=>{
    if(!bot.active)return;
    const turn=positionAt(doc).turn();bot.times[turn]--;updateClocks();
    if(bot.times[turn]<=0)endBot(turn==='w'?'¡Tiempo agotado para las blancas!':'¡Tiempo agotado para las negras!');
  },1000);
  render();await flushSave();await botMove();
});
action('bot-stop',()=>{endBot();render();$('bot-dialog').close();});

// Revisión de fallos: analiza cada posición de la partida con el motor.
let mistakes=[],mistakeCursor=-1,auditSerial=0;
const clampCp=info=>{const v=info.type==='mate'?(info.value>0?1:-1)*1000:info.value;return Math.max(-1000,Math.min(1000,v));};
async function auditGame(){
  if(!doc.moves.length){toast('Carga o juega primero una partida para revisar sus fallos.');return;}
  const serial=++auditSerial,moves=[...doc.moves],depth=Math.min(doc.depth||14,12);
  $('mistakes-panel').hidden=false;$('mistakes-list').innerHTML='';mistakes=[];mistakeCursor=-1;$('gm-audit-btn').disabled=true;
  try{
    await runExclusive(async()=>{
      const evals=[];
      for(let i=0;i<=moves.length;i++){
        if(serial!==auditSerial)return;
        $('mistakes-summary').textContent=`Revisando posición ${i+1} de ${moves.length+1}…`;
        const fen=validateEngineFen(positionAt({initialFen:doc.initialFen,moves},i).fen()),r=await engine.analyze(fen,depth);
        if(serial!==auditSerial)return;
        evals.push(r.evaluation?clampCp(r.evaluation)*(fen.split(' ')[1]==='w'?1:-1):0);
      }
      const fields=doc.initialFen.split(' '),start=(Number(fields[5])-1)*2+(fields[1]==='b'?1:0);
      for(let i=1;i<=moves.length;i++){
        const white=(start+i-1)%2===0,loss=(evals[i-1]-evals[i])*(white?1:-1);
        if(loss<75)continue;
        const type=loss>=300?{tag:'?? Grave',cls:'badge-blunder'}:loss>=150?{tag:'? Error',cls:'badge-mistake'}:{tag:'?! Imprecisión',cls:'badge-inaccuracy'};
        const num=Math.floor((start+i-1)/2)+1;
        mistakes.push({ply:i,label:`${num}${white?'.':'...'} ${moves[i-1]}`,loss:(loss/100).toFixed(2),...type});
      }
      $('mistakes-summary').textContent=`Fallos encontrados: ${mistakes.length}`;
      $('mistakes-list').innerHTML=mistakes.length?mistakes.map(m=>`<div class="mistake-item" data-mistake-ply="${m.ply}"><span><strong>${escape(m.label)}</strong> (pierde ${m.loss} peones)</span><span class="${m.cls}">${m.tag}</span></div>`).join(''):'<p style="font-size:12px;margin:4px 0;">Partida muy precisa: no se detectaron pérdidas relevantes.</p>';
    });
  }finally{$('gm-audit-btn').disabled=false;}
}
action('gm-audit-btn',auditGame);
$('mistakes-list').addEventListener('click',e=>{const ply=e.target.closest('[data-mistake-ply]')?.dataset.mistakePly;if(ply)jump(Number(ply));});
action('next-mistake-btn',()=>{if(!mistakes.length)return;mistakeCursor=(mistakeCursor+1)%mistakes.length;jump(mistakes[mistakeCursor].ply);});
action('help-open',()=>$('help-dialog').showModal());
action('engine-toggle',async()=>{
  enabled=!enabled;toggleButton();
  if(enabled)scheduleAnalysis();else{pending=null;analysisSerial++;clearTimeout(scheduleTimer);await engine.stop();engineStatus(engine.label+' · en pausa');}
});
$('depth').addEventListener('change',()=>{doc.depth=Number($('depth').value);markDirty();scheduleAnalysis();});
action('retry-engine',async()=>{
  enabled=false;pending=null;analysisSerial++;engine.destroy();engine=makeEngine(engineMode);$('engine-toggle').disabled=true;
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
  if(await registerWorker())return;
  $('origin-warning').hidden=location.protocol!=='file:';
  board=Chessground($('board'),{fen:doc.initialFen,orientation:'white',coordinates:true,
    animation:{enabled:true,duration:160},movable:{free:false,color:'white',dests:legalDests(new Chess()),events:{after:onMove}},
    drawable:{enabled:true,visible:true},premovable:{enabled:false}});
  try{await store.open();storeReady=true;const saved=await store.get('draft');if(saved)doc=validateDocument(saved);$('save-status').textContent=saved?'✓ Sesión recuperada':'✓ Guardado local preparado';await updateLibrary();}
  catch(e){$('save-status').textContent='No se pudo recuperar: exporta antes de cambiar';toast('Datos locales: '+e.message);}
  render();
  engine.init().then(()=>{$('engine-toggle').disabled=false;$('gm-audit-btn').disabled=false;engineStatus(engine.label+' · motor preparado');return ensureFullEngine();}).catch(e=>{engineStatus(e.message);showError(e);});
}
start().catch(showError);
