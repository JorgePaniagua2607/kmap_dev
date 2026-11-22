const { z } = require('zod');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/AppError');

const submitQuizSchema = z.object({
  tiempo_total_en_milisegundos: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(120000),
  answers: z
    .array(
      z.object({
        id_pregunta: z.coerce.number().int().positive(),
        id_opcion_que_eligio: z.coerce.number().int().positive().optional().nullable(),
        texto_que_escribio: z.string().trim().optional().nullable(),
        tiempo_que_tardo_en_responder_milisegundos: z.coerce
          .number()
          .int()
          .nonnegative()
          .optional()
          .default(15000)
      })
    )
    .default([])
});

function normalizeThresholdTo100(rawThreshold) {
  const num = Number(rawThreshold ?? 80);
  if (num > 0 && num <= 1) {
    return Number((num * 100).toFixed(2));
  }
  return num;
}

function normalizeGradeTo100(rawScore) {
  const num = Number(rawScore ?? 0);
  if (num > 0 && num <= 1) {
    return Number((num * 100).toFixed(2));
  }
  return Number(num.toFixed(2));
}

async function getQuizForTaking(quizId, user) {
  const id_quiz = Number(quizId);
  if (!id_quiz || Number.isNaN(id_quiz)) {
    throw new AppError('ID de quiz inválido', 400);
  }

  const quiz = await prisma.evaluacionQuiz.findUnique({
    where: { id_quiz },
    include: {
      tema: true,
      materia: {
        select: {
          id_materia: true,
          nombre_de_la_materia: true,
          codigo_de_la_materia: true
        }
      },
      preguntas: {
        where: { esta_habilitada: true },
        include: {
          opciones: { orderBy: { orden_en_que_aparece: 'asc' } }
        },
        orderBy: { id_pregunta: 'asc' }
      }
    }
  });

  if (!quiz) {
    throw new AppError('Quiz no encontrado', 404);
  }

  let questions = quiz.preguntas;
  if (questions.length === 0) {
    questions = await prisma.bancoPregunta.findMany({
      where: { id_tema: quiz.id_tema, esta_habilitada: true },
      include: {
        opciones: { orderBy: { orden_en_que_aparece: 'asc' } }
      },
      orderBy: { id_pregunta: 'asc' }
    });
  }

  return {
    id_quiz: quiz.id_quiz,
    id_materia: quiz.id_materia,
    id_tema: quiz.id_tema,
    titulo_del_quiz: quiz.titulo_del_quiz,
    tiempo_limite_en_milisegundos: quiz.tiempo_limite_en_milisegundos,
    nota_minima_para_aprobar: normalizeThresholdTo100(
      quiz.tema?.nota_minima_para_aprobar
    ),
    materia: quiz.materia,
    tema: {
      id_tema: quiz.tema.id_tema,
      nombre_del_tema: quiz.tema.nombre_del_tema,
      descripcion_del_tema: quiz.tema.descripcion_del_tema
    },
    total_preguntas: questions.length,
    // NUNCA expone respuesta_oficial antes del submit
    preguntas: questions.map((q) => ({
      id_pregunta: q.id_pregunta,
      id_tipo_pregunta: q.id_tipo_pregunta,
      texto_de_la_pregunta: q.texto_de_la_pregunta,
      nivel_de_dificultad: q.nivel_de_dificultad,
      opciones: q.opciones
    }))
  };
}

async function submitQuiz(quizId, input, user) {
  const id_quiz = Number(quizId);
  if (!id_quiz || Number.isNaN(id_quiz)) {
    throw new AppError('ID de quiz inválido', 400);
  }

  const studentId = Number(user.id_usuario);
  const parsed = submitQuizSchema.parse({
    tiempo_total_en_milisegundos:
      input.tiempo_total_en_milisegundos ?? input.timeTakenMs ?? 120000,
    answers: (input.answers || input.respuestas || []).map((a) => ({
      id_pregunta: a.id_pregunta ?? a.questionId,
      id_opcion_que_eligio:
        a.id_opcion_que_eligio ?? a.selectedOptionId ?? null,
      texto_que_escribio: a.texto_que_escribio ?? a.textAnswer ?? null,
      tiempo_que_tardo_en_responder_milisegundos:
        a.tiempo_que_tardo_en_responder_milisegundos ?? 15000
    }))
  });

  const quiz = await prisma.evaluacionQuiz.findUnique({
    where: { id_quiz },
    include: {
      tema: true,
      preguntas: {
        where: { esta_habilitada: true },
        include: {
          opciones: { orderBy: { orden_en_que_aparece: 'asc' } },
          respuesta_oficial: true
        },
        orderBy: { id_pregunta: 'asc' }
      }
    }
  });

  if (!quiz) {
    throw new AppError('Quiz no encontrado', 404);
  }

  let questions = quiz.preguntas;
  if (questions.length === 0) {
    questions = await prisma.bancoPregunta.findMany({
      where: { id_tema: quiz.id_tema, esta_habilitada: true },
      include: {
        opciones: { orderBy: { orden_en_que_aparece: 'asc' } },
        respuesta_oficial: true
      },
      orderBy: { id_pregunta: 'asc' }
    });
  }

  if (questions.length === 0) {
    throw new AppError('Este quiz no tiene preguntas configuradas para evaluar', 400);
  }

  const answersByQuestionId = new Map(
    parsed.answers.map((a) => [Number(a.id_pregunta), a])
  );

  let correctCount = 0;
  const feedbackBreakdown = [];

  for (const question of questions) {
    const submitted = answersByQuestionId.get(question.id_pregunta);
    const official = question.respuesta_oficial;

    let isCorrect = false;
    if (submitted && official) {
      if (
        official.id_opcion_correcta &&
        submitted.id_opcion_que_eligio &&
        Number(official.id_opcion_correcta) ===
          Number(submitted.id_opcion_que_eligio)
      ) {
        isCorrect = true;
      } else if (
        official.texto_correcto &&
        submitted.texto_que_escribio &&
        official.texto_correcto.trim().toLowerCase() ===
          submitted.texto_que_escribio.trim().toLowerCase()
      ) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      correctCount++;
    }

    feedbackBreakdown.push({
      id_pregunta: question.id_pregunta,
      texto_de_la_pregunta: question.texto_de_la_pregunta,
      id_opcion_que_eligio: submitted?.id_opcion_que_eligio || null,
      texto_que_escribio: submitted?.texto_que_escribio || null,
      fue_correcta_su_respuesta: isCorrect,
      id_opcion_correcta: official?.id_opcion_correcta || null,
      texto_correcto: official?.texto_correcto || null,
      explicacion: question.explicacion || null,
      tiempo_que_tardo_en_responder_milisegundos:
        submitted?.tiempo_que_tardo_en_responder_milisegundos || 15000
    });
  }

  const totalQuestions = questions.length;
  const grade = Number(((correctCount / totalQuestions) * 100).toFixed(2));
  const passingThreshold = normalizeThresholdTo100(
    quiz.tema?.nota_minima_para_aprobar
  );
  const passed = grade >= passingThreshold;

  const estadoAprendizaje = passed
    ? 'dominado'
    : grade >= 50
      ? 'en_progreso'
      : 'debil';

  // 1. Guardar intento_de_quiz y respuesta_estudiante
  const intento = await prisma.intentoDeQuiz.create({
    data: {
      id_quiz: quiz.id_quiz,
      id_estudiante: studentId,
      fecha_en_que_inicio: new Date(
        Date.now() - parsed.tiempo_total_en_milisegundos
      ),
      fecha_en_que_termino: new Date(),
      tiempo_total_en_milisegundos: parsed.tiempo_total_en_milisegundos,
      puntaje_que_obtuvo: grade,
      estado_del_intento: 'completado'
    }
  });

  for (const fb of feedbackBreakdown) {
    await prisma.respuestaEstudiante.create({
      data: {
        id_intento: intento.id_intento,
        id_pregunta: fb.id_pregunta,
        id_opcion_que_eligio: fb.id_opcion_que_eligio,
        texto_que_escribio: fb.texto_que_escribio,
        fue_correcta_su_respuesta: fb.fue_correcta_su_respuesta,
        tiempo_que_tardo_en_responder_milisegundos:
          fb.tiempo_que_tardo_en_responder_milisegundos
      }
    });
  }

  // 2. Actualizar progreso_actual e insertar snapshot en historial_de_progreso
  const existingProgress = await prisma.progresoActual.findUnique({
    where: {
      id_estudiante_id_tema: {
        id_estudiante: studentId,
        id_tema: quiz.id_tema
      }
    }
  });

  const attemptsCount = (existingProgress?.cantidad_de_intentos || 0) + 1;
  const confidence = Math.min(100, Number((50 + attemptsCount * 15).toFixed(2)));

  await prisma.progresoActual.upsert({
    where: {
      id_estudiante_id_tema: {
        id_estudiante: studentId,
        id_tema: quiz.id_tema
      }
    },
    update: {
      nota_actual_del_tema: grade,
      seguridad_del_sistema_en_su_nota: confidence,
      cantidad_de_intentos: attemptsCount,
      estado_de_aprendizaje: estadoAprendizaje
    },
    create: {
      id_estudiante: studentId,
      id_tema: quiz.id_tema,
      nota_actual_del_tema: grade,
      seguridad_del_sistema_en_su_nota: confidence,
      cantidad_de_intentos: attemptsCount,
      estado_de_aprendizaje: estadoAprendizaje
    }
  });

  await prisma.historialDeProgreso.create({
    data: {
      id_estudiante: studentId,
      id_tema: quiz.id_tema,
      nota_que_tenia: grade,
      seguridad_del_sistema_en_su_nota: confidence,
      estado_de_aprendizaje: estadoAprendizaje
    }
  });

  // 3. Motor de Recomendaciones Basadas en Prerrequisitos del Grafo DAG + falla_encontrada
  const prereqEdges = await prisma.requisitoEntreTemas.findMany({
    where: { id_tema: quiz.id_tema },
    include: {
      tema_prerrequisito: {
        include: {
          materiales: {
            where: { esta_visible_para_estudiantes: true },
            select: {
              id_material: true,
              titulo_del_material: true,
              enlace_para_descargar: true
            }
          }
        }
      }
    },
    orderBy: { necesidad_de_saber_el_tema_anterior: 'desc' }
  });

  const recommendations = [];

  if (!passed || grade < 85) {
    for (const edge of prereqEdges) {
      const prereqTopic = edge.tema_prerrequisito;
      const prereqProgress = await prisma.progresoActual.findUnique({
        where: {
          id_estudiante_id_tema: {
            id_estudiante: studentId,
            id_tema: prereqTopic.id_tema
          }
        }
      });

      const prereqGrade = prereqProgress
        ? normalizeGradeTo100(prereqProgress.nota_actual_del_tema)
        : 0;
      const prereqState = prereqProgress?.estado_de_aprendizaje || 'sin_evaluar';

      recommendations.push({
        id_tema_prerrequisito: prereqTopic.id_tema,
        nombre_del_tema: prereqTopic.nombre_del_tema,
        descripcion_del_tema: prereqTopic.descripcion_del_tema,
        importancia_prerrequisito: edge.necesidad_de_saber_el_tema_anterior,
        estado_actual_estudiante: prereqState,
        nota_actual_estudiante: prereqGrade,
        motivo: !passed
          ? `Reprobaste "${quiz.tema.nombre_del_tema}" (${grade}/100). Se recomienda reforzar primero el nodo prerrequisito "${prereqTopic.nombre_del_tema}".`
          : `Para alcanzar el dominio total en "${quiz.tema.nombre_del_tema}", repasa "${prereqTopic.nombre_del_tema}".`,
        materiales_recomendados: prereqTopic.materiales
      });

      if (!passed) {
        await prisma.fallaEncontrada.create({
          data: {
            id_estudiante: studentId,
            id_tema_que_le_falta: prereqTopic.id_tema,
            id_tema_donde_fallo_originalmente: quiz.id_tema,
            seguridad_del_sistema_en_su_falla: Number(
              (100 - grade).toFixed(2)
            ),
            tipo_de_falla:
              prereqState === 'sin_evaluar' || prereqState === 'debil'
                ? 'raiz'
                : 'intermedia'
          }
        });
      }
    }

    // Si el nodo es un nodo raíz (sin prerrequisitos) y reprobó, registrar la falla raíz en el propio tema
    if (!passed && prereqEdges.length === 0) {
      const ownMaterials = await prisma.materialEstudio.findMany({
        where: { id_tema: quiz.id_tema, esta_visible_para_estudiantes: true },
        select: {
          id_material: true,
          titulo_del_material: true,
          enlace_para_descargar: true
        }
      });

      await prisma.fallaEncontrada.create({
        data: {
          id_estudiante: studentId,
          id_tema_que_le_falta: quiz.id_tema,
          id_tema_donde_fallo_originalmente: quiz.id_tema,
          seguridad_del_sistema_en_su_falla: Number((100 - grade).toFixed(2)),
          tipo_de_falla: 'raiz'
        }
      });

      recommendations.push({
        id_tema_prerrequisito: quiz.id_tema,
        nombre_del_tema: quiz.tema.nombre_del_tema,
        descripcion_del_tema: quiz.tema.descripcion_del_tema,
        importancia_prerrequisito: 100,
        estado_actual_estudiante: estadoAprendizaje,
        nota_actual_estudiante: grade,
        motivo: `Este es un tema base (raíz del grafo). Revisa sus materiales de estudio antes de volver a intentar el quiz.`,
        materiales_recomendados: ownMaterials
      });
    }
  }

  // 4. Actualizar y Recalcular Posición en el Ranking (ranking_por_tema)
  const existingRank = await prisma.rankingPorTema.findUnique({
    where: {
      id_tema_id_estudiante: {
        id_tema: quiz.id_tema,
        id_estudiante: studentId
      }
    }
  });

  const bestScore = existingRank
    ? Math.max(Number(existingRank.mejor_puntaje_obtenido), grade)
    : grade;

  const bestTime =
    existingRank && existingRank.mejor_tiempo_en_milisegundos
      ? Math.min(
          existingRank.mejor_tiempo_en_milisegundos,
          parsed.tiempo_total_en_milisegundos
        )
      : parsed.tiempo_total_en_milisegundos;

  await prisma.rankingPorTema.upsert({
    where: {
      id_tema_id_estudiante: {
        id_tema: quiz.id_tema,
        id_estudiante: studentId
      }
    },
    update: {
      mejor_puntaje_obtenido: bestScore,
      mejor_tiempo_en_milisegundos: bestTime
    },
    create: {
      id_tema: quiz.id_tema,
      id_estudiante: studentId,
      mejor_puntaje_obtenido: bestScore,
      mejor_tiempo_en_milisegundos: bestTime,
      posicion_en_el_ranking: 1
    }
  });

  const allTopicRankings = await prisma.rankingPorTema.findMany({
    where: { id_tema: quiz.id_tema },
    include: {
      estudiante: {
        select: {
          id_usuario: true,
          nombre_completo: true,
          codigo_sis: true
        }
      }
    },
    orderBy: [
      { mejor_puntaje_obtenido: 'desc' },
      { mejor_tiempo_en_milisegundos: 'asc' }
    ]
  });

  let studentRankPosition = 1;
  for (let idx = 0; idx < allTopicRankings.length; idx++) {
    const row = allTopicRankings[idx];
    const pos = idx + 1;
    if (row.posicion_en_el_ranking !== pos) {
      await prisma.rankingPorTema.update({
        where: { id_ranking: row.id_ranking },
        data: { posicion_en_el_ranking: pos }
      });
    }
    if (Number(row.id_estudiante) === studentId) {
      studentRankPosition = pos;
    }
  }

  // 5. Actualizar resumen_estadisticas_materia
  const subjectAttempts = await prisma.intentoDeQuiz.findMany({
    where: {
      quiz: { id_materia: quiz.id_materia },
      estado_del_intento: 'completado'
    }
  });

  if (subjectAttempts.length > 0) {
    const totalQuizzes = subjectAttempts.length;
    const sumGrades = subjectAttempts.reduce(
      (acc, a) => acc + normalizeGradeTo100(a.puntaje_que_obtuvo),
      0
    );
    const avgGrade = Number((sumGrades / totalQuizzes).toFixed(2));
    const approvedCount = subjectAttempts.filter(
      (a) => normalizeGradeTo100(a.puntaje_que_obtuvo) >= passingThreshold
    ).length;
    const failedCount = totalQuizzes - approvedCount;

    await prisma.resumenEstadisticasMateria.upsert({
      where: { id_materia: quiz.id_materia },
      update: {
        total_de_quices_realizados: totalQuizzes,
        promedio_general_de_notas: avgGrade,
        cantidad_de_aprobados: approvedCount,
        cantidad_de_reprobados: failedCount
      },
      create: {
        id_materia: quiz.id_materia,
        total_de_quices_realizados: totalQuizzes,
        promedio_general_de_notas: avgGrade,
        cantidad_de_aprobados: approvedCount,
        cantidad_de_reprobados: failedCount
      }
    });
  }

  await prisma.registroAuditoria.create({
    data: {
      id_usuario: studentId,
      accion_realizada: 'SUBMIT_QUIZ_EVALUATION',
      tabla_afectada: 'intento_de_quiz',
      id_del_registro_afectado: intento.id_intento
    }
  });

  return {
    id_intento: intento.id_intento,
    id_quiz: quiz.id_quiz,
    id_tema: quiz.id_tema,
    nombre_del_tema: quiz.tema.nombre_del_tema,
    score: correctCount,
    maxScore: totalQuestions,
    grade,
    passingThreshold,
    passed,
    estado_de_aprendizaje: estadoAprendizaje,
    rank: studentRankPosition,
    totalParticipantsInRank: allTopicRankings.length,
    leaderboard: allTopicRankings.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      id_estudiante: r.id_estudiante,
      nombre_completo: r.estudiante.nombre_completo,
      mejor_puntaje_obtenido: r.mejor_puntaje_obtenido,
      mejor_tiempo_en_milisegundos: r.mejor_tiempo_en_milisegundos
    })),
    recommendations,
    feedback: feedbackBreakdown
  };
}

async function getSubjectHeatmap(subjectId) {
  const id_materia = Number(subjectId);
  if (!id_materia || Number.isNaN(id_materia)) {
    throw new AppError('ID de materia inválido', 400);
  }

  const materia = await prisma.materiaAsignatura.findUnique({
    where: { id_materia },
    include: {
      resumen_estadisticas: true,
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
      evaluaciones_quiz: {
        include: {
          intentos: {
            where: { estado_del_intento: 'completado' }
          }
        }
      },
      progresos_actuales: true,
      fallas_como_faltante: true,
      fallas_como_origen: true
    },
    orderBy: { id_tema: 'asc' }
  });

  const nodesHeatmap = temas.map((tema, idx) => {
    const threshold = normalizeThresholdTo100(tema.nota_minima_para_aprobar);

    // Recolectar calificaciones desde intentos completados y progreso_actual
    const attemptGrades = tema.evaluaciones_quiz.flatMap((q) =>
      q.intentos.map((i) => normalizeGradeTo100(i.puntaje_que_obtuvo))
    );
    const progressGrades = tema.progresos_actuales.map((p) =>
      normalizeGradeTo100(p.nota_actual_del_tema)
    );

    const allGrades =
      attemptGrades.length > 0 ? attemptGrades : progressGrades;

    const totalEvaluations = allGrades.length;
    const passedCount = allGrades.filter((g) => g >= threshold).length;
    const failedCount = totalEvaluations - passedCount;

    const averageGrade =
      totalEvaluations > 0
        ? Number(
            (
              allGrades.reduce((acc, val) => acc + val, 0) / totalEvaluations
            ).toFixed(2)
          )
        : null;

    const bestGrade =
      totalEvaluations > 0 ? Math.max(...allGrades) : null;
    const worstGrade =
      totalEvaluations > 0 ? Math.min(...allGrades) : null;

    const failureRate =
      totalEvaluations > 0
        ? Number(((failedCount / totalEvaluations) * 100).toFixed(2))
        : 0;

    const detectedGapsCount =
      tema.fallas_como_faltante.length + tema.fallas_como_origen.length;

    let heatLevel = 'NO_DATA_GRAY';
    let heatColor = '#94A3B8';
    if (totalEvaluations > 0) {
      if (failureRate >= 50 || (averageGrade !== null && averageGrade < 65)) {
        heatLevel = 'CRITICAL_RED';
        heatColor = '#EF4444';
      } else if (averageGrade !== null && averageGrade < threshold) {
        heatLevel = 'WARNING_AMBER';
        heatColor = '#F59E0B';
      } else {
        heatLevel = 'HEALTHY_GREEN';
        heatColor = '#10B981';
      }
    }

    return {
      id_tema: tema.id_tema,
      nodeId: String(tema.id_tema),
      nombre_del_tema: tema.nombre_del_tema,
      position: {
        x: tema.posicion_x || (idx % 3) * 260 + 80,
        y: tema.posicion_y || Math.floor(idx / 3) * 160 + 80
      },
      passingThreshold: threshold,
      totalEvaluations,
      passedCount,
      failedCount,
      failureRate,
      averageGrade,
      bestGrade,
      worstGrade,
      detectedGapsCount,
      heatLevel,
      heatColor
    };
  });

  const evaluatedNodes = nodesHeatmap.filter((n) => n.totalEvaluations > 0);

  const bestPerformingNodes = [...evaluatedNodes]
    .sort((a, b) => (b.averageGrade || 0) - (a.averageGrade || 0))
    .slice(0, 3);

  const worstPerformingNodes = [...evaluatedNodes]
    .sort((a, b) => (a.averageGrade || 0) - (b.averageGrade || 0))
    .slice(0, 3);

  const mostFailedNodes = [...nodesHeatmap]
    .sort(
      (a, b) =>
        b.failedCount +
        b.detectedGapsCount -
        (a.failedCount + a.detectedGapsCount)
    )
    .filter((n) => n.failedCount > 0 || n.detectedGapsCount > 0)
    .slice(0, 3);

  return {
    subject: {
      id_materia: materia.id_materia,
      nombre_de_la_materia: materia.nombre_de_la_materia,
      codigo_de_la_materia: materia.codigo_de_la_materia,
      docente: materia.docente,
      resumen_estadisticas: materia.resumen_estadisticas
    },
    summary: {
      totalNodes: nodesHeatmap.length,
      evaluatedNodesCount: evaluatedNodes.length,
      criticalNodesCount: nodesHeatmap.filter(
        (n) => n.heatLevel === 'CRITICAL_RED'
      ).length,
      warningNodesCount: nodesHeatmap.filter(
        (n) => n.heatLevel === 'WARNING_AMBER'
      ).length,
      healthyNodesCount: nodesHeatmap.filter(
        (n) => n.heatLevel === 'HEALTHY_GREEN'
      ).length,
      bestPerformingNodes,
      worstPerformingNodes,
      mostFailedNodes
    },
    nodes: nodesHeatmap
  };
}

module.exports = {
  getQuizForTaking,
  submitQuiz,
  getSubjectHeatmap
};
