const express = require('express');
const studentController = require('../controllers/student.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateJWT, authorizeRoles('ESTUDIANTE', 'ADMIN'));

// Matricularse a una materia con el código dado por el docente
router.post('/enroll', studentController.enrollByCode);

// Listar grilla de materias inscritas del estudiante
router.get('/subjects', studentController.listMySubjects);

module.exports = router;
