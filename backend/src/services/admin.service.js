const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { AppError } = require('../utils/AppError');
const { sanitizeUser } = require('../utils/roleMapper');
const { generateEnrollmentCode } = require('../utils/codeGenerator');
const emailService = require('./email.service');

const createTeacherSchema = z.object({
  nombre_completo: z
    .string({ required_error: 'El nombre del docente es obligatorio' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(120),
  correo_electronico: z
    .string({ required_error: 'El correo del docente es obligatorio' })
    .trim()
    .email('Correo electrónico inválido')
    .max(254),
  carnet_identidad: z
    .string({ required_error: 'El carnet del docente es obligatorio' })
    .trim()
    .min(4, 'El carnet debe tener al menos 4 caracteres')
    .max(30)
});

const createSubjectSchema = z.object({
  nombre_de_la_materia: z
    .string({ required_error: 'El nombre de la materia es obligatorio' })
    .trim()
    .min(3, 'El nombre de la materia debe tener al menos 3 caracteres')
    .max(120),
  codigo_de_la_materia: z
    .string({ required_error: 'El código de la materia es obligatorio' })
    .trim()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(20),
  descripcion_corta: z.string().trim().max(2000).optional().nullable(),
  id_del_docente: z.coerce
    .number({ required_error: 'Debes indicar el id_del_docente responsable' })
    .int()
    .positive(),
  color_representativo: z.string().trim().max(20).optional().nullable(),
  enlace_al_icono: z.string().trim().max(500).optional().nullable(),
  esta_habilitada: z.boolean().optional().default(true)
});

const updateSubjectSchema = z.object({
  nombre_de_la_materia: z.string().trim().min(3).max(120).optional(),
  codigo_de_la_materia: z.string().trim().min(2).max(20).optional(),
  descripcion_corta: z.string().trim().max(2000).optional().nullable(),
  id_del_docente: z.coerce.number().int().positive().optional(),
  color_representativo: z.string().trim().max(20).optional().nullable(),
  enlace_al_icono: z.string().trim().max(500).optional().nullable(),
  esta_habilitada: z.boolean().optional()
});

const assignSubjectsSchema = z.object({
  id_del_docente: z.coerce
    .number({ required_error: 'El id_del_docente es obligatorio' })
    .int()
    .positive(),
  subjectIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'Debes enviar al menos un ID de materia en subjectIds')
});

async function getDocenteRole() {
  let rol = await prisma.catalogoRol.findUnique({
    where: { nombre_del_rol: 'docente' }
  });
  if (!rol) {
    rol = await prisma.catalogoRol.create({
      data: {
        nombre_del_rol: 'docente',
        descripcion_del_rol: 'Crea materias, temas, materiales, preguntas y evaluaciones'
      }
    });
  }
  return rol;
}

async function listTeachers() {
  const rolDocente = await getDocenteRole();
  const docentes = await prisma.usuario.findMany({
    where: { id_rol: rolDocente.id_rol },
    include: {
      rol: true,
      materias_dictadas: {
        select: {
          id_materia: true,
          nombre_de_la_materia: true,
          codigo_de_la_materia: true,
          codigo_matriculacion: true,
          esta_habilitada: true
        }
      }
    },
    orderBy: { id_usuario: 'asc' }
  });

  return docentes.map((doc) => ({
    ...sanitizeUser(doc),
    total_materias_dictadas: doc.materias_dictadas.length,
    materias_dictadas: doc.materias_dictadas
  }));
}

async function createTeacher(input, adminUserId) {
  const normalized = {
    nombre_completo: input.nombre_completo || input.nombre || input.name,
    correo_electronico: input.correo_electronico || input.correo || input.email,
    carnet_identidad: String(
      input.carnet_identidad || input.carnet || ''
    ).trim()
  };

  const data = createTeacherSchema.parse(normalized);
  const cleanEmail = data.correo_electronico.toLowerCase();

  const existing = await prisma.usuario.findFirst({
    where: {
      OR: [
        { correo_electronico: cleanEmail },
        { carnet_identidad: data.carnet_identidad }
      ]
    }
  });

  if (existing) {
    throw new AppError(
      'Ya existe un usuario con ese correo electrónico o número de carnet',
      409
    );
  }

  const rolDocente = await getDocenteRole();
  const contrasena_encriptada = await bcrypt.hash(
    data.carnet_identidad,
    env.BCRYPT_SALT_ROUNDS
  );

  const nuevoDocente = await prisma.usuario.create({
    data: {
      id_rol: rolDocente.id_rol,
      nombre_completo: data.nombre_completo,
      correo_electronico: cleanEmail,
      carnet_identidad: data.carnet_identidad,
      contrasena_encriptada,
      debe_cambiar_contrasena: true,
      esta_habilitado: true
    },
    include: { rol: true }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: adminUserId || null,
      accion_realizada: 'CREATE_TEACHER',
      tabla_afectada: 'usuario',
      id_del_registro_afectado: nuevoDocente.id_usuario
    }
  });

  const emailDelivery = await emailService.sendTeacherCredentials({
    nombre_completo: nuevoDocente.nombre_completo,
    correo_electronico: nuevoDocente.correo_electronico,
    carnet_identidad: data.carnet_identidad
  });

  return {
    teacher: sanitizeUser(nuevoDocente),
    emailDelivery
  };
}

async function listSubjects() {
  const materias = await prisma.materiaAsignatura.findMany({
    include: {
      docente: {
        select: {
          id_usuario: true,
          nombre_completo: true,
          correo_electronico: true,
          carnet_identidad: true
        }
      },
      resumen_estadisticas: true,
      _count: {
        select: {
          inscripciones: true,
          temas: true,
          evaluaciones_quiz: true
        }
      }
    },
    orderBy: { id_materia: 'asc' }
  });

  return materias;
}

async function createSubject(input, adminUserId) {
  const normalized = {
    nombre_de_la_materia: input.nombre_de_la_materia || input.name,
    codigo_de_la_materia: (
      input.codigo_de_la_materia ||
      input.code ||
      ''
    ).toUpperCase(),
    descripcion_corta: input.descripcion_corta ?? input.description ?? null,
    id_del_docente: input.id_del_docente ?? input.teacherId,
    color_representativo: input.color_representativo ?? input.color ?? '#33A1FF',
    enlace_al_icono: input.enlace_al_icono ?? null,
    esta_habilitada:
      input.esta_habilitada !== undefined ? Boolean(input.esta_habilitada) : true
  };

  const data = createSubjectSchema.parse(normalized);

  const docente = await prisma.usuario.findUnique({
    where: { id_usuario: data.id_del_docente },
    include: { rol: true }
  });

  if (!docente) {
    throw new AppError(
      `No existe el docente con id_usuario=${data.id_del_docente}`,
      404
    );
  }

  const codigo_matriculacion = generateEnrollmentCode(
    data.codigo_de_la_materia.replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'KMAP'
  );

  const nuevaMateria = await prisma.materiaAsignatura.create({
    data: {
      ...data,
      codigo_matriculacion
    },
    include: {
      docente: {
        select: {
          id_usuario: true,
          nombre_completo: true,
          correo_electronico: true
        }
      }
    }
  });

  await prisma.resumenEstadisticasMateria.upsert({
    where: { id_materia: nuevaMateria.id_materia },
    update: {},
    create: {
      id_materia: nuevaMateria.id_materia,
      total_de_estudiantes_inscritos: 0,
      total_de_quices_realizados: 0,
      promedio_general_de_notas: 0,
      cantidad_de_aprobados: 0,
      cantidad_de_reprobados: 0
    }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: adminUserId || null,
      accion_realizada: 'CREATE_SUBJECT',
      tabla_afectada: 'materia_asignatura',
      id_del_registro_afectado: nuevaMateria.id_materia
    }
  });

  return nuevaMateria;
}

async function updateSubject(subjectId, input, adminUserId) {
  const id_materia = Number(subjectId);
  if (!id_materia || Number.isNaN(id_materia)) {
    throw new AppError('ID de materia inválido', 400);
  }

  const normalized = {
    nombre_de_la_materia: input.nombre_de_la_materia || input.name,
    codigo_de_la_materia: input.codigo_de_la_materia || input.code,
    descripcion_corta: input.descripcion_corta ?? input.description,
    id_del_docente: input.id_del_docente ?? input.teacherId,
    color_representativo: input.color_representativo ?? input.color,
    enlace_al_icono: input.enlace_al_icono,
    esta_habilitada: input.esta_habilitada
  };

  Object.keys(normalized).forEach((k) => {
    if (normalized[k] === undefined) delete normalized[k];
  });

  const data = updateSubjectSchema.parse(normalized);

  const actualizada = await prisma.materiaAsignatura.update({
    where: { id_materia },
    data,
    include: {
      docente: {
        select: {
          id_usuario: true,
          nombre_completo: true,
          correo_electronico: true
        }
      }
    }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: adminUserId || null,
      accion_realizada: 'UPDATE_SUBJECT',
      tabla_afectada: 'materia_asignatura',
      id_del_registro_afectado: id_materia
    }
  });

  return actualizada;
}

async function deleteSubject(subjectId, adminUserId) {
  const id_materia = Number(subjectId);
  if (!id_materia || Number.isNaN(id_materia)) {
    throw new AppError('ID de materia inválido', 400);
  }

  await prisma.materiaAsignatura.delete({
    where: { id_materia }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: adminUserId || null,
      accion_realizada: 'DELETE_SUBJECT',
      tabla_afectada: 'materia_asignatura',
      id_del_registro_afectado: id_materia
    }
  });

  return { deletedId: id_materia };
}

async function assignSubjectsToTeacher(input, adminUserId) {
  const rawIds = Array.isArray(input.subjectIds)
    ? input.subjectIds
    : input.id_materia
      ? [input.id_materia]
      : [];

  const data = assignSubjectsSchema.parse({
    id_del_docente: input.id_del_docente ?? input.teacherId,
    subjectIds: rawIds
  });

  const docente = await prisma.usuario.findUnique({
    where: { id_usuario: data.id_del_docente },
    include: { rol: true }
  });

  if (!docente) {
    throw new AppError('El docente especificado no existe', 404);
  }

  await prisma.materiaAsignatura.updateMany({
    where: { id_materia: { in: data.subjectIds } },
    data: { id_del_docente: data.id_del_docente }
  });

  const materiasDictadas = await prisma.materiaAsignatura.findMany({
    where: { id_del_docente: data.id_del_docente },
    orderBy: { id_materia: 'asc' }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: adminUserId || null,
      accion_realizada: 'ASSIGN_SUBJECTS',
      tabla_afectada: 'materia_asignatura',
      id_del_registro_afectado: data.id_del_docente
    }
  });

  return {
    docente: sanitizeUser(docente),
    total_materias_dictadas: materiasDictadas.length,
    materias_dictadas: materiasDictadas
  };
}

module.exports = {
  listTeachers,
  createTeacher,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectsToTeacher
};
