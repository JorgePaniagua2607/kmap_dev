import { shortestPath } from './graph.js';

/*
 * Motor de diagnóstico (funciones puras sobre un estado serializable).
 * 1. Evalúa el tema objetivo con 2-3 preguntas adaptativas.
 * 2. Si falla, encola sus prerrequisitos y repite hacia atrás.
 * 3. Si aprueba, esa rama deja de explorarse.
 * 4. Tema raíz = tema reprobado cuyos prerrequisitos están todos aprobados.
 */
export const initState = (target) => ({
  target, queue: [target], current: null, cur: null, results: {}, order: [], finished: false,
});

function pick(list, cur) {
  const left = list.filter((q) => !cur.used.includes(q.id));
  if (!left.length) return null;
  left.sort((a, b) => Math.abs(a.difficulty - cur.diff) - Math.abs(b.difficulty - cur.diff));
  return left[0];
}

function closeTopic(state, g) {
  const { n, ok } = state.cur;
  const score = n ? Math.round((ok / n) * 100) : null;
  const passed = score === null || score >= 50;
  state.results[state.current] = { score, passed };
  state.order.push(state.current);
  if (!passed) {
    for (const p of g.prereqs[state.current] || []) {
      if (!(p in state.results) && !state.queue.includes(p)) state.queue.push(p);
    }
  }
  state.current = null;
  state.cur = null;
}

// Devuelve la siguiente pregunta (puede cambiar de tema) o null si terminó el diagnóstico
export function nextQuestion(state, g, questionsByTopic) {
  for (;;) {
    if (state.current === null) {
      if (!state.queue.length) { state.finished = true; return null; }
      state.current = state.queue.shift();
      state.cur = { n: 0, ok: 0, diff: 2, used: [] };
    }
    const q = pick(questionsByTopic[state.current] || [], state.cur);
    if (q) { state.cur.used.push(q.id); return q; }
    closeTopic(state, g);
  }
}

export function applyAnswer(state, g, correct) {
  const c = state.cur;
  c.n++; c.ok += correct ? 1 : 0;
  c.diff = Math.min(3, Math.max(1, c.diff + (correct ? 1 : -1)));
  const decided = c.n >= 3 || (c.n === 2 && c.ok !== 1);
  if (decided) closeTopic(state, g);
}

export function finalize(state, g) {
  const failed = state.order.filter((t) => !state.results[t].passed);
  const roots = failed.filter((t) => (g.prereqs[t] || []).every((p) => state.results[p]?.passed));
  const root = roots.length ? roots[roots.length - 1] : null;
  const path = root !== null ? shortestPath(g.next, root, state.target) : [];
  return { rootTopicId: root, path };
}
