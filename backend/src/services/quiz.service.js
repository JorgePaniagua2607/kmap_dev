const { z } = require('zod');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/AppError');
const aiService = require('./ai.service');

const questionInputSchema = z.object({
  texto_de_la_pregunta: z.string().trim().min(3).max(5000),
  nivel_de_dificultad: z.coerce.number().min(0).max(100).optional().default(50),
  explicacion: z.string().trim().max(2000).optional().nullable(),
  opciones: z
    .array(
      z.object({
        texto_de_la_opcion: z.string().trim().min(1).max(1000),
        orden_en_que_aparece: z.coerce.number().int().min(0).optional()
      })
    )
    .min(2, 'Cada pregunta debe tener al menos 2 opciones'),
  indice_opcion_correcta: z.coerce.number().int().min(0).default(0)
});

const createQuizSchema = z.object({
  titulo_del_quiz: z
    .string({ required_error: 'El título del quiz es obligatorio' })
    .trim()
    .min(3)
    .max(200),
  tiempo_limite_en_milisegundos: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(600000),
  esta_habilitado: z.boolean().optional().default(true),
  questions: z
    .array(questionInputSchema)
    .min(1, 'El quiz debe incluir al menos una pregunta')
});

async function getMultipleChoiceTypeId() {
  let tipo = await prisma.catalogoTipoPregunta.findUnique({
    where: { nombre_del_tipo: 'seleccion_multiple' }
  });
  if (!tipo) {
    tipo = await prisma.catalogoTipoPregunta.create({
      data: {
        nombre_del_tipo: 'seleccion_multiple',
        descripcion_del_tipo: 'Pregunta con varias opciones y una sola correcta'
      }
    });
  }
  return tipo.id_tipo_pregunta;
}

function normalizeQuestionPayload(q) {
  const opciones = (q.opciones || q.options || []).map((opt, idx) => ({
    texto_de_la_opcion:
      typeof opt === 'string'
        ? opt
        : opt.texto_de_la_opcion || opt.text || `Opción ${idx + 1}`,
    orden_en_que_aparece: opt.orden_en_que_aparece ?? idx + 1
  }));

  return {
    texto_de_la_pregunta: q.texto_de_la_pregunta || q.questionText,
    nivel_de_dificultad: q.nivel_de_dificultad ?? q.difficulty ?? 50,
    explicacion: q.explicacion ?? q.explanation ?? null,
    opciones,
    indice_opcion_correcta:
      q.indice_opcion_correcta ?? q.correctIndex ?? q.correctOptionIndex ?? 0
  };
}

async function listNodeQuizzes(nodeId, user) {
  const id_tema = Number(nodeId);
  if (!id_tema || Number.isNaN(id_tema)) {
    throw new AppError('ID de nodo/tema inválido', 400);
  }

  const isStudent = user.role === 'ESTUDIANTE';

  const quizzes = await prisma.evaluacionQuiz.findMany({
    where: {
      id_tema,
      ...(isStudent ? { esta_habilitado: true } : {})
    },
    include: {
      preguntas: {
        where: { esta_habilitada: true },
        include: {
          opciones: {
            orderBy: { orden_en_que_aparece: 'asc' }
          },
          ...(isStudent ? {} : { respuesta_oficial: true })
        },
        orderBy: { id_pregunta: 'asc' }
      }
    },
    orderBy: { id_quiz: 'desc' }
  });

  // Si un quiz de bd.ins no tiene preguntas con id_quiz directo pero su tema sí tiene preguntas en banco_preguntas:
  const topicQuestions = await prisma.bancoPregunta.findMany({
    where: { id_tema, esta_habilitada: true },
    include: {
      opciones: { orderBy: { orden_en_que_aparece: 'asc' } },
      ...(isStudent ? {} : { respuesta_oficial: true })
    },
    orderBy: { id_pregunta: 'asc' }
  });

  return quizzes.map((quiz) => {
    const rawQuestions =
      quiz.preguntas.length > 0 ? quiz.preguntas : topicQuestions;

    const sanitizedQuestions = rawQuestions.map((p) => {
      const base = {
        id_pregunta: p.id_pregunta,
        id_tema: p.id_tema,
        id_tipo_pregunta: p.id_tipo_pregunta,
        texto_de_la_pregunta: p.texto_de_la_pregunta,
        nivel_de_dificultad: p.nivel_de_dificultad,
        generada_por_ia: p.generada_por_ia,
        opciones: p.opciones
      };
      if (!isStudent) {
        base.explicacion = p.explicacion;
        base.respuesta_oficial = p.respuesta_oficial || null;
      }
      return base;
    });

    return {
      id_quiz: quiz.id_quiz,
      id_materia: quiz.id_materia,
      id_tema: quiz.id_tema,
      titulo_del_quiz: quiz.titulo_del_quiz,
      tiempo_limite_en_milisegundos: quiz.tiempo_limite_en_milisegundos,
      generado_por_ia: quiz.generado_por_ia,
      esta_habilitado: quiz.esta_habilitado,
      status: quiz.esta_habilitado ? 'PUBLISHED' : 'DRAFT',
      fecha_creacion: quiz.fecha_creacion,
      total_preguntas: sanitizedQuestions.length,
      preguntas: sanitizedQuestions
    };
  });
}

async function createQuizWithQuestions(
  tema,
  { titulo_del_quiz, tiempo_limite_en_milisegundos, esta_habilitado, generado_por_ia, questions },
  userId
) {
  const id_tipo_pregunta = await getMultipleChoiceTypeId();

  return prisma.$transaction(async (tx) => {
    const quiz = await tx.evaluacionQuiz.create({
      data: {
        id_materia: tema.id_materia,
        id_tema: tema.id_tema,
        titulo_del_quiz,
        tiempo_limite_en_milisegundos,
        generado_por_ia: Boolean(generado_por_ia),
        esta_habilitado: Boolean(esta_habilitado)
      }
    });

    const createdQuestions = [];

    for (const q of questions) {
      const pregunta = await tx.bancoPregunta.create({
        data: {
          id_tema: tema.id_tema,
          id_tipo_pregunta,
          id_quiz: quiz.id_quiz,
          texto_de_la_pregunta: q.texto_de_la_pregunta,
          explicacion: q.explicacion || null,
          nivel_de_dificultad: q.nivel_de_dificultad ?? 50,
          generada_por_ia: Boolean(generado_por_ia),
          esta_habilitada: true
        }
      });

      const createdOptions = [];
      for (let i = 0; i < q.opciones.length; i++) {
        const opt = q.opciones[i];
        const createdOpt = await tx.opcionRespuesta.create({
          data: {
            id_pregunta: pregunta.id_pregunta,
            texto_de_la_opcion: opt.texto_de_la_opcion,
            orden_en_que_aparece: opt.orden_en_que_aparece ?? i + 1
          }
        });
        createdOptions.push(createdOpt);
      }

      const safeCorrectIdx =
        q.indice_opcion_correcta >= 0 &&
        q.indice_opcion_correcta < createdOptions.length
          ? q.indice_opcion_correcta
          : 0;
      const correctOption = createdOptions[safeCorrectIdx];

      const oficial = await tx.respuestaOficial.create({
        data: {
          id_pregunta: pregunta.id_pregunta,
          id_opcion_correcta: correctOption.id_opcion,
          texto_correcto: correctOption.texto_de_la_opcion
        }
      });

      createdQuestions.push({
        ...pregunta,
        opciones: createdOptions,
        respuesta_oficial: oficial
      });
    }

    await tx.registroAuditoria.create({
      data: {
        id_usuario: userId || null,
        accion_realizada: generado_por_ia ? 'GENERATE_AI_QUIZ' : 'CREATE_MANUAL_QUIZ',
        tabla_afectada: 'evaluacion_quiz',
        id_del_registro_afectado: quiz.id_quiz
      }
    });

    return {
      ...quiz,
      status: quiz.esta_habilitado ? 'PUBLISHED' : 'DRAFT',
      preguntas: createdQuestions
    };
  });
}

async function createManualQuiz(nodeId, input, user) {
  const id_tema = Number(nodeId);
  if (!id_tema || Number.isNaN(id_tema)) {
    throw new AppError('ID de nodo/tema inválido', 400);
  }

  const tema = await prisma.temaConocimiento.findUnique({
    where: { id_tema }
  });

  if (!tema) {
    throw new AppError('Nodo/tema no encontrado', 404);
  }

  const rawQuestions = (input.questions || input.preguntas || []).map(
    normalizeQuestionPayload
  );

  const parsed = createQuizSchema.parse({
    titulo_del_quiz: input.titulo_del_quiz || input.title,
    tiempo_limite_en_milisegundos:
      input.tiempo_limite_en_milisegundos ?? input.timeLimitMs ?? 600000,
    esta_habilitado:
      input.esta_habilitado !== undefined
        ? Boolean(input.esta_habilitado)
        : input.status === 'DRAFT'
          ? false
          : true,
    questions: rawQuestions
  });

  return createQuizWithQuestions(
    tema,
    {
      ...parsed,
      generado_por_ia: false
    },
    user.id_usuario
  );
}

async function generateAiQuiz(nodeId, input = {}, user) {
  const id_tema = Number(nodeId);
  if (!id_tema || Number.isNaN(id_tema)) {
    throw new AppError('ID de nodo/tema inválido', 400);
  }

  const tema = await prisma.temaConocimiento.findUnique({
    where: { id_tema },
    include: {
      materiales: true
    }
  });

  if (!tema) {
    throw new AppError('Nodo/tema no encontrado', 404);
  }

  const aiDraft = await aiService.generateStructuredQuiz({
    topicTitle: tema.nombre_del_tema,
    topicDescription: tema.descripcion_del_tema,
    materials: tema.materiales,
    numQuestions: input.numQuestions || input.cantidad_preguntas || 4,
    difficulty: input.difficulty || input.nivel_de_dificultad || 60
  });

  const normalizedQuestions = aiDraft.questions.map(normalizeQuestionPayload);

  // Persistir en estado BORRADOR EDITABLE (esta_habilitado: false, generado_por_ia: true)
  const savedQuiz = await createQuizWithQuestions(
    tema,
    {
      titulo_del_quiz: input.titulo_del_quiz || aiDraft.titulo_del_quiz,
      tiempo_limite_en_milisegundos:
        input.tiempo_limite_en_milisegundos || 600000,
      esta_habilitado: false,
      generado_por_ia: true,
      questions: normalizedQuestions
    },
    user.id_usuario
  );

  return {
    aiProvider: aiDraft.provider,
    aiModel: aiDraft.model,
    quiz: savedQuiz
  };
}

async function updateQuiz(quizId, input, user) {
  const id_quiz = Number(quizId);
  if (!id_quiz || Number.isNaN(id_quiz)) {
    throw new AppError('ID de quiz inválido', 400);
  }

  const existing = await prisma.evaluacionQuiz.findUnique({
    where: { id_quiz }
  });

  if (!existing) {
    throw new AppError('Quiz no encontrado', 404);
  }

  const updateData = {};
  if (input.titulo_del_quiz || input.title) {
    updateData.titulo_del_quiz = (input.titulo_del_quiz || input.title).trim();
  }
  if (input.tiempo_limite_en_milisegundos !== undefined) {
    updateData.tiempo_limite_en_milisegundos = Number(
      input.tiempo_limite_en_milisegundos
    );
  }
  if (input.esta_habilitado !== undefined) {
    updateData.esta_habilitado = Boolean(input.esta_habilitado);
  } else if (input.status) {
    updateData.esta_habilitado = input.status === 'PUBLISHED';
  }

  const updated = await prisma.evaluacionQuiz.update({
    where: { id_quiz },
    data: updateData,
    include: {
      preguntas: {
        include: {
          opciones: { orderBy: { orden_en_que_aparece: 'asc' } },
          respuesta_oficial: true
        }
      }
    }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: user.id_usuario,
      accion_realizada: 'UPDATE_QUIZ',
      tabla_afectada: 'evaluacion_quiz',
      id_del_registro_afectado: id_quiz
    }
  });

  return {
    ...updated,
    status: updated.esta_habilitado ? 'PUBLISHED' : 'DRAFT'
  };
}

async function deleteQuiz(quizId, user) {
  const id_quiz = Number(quizId);
  if (!id_quiz || Number.isNaN(id_quiz)) {
    throw new AppError('ID de quiz inválido', 400);
  }

  await prisma.bancoPregunta.deleteMany({
    where: { id_quiz }
  });

  await prisma.evaluacionQuiz.delete({
    where: { id_quiz }
  });

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: user.id_usuario,
      accion_realizada: 'DELETE_QUIZ',
      tabla_afectada: 'evaluacion_quiz',
      id_del_registro_afectado: id_quiz
    }
  });

  return { deletedId: id_quiz };
}

module.exports = {
  listNodeQuizzes,
  createManualQuiz,
  generateAiQuiz,
  updateQuiz,
  deleteQuiz
};
