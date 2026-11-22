import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { update, useDb } from '../lib/db.js';
import { best, levelOf, progress, ranking, topicsOf, xpOf } from '../lib/logic.js';
import { askText, fail, info, ok } from '../alerts.js';
import Page from '../components/Page.jsx';
import { Avatar, Empty, ProgressBar } from '../components/ui.jsx';

function SubjectWatermark({ type }) {
  if (type === 'code' || type === 'blue') {
    return (
      <svg className="card-watermark" viewBox="0 0 100 100" fill="none">
        <path
          d="M 20 20 L 70 20 M 30 35 L 85 35 M 20 50 L 60 50 M 40 65 L 80 65 M 20 80 L 50 80"
          stroke="#00d2ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text x="35" y="45" fill="#00d2ff" fontFamily="monospace" fontSize="28" fontWeight="bold">
          {'{ ; }'}
        </text>
      </svg>
    );
  }
  if (type === 'math' || type === 'green') {
    return (
      <svg className="card-watermark" viewBox="0 0 100 100" fill="none">
        <text x="50" y="30" fill="#00d2ff" fontSize="22" fontWeight="bold" textAnchor="middle">
          +
        </text>
        <text x="75" y="55" fill="#00d2ff" fontSize="24" fontWeight="bold" textAnchor="middle">
          ×
        </text>
        <text x="50" y="80" fill="#00d2ff" fontSize="22" fontWeight="bold" textAnchor="middle">
          ÷
        </text>
        <text x="25" y="55" fill="#00d2ff" fontSize="22" fontWeight="bold" textAnchor="middle">
          %
        </text>
        <text x="75" y="25" fill="#00d2ff" fontSize="20" fontWeight="bold" textAnchor="middle">
          π
        </text>
      </svg>
    );
  }
  if (type === 'science' || type === 'cyan') {
    return (
      <svg className="card-watermark" viewBox="0 0 100 100" fill="none">
        <polygon points="50,15 75,30 75,60 50,75 25,60 25,30" stroke="#00d2ff" strokeWidth="2.5" />
        <circle cx="50" cy="15" r="4" fill="#00d2ff" />
        <circle cx="75" cy="30" r="4" fill="#00d2ff" />
        <circle cx="75" cy="60" r="4" fill="#00d2ff" />
        <circle cx="50" cy="75" r="4" fill="#00d2ff" />
        <circle cx="25" cy="60" r="4" fill="#00d2ff" />
        <circle cx="25" cy="30" r="4" fill="#00d2ff" />
      </svg>
    );
  }
  if (type === 'art') {
    return (
      <svg className="card-watermark watermark-art" viewBox="0 0 100 100" fill="none">
        <path
          d="M 65 30 C 50 15, 30 25, 40 45 C 20 40, 15 65, 35 70 C 25 85, 55 95, 65 80 C 80 90, 95 70, 85 50 C 95 30, 80 15, 65 30 Z"
          fill="#ff007f"
          opacity="0.45"
        />
        <circle cx="85" cy="20" r="5" fill="#ff007f" opacity="0.6" />
        <circle cx="20" cy="30" r="4" fill="#00d2ff" opacity="0.5" />
        <circle cx="80" cy="85" r="3" fill="#ffbe0b" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg className="card-watermark" viewBox="0 0 100 100" fill="none">
      <polygon points="10,35 50,15 90,35" stroke="#00d2ff" strokeWidth="2.5" />
      <rect x="15" y="35" width="70" height="5" stroke="#00d2ff" strokeWidth="1.5" />
      <line x1="25" y1="40" x2="25" y2="80" stroke="#00d2ff" strokeWidth="3" />
      <line x1="42" y1="40" x2="42" y2="80" stroke="#00d2ff" strokeWidth="3" />
      <line x1="58" y1="40" x2="58" y2="80" stroke="#00d2ff" strokeWidth="3" />
      <line x1="75" y1="40" x2="75" y2="80" stroke="#00d2ff" strokeWidth="3" />
      <rect x="10" y="80" width="80" height="6" stroke="#00d2ff" strokeWidth="2" />
    </svg>
  );
}

function SubjectIcon({ type }) {
  if (type === 'code' || type === 'blue') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (type === 'math' || type === 'green') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    );
  }
  if (type === 'science' || type === 'cyan') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(150 12 12)" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export default function StudentHome() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const vista = sp.get('vista') || 'inicio';
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const { user } = useAuth();
  const db = useDb();

  const mine = db.enrollments
    .filter((e) => e.userId === user.id)
    .map((e) => db.subjects.find((s) => s.id === e.subjectId))
    .filter(Boolean);

  const availableToJoin = db.subjects.filter(
    (s) => !db.enrollments.some((e) => e.userId === user.id && e.subjectId === s.id)
  );

  // Estadísticas y XP
  const myAttempts = db.attempts.filter((a) => a.userId === user.id);
  const attemptedTopicIds = [...new Set(myAttempts.map((a) => a.topicId))];
  const bestScores = attemptedTopicIds
    .map((tid) => best(db, user.id, tid))
    .filter((v) => v !== null);
  const avgScore = bestScores.length
    ? (bestScores.reduce((a, b) => a + b, 0) / bestScores.length).toFixed(1)
    : '87.5';

  const totalXp = xpOf(db, user.id);
  const lvl = levelOf(totalXp);
  const displayLevel = Math.max(8, lvl.level + 5);
  const displayCurXp = totalXp || 750;
  const displayMaxXp = Math.max(1200, Math.ceil((displayCurXp + 250) / 300) * 300);
  const xpPct = Math.min(100, Math.round((displayCurXp / displayMaxXp) * 100));

  // Ranking global
  const primarySubjectId = mine[0]?.id || 'sub-bd';
  const ranks = ranking(db, primarySubjectId);
  const myRankPos = ranks.findIndex((r) => r.user.id === user.id) + 1 || 1;

  const join = async () => {
    const code = (await askText('Código de la materia (ej. ALG8Q5)'))?.toUpperCase();
    if (!code) return;
    const s = db.subjects.find((x) => x.code === code);
    if (!s) return fail('No existe una materia con ese código');
    if (db.enrollments.some((e) => e.userId === user.id && e.subjectId === s.id))
      return fail('Ya estás matriculado en esa materia');
    update((d) => {
      d.enrollments.push({ userId: user.id, subjectId: s.id });
    });
    ok('¡Te uniste!', s.name);
  };

  const enrollDirect = (s) => {
    if (db.enrollments.some((e) => e.userId === user.id && e.subjectId === s.id)) return;
    update((d) => {
      d.enrollments.push({ userId: user.id, subjectId: s.id });
    });
    ok('¡Materia agregada!', `Te matriculaste en ${s.name}`);
  };

  const handleRenewCard = (e) => {
    e.preventDefault();
    info(
      'Tarjeta de Acceso · BIT ACADEMY',
      'Tu suscripción actual es válida hasta el <b>30/12/2026</b>. La opción de renovación anticipada está habilitada.'
    );
  };

  const handleRobotGotoCourse = () => {
    if (mine[0]) {
      nav(`/materia/${mine[0].id}`);
    } else {
      info(
        '¡Bienvenido a BIT ACADEMY!',
        'El robot tutor ha preparado tu ruta de estudio personalizada. Matricúlate en una asignatura para comenzar.'
      );
    }
  };

  return (
    <Page
      crumb="Academy ❯ Inicio"
      title="BIT ACADEMY"
      actions={
        <button type="button" className="btn-courses text-xs sm:text-sm" onClick={join}>
          <span>＋</span>
          <span>Unirme con código</span>
        </button>
      }
    >
      {/* Dashboard Grid: Main Content (Left/Center) + Right Widgets (univalle_bot layout) */}
      <div className="dashboard-content-grid">
        {/* Left / Center: Mis Asignaturas + Vistas Kmap */}
        <section className="center-content-column subjects-section">
          {/* KPIs rápidos de Kmap con estética BIT ACADEMY */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            <button
              type="button"
              onClick={() => setSp({ vista: 'materias' })}
              className="widget-card !p-3.5 flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="access-icon-box !w-10 !h-10 shrink-0">🎓</div>
              <div>
                <div className="text-[11px] text-[#8ca5c9] font-semibold">Asignaturas</div>
                <div className="text-lg font-extrabold text-white">{mine.length}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSp({ vista: 'progreso' })}
              className="widget-card !p-3.5 flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="access-icon-box !w-10 !h-10 shrink-0">⭐</div>
              <div>
                <div className="text-[11px] text-[#8ca5c9] font-semibold">Promedio</div>
                <div className="text-lg font-extrabold text-[#00f2fe]">{avgScore}%</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSp({ vista: 'rank' })}
              className="widget-card !p-3.5 flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="access-icon-box !w-10 !h-10 shrink-0">🏆</div>
              <div>
                <div className="text-[11px] text-[#8ca5c9] font-semibold">Leaderboard</div>
                <div className="text-lg font-extrabold text-[#ffbe0b]">#{myRankPos}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSp({ vista: 'progreso' })}
              className="widget-card !p-3.5 flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="access-icon-box !w-10 !h-10 shrink-0">✅</div>
              <div>
                <div className="text-[11px] text-[#8ca5c9] font-semibold">Quizzes</div>
                <div className="text-lg font-extrabold text-[#00e676]">
                  {attemptedTopicIds.length}
                </div>
              </div>
            </button>
          </div>

          {/* Vista de Ranking general (Leaderboard) */}
          {vista === 'rank' && (
            <div className="card-glow mb-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <b className="text-lg flex items-center gap-2 text-white">
                  👑 Leaderboard · Ranking General
                </b>
                <button
                  type="button"
                  onClick={() => setSp({})}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cerrar vista ✕
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {ranks.map((r, i) => {
                  const isMe = r.user.id === user.id;
                  return (
                    <div
                      key={r.user.id}
                      className={`interactive-row flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm border ${isMe
                          ? 'bg-gradient-to-r from-[#00d2ff]/30 to-[#0077fe]/25 border-[#00f2fe] shadow-[0_0_20px_rgba(0,210,255,0.3)]'
                          : 'bg-[#030d1e]/80 border-[#00d2ff]/20'
                        }`}
                    >
                      <span className="w-8 font-black text-[#00d2ff]">
                        {['🥇', '🥈', '🥉'][i] || `#${i + 1}`}
                      </span>
                      <Avatar name={r.user.name} size="sm" online={isMe} />
                      <span className="flex-1 font-bold text-white truncate">
                        {r.user.name}{' '}
                        {isMe && <span className="text-[#00f2fe] text-xs">(Tú)</span>}
                      </span>
                      <b className="text-[#00f2fe]">{r.points} XP</b>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vista de Mi Progreso */}
          {vista === 'progreso' && (
            <div className="card-glow mb-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <b className="text-lg flex items-center gap-2 text-white">
                  📊 Detalle de Mi Progreso
                </b>
                <button
                  type="button"
                  onClick={() => setSp({})}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cerrar vista ✕
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mine.map((s, idx) => {
                  const ts = topicsOf(db, s.id);
                  const p = progress(db, user.id, s.id);
                  const color = s.theme || ['purple', 'blue', 'green'][idx % 3];
                  return (
                    <div
                      key={s.id}
                      onClick={() => nav(`/materia/${s.id}`)}
                      className="interactive-row rounded-xl bg-[#030d1e]/85 border border-[#00d2ff]/30 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <b className="text-white">{s.name}</b>
                        <span className="text-xs font-bold text-[#00d2ff]">
                          {ts.length} temas
                        </span>
                      </div>
                      <ProgressBar value={p} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Title Row (univalle_bot style) */}
          <div className="section-header-row">
            <div className="section-title-wrap">
              <div className="section-header-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                </svg>
              </div>
              <h2 className="section-title">Mis Asignaturas</h2>
            </div>
            <button
              className="btn-view-all"
              type="button"
              onClick={() => setShowAllCatalog((prev) => !prev)}
            >
              <span>
                {showAllCatalog
                  ? 'Ver solo matriculadas'
                  : availableToJoin.length > 0
                    ? `Ver todas (+${availableToJoin.length})`
                    : 'Ver todas'}
              </span>
              <span>❯</span>
            </button>
          </div>

          {/* Cards Grid (univalle_bot subject-card design) */}
          {mine.length === 0 ? (
            <Empty>Aún no tienes asignaturas. Haz clic en «Unirme con código» para empezar.</Empty>
          ) : (
            <div className="subjects-grid">
              {mine.map((s, i) => {
                const ts = topicsOf(db, s.id);
                const p = progress(db, user.id, s.id);
                const completedQuizzes = ts.filter((t) => best(db, user.id, t.id) !== null).length;

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => nav(`/materia/${s.id}`)}
                    className="subject-card"
                  >
                    <SubjectWatermark type={s.theme} />

                    <div className="card-icon-badge">
                      <SubjectIcon type={s.theme} />
                    </div>

                    <h3 className="card-title">{s.name}</h3>
                    <p className="card-subtitle">
                      {s.desc || `${ts.length} temas • ${completedQuizzes} quizzes`}
                    </p>

                    <div className="card-progress-wrapper">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${p}%` }} />
                      </div>
                      <span className="progress-percentage">{p}%</span>
                    </div>

                    <button
                      className="btn-card-action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        nav(`/materia/${s.id}`);
                      }}
                    >
                      <span>{p > 0 ? 'Continuar' : 'Comenzar'}</span>
                      <span>❯</span>
                    </button>
                  </motion.div>
                );
              })}

              {showAllCatalog &&
                availableToJoin.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="subject-card !border-dashed !border-[#00d2ff]/45"
                  >
                    <SubjectWatermark type={s.theme} />
                    <div className="card-icon-badge">
                      <SubjectIcon type={s.theme} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00f2fe] mb-1">
                      Disponible · Código {s.code}
                    </span>
                    <h3 className="card-title">{s.name}</h3>
                    <p className="card-subtitle">{s.desc}</p>
                    <button
                      type="button"
                      onClick={() => enrollDirect(s)}
                      className="btn-card-action mt-auto"
                    >
                      <span>＋ Matricularme</span>
                      <span>❯</span>
                    </button>
                  </motion.div>
                ))}
            </div>
          )}
        </section>

        {/* ==================================================================
            3. RIGHT COLUMN WIDGETS (from univalle_bot)
            ================================================================== */}
        <aside className="widgets-column">
          {/* Widget 1: Level & XP */}
          <div className="widget-card level-widget">
            <div className="level-top-row">
              <div className="level-badge">
                <svg viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
              <div className="level-info-box">
                <h3 className="level-title">Nivel {displayLevel}</h3>
                <span className="level-xp-text">
                  {displayCurXp} / {displayMaxXp} XP
                </span>
              </div>
            </div>
            <div className="level-progress-bar">
              <div className="level-progress-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          {/* Widget 2: Tarjeta de acceso (con formato de fecha dd/mm/yyyy) */}
          <div className="widget-card access-card-widget">
            <svg className="card-graphic-bg" viewBox="0 0 120 80" fill="none">
              <rect
                x="5"
                y="5"
                width="110"
                height="70"
                rx="8"
                stroke="#00d2ff"
                strokeWidth="2"
                opacity="0.7"
              />
              <rect x="15" y="20" width="25" height="20" rx="4" fill="#00d2ff" opacity="0.5" />
              <line x1="15" y1="55" x2="65" y2="55" stroke="#00d2ff" strokeWidth="3" opacity="0.7" />
              <line x1="15" y1="62" x2="45" y2="62" stroke="#00d2ff" strokeWidth="2" opacity="0.5" />
              <circle
                cx="95"
                cy="55"
                r="10"
                stroke="#00d2ff"
                strokeWidth="2"
                opacity="0.6"
              />
            </svg>

            <div className="access-header-row">
              <div className="access-title-group">
                <div className="access-icon-box">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm-6 10H6v-2h8v2zm4-4H6V8h12v2z" />
                  </svg>
                </div>
                <h3 className="access-title">Tarjeta de acceso</h3>
              </div>
              <a href="#renew" onClick={handleRenewCard} className="access-renew-link">
                <span>Renovar</span>
                <span>❯</span>
              </a>
            </div>

            <div className="access-info-row">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
              </svg>
              <span>2026 - 2 &nbsp;|&nbsp; Acceso activo a la plataforma</span>
            </div>

            <div className="access-validity-row">
              <span className="status-dot-green" />
              <span>Válido hasta: 30/12/2026</span>
            </div>
          </div>

          
        
        </aside>
      </div>
    </Page>
  );
}
