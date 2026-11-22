const express = require('express');
const nodeController = require('../controllers/node.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { uploadMiddleware } = require('../services/storage.service');

const router = express.Router();

router.use(authenticateJWT);

// Detalle de un nodo/tema con sus materiales, prerrequisitos y quizzes
router.get(
  '/:nodeId',
  authorizeRoles('DOCENTE', 'ESTUDIANTE', 'ADMIN', 'TUTOR', 'AUDITOR'),
  nodeController.getNodeDetail
);

// Actualizar descripción, título o coordenadas de un tema
router.patch(
  '/:nodeId',
  authorizeRoles('DOCENTE', 'ADMIN'),
  nodeController.updateNode
);

// Subir o asociar material de estudio a un tema (soporta multipart file o enlace JSON)
router.post(
  '/:nodeId/materials',
  authorizeRoles('DOCENTE', 'ADMIN'),
  uploadMiddleware.single('file'),
  nodeController.addMaterial
);

// Listar quizzes de un tema (oculta respuestas correctas si el rol es ESTUDIANTE)
router.get(
  '/:nodeId/quizzes',
  authorizeRoles('DOCENTE', 'ESTUDIANTE', 'ADMIN'),
  nodeController.listNodeQuizzes
);

// Crear quiz manual para un tema
router.post(
  '/:nodeId/quizzes',
  authorizeRoles('DOCENTE', 'ADMIN'),
  nodeController.createManualQuiz
);

// Generar quiz con IA en formato JSON estructurado (en borrador editable)
router.post(
  '/:nodeId/quiz/generate-ai',
  authorizeRoles('DOCENTE', 'ADMIN'),
  nodeController.generateAiQuiz
);

module.exports = router;
