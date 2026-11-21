import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const NAV = {
  estudiante: [['/', '🗺️', 'Mi mapa']],
  docente: [['/', '🔥', 'Mapa de calor'], ['/editor', '🕸️', 'Editor de grafo'], ['/preguntas', '❓', 'Banco de preguntas']],
};

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_1fr] gap-4 p-4">
      <aside className="card flex md:flex-col gap-2 md:sticky md:top-4 md:h-[calc(100vh-2rem)] mb-4 md:mb-0 overflow-x-auto">
        <div className="text-xl font-extrabold md:mb-4 whitespace-nowrap">🧠 Mapa<span className="text-cyan-300">Edu</span></div>
        {NAV[user.role].map(([to, ico, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `px-3 py-2 rounded-xl whitespace-nowrap ${isActive ? 'bg-gradient-to-r from-sky-500 to-cyan-300 text-[#042] font-bold' : 'hover:bg-cyan-400/10'}`}>
            {ico} {label}
          </NavLink>
        ))}
        <div className="md:mt-auto text-sm text-blue-200 whitespace-nowrap">
          <div className="mb-2">{user.name} · {user.role}</div>
          <button className="btn-ghost w-full" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}
