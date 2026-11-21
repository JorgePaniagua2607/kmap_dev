// Express 4 no captura errores async: este wrapper los envía al manejador global
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
