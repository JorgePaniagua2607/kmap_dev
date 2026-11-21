import Swal from 'sweetalert2';

// Todas las notificaciones y confirmaciones usan SweetAlert2 (nunca alert/confirm/prompt)
const base = { background: '#0a2a5e', color: '#eaf4ff', confirmButtonColor: '#0ea5e9', cancelButtonColor: '#334155' };

export const ok = (title, text) => Swal.fire({ ...base, icon: 'success', title, text, timer: 1600, showConfirmButton: false });
export const fail = (text) => Swal.fire({ ...base, icon: 'error', title: 'No se pudo completar', text });
export const info = (title, html) => Swal.fire({ ...base, icon: 'info', title, html });
export const ask = async (title, text, confirmButtonText = 'Sí') =>
  (await Swal.fire({ ...base, icon: 'question', title, text, showCancelButton: true, confirmButtonText, cancelButtonText: 'Cancelar' })).isConfirmed;
export const askText = async (title, value = '') => {
  const r = await Swal.fire({ ...base, title, input: 'text', inputValue: value, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', inputValidator: (v) => !v.trim() && 'Este campo es obligatorio' });
  return r.isConfirmed ? r.value.trim() : null;
};
export { Swal, base };
