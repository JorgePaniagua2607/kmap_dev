const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/AppError');
const { normalizeRoleName, sanitizeUser } = require('../utils/roleMapper');

const authenticateJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No autorizado: Token Bearer requerido', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, env.JWT_SECRET);

  const userId = Number(decoded.sub);
  if (!userId || Number.isNaN(userId)) {
    throw new AppError('Token JWT con identificador de usuario inválido', 401);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: userId },
    include: { rol: true }
  });

  if (!usuario) {
    throw new AppError('El usuario asociado al token ya no existe', 401);
  }

  if (!usuario.esta_habilitado) {
    throw new AppError('Tu cuenta se encuentra deshabilitada', 403);
  }

  req.user = sanitizeUser(usuario);
  next();
});

const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => normalizeRoleName(r));

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuario no autenticado', 401));
    }

    const userRole = normalizeRoleName(req.user.role || req.user.nombre_del_rol);
    if (!normalizedAllowed.includes(userRole)) {
      return next(
        new AppError(
          `Acceso denegado: Se requiere rol [${normalizedAllowed.join(', ')}] y tu rol actual es [${userRole}]`,
          403
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles
};
