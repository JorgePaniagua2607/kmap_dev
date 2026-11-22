import { useSyncExternalStore } from 'react';

export const uid = () => Math.random().toString(36).slice(2, 9);
export const genCode = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

// Estado inicial vacío mientras se hidrata desde la base de datos oficial MySQL (/api/kmap/state)
const emptyState = () => ({
  users: [],
  subjects: [],
  topics: [],
  edges: [],
  questions: [],
  enrollments: [],
  attempts: [],
});

let state = emptyState();

const subs = new Set();
const emit = () => subs.forEach((f) => f());

// Limpiar cualquier base de datos temporal antigua de localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('kmap_db_v3');
  } catch {}
}

// Cargar estado real desde MySQL al iniciar la aplicación
export async function refreshFromBackend() {
  try {
    const r = await fetch('/api/kmap/state');
    if (r.ok) {
      const res = await r.json();
      if (res && res.state && Array.isArray(res.state.users)) {
        state = res.state;
        emit();
      }
    }
  } catch (err) {
    console.error('Error conectando con el backend:', err);
  }
}

if (typeof window !== 'undefined') {
  refreshFromBackend();
}

// Sincronizar cambios con MySQL y actualizar con los IDs oficiales de la BD
const syncToBackend = (data) => {
  fetch('/api/kmap/sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((res) => {
      if (res && res.state && Array.isArray(res.state.users)) {
        state = res.state;
        emit();
      }
    })
    .catch((err) => {
      console.error('Error sincronizando con MySQL:', err);
    });
};

export const getDb = () => state;

export function update(fn) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  emit();
  syncToBackend(next);
}

export function resetDb() {
  fetch('/api/kmap/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((res) => {
      if (res && res.state && Array.isArray(res.state.users)) {
        state = res.state;
        emit();
      }
    })
    .catch(() => {});
}

export const useDb = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state
  );
