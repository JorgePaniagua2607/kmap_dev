import { Router } from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { wrap } from '../utils.js';
import { loadGraph, isDag } from '../services/graph.js';

const r = Router();
r.use(auth());

r.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM subjects ORDER BY id');
  res.json(rows);
}));

r.post('/', auth(['docente']), wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const [ins] = await pool.query('INSERT INTO subjects (name, teacher_id) VALUES (?, ?)', [name, req.user.id]);
  res.json({ id: ins.insertId, name });
}));

// Grafo + dominio del usuario autenticado
r.get('/:id/graph', wrap(async (req, res) => {
  const { topics, edges } = await loadGraph(req.params.id);
  const [m] = await pool.query(
    'SELECT m.topic_id, m.score FROM mastery m JOIN topics t ON t.id = m.topic_id WHERE m.user_id = ? AND t.subject_id = ?',
    [req.user.id, req.params.id]
  );
  const mm = Object.fromEntries(m.map((x) => [x.topic_id, x.score]));
  res.json({ topics: topics.map((t) => ({ ...t, mastery: mm[t.id] ?? null })), edges });
}));

// Guardado masivo del grafo desde el editor (React Flow)
r.put('/:id/graph', auth(['docente']), wrap(async (req, res) => {
  const sid = Number(req.params.id);
  const nodes = req.body.nodes || [], edges = req.body.edges || [];
  const ids = nodes.map((n) => String(n.id));
  if (new Set(ids).size !== ids.length) return res.status(400).json({ error: 'Hay temas duplicados' });
  if (nodes.some((n) => !String(n.name || '').trim())) return res.status(400).json({ error: 'Todos los temas necesitan nombre' });
  const pairs = edges.map((e) => [String(e.source), String(e.target)]);
  if (pairs.some(([a, b]) => a === b || !ids.includes(a) || !ids.includes(b)))
    return res.status(400).json({ error: 'Hay conexiones inválidas' });
  if (!isDag(ids, pairs)) return res.status(400).json({ error: 'El grafo tiene ciclos: un tema no puede depender de sí mismo, directa o indirectamente' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id FROM topics WHERE subject_id = ?', [sid]);
    const exIds = new Set(existing.map((x) => String(x.id)));
    const map = {};
    for (const n of nodes) {
      const x = Math.round(n.x), y = Math.round(n.y);
      if (exIds.has(String(n.id))) {
        await conn.query('UPDATE topics SET name = ?, pos_x = ?, pos_y = ? WHERE id = ? AND subject_id = ?', [n.name.trim(), x, y, n.id, sid]);
        map[String(n.id)] = Number(n.id);
      } else {
        const [ins] = await conn.query('INSERT INTO topics (subject_id, name, pos_x, pos_y) VALUES (?, ?, ?, ?)', [sid, n.name.trim(), x, y]);
        map[String(n.id)] = ins.insertId;
      }
    }
    const keep = Object.values(map);
    for (const old of existing) if (!keep.includes(old.id)) await conn.query('DELETE FROM topics WHERE id = ?', [old.id]);
    await conn.query('DELETE FROM topic_prereqs WHERE topic_id IN (SELECT id FROM (SELECT id FROM topics WHERE subject_id = ?) t)', [sid]);
    for (const [a, b] of pairs) await conn.query('INSERT INTO topic_prereqs (topic_id, prereq_id) VALUES (?, ?)', [map[b], map[a]]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// Último diagnóstico del estudiante
r.get('/:id/diagnosis', wrap(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT target_topic_id, root_topic_id, path, created_at FROM diagnoses WHERE user_id = ? AND subject_id = ? ORDER BY id DESC LIMIT 1',
    [req.user.id, req.params.id]
  );
  const d = rows[0];
  res.json(d ? { targetTopicId: d.target_topic_id, rootTopicId: d.root_topic_id, path: JSON.parse(d.path), createdAt: d.created_at } : null);
}));

// Mapa de calor del grupo
r.get('/:id/heatmap', auth(['docente']), wrap(async (req, res) => {
  const sid = req.params.id;
  const { edges } = await loadGraph(sid);
  const [topics] = await pool.query(
    `SELECT t.id, t.name, t.pos_x AS x, t.pos_y AS y, ROUND(AVG(m.score)) AS avg, COUNT(m.user_id) AS n, COALESCE(SUM(m.score < 40), 0) AS failing
     FROM topics t LEFT JOIN mastery m ON m.topic_id = t.id WHERE t.subject_id = ? GROUP BY t.id, t.name, t.pos_x, t.pos_y`, [sid]);
  const [roots] = await pool.query(
    `SELECT d.root_topic_id AS id, COUNT(*) AS count FROM diagnoses d
     JOIN (SELECT MAX(id) AS mid FROM diagnoses WHERE subject_id = ? GROUP BY user_id) l ON l.mid = d.id
     WHERE d.root_topic_id IS NOT NULL GROUP BY d.root_topic_id ORDER BY count DESC`, [sid]);
  res.json({
    topics: topics.map((t) => ({ ...t, avg: t.n ? Number(t.avg) : null, n: Number(t.n), failing: Number(t.failing) })),
    edges, roots,
  });
}));

export default r;
