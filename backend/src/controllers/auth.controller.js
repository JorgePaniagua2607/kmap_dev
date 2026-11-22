const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/AppError');

const registerStudent = asyncHandler(async (req, res) => {
  const result = await authService.registerStudent(req.body);
  res.status(201).json({
    ok: true,
    message: 'Estudiante registrado exitosamente con código SIS est.umss',
    ...result
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({
    ok: true,
    message: result.user.mustChangePassword
      ? 'Inicio de sesión exitoso. Debes cambiar tu contraseña inicial.'
      : 'Inicio de sesión exitoso',
    ...result
  });
});

const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id_usuario);
  res.status(200).json({
    ok: true,
    user: profile
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id_usuario, req.body);
  res.status(200).json({
    ok: true,
    message: 'Contraseña actualizada correctamente',
    ...result
  });
});

module.exports = {
  registerStudent,
  login,
  getMe,
  changePassword
};
