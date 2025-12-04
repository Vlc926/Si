// controlador/login.js
import { getSupabase } from './api.js';

/* 1) Referencias del formulario (IDs alternos por compatibilidad) */
const form =
  document.querySelector('#frmLogin') ||
  document.querySelector('#loginForm');

const inpCorreo =
  document.querySelector('#correo') ||
  document.querySelector('#email');

const inpPass =
  document.querySelector('#contrasena') ||   // "contrasena"
  document.querySelector('#contraseña')  ||   // "contraseña"
  document.querySelector('#password');

const btnSubmit = form?.querySelector('button[type="submit"]');
if (!form || !inpCorreo || !inpPass) {
  console.error('login.js: No se encontraron los elementos del formulario de login.');
}

/* 2) Helpers UI */
function setSubmitting(isLoading) {
  if (!btnSubmit) return;
  btnSubmit.disabled = isLoading;
  btnSubmit.textContent = isLoading ? 'Ingresando...' : 'Iniciar sesión';
}

function saveLocalSession({ id = null, email, nombre = '', telefono = '', rolNombre = 'Sin rol', rolId = null }) {
  const usuarioSesion = {
    id,
    user: email,
    correo: email,
    nombre,
    telefono,
    rolId,
    rolNombre,
    rol: rolNombre
  };
  localStorage.setItem('veterinaryUser', JSON.stringify(usuarioSesion));
}

/* 3) Login contra tu esquema: usuarios + roles + cuenta("contraseña") */
async function loginWithSupabase(sb, email, password) {
  // IMPORTANTE: tu columna es literalmente "contraseña" (con ñ).
  // Acceso SIEMPRE con corchetes: obj['contraseña']
  const selectExpr = `
    id,
    nombre,
    correo,
    telefono,
    rol_id,
    rol:roles ( id, nombre ),
    cuenta:cuenta!cuenta_usuario_id_fkey("contraseña")
  `;

  const { data: usuario, error } = await sb
    .from('usuarios')
    .select(selectExpr)
    .eq('correo', email)        // usa ilike si quieres case-insensitive
    .maybeSingle();

  if (error) {
    return { ok: false, reason: 'Error consultando usuario: ' + error.message };
  }
  if (!usuario) {
    return { ok: false, reason: 'No se encontró un usuario con ese correo.' };
  }

  // Extraer contraseña real desde la relación "cuenta"
  let passReal = null;
  const cta = usuario.cuenta;
  if (Array.isArray(cta)) {
    passReal = cta[0]?.['contraseña'] ?? null;
  } else if (cta) {
    passReal = cta['contraseña'] ?? null;
  }
  if (!passReal) {
    return { ok: false, reason: 'Esta cuenta no tiene contraseña configurada.' };
  }

  // Comparación en texto plano (como está hoy)
  if (password !== passReal) {
    return { ok: false, reason: 'Contraseña incorrecta.' };
  }

  const rolNombre = (usuario.rol?.nombre || 'Sin rol').trim();

  return {
    ok: true,
    payload: {
      id:       usuario.id,
      email:    usuario.correo,
      nombre:   usuario.nombre,
      telefono: usuario.telefono,
      rolId:    usuario.rol_id,
      rolNombre
    }
  };
}

/* 4) Handler del formulario */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo = (inpCorreo?.value || '').trim();
  const pass   = inpPass?.value || '';

  if (!correo || !pass) {
    alert('Ingresa correo y contraseña.');
    return;
  }

  setSubmitting(true);
  try {
    // Obtén el cliente centralizado
    const sb = await getSupabase();
    if (!sb) {
      alert('Login: no hay configuración de Supabase (faltan SUPABASE_URL o SUPABASE_ANON_KEY).');
      return;
    }

    const result = await loginWithSupabase(sb, correo, pass);
    if (!result.ok) {
      alert(result.reason || 'No se pudo iniciar sesión.');
      return;
    }

    // Guardar sesión local (lo usa seguridad.js)
    saveLocalSession(result.payload);

    // Redirección por rol
    const rolLower = (result.payload.rolNombre || '').toLowerCase();
    if (rolLower === 'administrador') {
      window.location.href = 'index.html';
    } else if (rolLower === 'recepcionista') {
      window.location.href = 'recepcionpanel.html';
    } else if (rolLower === 'veterinario') {
      window.location.href = 'mis_citas.html';
    } else {
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error('Error inesperado en login:', err);
    alert('Ocurrió un error al iniciar sesión.');
  } finally {
    setSubmitting(false);
  }
});
