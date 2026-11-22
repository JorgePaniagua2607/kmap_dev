const express = require('express');
const quizController = require('../controllers/quiz.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateJWT);

// Consultar un quiz para resolverlo (oculta respuestas correctas)
router.get(
  '/:quizId',
  authorizeRoles('ESTUDIANTE', 'DOCENTE', 'ADMIN'),
  quizController.getQuizForTaking
);

// Enviar respuestas y evaluar quiz en el servidor (nota, recomendaciones del grafo y ranking)
router.post(
  '/:quizId/submit',
  authorizeRoles('ESTUDIANTE', 'DOCENTE', 'ADMIN'),
  quizController.submitQuiz
);

// Editar quiz (incluyendo publicar un borrador generado con IA)
router.put(
  '/:quizId',
  authorizeRoles('DOCENTE', 'ADMIN'),
  quizController.updateQuiz
);

// Eliminar quiz
router.delete(
  '/:quizId',
  authorizeRoles('DOCENTE', 'ADMIN'),
  quizController.deleteQuiz
);

module.exports = router;
