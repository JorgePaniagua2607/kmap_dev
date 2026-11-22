const { ZodError } = require('zod');

function notFoundHandler(req, res, next) {
  res.status(404).json({
    ok: false,
    error: 'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: 'VALIDATION_ERROR',
      message: 'Error de validación en los datos enviados',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  if (err.name === 'AppError') {
    return res.status(err.statusCode || 400).json({
      ok: false,
      error: 'APP_ERROR',
      message: err.message,
      details: err.details || null
    });
  }

  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(', ')
      : err.meta?.target || 'campo único';
    return res.status(409).json({
      ok: false,
      error: 'DUPLICATE_RECORD',
      message: `Ya existe un registro con ese valor en: ${target}`
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      ok: false,
      error: 'RECORD_NOT_FOUND',
      message: 'El registro solicitado no existe en la base de datos'
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      ok: false,
      error: 'INVALID_TOKEN',
      message: 'Token JWT inválido o expirado'
    });
  }

  console.error('[ERROR NO CONTROLADO]:', err);
  return res.status(500).json({
    ok: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Error interno del servidor'
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
