import jwt from 'jsonwebtoken';
import 'dotenv/config';

export const SECRET = process.env.JWT_SECRET || 'dev-secret';

export const auth = (roles) => (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const user = jwt.verify(token, SECRET);
    if (roles && !roles.includes(user.role)) return res.status(403).json({ error: 'Sin permisos para esta acción' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión no válida, inicia sesión de nuevo' });
  }
};
