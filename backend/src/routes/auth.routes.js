const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Público: Registro de estudiante con validación estricta de código SIS (est.umss)
router.post('/register/student', authController.registerStudent);

// Público: Login unificado para ADMIN, DOCENTE y ESTUDIANTE
router.post('/login', authController.login);

// Protegido: Perfil del usuario autenticado
router.get(
  '/me',
  authenticateJWT,
  authorizeRoles('ADMIN', 'DOCENTE', 'ESTUDIANTE', 'TUTOR', 'AUDITOR'),
  authController.getMe
);

// Protegido: Cambio de contraseña (actualiza debe_cambiar_contrasena = false)
router.post(
  '/change-password',
  authenticateJWT,
  authorizeRoles('ADMIN', 'DOCENTE', 'ESTUDIANTE', 'TUTOR', 'AUDITOR'),
  authController.changePassword
);

module.exports = router;
