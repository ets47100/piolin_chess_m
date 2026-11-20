// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess, DEFAULT_POSITION } from 'chess.js';
export const APP_VERSION='3.2.0';
export const DEFAULT_FEN=DEFAULT_POSITION;
export function positionAt(doc, cursor=doc.cursor) {
  const chess=new Chess(doc.initialFen);
  for(const san of doc.moves.slice(0,cursor)) chess.move(san);
  return chess;
}
export function newDocument() {
  return {schema:1,id:'draft',title:'Partida sin título',initialFen:DEFAULT_FEN,
    moves:[],cursor:0,notes:'',orientation:'white',depth:14,analyses:{},updatedAt:new Date().toISOString()};
}
export function validateDocument(value) {
  if(!value || value.schema!==1 || typeof value.id!=='string' || value.id.length>100 ||
    typeof value.title!=='string' || value.title.length>200 ||
    typeof value.initialFen!=='string' || value.initialFen.length>200 ||
    !Array.isArray(value.moves) || value.moves.length>6000 ||
    value.moves.some(m=>typeof m!=='string' || m.length>20) ||
    !Number.isInteger(value.cursor) || value.cursor<0 || value.cursor>value.moves.length ||
    typeof value.notes!=='string' || value.notes.length>100000 ||
    !['white','black'].includes(value.orientation)) throw Error('Partida guardada no válida.');
  const chess=new Chess(value.initialFen);
  // Stockfish necesita un rey por bando y el rey que no tiene el turno a salvo.
  validateEngineFen(chess.fen());
  for(const move of value.moves) chess.move(move);
  const analyses={};
  if(value.analyses&&typeof value.analyses==='object'&&!Array.isArray(value.analyses)){
    for(const [fen,result] of Object.entries(value.analyses).slice(-32)){
      if(fen.length>200||!result||result.fen!==fen)continue;
      try{validateEngineFen(fen);}catch{continue;}
      const ev=result.evaluation;if(!ev||!['cp','mate'].includes(ev.type)||!Number.isInteger(ev.value)||!Number.isInteger(ev.depth)||!['exact','lower','upper'].includes(ev.bound)||!Array.isArray(ev.pv)||ev.pv.length>100||ev.pv.some(m=>typeof m!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)))continue;
      const best=result.bestMove;if(best!==null&&(typeof best!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best)))continue;
      analyses[fen]={fen,bestMove:best,evaluation:{type:ev.type,value:ev.value,depth:ev.depth,bound:ev.bound,pv:[...ev.pv],nodes:Number(ev.nodes)||0}};
    }
  }
  return {schema:1,id:value.id,title:value.title,initialFen:value.initialFen,
    moves:[...value.moves],cursor:value.cursor,notes:value.notes,
    orientation:value.orientation,depth:[10,12,14,16,18,20].includes(value.depth)?value.depth:14,analyses,...(typeof value.libraryId==='string'&&value.libraryId.length<100?{libraryId:value.libraryId}:{}),...(typeof value.studyPlayer==='string'&&value.studyPlayer.length<=200?{studyPlayer:value.studyPlayer}:{}),...(typeof value.sourcePgn==='string'&&value.sourcePgn.length<=2000000?{sourcePgn:value.sourcePgn}:{}),updatedAt:typeof value.updatedAt==='string'?value.updatedAt:new Date().toISOString()};
}
export function validateEngineFen(fen) {
  if(typeof fen!=='string' || /[\r\n\x00]/.test(fen)) throw Error('FEN no válido.');
  const fields=fen.trim().split(/\s+/);
  if(fields.length!==6 || !/^\d+$/.test(fields[4]) || !/^\d+$/.test(fields[5]) ||
    +fields[4]>1000000 || +fields[5]>1000000) throw Error('Contadores FEN no válidos.');
  const chess=new Chess(fen);
  const pieces=chess.board().flat().filter(Boolean);
  for(const color of ['w','b']) {
    const side=pieces.filter(p=>p.color===color);
    if(side.length>16 || side.filter(p=>p.type==='p').length>8) throw Error('Demasiadas piezas en el FEN.');
  }
  const other=chess.turn()==='w'?'b':'w';
  const king=pieces.find(p=>p.type==='k' && p.color===other);
  if(!king || chess.isAttacked(king.square,chess.turn())) throw Error('El rey del bando sin turno no puede estar en jaque.');
  for(const [right,ks,rs,color] of [['K','e1','h1','w'],['Q','e1','a1','w'],['k','e8','h8','b'],['q','e8','a8','b']]) {
    if(fields[2].includes(right) && (chess.get(ks)?.type!=='k' || chess.get(ks)?.color!==color ||
      chess.get(rs)?.type!=='r' || chess.get(rs)?.color!==color)) throw Error('Derecho de enroque incoherente.');
  }
  if(fields[3]!=='-') {
    const ep=fields[3]; const white=chess.turn()==='w';
    if(!(white?/^[a-h]6$/:/^[a-h]3$/).test(ep) || chess.get(ep) ||
      chess.get(ep[0]+(white?'5':'4'))?.type!=='p' ||
      chess.get(ep[0]+(white?'5':'4'))?.color!==(white?'b':'w') ||
      chess.get(ep[0]+(white?'7':'2')) || +fields[4]!==0) throw Error('Captura al paso incoherente.');
  }
  return chess.fen();
}
export function pgnHeader(pgn, name) {
  return (pgn.match(new RegExp('^\\[' + name + '\\s+"((?:\\\\.|[^"\\\\])*)"\\s*\\]', 'm'))?.[1] || '')
    .replace(/\\(["\\])/g, '$1').trim();
}

export function importText(text) {
  if(typeof text!=='string' || text.length>2000000) throw Error('Archivo demasiado grande (máximo 2 MB).');
  const doc=newDocument(), chess=new Chess();
  if(text.trim().split(/\s+/).length===6 && /^[prnbqkPRNBQK1-8/]+\s[wb]\s/.test(text.trim())) {
    doc.initialFen=validateEngineFen(text.trim()); doc.title='Posición importada'; return doc;
  }
  if((text.match(/^\[Event\s/gm)||[]).length>1) throw Error('Esta primera versión carga una partida PGN cada vez.');
  chess.loadPgn(text);
  const headers=chess.getHeaders();
  doc.initialFen=headers.FEN || DEFAULT_FEN;
  doc.moves=chess.history(); doc.cursor=doc.moves.length;doc.sourcePgn=text;
  doc.title=headers.White && headers.Black?`${headers.White} — ${headers.Black}`:'Partida importada';
  return validateDocument(doc);
}
export function exportPgn(doc) {
  const chess=positionAt(doc,doc.moves.length);
  if(doc.sourcePgn){const original=new Chess();original.loadPgn(doc.sourcePgn);if(JSON.stringify(original.history())===JSON.stringify(doc.moves))return doc.sourcePgn;}
  chess.setHeader('Event',doc.title); chess.setHeader('White','Blancas');chess.setHeader('Black','Negras');
  return chess.pgn({maxWidth:80});
}
export function parseBackup(text) {
  if(text.length>20000000) throw Error('Copia demasiado grande (máximo 20 MB).');
  const b=JSON.parse(text);
  if(b.application!=='piolin_chess' || b.schema!==1 || !Array.isArray(b.games) || b.games.length>2000) throw Error('Copia no compatible.');
  const ids=new Set();
  const games=b.games.map(g=>{
    const d=validateDocument(g);
    if(d.id==='draft' || ids.has(d.id)) throw Error('Identificadores duplicados en la copia.');
    ids.add(d.id); return d;
  });
  const studies = (Array.isArray(b.studies) ? b.studies : []).map(study => {
    if (!['profile','rival'].includes(study?.role) || typeof study.player !== 'string' ||
        typeof study.name !== 'string' || !Array.isArray(study.records) ||
        study.records.some(record => !Array.isArray(record.findings) ||
          !Array.isArray(record.game?.colors) || !record.game.colors.every(color => ['w','b'].includes(color)))) {
      throw Error('La copia contiene un estudio no compatible.');
    }
    return { ...study, id: typeof study.id === 'string' && /^study:[a-f0-9-]{36}$/.test(study.id) ? study.id : 'study:' + crypto.randomUUID(), records:
      study.records.map(record => ({ ...record, game: { ...record.game, doc: validateDocument(record.game.doc) } })) };
  });
  return {games,studies,draft:b.draft?{...validateDocument(b.draft),id:'draft'}:newDocument()};
}
export function legalDests(chess) {
  const dests=new Map();
  for(const m of chess.moves({verbose:true})) {
    if(!dests.has(m.from)) dests.set(m.from,[]);
    if(!dests.get(m.from).includes(m.to)) dests.get(m.from).push(m.to);
  }
  return dests;
}
export function pvToSan(fen,moves) {
  const game=new Chess(fen),out=[];
  for(const m of moves.slice(0,12)) {
    try {
      const before=game.turn(), n=game.moveNumber();
      const played=game.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});
      out.push(`${before==='w'?n+'.':out.length===0?n+'…':''}${played.san}`);
    } catch {break;}
  }
  return out.join(' ');
}
