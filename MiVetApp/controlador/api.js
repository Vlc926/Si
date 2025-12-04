// controlador/api.js
// Cliente centralizado y seguro

let _sb = null;        // memo
let _ready = null;     // promesa para evitar condiciones de carrera
const ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

function creds() {
  const url = (window.SUPABASE_URL || '').trim();
  const key = (window.SUPABASE_ANON_KEY || '').trim();
  return { ok: Boolean(url && key), url, key };
}

/** Devuelve el cliente o null (NO lanza). */
export async function getSupabase() {
  if (_sb) return _sb;
  if (_ready) return _ready;

  _ready = (async () => {
    const { ok, url, key } = creds();
    if (!ok) {
      console.warn('[Supabase] Faltan SUPABASE_URL o SUPABASE_ANON_KEY.');
      _sb = null;
      window.supabase = undefined;
      return null;
    }
    try {
      const { createClient } = await import(ESM);
      _sb = createClient(url, key, {
        auth: { persistSession: false },
        global: { headers: { 'x-application-name': 'veterinari-frontend' } },
      });
      window.supabase = _sb; // opcional: compat con código legado
      return _sb;
    } catch (e) {
      console.error('[Supabase] Error creando cliente:', e);
      _sb = null;
      window.supabase = undefined;
      return null;
    }
  })();

  return _ready;
}

/** Igual que getSupabase, pero lanza si no hay credenciales. */
export async function requireSupabase() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no configurado (faltan URL o KEY).');
  return sb;
}
