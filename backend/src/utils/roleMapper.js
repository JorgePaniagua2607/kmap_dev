const ROLE_MAP_TO_CODE = {
  administrador: 'ADMIN',
  admin: 'ADMIN',
  docente: 'DOCENTE',
  estudiante: 'ESTUDIANTE',
  tutor: 'TUTOR',
  auditor: 'AUDITOR',
  invitado: 'INVITADO'
};

const CODE_TO_DB_ROLE = {
  ADMIN: 'administrador',
  DOCENTE: 'docente',
  ESTUDIANTE: 'estudiante',
  TUTOR: 'tutor',
  AUDITOR: 'auditor',
  INVITADO: 'invitado'
};

function normalizeRoleName(dbRoleName = '') {
  const key = String(dbRoleName).trim().toLowerCase();
  return ROLE_MAP_TO_CODE[key] || String(dbRoleName).toUpperCase();
}

function toDbRoleName(roleCode = '') {
  const key = String(roleCode).trim().toUpperCase();
  return CODE_TO_DB_ROLE[key] || String(roleCode).trim().toLowerCase();
}

function sanitizeUser(usuario) {
  if (!usuario) return null;
  const roleName = usuario.rol?.nombre_del_rol || '';
  const role = normalizeRoleName(roleName);

  return {
    id: usuario.id_usuario,
    id_usuario: usuario.id_usuario,
    id_rol: usuario.id_rol,
    role,
    nombre_del_rol: roleName,
    name: usuario.nombre_completo,
    nombre_completo: usuario.nombre_completo,
    email: usuario.correo_electronico,
    correo_electronico: usuario.correo_electronico,
    sisCode: usuario.codigo_sis,
    codigo_sis: usuario.codigo_sis,
    carnet: usuario.carnet_identidad,
    carnet_identidad: usuario.carnet_identidad,
    mustChangePassword: Boolean(usuario.debe_cambiar_contrasena),
    debe_cambiar_contrasena: Boolean(usuario.debe_cambiar_contrasena),
    isActive: Boolean(usuario.esta_habilitado),
    esta_habilitado: Boolean(usuario.esta_habilitado),
    avatarUrl: usuario.enlace_a_su_foto || null,
    fecha_registro: usuario.fecha_registro
  };
}

module.exports = {
  normalizeRoleName,
  toDbRoleName,
  sanitizeUser
};
