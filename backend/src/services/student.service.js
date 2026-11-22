const { z } = require('zod');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/AppError');

const enrollSchema = z.object({
  codigo_matriculacion: z
    .string({ required_error: 'El código de matriculación es obligatorio' })
    .trim()
    .min(3, 'Código de matriculación inválido')
    .max(30)
});

async function enrollByCode(studentId, input) {
  const rawCode =
    input.codigo_matriculacion ||
    input.enrollmentCode ||
    input.codigo ||
    input.code;

  const { codigo_matriculacion } = enrollSchema.parse({
    codigo_matriculacion: rawCode
  });

  const codeUpper = codigo_matriculacion.toUpperCase();

  // Buscar por codigo_matriculacion o por codigo_de_la_materia como respaldo amigable
  const materia = await prisma.materiaAsignatura.findFirst({
    where: {
      OR: [
        { codigo_matriculacion: codeUpper },
        { codigo_de_la_materia: codeUpper }
      ]
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

  if (!materia) {
    throw new AppError(
      `No se encontró ninguna materia con el código de matriculación "${codeUpper}"`,
      404
    );
  }

  if (!materia.esta_habilitada) {
    throw new AppError('Esta materia no se encuentra habilitada actualmente', 403);
  }

  const existing = await prisma.inscripcionMateria.findUnique({
    where: {
      id_materia_id_estudiante: {
        id_materia: materia.id_materia,
        id_estudiante: Number(studentId)
      }
    }
  });

  if (existing && existing.estado_de_la_inscripcion === 'activo') {
    throw new AppError('Ya te encuentras inscrito en esta materia', 409);
  }

  const inscripcion = await prisma.inscripcionMateria.upsert({
    where: {
      id_materia_id_estudiante: {
        id_materia: materia.id_materia,
        id_estudiante: Number(studentId)
      }
    },
    update: {
      estado_de_la_inscripcion: 'activo',
      fecha_en_que_se_inscribio: new Date()
    },
    create: {
      id_materia: materia.id_materia,
      id_estudiante: Number(studentId),
      estado_de_la_inscripcion: 'activo'
    },
    include: {
      materia: {
        include: {
          docente: {
            select: {
              id_usuario: true,
              nombre_completo: true,
              correo_electronico: true
            }
          }
        }
      }
    }
  });

  // Actualizar contador en resumen_estadisticas_materia
  const totalActivos = await prisma.inscripcionMateria.count({
    where: {
      id_materia: materia.id_materia,
      estado_de_la_inscripcion: 'activo'
    }
  });

  await prisma.resumenEstadisticasMateria.upsert({
    where: { id_materia: materia.id_materia },
    update: { total_de_estudiantes_inscritos: totalActivos },
    create: {
      id_materia: materia.id_materia,
      total_de_estudiantes_inscritos: totalActivos
    }
  });

  // Asegurar ruta de aprendizaje activa para el estudiante en esta materia
  const existingRoute = await prisma.rutaDeAprendizaje.findFirst({
    where: {
      id_estudiante: Number(studentId),
      id_materia: materia.id_materia,
      estado_de_la_ruta: 'activa'
    }
  });

  if (!existingRoute) {
    await prisma.rutaDeAprendizaje.create({
      data: {
        id_estudiante: Number(studentId),
        id_materia: materia.id_materia,
        estado_de_la_ruta: 'activa'
      }
    });
  }

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: Number(studentId),
      accion_realizada: 'ENROLL_SUBJECT',
      tabla_afectada: 'inscripcion_materia',
      id_del_registro_afectado: inscripcion.id_inscripcion
    }
  });

  return inscripcion;
}

async function listEnrolledSubjects(studentId) {
  const inscripciones = await prisma.inscripcionMateria.findMany({
    where: {
      id_estudiante: Number(studentId),
      estado_de_la_inscripcion: { in: ['activo', 'completado'] }
    },
    include: {
      materia: {
        include: {
          docente: {
            select: {
              id_usuario: true,
              nombre_completo: true,
              correo_electronico: true
            }
          },
          _count: {
            select: {
              temas: true,
              evaluaciones_quiz: true
            }
          }
        }
      }
    },
    orderBy: { fecha_en_que_se_inscribio: 'desc' }
  });

  return {
    total_materias_inscritas: inscripciones.length,
    inscripciones
  };
}

module.exports = {
  enrollByCode,
  listEnrolledSubjects
};
