import { Router } from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { wrap } from '../utils.js';
import { loadGraph, adjacency } from '../services/graph.js';
import { initState, nextQuestion, applyAnswer, finalize } from '../services/diagnosis.js';

const r = Router();
r.use(auth(['estudiante']));

async function questionsByTopic(topicIds) {
  if (!topicIds.length) return {};
  const [rows] = await pool.query('SELECT id, topic_id, text, options, correct_idx, difficulty FROM questions WHERE topic_id IN (?)', [topicIds]);
  const out = {};
  for (const q of rows) (out[q.topic_id] ||= []).push({ id: q.id, text: q.text, options: JSON.parse(q.options), correct: q.correct_idx, difficulty: q.difficulty });
  return out;
}

// Nunca se envía la respuesta correcta al cliente antes de contestar
const safe = (q, topics, state) => q && {
  id: q.id, text: q.text, options: q.options,
  topic: { id: state.current, name: topics.find((t) => t.id === state.current)?.name },
  evaluated: state.order.length,
};

r.post('/start', wrap(async (req, res) => {
  const { subjectId, targetTopicId } = req.body;
  const { topics, edges } = await loadGraph(subjectId);
  if (!topics.some((t) => t.id === Number(targetTopicId))) return res.status(400).json({ error: 'Tema no válido' });
  const g = adjacency(edges);
  const state = initState(Number(targetTopicId));
  const q = nextQuestion(state, g, await questionsByTopic(topics.map((t) => t.id)));
  if (!q) return res.status(400).json({ error: 'Este tema aún no tiene preguntas' });
  const [ins] = await pool.query('INSERT INTO quiz_sessions (user_id, subject_id, state) VALUES (?, ?, ?)', [req.user.id, subjectId, JSON.stringify(state)]);
  res.json({ sessionId: ins.insertId, question: safe(q, topics, state) });
}));

r.post('/:id/answer', wrap(async (req, res) => {
  const { questionId, optionIdx } = req.body;
  const [rows] = await pool.query('SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ? AND status = "active"', [req.params.id, req.user.id]);
  const s = rows[0];
  if (!s) return res.status(404).json({ error: 'Sesión de quiz no encontrada' });
  const state = JSON.parse(s.state);
  const { topics, edges } = await loadGraph(s.subject_id);
  const g = adjacency(edges);
  const qs = await questionsByTopic(topics.map((t) => t.id));
  const question = (qs[state.current] || []).find((q) => q.id === Number(questionId));
  if (!question || !state.cur.used.includes(question.id)) return res.status(400).json({ error: 'Pregunta no válida' });

  const correct = Number(optionIdx) === question.correct;
  await pool.query('INSERT INTO attempts (user_id, topic_id, question_id, correct) VALUES (?, ?, ?, ?)', [req.user.id, state.current, question.id, correct ? 1 : 0]);
  applyAnswer(state, g, correct);
  const next = nextQuestion(state, g, qs);

  if (!state.finished) {
    await pool.query('UPDATE quiz_sessions SET state = ? WHERE id = ?', [JSON.stringify(state), s.id]);
    return res.json({ correct, correctIdx: question.correct, question: safe(next, topics, state) });
  }

  // Fin: diagnóstico, actualización de dominio y registro
  const { rootTopicId, path } = finalize(state, g);
  for (const [tid, rs] of Object.entries(state.results)) {
    if (rs.score === null) continue;
    await pool.query(
      'INSERT INTO mastery (user_id, topic_id, score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE score = ROUND(score * 0.4 + VALUES(score) * 0.6)',
      [req.user.id, tid, rs.score]
    );
  }
  await pool.query('INSERT INTO diagnoses (user_id, subject_id, target_topic_id, root_topic_id, path) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, s.subject_id, state.target, rootTopicId, JSON.stringify(path)]);
  await pool.query('UPDATE quiz_sessions SET state = ?, status = "done" WHERE id = ?', [JSON.stringify(state), s.id]);
  const name = (id) => topics.find((t) => t.id === Number(id))?.name;
  res.json({
    correct, correctIdx: question.correct, finished: true,
    result: {
      rootTopicId, rootName: rootTopicId !== null ? name(rootTopicId) : null,
      path: path.map((id) => ({ id, name: name(id) })),
      evaluated: state.order.map((id) => ({ id, name: name(id), ...state.results[id] })),
    },
  });
}));

export default r;
