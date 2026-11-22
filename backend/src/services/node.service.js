const { z } = require('zod');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/AppError');
const { inferFileTypeName } = require('./storage.service');

const updateNodeSchema = z.object({
  nombre_del_tema: z.string().trim().min(2).max(160).optional(),
  descripcion_del_tema: z.string().trim().max(2000).optional().nullable(),
  nota_minima_para_aprobar: z.coerce.number().min(0).max(100).optional(),
  importancia_del_tema: z.coerce.number().min(0).max(100).optional(),
  posicion_x: z.coerce.number().optional(),
  posicion_y: z.coerce.number().optional(),
  esta_habilitado: z.boolean().optional()
});

const createMaterialSchema = z.object({
  titulo_del_material: z
    .string({ required_error: 'El título del material es obligatorio' })
    .trim()
    .min(2, 'El título debe tener al menos 2 caracteres')
    .max(200),
  descripcion_del_material: z.string().trim().max(1000).optional().nullable(),
  enlace_para_descargar: z
    .string({ required_error: 'El enlace o archivo del material es obligatorio' })
    .trim()
    .min(2)
    .max(500),
  tipo_archivo: z.string().trim().optional(),
  id_tipo_archivo: z.coerce.number().int().positive().optional(),
  esta_visible_para_estudiantes: z.boolean().optional().default(true)
});

async function resolveTipoArchivoId(id_tipo_archivo, tipoNombre, enlace) {
  if (id_tipo_archivo) {
    const found = await prisma.catalogoTipoArchivo.findUnique({
      where: { id_tipo_archivo: Number(id_tipo_archivo) }
    });
    if (found) return found.id_tipo_archivo;
  }

  const targetName = tipoNombre || inferFileTypeName(enlace);
  let tipo = await prisma.catalogoTipoArchivo.findUnique({
    where: { nombre_del_tipo: targetName }
  });

  if (!tipo) {
    tipo = await prisma.catalogoTipoArchivo.create({
      data: {
        nombre_del_tipo: targetName,
        icono_que_lo_representa: 'fa-file'
      }
    });
  }

  return tipo.id_tipo_archivo;
}

async function getNodeDetail(nodeId) {
  const id_tema = Number(nodeId);
  if (!id_tema || Number.isNaN(id_tema)) {
    throw new AppError('ID de nodo/tema inválido', 400);
  }

  const tema = await prisma.temaConocimiento.findUnique({
    where: { id_tema },
    include: {
      materia: {
        select: {
          id_materia: true,
          nombre_de_la_materia: true,
          codigo_de_la_materia: true,
          id_del_docente: true
        }
      },
      materiales: {
        include: {
          tipo_archivo: true,
          docente: {
            select: {
              id_usuario: true,
              nombre_completo: true
            }
          }
        },
        orderBy: { id_material: 'desc' }
      },
      requisitos_necesarios: {
        include: {
          tema_prerrequisito: {
            select: {
              id_tema: true,
              nombre_del_tema: true,
              descripcion_del_tema: true
            }
          }
        }
      },
      evaluaciones_quiz: {
        select: {
          id_quiz: true,
          titulo_del_quiz: true,
          tiempo_limite_en_milisegundos: true,
          generado_por_ia: true,
          esta_habilitado: true,
          fecha_creacion: true
        },
        orderBy: { id_quiz: 'desc' }
      }
    }
  });

  if (!tema) {
    throw new AppError('Tema / nodo de conocimiento no encontrado', 404);
  }

  return tema;
}

async function updateNode(nodeId, input, user) {
  const id_tema = Number(nodeId);
  if (!id_tema || Number.isNaN(id_tema)) {
    throw new AppError('ID de nodo/tema inválido', 400);
  }

  const existing = await prisma.temaConocimiento.findUnique({
    where: { id_tema },
    include: { materia: true }
  });

  if (!existing) {
    throw new AppError('Nodo/tema no encontrado', 404);
  }

  if (
    user.role !== 'ADMIN' &&
    Number(existing.materia.id_del_docente) !== Number(user.id_usuario)
  ) {
    throw new AppError(
      'No tienes permiso para editar un tema de una materia que no dictas',
      403
    );
  }

  const normalized = {
    nombre_del_tema: input.nombre_del_tema || input.title,
    descripcion_del_tema: input.descripcion_del_tema ?? input.description,
    nota_minima_para_aprobar: input.nota_minima_para_aprobar,
    importancia_del_tema: input.importancia_del_tema,
    posicion_x: input.posicion_x ?? input.position?.x,
    posicion_y: input.posicion_y ?? input.position?.y,
    esta_habilitado: input.esta_habilitado
  };

  Object.keys(normalized).forEach((k) => {
    if (normalized[k] === undefined) delete normalized[k];
  });

  const data = updateNodeSchema.parse(normalized);

  const actualizado = await prisma.temaConocimiento.update({
    where: { id_tema },
    data
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: user.id_usuario,
      accion_realizada: 'UPDATE_TOPIC_NODE',
      tabla_afectada: 'tema_conocimiento',
      id_del_registro_afectado: id_tema
    }
  });

  return actualizado;
}

async function addMaterialToNode(nodeId, input, uploadedFile, user) {
  const id_tema = Number(nodeId);
  if (!id_tema || Number.isNaN(id_tema)) {
    throw new AppError('ID de nodo/tema inválido', 400);
  }

  const tema = await prisma.temaConocimiento.findUnique({
    where: { id_tema },
    include: { materia: true }
  });

  if (!tema) {
    throw new AppError('Nodo/tema no encontrado', 404);
  }

  const fileUrl = uploadedFile
    ? `/uploads/${uploadedFile.filename}`
    : input.enlace_para_descargar || input.fileUrl || input.url;

  const normalized = {
    titulo_del_material:
      input.titulo_del_material ||
      input.title ||
      (uploadedFile ? uploadedFile.originalname : ''),
    descripcion_del_material:
      input.descripcion_del_material ?? input.description ?? null,
    enlace_para_descargar: fileUrl,
    tipo_archivo: input.tipo_archivo || input.type,
    id_tipo_archivo: input.id_tipo_archivo,
    esta_visible_para_estudiantes:
      input.esta_visible_para_estudiantes !== undefined
        ? Boolean(input.esta_visible_para_estudiantes)
        : true
  };

  const data = createMaterialSchema.parse(normalized);
  const id_tipo_archivo = await resolveTipoArchivoId(
    data.id_tipo_archivo,
    data.tipo_archivo,
    data.enlace_para_descargar
  );

  const material = await prisma.materialEstudio.create({
    data: {
      id_materia: tema.id_materia,
      id_tema: tema.id_tema,
      id_del_docente_que_lo_subio: Number(user.id_usuario),
      id_tipo_archivo,
      titulo_del_material: data.titulo_del_material,
      descripcion_del_material: data.descripcion_del_material,
      enlace_para_descargar: data.enlace_para_descargar,
      esta_visible_para_estudiantes: data.esta_visible_para_estudiantes
    },
    include: {
      tipo_archivo: true
    }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: user.id_usuario,
      accion_realizada: 'ADD_STUDY_MATERIAL',
      tabla_afectada: 'material_estudio',
      id_del_registro_afectado: material.id_material
    }
  });

  return material;
}

async function deleteMaterial(materialId, user) {
  const id_material = Number(materialId);
  if (!id_material || Number.isNaN(id_material)) {
    throw new AppError('ID de material inválido', 400);
  }

  await prisma.materialEstudio.delete({
    where: { id_material }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: user.id_usuario,
      accion_realizada: 'DELETE_STUDY_MATERIAL',
      tabla_afectada: 'material_estudio',
      id_del_registro_afectado: id_material
    }
  });

  return { deletedId: id_material };
}

module.exports = {
  getNodeDetail,
  updateNode,
  addMaterialToNode,
  deleteMaterial
};
