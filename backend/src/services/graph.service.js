const { z } = require('zod');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/AppError');
const { validateDAG } = require('../utils/dagValidator');

const saveGraphSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]),
        title: z.string().trim().min(1, 'El título del nodo es obligatorio').max(160),
        description: z.string().trim().max(2000).optional().nullable(),
        nota_minima_para_aprobar: z.coerce.number().min(0).max(100).optional(),
        importancia_del_tema: z.coerce.number().min(0).max(100).optional(),
        position: z
          .object({
            x: z.coerce.number().default(0),
            y: z.coerce.number().default(0)
          })
          .optional()
          .default({ x: 0, y: 0 })
      })
    )
    .min(1, 'El grafo debe contener al menos un nodo/tema'),
  edges: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        source: z.union([z.string(), z.number()]),
        target: z.union([z.string(), z.number()]),
        necesidad_de_saber_el_tema_anterior: z.coerce
          .number()
          .min(0)
          .max(100)
          .optional()
          .default(100)
      })
    )
    .optional()
    .default([])
});

function formatGraphForReactFlow(id_materia, temas = [], requisitos = []) {
  const nodes = temas.map((t, index) => ({
    id: String(t.id_tema),
    id_tema: t.id_tema,
    title: t.nombre_del_tema,
    nombre_del_tema: t.nombre_del_tema,
    description: t.descripcion_del_tema || '',
    descripcion_del_tema: t.descripcion_del_tema || '',
    nota_minima_para_aprobar: t.nota_minima_para_aprobar,
    importancia_del_tema: t.importancia_del_tema,
    position: {
      x: t.posicion_x || (index % 3) * 260 + 80,
      y: t.posicion_y || Math.floor(index / 3) * 160 + 80
    },
    data: {
      label: t.nombre_del_tema,
      description: t.descripcion_del_tema || '',
      materialsCount: t._count?.materiales ?? 0,
      quizzesCount: t._count?.evaluaciones_quiz ?? 0
    }
  }));

  const edges = requisitos.map((r) => ({
    id: `e-${r.id_del_tema_que_se_necesita_primero}-${r.id_tema}`,
    id_requisito: r.id_requisito,
    source: String(r.id_del_tema_que_se_necesita_primero),
    target: String(r.id_tema),
    necesidad_de_saber_el_tema_anterior: r.necesidad_de_saber_el_tema_anterior
  }));

  return {
    id_materia: Number(id_materia),
    total_nodes: nodes.length,
    total_edges: edges.length,
    nodes,
    edges
  };
}

async function getSubjectGraph(subjectId) {
  const id_materia = Number(subjectId);
  if (!id_materia || Number.isNaN(id_materia)) {
    throw new AppError('ID de materia inválido', 400);
  }

  const materia = await prisma.materiaAsignatura.findUnique({
    where: { id_materia },
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
    throw new AppError('Materia no encontrada', 404);
  }

  const temas = await prisma.temaConocimiento.findMany({
    where: { id_materia, esta_habilitado: true },
    include: {
      _count: {
        select: {
          materiales: true,
          evaluaciones_quiz: true
        }
      }
    },
    orderBy: { id_tema: 'asc' }
  });

  const temaIds = temas.map((t) => t.id_tema);
  const requisitos =
    temaIds.length > 0
      ? await prisma.requisitoEntreTemas.findMany({
          where: {
            id_tema: { in: temaIds },
            id_del_tema_que_se_necesita_primero: { in: temaIds }
          },
          orderBy: { id_requisito: 'asc' }
        })
      : [];

  return {
    subject: {
      id_materia: materia.id_materia,
      nombre_de_la_materia: materia.nombre_de_la_materia,
      codigo_de_la_materia: materia.codigo_de_la_materia,
      docente: materia.docente
    },
    ...formatGraphForReactFlow(id_materia, temas, requisitos)
  };
}

async function saveSubjectGraph(subjectId, input, user) {
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
      'No tienes permiso para modificar el grafo de una materia que no dictas',
      403
    );
  }

  // Normalizar entrada para soportar { title / nombre_del_tema }
  const normalizedNodes = (input.nodes || []).map((n) => ({
    id: n.id ?? n.id_tema,
    title: n.title || n.nombre_del_tema,
    description: n.description ?? n.descripcion_del_tema ?? '',
    nota_minima_para_aprobar: n.nota_minima_para_aprobar ?? 80,
    importancia_del_tema: n.importancia_del_tema ?? 1,
    position: {
      x: n.position?.x ?? n.posicion_x ?? 0,
      y: n.position?.y ?? n.posicion_y ?? 0
    }
  }));

  const normalizedEdges = (input.edges || []).map((e) => ({
    id: e.id,
    source: e.source ?? e.id_del_tema_que_se_necesita_primero,
    target: e.target ?? e.id_tema,
    necesidad_de_saber_el_tema_anterior:
      e.necesidad_de_saber_el_tema_anterior ?? e.weight ?? 100
  }));

  const parsed = saveGraphSchema.parse({
    nodes: normalizedNodes,
    edges: normalizedEdges
  });

  // 1. VALIDACIÓN ESTRICTA ANTI-CICLOS (DAG) ANTES DE PERSISTIR
  const dagValidation = validateDAG(parsed.nodes, parsed.edges);

  // 2. Persistir nodos y aristas en transacción
  const existingTemas = await prisma.temaConocimiento.findMany({
    where: { id_materia }
  });
  const existingById = new Map(existingTemas.map((t) => [String(t.id_tema), t]));
  const existingByName = new Map(
    existingTemas.map((t) => [t.nombre_del_tema.toLowerCase(), t])
  );

  const clientToDbId = new Map();

  await prisma.$transaction(async (tx) => {
    for (const node of parsed.nodes) {
      const clientId = String(node.id);
      const matchById = existingById.get(clientId);
      const matchByName = existingByName.get(node.title.toLowerCase());
      const targetRecord = matchById || matchByName;

      if (targetRecord) {
        const updated = await tx.temaConocimiento.update({
          where: { id_tema: targetRecord.id_tema },
          data: {
            nombre_del_tema: node.title,
            descripcion_del_tema: node.description,
            nota_minima_para_aprobar: node.nota_minima_para_aprobar ?? 80,
            importancia_del_tema: node.importancia_del_tema ?? 1,
            posicion_x: node.position.x,
            posicion_y: node.position.y,
            esta_habilitado: true
          }
        });
        clientToDbId.set(clientId, updated.id_tema);
      } else {
        const created = await tx.temaConocimiento.create({
          data: {
            id_materia,
            nombre_del_tema: node.title,
            descripcion_del_tema: node.description,
            nota_minima_para_aprobar: node.nota_minima_para_aprobar ?? 80,
            importancia_del_tema: node.importancia_del_tema ?? 1,
            posicion_x: node.position.x,
            posicion_y: node.position.y,
            esta_habilitado: true
          }
        });
        clientToDbId.set(clientId, created.id_tema);
      }
    }

    const activeDbIds = Array.from(clientToDbId.values());

    // Limpiar requisitos previos de los temas de esta materia y recrear las aristas del DAG
    await tx.requisitoEntreTemas.deleteMany({
      where: {
        OR: [
          { id_tema: { in: activeDbIds } },
          { id_del_tema_que_se_necesita_primero: { in: activeDbIds } }
        ]
      }
    });

    for (const edge of parsed.edges) {
      const sourceDbId = clientToDbId.get(String(edge.source));
      const targetDbId = clientToDbId.get(String(edge.target));

      if (sourceDbId && targetDbId) {
        await tx.requisitoEntreTemas.create({
          data: {
            id_tema: targetDbId,
            id_del_tema_que_se_necesita_primero: sourceDbId,
            necesidad_de_saber_el_tema_anterior:
              edge.necesidad_de_saber_el_tema_anterior ?? 100
          }
        });
      }
    }

    await tx.registroAuditoria.create({
      data: {
        id_usuario: user.id_usuario,
        accion_realizada: 'SAVE_SUBJECT_GRAPH_DAG',
        tabla_afectada: 'tema_conocimiento',
        id_del_registro_afectado: id_materia
      }
    });
  });

  const updatedGraph = await getSubjectGraph(id_materia);
  return {
    dagValidation,
    ...updatedGraph
  };
}

module.exports = {
  getSubjectGraph,
  saveSubjectGraph
};
