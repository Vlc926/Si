// controlador/index.js
import { requireLogin, initRoleUI, wireLogout } from './seguridad.js';
import { getSupabase } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const usuario = requireLogin(['Administrador','Recepcionista','Veterinario']);
  if (!usuario) return;

  initRoleUI(usuario);
  wireLogout('.btn-logout');

  (async () => {
    const sb = await getSupabase();
    const listEl = document.getElementById('list');
    const form   = document.querySelector('form');

    if (!sb) {
      if (listEl) {
        listEl.innerHTML = '<p style="opacity:.8">Conecta Supabase para listar servicios.</p>';
      }
      return; // evita llamadas a BD sin cliente
    }

    async function loadList() {
      if (!listEl) return;
      const { data: rows, error } = await sb.from('servicios').select('*').order('id', { ascending: true });
      if (error) { listEl.innerHTML = `<p>Error: ${error.message}</p>`; return; }
      if (!rows?.length) { listEl.innerHTML = '<p>No hay servicios.</p>'; return; }

      let html = '<table><thead><tr>';
      Object.keys(rows[0]).forEach(k => (html += `<th>${k}</th>`));
      html += '<th>Acciones</th></tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr>';
        Object.values(r).forEach(v => (html += `<td>${v ?? ''}</td>`));
        html += `<td><button data-id="${r.id}" class="btn-del">Eliminar</button></td></tr>`;
      });
      html += '</tbody></table>';
      listEl.innerHTML = html;

      listEl.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          if (!confirm('¿Eliminar registro?')) return;
          const { error: delErr } = await sb.from('servicios').delete().eq('id', id);
          if (delErr) alert('Error: ' + delErr.message); else loadList();
        });
      });
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const { error } = await sb.from('servicios').insert([data]);
      if (error) return alert('Error al guardar: ' + error.message);
      alert('Servicio agregado correctamente.');
      form.reset();
      loadList();
    });

    loadList();
  })();
});
