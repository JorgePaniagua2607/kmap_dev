import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { resetDb } from '../lib/db.js';
import { ask, info, ok } from '../alerts.js';
import RobotMascot from './RobotMascot.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const reset = async () => {
    if (
      await ask(
        'Restablecer datos demo',
        'Se borrarán los cambios y se volverá a los datos iniciales de BIT ACADEMY.',
        'Restablecer'
      )
    ) {
      resetDb();
      logout();
      ok('Datos restablecidos');
    }
  };

  const isItemActive = (to) => {
    if (to === '/perfil') return pathname === '/perfil';
    if (to.includes('?vista=')) {
      const v = to.split('?vista=')[1];
      return pathname === '/' && search === `?vista=${v}`;
    }
    if (to === '/') {
      if (user.role === 'estudiante') {
        return (pathname === '/' && !search) || pathname.startsWith('/materia');
      }
      return pathname === '/' || pathname.startsWith('/materia');
    }
    return pathname === to;
  };

  const openToolModal = (title, msg) => {
    setMobileOpen(false);
    info(title, `<p class="text-sm text-cyan-100 leading-relaxed">${msg}</p>`);
  };

  return (
    <div className="dashboard-layout">
      {/* Barra móvil para pantallas pequeñas */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 px-4 flex items-center justify-between bg-[#030d1e]/95 border-b border-[#00d2ff]/25 backdrop-blur-md z-50">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="btn-ghost w-10 h-10 p-0 grid place-items-center text-lg font-black"
          aria-label="Menú"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
        <img
          src="/assets/images/logo.svg"
          alt="BIT ACADEMY"
          className="h-9 w-auto cursor-pointer"
          onClick={() => nav('/')}
        />
        <div
          className="user-avatar-wrap !w-9 !h-9"
          onClick={() => nav('/perfil')}
          title="Ir a Mi Perfil"
        >
          <img src="/assets/images/avatar.svg" alt={user.name} />
        </div>
      </div>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-40"
        />
      )}

      {/* ====================================================================
          1. SIDEBAR (BIT ACADEMY Aesthetic from univalle_bot)
         ==================================================================== */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Logo */}
        <div
          className="sidebar-logo"
          onClick={() => {
            setMobileOpen(false);
            nav('/');
          }}
        >
          <img src="/assets/images/logo.svg" alt="BIT ACADEMY Logo" />
        </div>

        {user.role === 'estudiante' && (
          <>
            {/* Section: MENÚ PRINCIPAL */}
            <div className="nav-section">
              <div className="section-label">Menú Principal</div>
              <ul className="nav-list">
                <li className={`nav-item ${isItemActive('/') ? 'active' : ''}`}>
                  <NavLink to="/" onClick={() => setMobileOpen(false)} className="nav-link">
                    <span className="nav-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                      </svg>
                    </span>
                    <span className="nav-text">Journey</span>
                    <span className="chevron">❯</span>
                  </NavLink>
                </li>
                <li className={`nav-item ${isItemActive('/?vista=progreso') ? 'active' : ''}`}>
                  <NavLink
                    to="/?vista=progreso"
                    onClick={() => setMobileOpen(false)}
                    className="nav-link"
                  >
                    <span className="nav-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5z" />
                      </svg>
                    </span>
                    <span className="nav-text">Practice</span>
                  </NavLink>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() =>
                      openToolModal(
                        'Projects · BIT ACADEMY',
                        'Explora proyectos integradores basados en tus grafos de conocimiento.'
                      )
                    }
                    className="nav-link"
                  >
                    <span className="nav-icon icon-projects">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                      </svg>
                    </span>
                    <span className="nav-text">Projects</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() =>
                      openToolModal(
                        'Library · Recursos Académicos',
                        'Accede a todos los apuntes PDF, guías prácticas y enlaces de investigación de tus asignaturas.'
                      )
                    }
                    className="nav-link"
                  >
                    <span className="nav-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                      </svg>
                    </span>
                    <span className="nav-text">Library</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Section: MIS CURSOS */}
            <div className="nav-section">
              <div className="section-label">Mis Cursos</div>
              <ul className="nav-list">
                <li className={`nav-item ${isItemActive('/?vista=materias') ? 'active' : ''}`}>
                  <NavLink
                    to="/?vista=materias"
                    onClick={() => setMobileOpen(false)}
                    className="nav-link"
                  >
                    <span className="nav-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                    </span>
                    <span className="nav-text">Mis Cursos Hub</span>
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Section: HERRAMIENTAS */}
            <div className="nav-section">
              <div className="section-label">Herramientas</div>
              <ul className="nav-list">
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() =>
                      openToolModal(
                        'Zanark Club',
                        'Club de excelencia académica y retos semanales de programación y ciencias.'
                      )
                    }
                    className="nav-link"
                  >
                    <span className="nav-icon icon-gold">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                      </svg>
                    </span>
                    <span className="nav-text">Zanark Club</span>
                  </button>
                </li>
                <li className={`nav-item ${isItemActive('/?vista=progreso') ? 'active' : ''}`}>
                  <NavLink
                    to="/?vista=progreso"
                    onClick={() => setMobileOpen(false)}
                    className="nav-link"
                  >
                    <span className="nav-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="12" width="4" height="9" rx="1" fill="#ffbe0b" />
                        <rect x="10" y="7" width="4" height="14" rx="1" fill="#00d2ff" />
                        <rect x="17" y="3" width="4" height="18" rx="1" fill="#ff3366" />
                      </svg>
                    </span>
                    <span className="nav-text">Missions</span>
                  </NavLink>
                </li>
                <li className={`nav-item ${isItemActive('/?vista=rank') ? 'active' : ''}`}>
                  <NavLink
                    to="/?vista=rank"
                    onClick={() => setMobileOpen(false)}
                    className="nav-link"
                  >
                    <span className="nav-icon icon-gold">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </span>
                    <span className="nav-text">Leaderboard</span>
                  </NavLink>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      nav('/?vista=materias');
                    }}
                    className="nav-link"
                  >
                    <span className="nav-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <span className="nav-text">Search</span>
                  </button>
                </li>
                <li className={`nav-item ${isItemActive('/perfil') ? 'active' : ''}`}>
                  <NavLink
                    to="/perfil"
                    onClick={() => setMobileOpen(false)}
                    className="nav-link"
                  >
                    <span className="nav-icon icon-purple">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                      </svg>
                    </span>
                    <span className="nav-text">Profile</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </>
        )}

        {user.role === 'docente' && (
          <div className="nav-section">
            <div className="section-label">Gestión Docente</div>
            <ul className="nav-list">
              <li className={`nav-item ${isItemActive('/') ? 'active' : ''}`}>
                <NavLink to="/" onClick={() => setMobileOpen(false)} className="nav-link">
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  </span>
                  <span className="nav-text">Mis Materias</span>
                  <span className="chevron">❯</span>
                </NavLink>
              </li>
              <li className={`nav-item ${isItemActive('/perfil') ? 'active' : ''}`}>
                <NavLink to="/perfil" onClick={() => setMobileOpen(false)} className="nav-link">
                  <span className="nav-icon icon-purple">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                  </span>
                  <span className="nav-text">Mi Perfil</span>
                </NavLink>
              </li>
            </ul>
          </div>
        )}

        {user.role === 'admin' && (
          <div className="nav-section">
            <div className="section-label">Administración</div>
            <ul className="nav-list">
              <li className={`nav-item ${isItemActive('/') ? 'active' : ''}`}>
                <NavLink to="/" onClick={() => setMobileOpen(false)} className="nav-link">
                  <span className="nav-icon icon-gold">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </span>
                  <span className="nav-text">Panel Admin</span>
                  <span className="chevron">❯</span>
                </NavLink>
              </li>
              <li className={`nav-item ${isItemActive('/perfil') ? 'active' : ''}`}>
                <NavLink to="/perfil" onClick={() => setMobileOpen(false)} className="nav-link">
                  <span className="nav-icon icon-purple">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                  </span>
                  <span className="nav-text">Mi Perfil</span>
                </NavLink>
              </li>
            </ul>
          </div>
        )}

        {/* Acciones de sesión */}
        <div className="nav-section border-t border-[#00d2ff]/15 pt-3 mt-1">
          <ul className="nav-list">
            <li className="nav-item">
              <button type="button" onClick={reset} className="nav-link text-xs">
                <span className="nav-icon">♻️</span>
                <span className="nav-text">Restablecer demo</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                onClick={logout}
                className="nav-link text-rose-300 hover:!text-white hover:!bg-rose-500/20"
              >
                <span className="nav-icon !text-rose-400">🚪</span>
                <span className="nav-text">Cerrar Sesión</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Bottom Slogan & Glowing Wave Graphic */}
        <div className="sidebar-footer">
          <svg className="sidebar-wave" viewBox="0 0 250 80" fill="none">
            <path
              d="M -10 60 Q 60 10, 140 45 T 260 20"
              stroke="rgba(0, 210, 255, 0.5)"
              strokeWidth="2.5"
              fill="none"
              filter="drop-shadow(0 0 6px #00d2ff)"
            />
            <path
              d="M -10 75 Q 80 35, 170 65 T 260 40"
              stroke="rgba(0, 140, 255, 0.3)"
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
          <div className="slogan-text">
            Aprende · Explora · Conquista <span className="slogan-arrow">❯❯</span>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          2. MAIN DASHBOARD CONTENT AREA
         ==================================================================== */}
      <main className="main-wrapper mt-14 md:mt-0">
        <Outlet />
      </main>

      {/* ====================================================================
          3. BOT MASCOTA 2D INTERACTIVO (de univalle_bot)
         ==================================================================== */}
      <RobotMascot />
    </div>
  );
}
