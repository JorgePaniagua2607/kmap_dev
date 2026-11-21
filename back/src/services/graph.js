import { pool } from '../db.js';

// Carga temas y aristas. Arista = { source: prerrequisito, target: tema que depende de él }
export async function loadGraph(subjectId) {
  const [topics] = await pool.query('SELECT id, name, pos_x AS x, pos_y AS y FROM topics WHERE subject_id = ?', [subjectId]);
  const [rows] = await pool.query(
    'SELECT p.prereq_id AS source, p.topic_id AS target FROM topic_prereqs p JOIN topics t ON t.id = p.topic_id WHERE t.subject_id = ?',
    [subjectId]
  );
  return { topics, edges: rows };
}

export function adjacency(edges) {
  const prereqs = {}, next = {};
  for (const { source, target } of edges) {
    (prereqs[target] ||= []).push(source);
    (next[source] ||= []).push(target);
  }
  return { prereqs, next };
}

// Algoritmo de Kahn: true si el grafo es acíclico
export function isDag(ids, pairs) {
  const indeg = Object.fromEntries(ids.map((i) => [i, 0]));
  const out = {};
  for (const [a, b] of pairs) { indeg[b]++; (out[a] ||= []).push(b); }
  const q = ids.filter((i) => indeg[i] === 0);
  let seen = 0;
  while (q.length) {
    const n = q.shift(); seen++;
    for (const m of out[n] || []) if (--indeg[m] === 0) q.push(m);
  }
  return seen === ids.length;
}

// BFS: camino más corto from -> to siguiendo prerrequisito -> dependiente
export function shortestPath(next, from, to) {
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) break;
    for (const m of next[n] || []) if (!(m in prev)) { prev[m] = n; q.push(m); }
  }
  if (!(to in prev)) return [];
  const path = [];
  for (let c = to; c !== null; c = prev[c]) path.unshift(Number(c));
  return path;
}
