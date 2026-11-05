// Proteções para o app nunca ficar com a tela escura/travada por causa do armazenamento do navegador.

const isQuotaError = (err: unknown) =>
  err instanceof DOMException &&
  (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);

/**
 * Se o armazenamento local (≈5 MB no iPhone) encher, a gravação falha em silêncio em vez de
 * derrubar o app. Os dados continuam no IndexedDB e na nuvem.
 */
export function installSafeLocalStorage() {
  try {
    const proto = Storage.prototype as Storage & { __medSafe?: boolean };
    if (proto.__medSafe) return;
    const original = proto.setItem;
    proto.setItem = function (key: string, value: string) {
      try {
        original.call(this, key, value);
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn(`[MedAcademic] Armazenamento local cheio ao salvar "${key}" (${value.length} caracteres).`);
          return;
        }
        throw err;
      }
    };
    proto.__medSafe = true;
  } catch {
    /* navegador sem localStorage */
  }
}

const isCustomPhoto = (v: unknown) => typeof v === 'string' && v.startsWith('data:');

/**
 * Reparo: remove fotos de perfil enviadas (data URLs) salvas localmente — só a foto,
 * nenhum outro dado é apagado. Usado pela tela de recuperação.
 */
export async function repairLocalPhotoData(): Promise<void> {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('medacademic')) continue;
      const raw = localStorage.getItem(key);
      if (!raw || !raw.includes('data:image')) continue;
      try {
        const parsed = JSON.parse(raw);
        const clean = (o: any) => {
          if (o && typeof o === 'object' && isCustomPhoto(o.avatarUrl)) o.avatarUrl = '';
          return o;
        };
        const next = Array.isArray(parsed) ? parsed.map(clean) : clean(parsed);
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* não é JSON */
      }
    }
  } catch {
    /* sem localStorage */
  }

  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.open('MedAcademicIDB_v1');
      req.onerror = () => resolve();
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('heavy_user_data')) {
          db.close();
          resolve();
          return;
        }
        const tx = db.transaction('heavy_user_data', 'readwrite');
        const store = tx.objectStore('heavy_user_data');
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          const val = cursor.value;
          if (String(cursor.key).startsWith('user_profile_') && val && isCustomPhoto(val.avatarUrl)) {
            cursor.update({ ...val, avatarUrl: '' });
          }
          cursor.continue();
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      };
    } catch {
      resolve();
    }
  });
}
