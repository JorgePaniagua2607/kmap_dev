import { Router } from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { wrap } from '../utils.js';

const r = Router();
r.use(auth(['docente']));

r.get('/topics/:id/questions', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id, text, options, correct_idx, difficulty FROM questions WHERE topic_id = ? ORDER BY difficulty, id', [req.params.id]);
  res.json(rows.map((q) => ({ id: q.id, text: q.text, options: JSON.parse(q.options), correctIdx: q.correct_idx, difficulty: q.difficulty })));
}));

r.post('/topics/:id/questions', wrap(async (req, res) => {
  const { text, options, correctIdx, difficulty } = req.body;
  const opts = (options || []).map((o) => String(o).trim());
  if (!text?.trim() || opts.length < 2 || opts.some((o) => !o)) return res.status(400).json({ error: 'Escribe el enunciado y todas las opciones' });
  if (!(correctIdx >= 0 && correctIdx < opts.length)) return res.status(400).json({ error: 'Marca la opción correcta' });
  const d = [1, 2, 3].includes(Number(difficulty)) ? Number(difficulty) : 2;
  const [ins] = await pool.query('INSERT INTO questions (topic_id, text, options, correct_idx, difficulty) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, text.trim(), JSON.stringify(opts), correctIdx, d]);
  res.json({ id: ins.insertId });
}));

r.delete('/questions/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default r;
