import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import 'dotenv/config';

const db = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '', multipleStatements: true,
});
await db.query(fs.readFileSync(new URL('../../bd/schema.sql', import.meta.url), 'utf8'));
await db.query('USE mapa_conocimiento');

const hash = await bcrypt.hash('123456', 10);
const [d] = await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', ['Prof. Rivera', 'docente@demo.com', hash, 'docente']);
await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', ['Ale Estudiante', 'estudiante@demo.com', hash, 'estudiante']);
const [s] = await db.query('INSERT INTO subjects (name,teacher_id) VALUES (?,?)', ['Cálculo I', d.insertId]);

const T = [
  ['ari', 'Aritmética', 90, 210], ['alg', 'Álgebra', 250, 90], ['tri', 'Trigonometría', 250, 330],
  ['fac', 'Factorización', 420, 90], ['fun', 'Funciones', 420, 250], ['lim', 'Límites', 590, 170],
  ['der', 'Derivadas', 760, 90], ['int', 'Integrales', 760, 270],
];
const id = {};
for (const [k, name, x, y] of T) { const [r] = await db.query('INSERT INTO topics (subject_id,name,pos_x,pos_y) VALUES (?,?,?,?)', [s.insertId, name, x, y]); id[k] = r.insertId; }
const E = [['ari','alg'],['ari','tri'],['alg','fac'],['alg','fun'],['tri','fun'],['fac','lim'],['fun','lim'],['lim','der'],['lim','int']];
for (const [a, b] of E) await db.query('INSERT INTO topic_prereqs (topic_id,prereq_id) VALUES (?,?)', [id[b], id[a]]);

// [tema, enunciado, [correcta, ...incorrectas], dificultad]
const Q = [
  ['ari','12 + 8 ÷ 4 = ?',['14','5','20','10'],1],['ari','3/4 + 1/2 = ?',['5/4','4/6','3/8','1'],2],['ari','2³ · 2² = ?',['2⁵','2⁶','4⁵','2¹'],3],
  ['alg','Resuelve 2x + 6 = 14',['x = 4','x = 10','x = 3','x = 5'],1],['alg','Si 3(x − 2) = 2x + 1, entonces x = ?',['7','5','−1','3'],2],['alg','Sistema x + y = 5, x − y = 1: (x, y) = ?',['(3, 2)','(2, 3)','(4, 1)','(1, 4)'],3],
  ['fac','Factoriza x² − 9',['(x − 3)(x + 3)','(x − 3)²','x(x − 9)','(x + 9)(x − 1)'],1],['fac','Factoriza x² + 5x + 6',['(x + 2)(x + 3)','(x + 1)(x + 6)','(x − 2)(x − 3)','(x + 5)(x + 1)'],2],['fac','Factoriza 6x² + 7x − 3',['(2x + 3)(3x − 1)','(6x − 1)(x + 3)','(2x − 3)(3x + 1)','(3x + 3)(2x − 1)'],3],
  ['fun','Si f(x) = 2x + 1, f(3) = ?',['7','6','5','9'],1],['fun','Dominio de f(x) = √(x − 4)',['x ≥ 4','x ≤ 4','x > 0','Todos los reales'],2],['fun','f(x) = x², g(x) = x + 1. (f∘g)(2) = ?',['9','5','6','7'],3],
  ['tri','sen(90°) = ?',['1','0','−1','1/2'],1],['tri','cos(60°) = ?',['1/2','√3/2','1','0'],2],['tri','tan x equivale a',['sen x / cos x','cos x / sen x','1 / sen x','sen x · cos x'],3],
  ['lim','lím x→2 (x + 3) = ?',['5','2','3','∞'],1],['lim','lím x→3 (x² − 9)/(x − 3) = ?',['6','0','3','No existe'],2],['lim','lím x→0 sen(x)/x = ?',['1','0','∞','−1'],3],
  ['der','d/dx x³ = ?',['3x²','x²','3x','x⁴/4'],1],['der','d/dx sen x = ?',['cos x','−cos x','−sen x','tan x'],2],['der','d/dx (x·eˣ) = ?',['eˣ(x + 1)','x·eˣ⁻¹','eˣ','x·eˣ'],3],
  ['int','∫ 2x dx = ?',['x² + C','2x² + C','x + C','2 + C'],1],['int','∫ cos x dx = ?',['sen x + C','−sen x + C','cos x + C','tan x + C'],2],['int','∫₀¹ 3x² dx = ?',['1','3','0','1/3'],3],
];
for (const [k, text, opts, diff] of Q) {
  const arr = opts.map((o, i) => ({ o, c: i === 0 })).sort(() => Math.random() - 0.5); // mezcla la posición de la correcta
  await db.query('INSERT INTO questions (topic_id,text,options,correct_idx,difficulty) VALUES (?,?,?,?,?)',
    [id[k], text, JSON.stringify(arr.map((a) => a.o)), arr.findIndex((a) => a.c), diff]);
}

// 12 estudiantes simulados para el mapa de calor docente
const base = { ari: 90, alg: 72, tri: 80, fac: 38, fun: 48, lim: 34, der: 22, int: 16 };
for (let i = 1; i <= 12; i++) {
  const [u] = await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [`Estudiante ${i}`, `est${i}@demo.com`, hash, 'estudiante']);
  const m = {};
  for (const [k, v] of Object.entries(base)) {
    m[k] = Math.max(0, Math.min(100, Math.round(v + (Math.random() - 0.5) * 40)));
    await db.query('INSERT INTO mastery (user_id,topic_id,score) VALUES (?,?,?)', [u.insertId, id[k], m[k]]);
  }
  const root = m.fac < 40 ? id.fac : m.fun < 40 ? id.fun : null;
  if (root) await db.query('INSERT INTO diagnoses (user_id,subject_id,target_topic_id,root_topic_id,path) VALUES (?,?,?,?,?)',
    [u.insertId, s.insertId, id.lim, root, JSON.stringify([root, id.lim])]);
}
console.log('Seed listo. Docente: docente@demo.com / 123456 — Estudiante: estudiante@demo.com / 123456');
await db.end();
