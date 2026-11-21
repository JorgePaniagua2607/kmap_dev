import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { SECRET } from '../middleware/auth.js';
import { wrap } from '../utils.js';

const r = Router();
const sign = (u) => ({
  token: jwt.sign({ id: u.id, name: u.name, role: u.role }, SECRET, { expiresIn: '8h' }),
  user: { id: u.id, name: u.name, role: u.role },
});

// El registro público crea siempre estudiantes; los docentes se crean por seed/BD
r.post('/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Completa los datos (contraseña de 6 caracteres como mínimo)' });
  const [ex] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (ex.length) return res.status(409).json({ error: 'Ese correo ya está registrado' });
  const hash = await bcrypt.hash(password, 10);
  const [ins] = await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "estudiante")', [name, email, hash]);
  res.json(sign({ id: ins.insertId, name, role: 'estudiante' }));
}));

r.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  res.json(sign(u));
}));

export default r;
