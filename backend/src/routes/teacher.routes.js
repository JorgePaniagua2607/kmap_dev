const express = require('express');
const teacherController = require('../controllers/teacher.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateJWT, authorizeRoles('DOCENTE', 'ADMIN'));

// Listar materias asignadas al docente
router.get('/subjects', teacherController.listMySubjects);

// Generar o regenerar código de matriculación estilo Classroom
router.post(
  '/subjects/:subjectId/enrollment-code',
  teacherController.regenerateEnrollmentCode
);

module.exports = router;
