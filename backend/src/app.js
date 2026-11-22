const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const env = require('./config/env');
const prisma = require('./config/prisma');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const teacherRoutes = require('./routes/teacher.routes');
const studentRoutes = require('./routes/student.routes');
const graphRoutes = require('./routes/graph.routes');
const nodeRoutes = require('./routes/node.routes');
const quizRoutes = require('./routes/quiz.routes');
const kmapSyncRoutes = require('./routes/kmapSync.routes');
const nodeController = require('./controllers/node.controller');
const { authenticateJWT, authorizeRoles } = require('./middlewares/auth.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

const allowedOrigins = env.FRONTEND_URL.split(',').map((url) => url.trim());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(__dirname, '..', env.UPLOAD_DIR)));

app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    name: 'Plan Kmap REST API',
    message: 'El Backend está funcionando correctamente.',
    endpoints: {
      health: 'http://localhost:4000/api/health',
      frontendTestHarness: env.FRONTEND_URL
    }
  });
});

app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  let tablesInfo = {};
  try {
    const [
      rolesCount,
      usersCount,
      subjectsCount,
      nodesCount,
      edgesCount,
      quizzesCount
    ] = await Promise.all([
      prisma.catalogoRol.count(),
      prisma.usuario.count(),
      prisma.materiaAsignatura.count(),
      prisma.temaConocimiento.count(),
      prisma.requisitoEntreTemas.count(),
      prisma.evaluacionQuiz.count()
    ]);
    tablesInfo = {
      rolesCount,
      usersCount,
      subjectsCount,
      nodesCount,
      edgesCount,
      quizzesCount
    };
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.status(200).json({
    ok: true,
    service: 'plan-kmap-backend',
    phase: 4,
    environment: env.NODE_ENV,
    database: dbStatus,
    modes: {
      email: env.EMAIL_MODE,
      storage: env.STORAGE_MODE,
      ai: env.AI_MODE
    },
    tablesInfo,
    timestamp: new Date().toISOString()
  });
});

// Rutas por módulo
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/subjects', graphRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/kmap', kmapSyncRoutes);

// Eliminar material de estudio por ID
app.delete(
  '/api/materials/:materialId',
  authenticateJWT,
  authorizeRoles('DOCENTE', 'ADMIN'),
  nodeController.deleteMaterial
);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
