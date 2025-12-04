// controlador/mis_citas.js
import { getSupabase } from './api.js';
import { requireLogin, initRoleUI } from './seguridad.js';


const usuario = requireLogin(['Veterinario']);
initRoleUI(usuario);
const sb = getSupabase();const $ = (s) => document.querySelector(s);

const tbody = $('#tablaMisCitas tbody');

function render(rows = []) {
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5">No tienes citas programadas.</td></tr>';
    return;
  }

  for (const c of rows) {
    const fecha = new Date(c.fecha);
    const diaSemana = fecha.toLocaleDateString('es-MX', { weekday: 'long' });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${diaSemana}</td>
      <td>${fecha.toLocaleString('es-MX')}</td>
      <td>${c.cliente?.nombre ?? ''}</td>
      <td>${c.mascota?.nombre ?? ''}</td>
      <td>${c.servicio?.nombre ?? ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function cargar() {
  const { data, error } = await sb
    .from('citas')
    .select(`
      id,
      fecha,
      cliente:clientes(nombre),
      mascota:mascotas(nombre),
      servicio:servicios(nombre)
    `)
    .eq('veterinario_id', usuario.id)   //solo las citas del veterinario logueado
    .order('fecha', { ascending: true });

  if (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="5">Error al cargar citas</td></tr>';
    return;
  }

  // Filtrar de lunes (1) a sábado (6)
  const filtradas = (data || []).filter(c => {
    const d = new Date(c.fecha).getDay(); // 0=Dom,1=Lun,...,6=Sab
    return d >= 1 && d <= 6;
  });

  render(filtradas);
}

document.addEventListener('DOMContentLoaded', cargar);
