import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { fail, info } from '../alerts.js';
import { Tabs } from '../components/ui.jsx';
import RobotMascot from '../components/RobotMascot.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [role, setRole] = useState('estudiante');
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({
    ident: '',
    password: '',
    name: '',
    sis: '',
    email: '',
    confirm: '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const reg = role === 'estudiante' && mode === 'register';

  const submit = (e) => {
    e.preventDefault();
    try {
      const u = reg ? register(f) : login(role, f.ident, f.password);
      if (u.mustChange)
        info(
          'Contraseña por defecto',
          'Tu contraseña inicial es tu carnet. Cámbiala desde <b>Mi Perfil</b>.'
        );
    } catch (err) {
      fail(err.message);
    }
  };

  const quickLogin = (r, ident, pass) => {
    setRole(r);
    setMode('login');
    setF((prev) => ({ ...prev, ident, password: pass }));
    try {
      login(r, ident, pass);
    } catch (err) {
      fail(err.message);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 relative z-10">
      <motion.form
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={submit}
        className="card-glow w-full max-w-md flex flex-col gap-4 p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <img
            src="/assets/images/logo.svg"
            alt="BIT ACADEMY Logo"
            className="h-12 w-auto drop-shadow-[0_0_12px_rgba(0,210,255,0.45)]"
          />
          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-[#00f2fe]">
            KMAP
          </span>
        </div>

        <p className="text-[#8ca5c9] text-sm">
          Explora tu grafo de conocimiento, realiza quizzes adaptativos y descubre tu ruta de
          aprendizaje con nuestro bot tutor ✨
        </p>

        <Tabs
          tabs={[
            ['estudiante', '🎓 Estudiante'],
            ['docente', '👨‍🏫 Docente'],
            ['admin', '🛠️ Admin'],
          ]}
          value={role}
          onChange={(r) => {
            setRole(r);
            setMode('login');
          }}
        />

        {reg && (
          <>
            <input
              className="input"
              placeholder="Nombre completo"
              value={f.name}
              onChange={set('name')}
              required
            />
            <input
              className="input"
              placeholder="Código SIS (ej. 202012345)"
              inputMode="numeric"
              value={f.sis}
              onChange={set('sis')}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Correo institucional (@est.umss.edu)"
              value={f.email}
              onChange={set('email')}
              required
            />
          </>
        )}

        {!reg && (
          <input
            className="input"
            placeholder={
              role === 'estudiante'
                ? 'Código SIS o correo (ej. 202012345)'
                : role === 'docente'
                ? 'Usuario, correo o carnet (ej. Prof. Rivera o docente@demo.com)'
                : 'Usuario admin (ej. admin)'
            }
            value={f.ident}
            onChange={set('ident')}
            required
          />
        )}

        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={f.password}
          onChange={set('password')}
          required
        />

        {reg && (
          <input
            className="input"
            type="password"
            placeholder="Repite la contraseña"
            value={f.confirm}
            onChange={set('confirm')}
            required
          />
        )}

        <button type="submit" className="btn w-full mt-1">
          {reg ? 'Crear cuenta ❯' : 'Iniciar sesión ❯'}
        </button>

        {role === 'estudiante' && (
          <button
            type="button"
            className="text-sm text-[#00d2ff] hover:underline"
            onClick={() => setMode(reg ? 'login' : 'register')}
          >
            {reg ? 'Ya tengo cuenta · Iniciar sesión' : 'Registrarme como nuevo estudiante'}
          </button>
        )}

        <div className="border-t border-[#00d2ff]/20 pt-3 mt-1">
          <div className="text-xs text-[#8ca5c9] mb-2 font-semibold">
            Acceso rápido cuentas Demo (1 clic):
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('estudiante', '202012345', '123456')}
              className="btn-ghost text-xs py-2 flex flex-col items-center gap-0.5"
            >
              <span className="text-[#00f2fe] font-bold">Estudiante</span>
              <span className="text-[11px] text-[#8ca5c9]">202012345</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('docente', 'Prof. Rivera', '1234567')}
              className="btn-ghost text-xs py-2 flex flex-col items-center gap-0.5"
            >
              <span className="text-[#00f2fe] font-bold">Docente</span>
              <span className="text-[11px] text-[#8ca5c9]">Prof. Rivera</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin', 'admin', 'admin123')}
              className="btn-ghost text-xs py-2 flex flex-col items-center gap-0.5"
            >
              <span className="text-[#00f2fe] font-bold">Admin</span>
              <span className="text-[11px] text-[#8ca5c9]">admin</span>
            </button>
          </div>
        </div>
      </motion.form>

      <RobotMascot />
    </div>
  );
}
