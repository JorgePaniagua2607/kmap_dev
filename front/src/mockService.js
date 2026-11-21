// Mock Service en memoria y LocalStorage para funcionamiento 100% en Frontend

const DB_KEY = 'kmap_standalone_db';

// Algoritmos de grafos
export function isDag(ids, pairs) {
  const indeg = Object.fromEntries(ids.map((i) => [i, 0]));
  const out = {};
  for (const [a, b] of pairs) {
    indeg[b] = (indeg[b] || 0) + 1;
    (out[a] ||= []).push(b);
  }
  const q = ids.filter((i) => (indeg[i] || 0) === 0);
  let seen = 0;
  while (q.length) {
    const n = q.shift();
    seen++;
    for (const m of out[n] || []) {
      indeg[m]--;
      if (indeg[m] === 0) q.push(m);
    }
  }
  return seen === ids.length;
}

export function shortestPath(next, from, to) {
  const prev = { [from]: null };
  const q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) break;
    for (const m of next[n] || []) {
      if (!(m in prev)) {
        prev[m] = n;
        q.push(m);
      }
    }
  }
  if (!(to in prev)) return [];
  const path = [];
  for (let c = to; c !== null; c = prev[c]) path.unshift(Number(c));
  return path;
}

export function adjacency(edges) {
  const prereqs = {};
  const next = {};
  for (const { source, target } of edges) {
    (prereqs[target] ||= []).push(source);
    (next[source] ||= []).push(target);
  }
  return { prereqs, next };
}

// Semilla inicial de datos
function getInitialData() {
  const subjects = [{ id: 1, name: 'Cálculo I', teacherId: 1 }];

  const topics = [
    { id: 1, key: 'ari', subjectId: 1, name: 'Aritmética', x: 90, y: 210 },
    { id: 2, key: 'alg', subjectId: 1, name: 'Álgebra', x: 250, y: 90 },
    { id: 3, key: 'tri', subjectId: 1, name: 'Trigonometría', x: 250, y: 330 },
    { id: 4, key: 'fac', subjectId: 1, name: 'Factorización', x: 420, y: 90 },
    { id: 5, key: 'fun', subjectId: 1, name: 'Funciones', x: 420, y: 250 },
    { id: 6, key: 'lim', subjectId: 1, name: 'Límites', x: 590, y: 170 },
    { id: 7, key: 'der', subjectId: 1, name: 'Derivadas', x: 760, y: 90 },
    { id: 8, key: 'int', subjectId: 1, name: 'Integrales', x: 760, y: 270 },
  ];

  const edges = [
    { source: 1, target: 2 }, // ari -> alg
    { source: 1, target: 3 }, // ari -> tri
    { source: 2, target: 4 }, // alg -> fac
    { source: 2, target: 5 }, // alg -> fun
    { source: 3, target: 5 }, // tri -> fun
    { source: 4, target: 6 }, // fac -> lim
    { source: 5, target: 6 }, // fun -> lim
    { source: 6, target: 7 }, // lim -> der
    { source: 6, target: 8 }, // lim -> int
  ];

  const rawQuestions = [
    ['ari', '12 + 8 ÷ 4 = ?', ['14', '5', '20', '10'], 1],
    ['ari', '3/4 + 1/2 = ?', ['5/4', '4/6', '3/8', '1'], 2],
    ['ari', '2³ · 2² = ?', ['2⁵', '2⁶', '4⁵', '2¹'], 3],
    ['alg', 'Resuelve 2x + 6 = 14', ['x = 4', 'x = 10', 'x = 3', 'x = 5'], 1],
    ['alg', 'Si 3(x − 2) = 2x + 1, entonces x = ?', ['7', '5', '−1', '3'], 2],
    ['alg', 'Sistema x + y = 5, x − y = 1: (x, y) = ?', ['(3, 2)', '(2, 3)', '(4, 1)', '(1, 4)'], 3],
    ['fac', 'Factoriza x² − 9', ['(x − 3)(x + 3)', '(x − 3)²', 'x(x − 9)', '(x + 9)(x − 1)'], 1],
    ['fac', 'Factoriza x² + 5x + 6', ['(x + 2)(x + 3)', '(x + 1)(x + 6)', '(x − 2)(x − 3)', '(x + 5)(x + 1)'], 2],
    ['fac', 'Factoriza 6x² + 7x − 3', ['(2x + 3)(3x − 1)', '(6x − 1)(x + 3)', '(2x − 3)(3x + 1)', '(3x + 3)(2x − 1)'], 3],
    ['fun', 'Si f(x) = 2x + 1, f(3) = ?', ['7', '6', '5', '9'], 1],
    ['fun', 'Dominio de f(x) = √(x − 4)', ['x ≥ 4', 'x ≤ 4', 'x > 0', 'Todos los reales'], 2],
    ['fun', 'f(x) = x², g(x) = x + 1. (f∘g)(2) = ?', ['9', '5', '6', '7'], 3],
    ['tri', 'sen(90°) = ?', ['1', '0', '−1', '1/2'], 1],
    ['tri', 'cos(60°) = ?', ['1/2', '√3/2', '1', '0'], 2],
    ['tri', 'tan x equivale a', ['sen x / cos x', 'cos x / sen x', '1 / sen x', 'sen x · cos x'], 3],
    ['lim', 'lím x→2 (x + 3) = ?', ['5', '2', '3', '∞'], 1],
    ['lim', 'lím x→3 (x² − 9)/(x − 3) = ?', ['6', '0', '3', 'No existe'], 2],
    ['lim', 'lím x→0 sen(x)/x = ?', ['1', '0', '∞', '−1'], 3],
    ['der', 'd/dx x³ = ?', ['3x²', 'x²', '3x', 'x⁴/4'], 1],
    ['der', 'd/dx sen x = ?', ['cos x', '−cos x', '−sen x', 'tan x'], 2],
    ['der', 'd/dx (x·eˣ) = ?', ['eˣ(x + 1)', 'x·eˣ⁻¹', 'eˣ', 'x·eˣ'], 3],
    ['int', '∫ 2x dx = ?', ['x² + C', '2x² + C', 'x + C', '2 + C'], 1],
    ['int', '∫ cos x dx = ?', ['sen x + C', '−sen x + C', 'cos x + C', 'tan x + C'], 2],
    ['int', '∫₀¹ 3x² dx = ?', ['1', '3', '0', '1/3'], 3],
  ];

  const questions = rawQuestions.map(([k, text, opts, difficulty], idx) => {
    const topic = topics.find((t) => t.key === k);
    return {
      id: idx + 1,
      topicId: topic ? topic.id : 1,
      text,
      options: opts,
      correctIdx: 0,
      difficulty,
    };
  });

  const users = [
    { id: 1, name: 'Prof. Rivera', email: 'docente@demo.com', password: '123456', role: 'docente' },
    { id: 2, name: 'Ale Estudiante', email: 'estudiante@demo.com', password: '123456', role: 'estudiante' },
  ];

  // Dominio inicial para el estudiante demo (id: 2)
  const mastery = [
    { userId: 2, topicId: 1, score: 90 },
    { userId: 2, topicId: 2, score: 75 },
    { userId: 2, topicId: 3, score: 80 },
    { userId: 2, topicId: 4, score: 35 },
    { userId: 2, topicId: 5, score: 45 },
    { userId: 2, topicId: 6, score: 30 },
    { userId: 2, topicId: 7, score: 20 },
    { userId: 2, topicId: 8, score: 15 },
  ];

  // Simulación de otros estudiantes para el heatmap docente
  const simulatedRoots = [
    { id: 4, count: 7 }, // Factorización
    { id: 5, count: 4 }, // Funciones
    { id: 3, count: 2 }, // Trigonometría
  ];

  const simulatedTopicStats = [
    { id: 1, avg: 90, failing: 0, n: 12 },
    { id: 2, avg: 72, failing: 2, n: 12 },
    { id: 3, avg: 80, failing: 1, n: 12 },
    { id: 4, avg: 38, failing: 8, n: 12 },
    { id: 5, avg: 48, failing: 6, n: 12 },
    { id: 6, avg: 34, failing: 9, n: 12 },
    { id: 7, avg: 22, failing: 11, n: 12 },
    { id: 8, avg: 16, failing: 12, n: 12 },
  ];

  const diagnoses = [
    {
      userId: 2,
      subjectId: 1,
      targetTopicId: 6,
      rootTopicId: 4,
      path: [4, 6],
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    subjects,
    topics,
    edges,
    questions,
    users,
    mastery,
    diagnoses,
    simulatedRoots,
    simulatedTopicStats,
  };
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const data = getInitialData();
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const data = getInitialData();
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    return data;
  }
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

// Sesiones de quiz activas en memoria
const quizSessions = new Map();

export const mockBackend = {
  // Autenticación
  login({ email, password }) {
    const db = loadDB();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== password) {
      throw new Error('Correo o contraseña incorrectos');
    }
    const token = 'mock_jwt_' + btoa(JSON.stringify({ id: user.id, email: user.email }));
    return { token, user: { id: user.id, name: user.name, role: user.role } };
  },

  register({ name, email, password }) {
    if (!name || !email || !password || password.length < 6) {
      throw new Error('Completa los datos (contraseña de 6 caracteres como mínimo)');
    }
    const db = loadDB();
    if (db.users.some((u) => u.email === email)) {
      throw new Error('Ese correo ya está registrado');
    }
    const newUser = { id: Date.now(), name, email, password, role: 'estudiante' };
    db.users.push(newUser);
    saveDB(db);
    const token = 'mock_jwt_' + btoa(JSON.stringify({ id: newUser.id, email: newUser.email }));
    return { token, user: { id: newUser.id, name: newUser.name, role: newUser.role } };
  },

  // Materias
  getSubjects() {
    const db = loadDB();
    return db.subjects.map(({ id, name }) => ({ id, name }));
  },

  createSubject({ name }, user) {
    if (!name?.trim()) throw new Error('Nombre de materia requerido');
    const db = loadDB();
    const newSubject = { id: Date.now(), name: name.trim(), teacherId: user?.id || 1 };
    db.subjects.push(newSubject);
    saveDB(db);
    return newSubject;
  },

  // Grafo de la materia
  getGraph(subjectId, currentUser) {
    const db = loadDB();
    const sid = Number(subjectId);
    const topics = db.topics.filter((t) => t.subjectId === sid);
    const topicIds = new Set(topics.map((t) => t.id));
    const edges = db.edges.filter((e) => topicIds.has(e.source) && topicIds.has(e.target));

    const masteryMap = {};
    if (currentUser?.role === 'estudiante') {
      db.mastery
        .filter((m) => m.userId === currentUser.id)
        .forEach((m) => {
          masteryMap[m.topicId] = m.score;
        });
    }

    return {
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        x: t.x,
        y: t.y,
        mastery: masteryMap[t.id] ?? null,
      })),
      edges,
    };
  },

  saveGraph(subjectId, { nodes, edges }) {
    const db = loadDB();
    const sid = Number(subjectId);
    const ids = nodes.map((n) => Number(n.id));
    const pairs = edges.map((e) => [Number(e.source), Number(e.target)]);

    if (!isDag(ids, pairs)) {
      throw new Error('El grafo contiene ciclos (no es un DAG válido)');
    }

    // Mapear nodos nuevos (ej: new-123456 -> id numérico)
    const idMap = new Map();
    let maxId = db.topics.reduce((max, t) => Math.max(max, t.id), 0);

    const updatedTopics = nodes.map((n) => {
      let realId = Number(n.id);
      if (isNaN(realId) || String(n.id).startsWith('new-')) {
        maxId++;
        realId = maxId;
        idMap.set(String(n.id), realId);
      } else {
        idMap.set(String(n.id), realId);
      }
      return {
        id: realId,
        subjectId: sid,
        name: n.name,
        x: Math.round(n.x),
        y: Math.round(n.y),
      };
    });

    const updatedEdges = edges.map((e) => ({
      source: idMap.get(String(e.source)) || Number(e.source),
      target: idMap.get(String(e.target)) || Number(e.target),
    }));

    // Reemplazar temas y aristas de esta materia
    db.topics = db.topics.filter((t) => t.subjectId !== sid).concat(updatedTopics);
    const currentTopicIds = new Set(updatedTopics.map((t) => t.id));
    db.edges = db.edges
      .filter((e) => !currentTopicIds.has(e.source) && !currentTopicIds.has(e.target))
      .concat(updatedEdges);

    saveDB(db);
    return { ok: true };
  },

  // Diagnóstico
  getDiagnosis(subjectId, currentUser) {
    const db = loadDB();
    const sid = Number(subjectId);
    const userId = currentUser?.id || 2;
    const list = db.diagnoses.filter((d) => d.userId === userId && d.subjectId === sid);
    return list.length ? list[list.length - 1] : null;
  },

  // Mapa de calor docente
  getHeatmap(subjectId) {
    const db = loadDB();
    const sid = Number(subjectId);
    const topics = db.topics.filter((t) => t.subjectId === sid);
    const topicIds = new Set(topics.map((t) => t.id));
    const edges = db.edges.filter((e) => topicIds.has(e.source) && topicIds.has(e.target));

    const statsMap = Object.fromEntries(
      (db.simulatedTopicStats || []).map((s) => [s.id, s])
    );

    const topicsWithStats = topics.map((t) => {
      const s = statsMap[t.id] || { avg: 50, failing: 2, n: 12 };
      return {
        id: t.id,
        name: t.name,
        x: t.x,
        y: t.y,
        avg: s.avg,
        failing: s.failing,
        n: s.n,
      };
    });

    return {
      topics: topicsWithStats,
      roots: db.simulatedRoots || [],
      edges,
    };
  },

  // Preguntas por tema
  getQuestions(topicId) {
    const db = loadDB();
    const tid = Number(topicId);
    return db.questions.filter((q) => q.topicId === tid);
  },

  createQuestion(topicId, { text, options, correctIdx, difficulty }) {
    if (!text?.trim() || !Array.isArray(options) || options.some((o) => !o?.trim())) {
      throw new Error('Completa el enunciado y todas las opciones');
    }
    const db = loadDB();
    const maxId = db.questions.reduce((max, q) => Math.max(max, q.id), 0);
    const newQ = {
      id: maxId + 1,
      topicId: Number(topicId),
      text: text.trim(),
      options: options.map((o) => o.trim()),
      correctIdx: Number(correctIdx) || 0,
      difficulty: Number(difficulty) || 2,
    };
    db.questions.push(newQ);
    saveDB(db);
    return newQ;
  },

  deleteQuestion(questionId) {
    const db = loadDB();
    const qid = Number(questionId);
    db.questions = db.questions.filter((q) => q.id !== qid);
    saveDB(db);
    return { ok: true };
  },

  // Quiz Adaptativo
  startQuiz({ subjectId, targetTopicId }) {
    const db = loadDB();
    const sid = Number(subjectId);
    const target = Number(targetTopicId);

    const topics = db.topics.filter((t) => t.subjectId === sid);
    const edges = db.edges;
    const { prereqs, next } = adjacency(edges);

    const questionsByTopic = {};
    for (const q of db.questions) {
      (questionsByTopic[q.topicId] ||= []).push(q);
    }

    const sessionId = 'quiz_' + Date.now();
    const state = {
      subjectId: sid,
      target,
      queue: [target],
      current: null,
      cur: null,
      results: {},
      order: [],
      finished: false,
      prereqs,
      next,
      questionsByTopic,
      topicsMap: Object.fromEntries(topics.map((t) => [t.id, t])),
    };

    const firstQuestion = this._nextQuizQuestion(state);
    if (!firstQuestion) throw new Error('No hay preguntas disponibles para evaluar');

    quizSessions.set(sessionId, state);
    return { sessionId, question: firstQuestion };
  },

  _nextQuizQuestion(state) {
    for (;;) {
      if (state.current === null) {
        if (!state.queue.length) {
          state.finished = true;
          return null;
        }
        state.current = state.queue.shift();
        state.cur = { n: 0, ok: 0, diff: 2, used: [] };
      }
      const list = state.questionsByTopic[state.current] || [];
      const left = list.filter((q) => !state.cur.used.includes(q.id));
      if (left.length) {
        left.sort((a, b) => Math.abs(a.difficulty - state.cur.diff) - Math.abs(b.difficulty - state.cur.diff));
        const q = left[0];
        state.cur.used.push(q.id);
        const topic = state.topicsMap[state.current] || { id: state.current, name: 'Tema' };
        return {
          id: q.id,
          text: q.text,
          options: q.options,
          topic: { id: topic.id, name: topic.name },
        };
      }
      // Sin preguntas restantes para este tema, cerrar tema
      const { n, ok } = state.cur;
      const score = n ? Math.round((ok / n) * 100) : null;
      const passed = score === null || score >= 50;
      state.results[state.current] = { score, passed };
      state.order.push(state.current);
      if (!passed) {
        for (const p of state.prereqs[state.current] || []) {
          if (!(p in state.results) && !state.queue.includes(p)) state.queue.push(p);
        }
      }
      state.current = null;
      state.cur = null;
    }
  },

  answerQuiz(sessionId, { questionId, optionIdx }, currentUser) {
    const state = quizSessions.get(sessionId);
    if (!state) throw new Error('Sesión de quiz no encontrada o expirada');

    const db = loadDB();
    const originalQ = db.questions.find((q) => q.id === Number(questionId));
    const correct = originalQ ? originalQ.correctIdx === Number(optionIdx) : false;

    // Actualizar cur
    const c = state.cur;
    c.n++;
    if (correct) c.ok++;
    c.diff = Math.min(3, Math.max(1, c.diff + (correct ? 1 : -1)));

    const decided = c.n >= 3 || (c.n === 2 && c.ok !== 1);
    if (decided) {
      const score = Math.round((c.ok / c.n) * 100);
      const passed = score >= 50;
      state.results[state.current] = { score, passed };
      state.order.push(state.current);
      if (!passed) {
        for (const p of state.prereqs[state.current] || []) {
          if (!(p in state.results) && !state.queue.includes(p)) state.queue.push(p);
        }
      }
      state.current = null;
      state.cur = null;
    }

    const nextQ = this._nextQuizQuestion(state);
    if (state.finished || !nextQ) {
      // Finalizar diagnóstico
      const failed = state.order.filter((t) => !state.results[t].passed);
      const roots = failed.filter((t) =>
        (state.prereqs[t] || []).every((p) => state.results[p]?.passed)
      );
      const rootTopicId = roots.length ? roots[roots.length - 1] : null;
      const pathIds = rootTopicId !== null ? shortestPath(state.next, rootTopicId, state.target) : [];

      const evaluated = state.order.map((tid) => ({
        id: tid,
        name: state.topicsMap[tid]?.name || `Tema ${tid}`,
        score: state.results[tid]?.score ?? 50,
      }));

      const rootName = rootTopicId ? state.topicsMap[rootTopicId]?.name : null;
      const path = pathIds.map((tid) => ({
        id: tid,
        name: state.topicsMap[tid]?.name || `Tema ${tid}`,
      }));

      // Guardar nuevo diagnóstico y actualizar mastery en LocalStorage
      const userId = currentUser?.id || 2;
      for (const ev of evaluated) {
        const existing = db.mastery.find((m) => m.userId === userId && m.topicId === ev.id);
        if (existing) {
          existing.score = Math.round(existing.score * 0.4 + ev.score * 0.6);
        } else {
          db.mastery.push({ userId, topicId: ev.id, score: ev.score });
        }
      }

      db.diagnoses.push({
        userId,
        subjectId: state.subjectId,
        targetTopicId: state.target,
        rootTopicId,
        path: pathIds,
        createdAt: new Date().toISOString(),
      });
      saveDB(db);

      quizSessions.delete(sessionId);
      return {
        correct,
        finished: true,
        result: { rootName, path, evaluated },
      };
    }

    return {
      correct,
      finished: false,
      question: nextQ,
    };
  },
};
