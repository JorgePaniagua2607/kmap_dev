export const PASS = 51; // nota mínima de aprobación

export const fmtDate = (d) => {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
};

export const topicsOf = (db, sid) => db.topics.filter((t) => t.subjectId === sid);
export const edgesOf = (db, sid) => db.edges.filter((e) => e.subjectId === sid);
export const best = (db, userId, topicId) => {
  const s = db.attempts.filter((a) => a.userId === userId && a.topicId === topicId).map((a) => a.score);
  return s.length ? Math.max(...s) : null;
};
export const bestMap = (db, userId, sid) => Object.fromEntries(topicsOf(db, sid).map((t) => [t.id, best(db, userId, t.id)]));

export const progress = (db, userId, sid) => {
  const ts = topicsOf(db, sid);
  return ts.length ? Math.round((100 * ts.filter((t) => (best(db, userId, t.id) ?? -1) >= PASS).length) / ts.length) : 0;
};
export const xpOf = (db, userId) => db.topics.reduce((s, t) => s + (best(db, userId, t.id) || 0), 0);
export const levelOf = (xp) => ({ level: Math.floor(xp / 300) + 1, cur: xp % 300, max: 300 });

export const ranking = (db, sid) => {
  const ts = topicsOf(db, sid);
  return db.enrollments.filter((e) => e.subjectId === sid)
    .map((e) => ({ user: db.users.find((u) => u.id === e.userId), points: ts.reduce((s, t) => s + (best(db, e.userId, t.id) || 0), 0) }))
    .filter((r) => r.user).sort((a, b) => b.points - a.points);
};

// Prerrequisitos aún no aprobados, del más profundo (posible origen del problema) al más cercano
export function recommendations(db, userId, topicId) {
  const t = db.topics.find((x) => x.id === topicId);
  if (!t) return [];
  const edges = edgesOf(db, t.subjectId), seen = new Set(), out = [];
  const walk = (id) => {
    for (const e of edges.filter((e) => e.target === id)) {
      if (seen.has(e.source)) continue;
      seen.add(e.source);
      const b = best(db, userId, e.source);
      if (b === null || b < PASS) {
        const found = db.topics.find((x) => x.id === e.source);
        if (found) out.push(found);
        walk(e.source);
      }
    }
  };
  walk(topicId);
  return out.reverse();
}

export const heat = (db, sid) => {
  const ids = db.enrollments.filter((e) => e.subjectId === sid).map((e) => e.userId);
  return topicsOf(db, sid).map((t) => {
    const sc = ids.map((id) => best(db, id, t.id)).filter((v) => v !== null);
    return { ...t, n: sc.length, avg: sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null, failing: sc.filter((v) => v < PASS).length };
  });
};

// Algoritmo de Kahn: true si el grafo no tiene ciclos
export function isDag(ids, pairs) {
  const indeg = Object.fromEntries(ids.map((i) => [i, 0])), out = {};
  for (const [a, b] of pairs) { indeg[b]++; (out[a] ||= []).push(b); }
  const q = ids.filter((i) => indeg[i] === 0);
  let seen = 0;
  while (q.length) { const n = q.shift(); seen++; for (const m of out[n] || []) if (--indeg[m] === 0) q.push(m); }
  return seen === ids.length;
}

// SIMULADO: en producción esta función debe llamar al back (que consulte un modelo de IA con la descripción y materiales del tema)
export async function generateQuizAI(topicName, n) {
  await new Promise((r) => setTimeout(r, 1400));
  return Array.from({ length: n }, (_, i) => ({
    text: `(${i + 1}) ¿Cuál afirmación describe correctamente un concepto clave de «${topicName}»?`,
    options: ['Definición correcta del concepto', 'Definición de otro tema', 'Afirmación sin relación', 'Ninguna de las anteriores'],
    correct: 0,
  }));
}
