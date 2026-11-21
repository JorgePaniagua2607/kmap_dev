import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fail } from '../alerts.js';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { login(await api(`/auth/${mode}`, { method: 'POST', body: f })); }
    catch (err) { fail(err.message); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <motion.form initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} className="card w-full max-w-sm flex flex-col gap-3">
        <div className="text-2xl font-extrabold">🧠 Mapa<span className="text-cyan-300">Edu</span></div>
        <p className="text-blue-200 text-sm">Descubre en qué tema se rompió tu aprendizaje.</p>
        {mode === 'register' && <input className="input" placeholder="Nombre" value={f.name} onChange={set('name')} />}
        <input className="input" type="email" placeholder="Correo" value={f.email} onChange={set('email')} />
        <input className="input" type="password" placeholder="Contraseña" value={f.password} onChange={set('password')} />
        <button className="btn" disabled={busy}>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
        <button type="button" className="text-sm text-cyan-300" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Crear una cuenta de estudiante' : 'Ya tengo cuenta'}
        </button>
        <p className="text-xs text-blue-300">Demo: estudiante@demo.com / docente@demo.com · 123456</p>
      </motion.form>
    </div>
  );
}
