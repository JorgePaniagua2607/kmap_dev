import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import subjectRoutes from './routes/subjects.js';
import questionRoutes from './routes/questions.js';
import quizRoutes from './routes/quiz.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api', questionRoutes);
app.use('/api/quiz', quizRoutes);
// Producción: sirve el front compilado (front/dist) desde el mismo servidor
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../front/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API en http://localhost:${port}`));
