const prisma = require('../config/prisma');
const { AppError } = require('../utils/AppError');
const { generateEnrollmentCode } = require('../utils/codeGenerator');

async function listTeacherSubjects(user) {
  const whereClause =
    user.role === 'ADMIN' ? {} : { id_del_docente: Number(user.id_usuario) };

  const materias = await prisma.materiaAsignatura.findMany({
    where: whereClause,
    include: {
      docente: {
        select: {
          id_usuario: true,
          nombre_completo: true,
          correo_electronico: true
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

  return {
    total_materias: materias.length,
    materias
  };
}

async function regenerateEnrollmentCode(subjectId, user) {
  const id_materia = Number(subjectId);
  if (!id_materia || Number.isNaN(id_materia)) {
    throw new AppError('ID de materia inválido', 400);
  }

  const materia = await prisma.materiaAsignatura.findUnique({
    where: { id_materia }
  });

  if (!materia) {
    throw new AppError('Materia no encontrada', 404);
  }

  if (
    user.role !== 'ADMIN' &&
    Number(materia.id_del_docente) !== Number(user.id_usuario)
  ) {
    throw new AppError(
      'No tienes permiso para regenerar el código de una materia que no dictas',
      403
    );
  }

  const prefix =
    (materia.codigo_de_la_materia || 'KMAP')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 6) || 'KMAP';

  const nuevoCodigo = generateEnrollmentCode(prefix);

  const actualizada = await prisma.materiaAsignatura.update({
    where: { id_materia },
    data: { codigo_matriculacion: nuevoCodigo }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: user.id_usuario,
      accion_realizada: 'REGENERATE_ENROLLMENT_CODE',
      tabla_afectada: 'materia_asignatura',
      id_del_registro_afectado: id_materia
    }
  });

  return actualizada;
}

module.exports = {
  listTeacherSubjects,
  regenerateEnrollmentCode
};
