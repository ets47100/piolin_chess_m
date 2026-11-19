// SPDX-License-Identifier: GPL-3.0-or-later
export function parseInfo(line) {
  if(!line.startsWith('info ') || line.startsWith('info string '))return null;
  const tokens=line.trim().split(/\s+/), pv=tokens.indexOf('pv');
  const head=pv<0?tokens:tokens.slice(0,pv);
  const score=head.indexOf('score'),depth=head.indexOf('depth');
  if(score<0||depth<0)return null;
  const type=head[score+1],value=Number(head[score+2]), d=Number(head[depth+1]);
  if(!['cp','mate'].includes(type)||!Number.isInteger(value)||!Number.isInteger(d))return null;
  const mp=head.indexOf('multipv');if(mp>=0&&head[mp+1]!=='1')return null;
  return {type,value,depth:d,bound:head.includes('lowerbound')?'lower':head.includes('upperbound')?'upper':'exact',pv:pv<0?[]:tokens.slice(pv+1),nodes:Number(head[head.indexOf('nodes')+1])||0};
}
export class LocalEngine {
  constructor({workerFactory=(url)=>new Worker(url),onStatus=()=>{}}={}) {
    this.workerFactory=workerFactory;this.onStatus=onStatus;this.ready=false;
    this.cancelEpoch=0;this.waiters=new Set();this.search=null;this.dead=false;
  }
  async init(){
    if(this.ready)return;
    if(this.initializing)return this.initializing;
    this.initializing=this._init();return this.initializing;
  }
  async _init(){
    if(this.dead)throw Error('El motor está cerrado. Recarga la aplicación.');
    this.onStatus('Cargando Stockfish completo…');
    this.worker=this.workerFactory('engine/stockfish-19-lite-single.js');
    this.worker.onmessage=event=>{for(const line of String(event.data).split(/[\r\n]+/))this._line(line.trim());};
    this.worker.onerror=()=>this._fail(Error('No se pudo ejecutar Stockfish. Comprueba que arrancaste desde el servidor local y que el dispositivo tiene memoria disponible.'));
    try {
      await this._command('uci','uciok',120000);
      this.send('setoption name Hash value 32');
      this.send('setoption name MultiPV value 1');
      this.send('setoption name UCI_Chess960 value false');
      await this._command('isready','readyok',30000);
      this.ready=true;this.onStatus('Stockfish 19 completo · preparado');
    }catch(e){this._fail(e);throw e;}
  }
  send(command){if(this.dead||!this.worker)throw Error('El motor no está disponible.');this.worker.postMessage(command);}
  _command(command,expected,ms){
    return new Promise((resolve,reject)=>{
      const waiter={expected,resolve:()=>{clearTimeout(waiter.timer);this.waiters.delete(waiter);resolve();},reject:e=>{clearTimeout(waiter.timer);this.waiters.delete(waiter);reject(e);}};
      waiter.timer=setTimeout(()=>{const error=Error('Stockfish no respondió a tiempo ('+expected+').');this._fail(error);},ms);
      this.waiters.add(waiter);
      try{this.send(command);}catch(e){waiter.reject(e);}
    });
  }
  async analyze(fen,depth=14,onInfo=()=>{}) {
    if(!Number.isInteger(depth)||depth<1||depth>30)throw Error('Profundidad no válida.');
    if(/[\r\n\x00]/.test(fen))throw Error('FEN no válido.');
    const epoch=this.cancelEpoch;
    await this.init();
    const canceled=()=>{if(epoch!==this.cancelEpoch){const e=Error('Análisis cancelado.');e.name='AbortError';throw e;}};
    canceled();
    if(this.search||this.preparing)throw Error('Ya hay un análisis en curso.');
    this.preparing=true;
    try {await this._command('isready','readyok',10000);}finally{this.preparing=false;}
    canceled();
    return new Promise((resolve,reject)=>{
      const search={resolve,reject,onInfo,fen,latest:null,timer:null,stopTimer:null};
      search.timer=setTimeout(()=>this._fail(Error('El análisis ha excedido dos minutos. Reduce la profundidad y recarga el motor.')),120000);
      this.search=search;
      try{this.send('position fen '+fen);this.send('go depth '+depth);}catch(e){this._fail(e);}
    });
  }
  _line(line){
    if(this.dead)return;
    for(const waiter of [...this.waiters])if(line===waiter.expected)waiter.resolve();
    const s=this.search;if(!s)return;
    const info=parseInfo(line);
    if(info&&(!s.latest||info.depth>=s.latest.depth)){s.latest=info;s.onInfo(info);}
    if(line.startsWith('bestmove ')){
      const token=line.split(/\s+/)[1];
      if(!/^(?:[a-h][1-8][a-h][1-8][qrbn]?|0000|\(none\))$/.test(token)){this._fail(Error('Respuesta UCI bestmove inválida.'));return;}
      clearTimeout(s.timer);clearTimeout(s.stopTimer);this.search=null;
      s.resolve({fen:s.fen,evaluation:s.latest,bestMove:['0000','(none)'].includes(token)?null:token});
    }
  }
  stop(){
    this.cancelEpoch++;
    const s=this.search;if(!s)return Promise.resolve();
    if(!s.stopTimer){
      s.stopTimer=setTimeout(()=>this._fail(Error('El motor no responde a la pausa. Recarga para reiniciarlo.')),5000);
      try{this.send('stop');}catch(e){this._fail(e);}
    }
    return new Promise(resolve=>{
      const success=s.resolve,failure=s.reject;
      s.resolve=v=>{success(v);resolve();};s.reject=e=>{failure(e);resolve();};
    });
  }
  _fail(error){
    if(this.dead)return;this.dead=true;this.ready=false;
    this.onStatus(error.message);
    for(const waiter of [...this.waiters])waiter.reject(error);
    if(this.search){const s=this.search;this.search=null;clearTimeout(s.timer);clearTimeout(s.stopTimer);s.reject(error);}
    this.worker?.terminate();
  }
  destroy(){
    if(!this.dead){try{this.worker?.postMessage('quit');}catch{}this._fail(Error('Motor cerrado.'));}
  }
}
