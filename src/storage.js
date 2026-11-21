// SPDX-License-Identifier: GPL-3.0-or-later
export class LocalStore {
  async open() {
    if(!globalThis.indexedDB) throw Error('Este navegador no permite el almacenamiento local necesario.');
    this.db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('piolin-chess',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('games',{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
      req.onblocked=()=>reject(Error('Cierra otras pestañas de piolin_chess para abrir los datos.'));
    });
    this.db.onversionchange=()=>this.db.close();
  }
  tx(mode,operation) {
    return new Promise((resolve,reject)=>{
      const tx=this.db.transaction('games',mode), store=tx.objectStore('games');
      let req;
      try {req=operation(store);} catch(e) {tx.abort();reject(e);return;}
      tx.oncomplete=()=>resolve(req?.result);
      tx.onerror=()=>reject(tx.error||Error('No se pudo guardar.'));
      tx.onabort=()=>reject(tx.error||Error('Guardado cancelado.'));
    });
  }
  get(id){return this.tx('readonly',s=>s.get(id));}
  all(){return this.tx('readonly',s=>s.getAll());}
  put(doc){return this.tx('readwrite',s=>s.put(structuredClone(doc)));}
  putMany(docs){
    return this.tx('readwrite',store=>{for(const doc of docs)store.put(doc);});
  }
  async importChapters(chapters) {
    let added = 0;
    await this.tx('readwrite', store => {
      for (const chapter of chapters) {
        const existing = store.get(chapter.id);
        existing.onsuccess = () => {
          if (!existing.result) {
            store.put(chapter);
            added++;
          }
        };
      }
    });
    return added;
  }
  updateStudy(id, changes) {
    return this.tx('readwrite', store => {
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result?.role) store.put({ ...request.result, ...changes });
      };
    });
  }
  saveStudy(study, gameKey) {
    return this.tx('readwrite', store => {
      const request = store.getAll();
      request.onsuccess = () => {
        const keys = new Set(request.result.filter(doc => doc.id !== 'draft' && !doc.role).map(gameKey));
        for (const { game } of study.records) {
          if (keys.has(game.key)) continue;
          keys.add(game.key);
          store.put({ ...game.doc, id: crypto.randomUUID() });
        }
        store.put(study);
      };
    });
  }
  remove(id){return this.tx('readwrite',s=>s.delete(id));}
  restore(backup){return this.tx('readwrite',s=>{
    s.clear();for(const game of backup.games)s.put(game);s.put(backup.draft);
    for(const study of backup.studies)s.put(study);
  });}
}
