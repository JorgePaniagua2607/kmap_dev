import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useDb } from '../lib/db.js';
import { topicsOf } from '../lib/logic.js';
import { info } from '../alerts.js';
import UserMenu from './UserMenu.jsx';

export default function Page({ title, subtitle, crumb, backTo, icon, actions, children }) {
  const { user } = useAuth();
  const db = useDb();
  const nav = useNavigate();

  const showNotifs = () => {
    info(
      'Notificaciones (3)',
      '<div class="text-left text-sm space-y-2 text-cyan-100"><p>1. 🚀 <b>Nueva tarea en Programación:</b> Revisa el grafo de conocimiento.</p><p>2. ⭐ <b>Recompensa de XP desbloqueada:</b> Has subido tu progreso en BIT ACADEMY.</p><p>3. 🏆 <b>Calificación de Quiz publicada:</b> Revisa tu posición en la Clasificación.</p></div>'
    );
  };

  const handleQuickQuiz = () => {
    if (user?.role === 'estudiante') {
      const enrolled = db.enrollments.find((e) => e.userId === user.id);
      const sid = enrolled?.subjectId || db.subjects[0]?.id;
      const firstTopic = sid ? topicsOf(db, sid)[0] : null;
      if (sid && firstTopic) {
        nav(`/materia/${sid}/tema/${firstTopic.id}/quiz`);
        return;
      }
    }
    info(
      'Quiz Rápido · BIT ACADEMY',
      'Iniciando evaluación rápida de conocimientos adaptativos de BIT ACADEMY.'
    );
  };

  const handleViewCourses = () => {
    if (user?.role === 'estudiante') {
      nav('/?vista=materias');
    } else {
      nav('/');
    }
  };

  const crumbParts = crumb ? crumb.split(/›|❯/).map((c) => c.trim()) : ['Academia', 'Inicio'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col flex-1 w-full"
    >
      {/* Top Header Bar (BIT ACADEMY aesthetic from univalle_bot) */}
      <header className="top-header">
        {/* Left Breadcrumbs & Quick Actions Pill Card */}
        <div className="header-breadcrumbs-card">
          <div className="header-academy-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
            </svg>
          </div>
          <div className="header-title-box">
            <div className="breadcrumbs">
              {crumbParts.map((part, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5">
                  {idx > 0 && <span className="separator">❯</span>}
                  <span>{part}</span>
                </span>
              ))}
            </div>
            <h1 className="header-main-title">{title || 'BIT ACADEMY'}</h1>
          </div>
          <div className="header-actions">
            {actions}
            {user?.role === 'estudiante' && (
              <>
                <button className="btn-quiz" type="button" onClick={handleQuickQuiz}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Quiz</span>
                </button>
                <button className="btn-courses" type="button" onClick={handleViewCourses}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" />
                  </svg>
                  <span>Ver cursos</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right User & Utility Controls */}
        <div className="header-user-controls">
          <button
            className="control-btn notification-btn"
            title="Notificaciones"
            type="button"
            onClick={showNotifs}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <span className="badge-count">3</span>
          </button>

          <button
            className="control-btn"
            title="Tema Neón"
            type="button"
            onClick={() =>
              info(
                'Modo Cyber Neón Activo',
                'El tema oscuro neón de <b>BIT ACADEMY</b> está optimizado para visualización de grafos.'
              )
            }
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A9.03 9.03 0 0 1 12 21a9 9 0 0 1-9-9c0-4.63 3.5-8.44 6.37-6.49z" />
            </svg>
          </button>

          <button
            className="control-btn"
            title="Configuración de Perfil"
            type="button"
            onClick={() => nav('/perfil')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>

          <UserMenu />
        </div>
      </header>

      {/* Sub-header con botón Volver cuando estamos dentro de una materia/tema */}
      {backTo && (
        <div className="card-glow flex flex-wrap items-center justify-between gap-3.5 py-3.5 px-5 mb-5">
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={() => nav(backTo)}
              className="btn-pill px-4 py-1.5 text-xs sm:text-sm"
            >
              <span>←</span> Volver
            </button>
            {icon && (
              <div className="card-icon-badge !w-11 !h-11 !mb-0 !text-xl">{icon}</div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">{title}</h2>
              {subtitle && <p className="text-xs sm:text-sm text-[#8ca5c9]">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 flex-1">{children}</div>
    </motion.div>
  );
}
