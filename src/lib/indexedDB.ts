/**
 * Layer de Persistência Local Ultra-Rápida usando IndexedDB
 * Garante o carregamento instantâneo de dados pesados (Histórico de Revisões Espaçadas,
 * Sessões de Estudo, Estatísticas de Progresso, Tópicos e Disciplinas)
 * antes mesmo da conclusão do handshaking/sincronização com o Firestore.
 */

const DB_NAME = 'MedAcademicIDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'heavy_user_data';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

export async function initIDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não é suportado neste ambiente.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('[IndexedDB] Erro ao abrir banco local:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function getIDBData<T>(key: string): Promise<T | null> {
  try {
    const db = await initIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result !== undefined ? (req.result as T) : null);
      };

      req.onerror = () => {
        console.warn(`[IndexedDB] Falha ao ler chave "${key}":`, req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro na leitura da chave "${key}":`, err);
    return null;
  }
}

export async function setIDBData(key: string, value: any): Promise<void> {
  try {
    const db = await initIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn(`[IndexedDB] Falha ao salvar chave "${key}":`, req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao persistir chave "${key}":`, err);
  }
}

export async function removeIDBData(key: string): Promise<void> {
  try {
    const db = await initIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao deletar chave "${key}":`, err);
  }
}

export async function clearIDBForUser(userId: string): Promise<void> {
  if (!userId) return;
  const cleanId = userId.trim().toLowerCase();
  try {
    const db = await initIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openKeyCursor();

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          const keyStr = String(cursor.key);
          if (keyStr.includes(cleanId) || keyStr.includes('default')) {
            store.delete(cursor.key);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao purgar dados do usuário ${cleanId}:`, err);
  }
}
