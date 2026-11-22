const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas de /api/admin requieren autenticación y rol ADMIN
router.use(authenticateJWT, authorizeRoles('ADMIN'));

// Docentes: listar con conteo de materias y dar de alta enviando credenciales por correo
router.get('/teachers', adminController.listTeachers);
router.post('/teachers', adminController.createTeacher);

// CRUD de Materias (materia_asignatura)
router.get('/subjects', adminController.listSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:subjectId', adminController.updateSubject);
router.delete('/subjects/:subjectId', adminController.deleteSubject);

// Asignar qué materias dicta un docente y retornar cuántas dicta
router.post('/assignments', adminController.assignSubjects);

module.exports = router;
