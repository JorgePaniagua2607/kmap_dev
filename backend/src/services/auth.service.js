const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { AppError } = require('../utils/AppError');
const { normalizeRoleName, sanitizeUser } = require('../utils/roleMapper');

const registerStudentSchema = z.object({
  nombre_completo: z
    .string({ required_error: 'El nombre completo es obligatorio' })
    .trim()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres')
    .max(120),
  codigo_sis: z
    .string({ required_error: 'El código SIS es obligatorio' })
    .trim()
    .min(6, 'El código SIS es demasiado corto')
    .max(60)
    .refine((val) => /^\d{6,}$/.test(val) || val.toLowerCase().includes('est.umss'), {
      message: 'El código SIS debe tener solo números (mínimo 6) o contener "est.umss"'
    }),
  correo_electronico: z
    .string()
    .trim()
    .email('Correo electrónico inválido')
    .refine((val) => /^[^@\s]+@est\.umss\.edu(\.bo)?$/i.test(val), {
      message: 'El correo debe terminar en @est.umss.edu'
    })
    .optional(),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100)
});

const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'Debes enviar tu código SIS, correo o usuario' })
    .trim()
    .min(2, 'Identificador inválido'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'Debes ingresar tu contraseña')
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'La contraseña actual es obligatoria' })
    .min(1, 'Debes ingresar tu contraseña actual'),
  newPassword: z
    .string({ required_error: 'La nueva contraseña es obligatoria' })
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
    .max(100)
});

function signToken(usuario) {
  const clean = sanitizeUser(usuario);
  const payload = {
    sub: clean.id_usuario,
    role: clean.role,
    id_rol: clean.id_rol,
    email: clean.correo_electronico,
    sisCode: clean.codigo_sis,
    mustChangePassword: clean.mustChangePassword
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

async function ensureRoleExists(nombre_del_rol, descripcion_del_rol) {
  let rol = await prisma.catalogoRol.findUnique({
    where: { nombre_del_rol }
  });
  if (!rol) {
    rol = await prisma.catalogoRol.create({
      data: { nombre_del_rol, descripcion_del_rol }
    });
  }
  return rol;
}

async function logAudit(id_usuario, accion_realizada, tabla_afectada, id_del_registro_afectado) {
  try {
    await prisma.registroAuditoria.create({
      data: {
        id_usuario: id_usuario || null,
        accion_realizada,
        tabla_afectada,
        id_del_registro_afectado: id_del_registro_afectado || null
      }
    });
  } catch (err) {
    console.warn('[AUDITORIA WARNING]:', err.message);
  }
}

async function registerStudent(input) {
  const normalizedInput = {
    nombre_completo: input.nombre_completo || input.name,
    codigo_sis: input.codigo_sis || input.sisCode,
    correo_electronico: input.correo_electronico || input.email,
    password: input.password
  };

  const data = registerStudentSchema.parse(normalizedInput);
  const cleanSis = data.codigo_sis.trim().toLowerCase();

  // Generar correo institucional si no se proporcionó uno explícito
  const cleanEmail = data.correo_electronico
    ? data.correo_electronico.trim().toLowerCase()
    : cleanSis.includes('@')
      ? cleanSis
      : `${cleanSis}@edu.bo`;

  const existingUser = await prisma.usuario.findFirst({
    where: {
      OR: [
        { codigo_sis: cleanSis },
        { correo_electronico: cleanEmail }
      ]
    }
  });

  if (existingUser) {
    throw new AppError(
      'Ya existe un estudiante registrado con ese código SIS o correo electrónico',
      409
    );
  }

  const rolEstudiante = await ensureRoleExists(
    'estudiante',
    'Se inscribe en materias, realiza quizzes y sigue rutas de aprendizaje'
  );

  const contrasena_encriptada = await bcrypt.hash(
    data.password,
    env.BCRYPT_SALT_ROUNDS
  );

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      id_rol: rolEstudiante.id_rol,
      nombre_completo: data.nombre_completo,
      correo_electronico: cleanEmail,
      codigo_sis: cleanSis,
      contrasena_encriptada,
      esta_habilitado: true,
      debe_cambiar_contrasena: false
    },
    include: { rol: true }
  });

  await logAudit(
    nuevoUsuario.id_usuario,
    'REGISTER_STUDENT',
    'usuario',
    nuevoUsuario.id_usuario
  );

  const token = signToken(nuevoUsuario);
  return {
    token,
    user: sanitizeUser(nuevoUsuario)
  };
}

async function login(input) {
  const normalizedInput = {
    identifier:
      input.identifier ||
      input.codigo_sis ||
      input.sisCode ||
      input.correo_electronico ||
      input.email ||
      input.username,
    password: input.password
  };

  const data = loginSchema.parse(normalizedInput);
  const idLower = data.identifier.trim().toLowerCase();

  // Buscar por codigo_sis, correo_electronico, carnet_identidad, nombre_completo o alias admin
  const conditions = [
    { codigo_sis: idLower },
    { correo_electronico: idLower },
    { carnet_identidad: data.identifier.trim() },
    { nombre_completo: data.identifier.trim() }
  ];

  if (idLower === env.ADMIN_USERNAME.toLowerCase() || idLower === 'admin') {
    conditions.push({ correo_electronico: env.ADMIN_EMAIL.toLowerCase() });
    conditions.push({ correo_electronico: 'admin@demo.com' });
  }

  const usuario = await prisma.usuario.findFirst({
    where: { OR: conditions },
    include: { rol: true }
  });

  if (!usuario) {
    throw new AppError('Credenciales inválidas (usuario no encontrado)', 401);
  }

  if (!usuario.esta_habilitado) {
    throw new AppError('Esta cuenta se encuentra deshabilitada', 403);
  }

  // Validación para estudiantes: su correo o código SIS debe pertenecer a est.umss
  const roleCode = normalizeRoleName(usuario.rol?.nombre_del_rol);
  if (roleCode === 'ESTUDIANTE') {
    const emailStr = (usuario.correo_electronico || '').toLowerCase();
    const sisStr = (usuario.codigo_sis || '').toLowerCase();
    if (!emailStr.includes('est.umss') && !sisStr.includes('est.umss')) {
      throw new AppError(
        'Acceso denegado: El estudiante debe contar con correo institucional @est.umss.edu',
        403
      );
    }
  }

  const isPasswordValid = await bcrypt.compare(
    data.password,
    usuario.contrasena_encriptada
  );

  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas (contraseña incorrecta)', 401);
  }

  await logAudit(usuario.id_usuario, 'LOGIN', 'usuario', usuario.id_usuario);

  const token = signToken(usuario);
  return {
    token,
    user: sanitizeUser(usuario)
  };
}

async function getProfile(userId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: Number(userId) },
    include: {
      rol: true,
      _count: {
        select: {
          materias_dictadas: true,
          inscripciones: true,
          intentos_quiz: true
        }
      }
    }
  });

  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return {
    ...sanitizeUser(usuario),
    stats: usuario._count
  };
}

async function changePassword(userId, input) {
  const data = changePasswordSchema.parse(input);

  if (data.currentPassword === data.newPassword) {
    throw new AppError(
      'La nueva contraseña debe ser diferente a la contraseña actual',
      400
    );
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: Number(userId) },
    include: { rol: true }
  });

  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const matches = await bcrypt.compare(
    data.currentPassword,
    usuario.contrasena_encriptada
  );

  if (!matches) {
    throw new AppError('La contraseña actual es incorrecta', 401);
  }

  const nuevaContrasenaEncriptada = await bcrypt.hash(
    data.newPassword,
    env.BCRYPT_SALT_ROUNDS
  );

  const actualizado = await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: {
      contrasena_encriptada: nuevaContrasenaEncriptada,
      debe_cambiar_contrasena: false
    },
    include: { rol: true }
  });

  await logAudit(
    actualizado.id_usuario,
    'CHANGE_PASSWORD',
    'usuario',
    actualizado.id_usuario
  );

  const token = signToken(actualizado);
  return {
    token,
    user: sanitizeUser(actualizado)
  };
}

module.exports = {
  registerStudent,
  login,
  getProfile,
  changePassword
};
