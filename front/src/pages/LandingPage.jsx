import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// Vive mientras la pestaña esté abierta: al terminar NO vuelve a escribir (solo con F5)
let typingFinished = false;
const FULL_TEXT = 'EVALÚA EL APRENDIZAJE.';
const ERROR_AT = 15;      // posición de la "D" de APRENDIZAJE
const ERROR_CHAR = 'S';

const ROBOT_MSGS = ['¡Hola! Soy BITSIBOOT.', '¿Listo para aprender?', 'Detecto un vacío en Álgebra...', '¡Vamos a estudiar juntos!', 'Tu ruta óptima está lista.'];
const TOPICS = ['Álgebra', 'Física', 'Cálculo', 'Química', 'Programación', 'Estadística', 'Biología', 'Geometría', 'Lógica', 'Inglés'];

// Datos con fuente verificable (no son resultados propios de BIT ACADEMY)
const EVIDENCE = [
  { big: '+1σ', label: 'Aprendizaje por dominio', text: 'Estudiantes que dominaban cada tema antes de avanzar superaron al 84% de un aula tradicional.', src: 'Bloom, 1984 · Educational Researcher' },
  { big: '61%', vs: '40%', label: 'Recuerdo a una semana', text: 'Practicar recuperando lo aprendido superó a releer el mismo texto una y otra vez.', src: 'Roediger & Karpicke, 2006 · Psychological Science' },
  { big: '0.37', label: 'Desviaciones estándar', text: 'Efecto promedio de la tutoría personalizada en estudios aleatorizados: unos 14 puntos percentiles.', src: 'Nickow, Oreopoulos & Quan, 2020' },
];

const SLIDES = [
  { icon: '🎯', title: 'Diagnóstico', text: 'Un test corto adaptativo mide qué dominas y qué no, tema por tema.' },
  { icon: '🕸️', title: 'Mapa de conocimiento', text: 'Cada tema se conecta con sus prerrequisitos. El grafo muestra el nodo raíz de tu dificultad.' },
  { icon: '🧭', title: 'Ruta personalizada', text: 'Estudias solo lo que falta, en el orden correcto, sin repetir lo que ya sabes.' },
  { icon: '🧠', title: 'Retención con práctica', text: 'Preguntas espaciadas y feedback inmediato para que lo aprendido dure.' },
];

const FEATURES = [
  { icon: '🕸️', title: 'Grafos de Conocimiento', text: 'Visualiza tu materia como un mapa y detecta qué prerrequisitos reforzar.' },
  { icon: '⚡', title: 'Evaluaciones Inteligentes', text: 'La dificultad se ajusta mientras respondes, con feedback instantáneo sobre tus errores.' },
  { icon: '🤖', title: 'BITSIBOOT IA (Gemini)', text: 'Un tutor 24/7 que guía con preguntas socráticas para que razones, no solo memorices.' },
  { icon: '🔥', title: 'Panel del Docente', text: 'Mapas de calor para ver qué nodo exacto está frenando a tu clase.' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  /* ---------- Typewriter ---------- */
  const [typed, setTyped] = useState(typingFinished ? FULL_TEXT : '');
  const [showError, setShowError] = useState(false);
  const [isTypingDone, setIsTypingDone] = useState(typingFinished);

  useEffect(() => {
    if (typingFinished) return;
    let cancelled = false, timer;
    const wait = (ms) => new Promise((res) => { timer = setTimeout(res, ms); });
    setTyped(''); setShowError(false);
    (async () => {
      await wait(900); // deja entrar el resto del hero primero
      for (let i = 1; i <= FULL_TEXT.length; i++) {
        if (i - 1 === ERROR_AT) {
          await wait(250); if (cancelled) return;
          setShowError(true);
          await wait(750); if (cancelled) return;
          setShowError(false);
          await wait(250); if (cancelled) return;
        }
        setTyped(FULL_TEXT.slice(0, i));
        await wait(75); if (cancelled) return;
      }
      typingFinished = true;
      setIsTypingDone(true);
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  /* ---------- Mensajes del robot ---------- */
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % ROBOT_MSGS.length), 4000);
    return () => clearInterval(t);
  }, []);

  /* ---------- Slider "Cómo funciona" ---------- */
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearTimeout(t);
  }, [slide, paused]);

  /* ---------- Aparición al hacer scroll ---------- */
  useEffect(() => {
    const els = rootRef.current.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ---------- Luz que sigue al mouse en las tarjetas ---------- */
  const onCardMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div className="landing-container" ref={rootRef}>
      <div className="bg-grid" />
      <div className="bg-watermark">BIT</div>
      <div className="bg-orb orb-cyan" /><div className="bg-orb orb-purple" /><div className="bg-orb orb-blue" />

      {/* NAVBAR */}
      <nav className="landing-navbar">
        <div className="landing-logo" onClick={() => navigate('/')}>
          <div className="logo-robot">
            <svg viewBox="0 0 100 100" fill="none">
              <rect x="20" y="30" width="60" height="50" rx="20" fill="url(#gradLogo)" />
              <path d="M35 55 Q40 45 45 55" stroke="#030d1e" strokeWidth="4" strokeLinecap="round" />
              <path d="M55 55 Q60 45 65 55" stroke="#030d1e" strokeWidth="4" strokeLinecap="round" />
              <defs><linearGradient id="gradLogo" x1="20" y1="30" x2="80" y2="80"><stop stopColor="#00f2fe" /><stop offset="1" stopColor="#9d50ff" /></linearGradient></defs>
            </svg>
          </div>
          <span className="logo-text">BIT <span className="text-gradient">ACADEMY</span></span>
        </div>
        <div className="landing-nav-buttons">
          <button className="btn-nav-login" onClick={() => navigate('/login')}>Iniciar Sesión</button>
          <button className="btn-nav-register" onClick={() => navigate('/login')}>Registrarse</button>
        </div>
      </nav>

      {/* HERO */}
      <header className="landing-hero">
        <div className="hero-symbols" aria-hidden="true">
          {[['10%', '4%', '∑'], ['62%', '2%', '√x'], ['14%', '46%', 'π'], ['80%', '42%', '∫'], ['8%', '90%', '{ }'], ['72%', '92%', '01'], ['40%', '50%', 'Δ']].map(([t, l, s], i) => (
            <span key={i} style={{ top: t, left: l, animationDelay: `${-i * 2}s` }}>{s}</span>
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-badge enter" style={{ '--d': '0s' }}><span className="pulse-dot" />Nueva era del aprendizaje adaptativo</div>

          <h1 className="hero-title">
            <span className="title-solid enter" style={{ '--d': '0.15s' }}>NO ESTUDIES MÁS HORAS.</span>
            <span className="hero-typewriter-container enter" style={{ '--d': '0.3s' }}>
              <span className="tw-ghost" aria-hidden="true">{FULL_TEXT}</span>
              <span className="tw-live" aria-label={FULL_TEXT}>
                <span className="tw-text">{typed}</span>
                {showError && <span className="tw-error">{ERROR_CHAR}</span>}
                {!isTypingDone && <span className="typewriter-cursor">|</span>}
              </span>
            </span>
          </h1>

          <p className="hero-subtitle enter" style={{ '--d': '0.45s' }}>
            BIT ACADEMY mapea tus conocimientos como un grafo: encuentra el tema base que te falta,
            te propone la ruta más corta para reforzarlo y te ayuda a retener lo aprendido con práctica e IA.
          </p>

          <div className="hero-cta enter" style={{ '--d': '0.6s' }}>
            <button className="btn-primary" onClick={() => navigate('/login')}>Empieza gratis ahora</button>
            <button className="btn-secondary" onClick={() => document.getElementById('como-funciona').scrollIntoView({ behavior: 'smooth' })}>Ver cómo funciona</button>
          </div>

          <div className="hero-stats enter" style={{ '--d': '0.75s' }}>
            {EVIDENCE.map((e, i) => (
              <div className="stat-item" key={i}>
                <div className={`stat-value text-gradient-${i + 1}`}>{e.big}</div>
                <div className="stat-label">{e.label}</div>
              </div>
            ))}
          </div>
          <p className="stat-footnote enter" style={{ '--d': '0.85s' }}>
            Cifras de investigación sobre dominio, práctica de recuperación y tutoría (ver fuentes más abajo). No son resultados propios de la plataforma.
          </p>
        </div>

        <div className="hero-robot-container enter-robot">
          <div className="robot-rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="robot-speech-bubble" key={msgIdx}>{ROBOT_MSGS[msgIdx]}</div>
          <div className="robot-3d">
            <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="150" cy="275" rx="80" ry="15" fill="rgba(0,0,0,0.8)" />
              <rect x="145" y="35" width="10" height="15" fill="#305070" />
              <circle cx="150" cy="25" r="12" fill="#00f2fe" className="antenna-light" />
              <rect x="65" y="100" width="15" height="45" rx="7" fill="#1e3a5f" stroke="#00f2fe" strokeWidth="2" />
              <rect x="220" y="100" width="15" height="45" rx="7" fill="#1e3a5f" stroke="#00f2fe" strokeWidth="2" />
              <rect x="75" y="50" width="150" height="110" rx="35" fill="#152b47" stroke="#2a5580" strokeWidth="4" />
              <rect x="90" y="65" width="120" height="80" rx="25" fill="#030d1e" stroke="#0f2b4c" strokeWidth="2" />
              <g className="robot-eyes">
                <path d="M115 105 Q125 95 135 105" stroke="#00f2fe" strokeWidth="7" strokeLinecap="round" fill="none" className="eye" />
                <path d="M165 105 Q175 95 185 105" stroke="#00f2fe" strokeWidth="7" strokeLinecap="round" fill="none" className="eye" />
              </g>
              <rect x="100" y="170" width="100" height="80" rx="25" fill="#152b47" stroke="#2a5580" strokeWidth="4" />
              <rect x="130" y="185" width="40" height="10" rx="5" fill="#00f2fe" opacity="0.8" className="chest-led" />
              <rect x="70" y="180" width="20" height="55" rx="10" fill="#1e3a5f" />
              <circle cx="80" cy="240" r="12" fill="#152b47" stroke="#2a5580" strokeWidth="3" />
              <g className="robot-arm-pointing">
                <rect x="210" y="170" width="20" height="55" rx="10" fill="#1e3a5f" transform="rotate(-40 220 170)" />
                <circle cx="255" cy="140" r="12" fill="#152b47" stroke="#00f2fe" strokeWidth="3" />
                <rect x="260" y="135" width="18" height="10" rx="5" fill="#00f2fe" />
              </g>
              <rect x="110" y="250" width="30" height="15" rx="7" fill="#1e3a5f" />
              <rect x="160" y="250" width="30" height="15" rx="7" fill="#1e3a5f" />
            </svg>
          </div>
        </div>
      </header>

      {/* CINTA DE MATERIAS */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...TOPICS, ...TOPICS].map((t, i) => <span key={i}>{t}<b>✦</b></span>)}
        </div>
      </div>

      {/* PROBLEMA + GRAFO ANIMADO */}
      <section className="landing-value-prop">
        <div className="value-container">
          <div className="value-text reveal">
            <h2 className="section-title-gradient">EL PROBLEMA NO ERES TÚ. ES EL MÉTODO.</h2>
            <p>
              En una clase estándar todos avanzan al mismo ritmo, aunque les falte una base. Bloom lo estudió en 1984: quienes
              dominaban cada tema antes de pasar al siguiente rindieron mucho mejor. BIT ACADEMY usa <strong>grafos de conocimiento</strong> para
              encontrar el tema base de tu dificultad y reconstruir desde ahí.
            </p>
            <ul className="value-list">
              <li><span className="check-icon">✓</span> Detecta vacíos que ni sabías que tenías.</li>
              <li><span className="check-icon">✓</span> Rutas personalizadas, no un libro de texto genérico.</li>
              <li><span className="check-icon">✓</span> Ahorra tiempo enfocándote solo en lo que necesitas.</li>
            </ul>
          </div>
          <div className="value-visual reveal" style={{ '--d': '0.15s' }}>
            <div className="graph-demo">
              <svg viewBox="0 0 360 330" role="img" aria-label="Grafo con un vacío detectado y la ruta más corta para resolverlo">
                <defs>
                  <linearGradient id="gPath" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00f2fe" /><stop offset="1" stopColor="#9d50ff" /></linearGradient>
                </defs>
                <g className="g-edges" stroke="#1e3a5f" strokeWidth="2" fill="none">
                  <path d="M180 55 L85 135" /><path d="M180 55 L275 135" /><path d="M85 135 L85 235" /><path d="M275 135 L180 235" /><path d="M85 235 L180 290" /><path d="M180 235 L180 290" />
                </g>
                <path className="g-route" d="M180 55 L85 135 L85 235 L180 290" stroke="url(#gPath)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {[[180, 55, 'Base', 'ok'], [85, 135, 'Intermedio', 'ok'], [275, 135, 'Vacío', 'err'], [85, 235, 'Práctica', 'ok'], [180, 235, 'Aplicación', ''], [180, 290, 'Avanzado', 'goal']].map(([x, y, t, c]) => (
                  <g key={t} className={`g-node ${c}`} transform={`translate(${x} ${y})`}>
                    {c === 'err' && <circle r="30" className="g-pulse" />}
                    <circle r="22" />
                    <text y="40" textAnchor="middle">{t}</text>
                  </g>
                ))}
              </svg>
              <div className="graph-legend"><span className="lg-err" /> Vacío detectado <span className="lg-route" /> Ruta más corta</div>
            </div>
          </div>
        </div>
      </section>

      {/* SLIDER */}
      <section className="landing-how" id="como-funciona" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <h2 className="section-title-landing reveal">ASÍ FUNCIONA</h2>
        <p className="section-subtitle-landing reveal">Cuatro pasos, de “no sé qué me falta” a “lo domino”.</p>
        <div className="slider reveal">
          <div className="slider-viewport">
            <div className="slider-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {SLIDES.map((s, i) => (
                <article className={`slide ${i === slide ? 'active' : ''}`} key={i}>
                  <div className="slide-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <span className="slide-ghost" aria-hidden="true">{i + 1}</span>
                </article>
              ))}
            </div>
          </div>
          <div className="slider-controls">
            <button aria-label="Anterior" onClick={() => setSlide((slide - 1 + SLIDES.length) % SLIDES.length)}>‹</button>
            <div className="slider-dots">
              {SLIDES.map((s, i) => (
                <button key={i} className={i === slide ? 'on' : ''} aria-label={s.title} onClick={() => setSlide(i)}>
                  <span style={i === slide && !paused ? { animation: 'fill 5s linear forwards' } : i < slide ? { width: '100%' } : undefined} />
                </button>
              ))}
            </div>
            <button aria-label="Siguiente" onClick={() => setSlide((slide + 1) % SLIDES.length)}>›</button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-features">
        <h2 className="section-title-landing reveal">UN ARSENAL COMPLETO PARA TU ÉXITO</h2>
        <p className="section-subtitle-landing reveal">Herramientas para estudiantes que quieren resultados, no solo contenido.</p>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div className="feature-card reveal" key={f.title} style={{ '--d': `${i * 0.1}s` }} onMouseMove={onCardMove}>
              <div className="card-spot" />
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVIDENCIA (reemplaza testimonios inventados) */}
      <section className="landing-evidence">
        <h2 className="section-title-landing reveal">LO QUE DICE LA INVESTIGACIÓN</h2>
        <p className="section-subtitle-landing reveal">Los métodos en los que se inspira BIT ACADEMY, con su fuente.</p>
        <div className="evidence-grid">
          {EVIDENCE.map((e, i) => (
            <div className="evidence-card reveal" key={i} style={{ '--d': `${i * 0.12}s` }} onMouseMove={onCardMove}>
              <div className="card-spot" />
              <div className={`ev-big text-gradient-${i + 1}`}>{e.big}{e.vs && <small> vs {e.vs}</small>}</div>
              <h3>{e.label}</h3>
              <p>{e.text}</p>
              <cite>{e.src}</cite>
            </div>
          ))}
        </div>
        <p className="evidence-note reveal">
          Nota: Bloom (1984) reportó hasta 2σ combinando tutoría uno a uno y aprendizaje por dominio, pero ese resultado no se ha replicado
          con ese tamaño; los metaanálisis posteriores muestran efectos menores, aunque positivos.
        </p>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="cta-box reveal">
          <h2 className="section-title-gradient">TU TIEMPO ES VALIOSO. NO LO DESPERDICIES.</h2>
          <p>Empieza por un diagnóstico y descubre qué tema te está frenando.</p>
          <button className="btn-primary" onClick={() => navigate('/login')}>Crear mi cuenta gratis</button>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 BIT ACADEMY — Ingeniería del aprendizaje para mentes brillantes.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
