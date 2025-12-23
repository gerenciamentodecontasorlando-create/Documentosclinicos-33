/* BTX Docs Saúde — IndexedDB (offline memory) */
(() => {
  const DB_NAME = "btx_docs_saude_db";
  const DB_VER = 1;

  const STORES = {
    settings: "settings",
    patients: "patients",
    agenda: "agenda",
    notes: "notes" // prontuário (evolução)
  };

  function openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);

      req.onupgradeneeded = () => {
        const db = req.result;

        if(!db.objectStoreNames.contains(STORES.settings)){
          db.createObjectStore(STORES.settings, { keyPath: "key" });
        }
        if(!db.objectStoreNames.contains(STORES.patients)){
          const st = db.createObjectStore(STORES.patients, { keyPath: "id" });
          st.createIndex("by_name", "name", { unique:false });
          st.createIndex("by_phone", "phone", { unique:false });
        }
        if(!db.objectStoreNames.contains(STORES.agenda)){
          const st = db.createObjectStore(STORES.agenda, { keyPath: "id" });
          st.createIndex("by_date", "date", { unique:false });
          st.createIndex("by_patientId", "patientId", { unique:false });
        }
        if(!db.objectStoreNames.contains(STORES.notes)){
          const st = db.createObjectStore(STORES.notes, { keyPath: "id" });
          st.createIndex("by_patientId", "patientId", { unique:false });
          st.createIndex("by_date", "date", { unique:false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function tx(db, storeName, mode="readonly"){
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  async function getSetting(key){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, STORES.settings);
      const req = st.get(key);
      req.onsuccess = ()=> resolve(req.result?.value ?? null);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function setSetting(key, value){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, STORES.settings, "readwrite");
      const req = st.put({ key, value });
      req.onsuccess = ()=> resolve(true);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function delSetting(key){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, STORES.settings, "readwrite");
      const req = st.delete(key);
      req.onsuccess = ()=> resolve(true);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function put(storeName, obj){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, storeName, "readwrite");
      const req = st.put(obj);
      req.onsuccess = ()=> resolve(obj);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function get(storeName, id){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, storeName);
      const req = st.get(id);
      req.onsuccess = ()=> resolve(req.result ?? null);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function del(storeName, id){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, storeName, "readwrite");
      const req = st.delete(id);
      req.onsuccess = ()=> resolve(true);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function getAll(storeName){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, storeName);
      const req = st.getAll();
      req.onsuccess = ()=> resolve(req.result ?? []);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function getAllByIndex(storeName, indexName, value){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const st = tx(db, storeName);
      const idx = st.index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = ()=> resolve(req.result ?? []);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function clearAll(){
    const db = await openDB();
    const names = Object.values(STORES);
    for(const s of names){
      await new Promise((resolve,reject)=>{
        const st = tx(db, s, "readwrite");
        const req = st.clear();
        req.onsuccess = ()=> resolve(true);
        req.onerror = ()=> reject(req.error);
      });
    }
    return true;
  }

  async function exportAll(){
    const data = {};
    for(const [k,v] of Object.entries(STORES)){
      data[v] = await getAll(v);
    }
    // settings é {key,value} — mantém
    return {
      exportedAt: new Date().toISOString(),
      version: DB_VER,
      data
    };
  }

  async function importAll(payload){
    if(!payload?.data) throw new Error("Arquivo inválido");
    // limpa e reimporta
    await clearAll();
    for(const storeName of Object.values(STORES)){
      const arr = payload.data[storeName] || [];
      for(const item of arr){
        await put(storeName, item);
      }
    }
    return true;
  }

  window.BTXDB = {
    STORES,
    getSetting,
    setSetting,
    delSetting,
    put,
    get,
    del,
    getAll,
    getAllByIndex,
    clearAll,
    exportAll,
    importAll
  };
})();
