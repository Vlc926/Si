// controlador/seguridad.js

// ---- Sesión local ----
export function getUsuarioActual() {
  try {
    const raw = localStorage.getItem('veterinaryUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error leyendo usuario de localStorage', e);
    return null;
  }
}

function normalizarRol(rol) {
  return (rol || '').toString().trim().toLowerCase();
}
function getRolUsuario(user) {
  return normalizarRol(user?.rolNombre || user?.rol);
}

// ---- Protección de páginas ----
export function requireLogin(rolesPermitidos = null) {
  const user = getUsuarioActual();

  if (!user) {
    window.location.href = 'login.html';
    return null;
  }

  const rolUser = getRolUsuario(user);
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const permitidos = rolesPermitidos.map(normalizarRol);
    if (!permitidos.includes(rolUser)) {
      alert('Acceso restringido.');
      window.location.href = 'login.html';
      return null;
    }
  }

  return user;
}

// ---- Helpers de rol ----
export function isAdmin(user) { return getRolUsuario(user) === 'administrador'; }
export function isVet(user)   { return getRolUsuario(user) === 'veterinario'; }
export function isRecep(user) { return getRolUsuario(user) === 'recepcionista'; }

// ---- Permisos ----
export function puedeVerCuentas(user)     { return isAdmin(user); }
export function puedeEditarCuentas(user)  { return isAdmin(user); }
export function puedeProgramarCitas(user) {
  const rol = getRolUsuario(user);
  return rol === 'administrador' || rol === 'recepcionista';
}
export function puedeVerMisCitas(user)    { return isVet(user); }

// ---- Logout ----
export function logout() {
  localStorage.removeItem('veterinaryUser');
  window.location.href = 'login.html';
}

// Botón logout (intenta signOut si existe Supabase global; limpia storage y redirige)
export function wireLogout(selector = '.btn-logout') {
  const el = document.querySelector(selector);
  if (!el) return;
  if (el.dataset.boundLogout === '1') return; // evita doble binding

  el.addEventListener('click', async () => {
    try {
      const sb = window.supabase;
      if (sb?.auth?.signOut) await sb.auth.signOut();
    } catch (_) {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  });

  el.dataset.boundLogout = '1';
}

// ---- UI por rol + badge ----
export function initRoleUI(userParam = null) {
  const user = userParam || getUsuarioActual();
  if (!user) return;

  const rolOriginal = user.rolNombre || user.rol || 'Sin rol';
  const rolLower    = getRolUsuario(user);
  const correo      = user.correo || user.email || user.user || '';

  // Badge: "ROL | CORREO"
  const indicator = document.querySelector('[data-user-indicator]');
  if (indicator) indicator.textContent = `${rolOriginal} | ${correo}`;

  // Mostrar/Ocultar por data-roles
  document.querySelectorAll('[data-roles]').forEach(link => {
    const rolesStr = link.getAttribute('data-roles') || '';
    const roles = rolesStr.split(',').map(normalizarRol).filter(Boolean);
    link.style.display = (roles.length && !roles.includes(rolLower)) ? 'none' : '';
  });

  // Ajuste dinámico de link Mascotas para veterinario
  const linkMascotas = document.querySelector('#linkMascotas');
  if (linkMascotas) {
    if (isVet(user)) {
      linkMascotas.href = 'mis_mascotas.html';
      linkMascotas.innerHTML = `
        <i class="fa-solid fa-dog"></i>
        <span class="nav-text">Mis mascotas</span>
      `;
    } else {
      linkMascotas.href = 'mascotas.html';
      linkMascotas.innerHTML = `
        <i class="fa-solid fa-dog"></i>
        <span class="nav-text">Mascotas</span>
      `;
    }
  }
}
