const { generateQuizWithLLM } = require('./quizAI.service');

/**
 * Motor de IA que lee y entiende todos los grafos de conocimiento (DAG) del sistema
 * para recomendar temas al estudiante cada vez que finaliza un quiz:
 *  - Si reprueba (score < 51): recomienda el nodo anterior (prerrequisito en el grafo) para reforzar la base.
 *  - Si aprueba (score >= 51): recomienda el siguiente nodo en el grafo DAG para continuar su ruta de aprendizaje.
 */
async function generateGraphRecommendation({
  state,
  userId,
  subjectId,
  topicId,
  score,
  PASS = 51,
}) {
  const topics = (state.topics || []).filter((t) => t.subjectId === subjectId);
  const edges = (state.edges || []).filter((e) => e.subjectId === subjectId);
  const currentTopic = topics.find((t) => t.id === topicId);
  const currentSubject = (state.subjects || []).find((s) => s.id === subjectId);

  if (!currentTopic) {
    return {
      passed: score >= PASS,
      action: score >= PASS ? 'advance' : 'review',
      message: 'Continúa explorando el grafo de conocimiento de tu materia.',
      recommendedTopics: [],
    };
  }

  // Calcular mejor nota del estudiante en cada nodo del grafo
  const bestScoreOf = (tid) => {
    const scores = (state.attempts || [])
      .filter((a) => a.userId === userId && a.topicId === tid)
      .map((a) => Number(a.score));
    return scores.length ? Math.max(...scores) : null;
  };

  // Orden topológico (Kahn) del grafo de la materia
  const indeg = Object.fromEntries(topics.map((t) => [t.id, 0]));
  const adj = Object.fromEntries(topics.map((t) => [t.id, []]));
  for (const e of edges) {
    if (indeg[e.target] !== undefined && adj[e.source]) {
      indeg[e.target]++;
      adj[e.source].push(e.target);
    }
  }
  const queue = topics.filter((t) => indeg[t.id] === 0).map((t) => t.id);
  const topoOrderIds = [];
  while (queue.length) {
    const u = queue.shift();
    topoOrderIds.push(u);
    for (const v of adj[u] || []) {
      if (--indeg[v] === 0) queue.push(v);
    }
  }
  for (const t of topics) {
    if (!topoOrderIds.includes(t.id)) topoOrderIds.push(t.id);
  }

  // Prerrequisitos directos (nodos anteriores que apuntan al tema actual: source -> topicId)
  const directPrereqs = edges
    .filter((e) => e.target === topicId)
    .map((e) => topics.find((t) => t.id === e.source))
    .filter(Boolean);

  // Todos los ancestros (prerrequisitos recursivos hacia atrás en el grafo)
  const allAncestors = [];
  const seenAnc = new Set();
  const walkBack = (id) => {
    for (const e of edges.filter((edge) => edge.target === id)) {
      if (seenAnc.has(e.source)) continue;
      seenAnc.add(e.source);
      const found = topics.find((t) => t.id === e.source);
      if (found) {
        allAncestors.push(found);
        walkBack(e.source);
      }
    }
  };
  walkBack(topicId);

  // Siguientes nodos directos (nodos hacia adelante a los que apunta el tema actual: topicId -> target)
  const directNextNodes = edges
    .filter((e) => e.source === topicId)
    .map((e) => topics.find((t) => t.id === e.target))
    .filter(Boolean);

  // Todos los sucesores hacia adelante en el grafo
  const allSuccessors = [];
  const seenSucc = new Set();
  const walkForward = (id) => {
    for (const e of edges.filter((edge) => edge.source === id)) {
      if (seenSucc.has(e.target)) continue;
      seenSucc.add(e.target);
      const found = topics.find((t) => t.id === e.target);
      if (found) {
        allSuccessors.push(found);
        walkForward(e.target);
      }
    }
  };
  walkForward(topicId);

  const passed = Number(score) >= PASS;

  // =========================================================================
  // CASO 1: EL ESTUDIANTE FALLÓ EL QUIZ (score < 51%) -> RECOMENDAR NODO ANTERIOR
  // =========================================================================
  if (!passed) {
    // 1.1 Buscar prerrequisitos/ancestros aún no aprobados (< 51% o sin evaluar), del más profundo al más cercano
    const unpassedAncestors = [...allAncestors]
      .reverse()
      .filter((t) => {
        const b = bestScoreOf(t.id);
        return b === null || b < PASS;
      });

    // 1.2 Si ya había aprobado los prerrequisitos pero falló este tema, recomendar el prerrequisito inmediato anterior
    let recommendedPrev = unpassedAncestors.length > 0 ? unpassedAncestors : directPrereqs;

    // 1.3 Si el tema actual es el nodo raíz (no tiene nodos anteriores en las aristas), buscar el anterior en orden topológico o el propio nodo base
    if (recommendedPrev.length === 0) {
      const myTopoIdx = topoOrderIds.indexOf(topicId);
      if (myTopoIdx > 0) {
        const prevTopoTopic = topics.find((t) => t.id === topoOrderIds[myTopoIdx - 1]);
        if (prevTopoTopic) recommendedPrev = [prevTopoTopic];
      }
    }
    if (recommendedPrev.length === 0) {
      recommendedPrev = [currentTopic];
    }

    const primaryPrev = recommendedPrev[0];
    const isSelfRoot = primaryPrev.id === currentTopic.id;

    const message = isSelfRoot
      ? `Obtuviste ${score}% en «${currentTopic.name}» (nodo raíz de ${currentSubject?.name || 'la materia'}). La IA recomienda revisar nuevamente los materiales de estudio de «${currentTopic.name}» antes de volver a intentar el quiz.`
      : `Obtuviste ${score}% en «${currentTopic.name}». Analizando el grafo de «${currentSubject?.name || 'la materia'}», la IA detectó que debes reforzar primero el nodo anterior «${primaryPrev.name}», ya que es prerrequisito directo para dominar «${currentTopic.name}».`;

    return {
      passed: false,
      action: 'review_previous',
      message,
      recommendedTopics: recommendedPrev.map((t) => ({
        id: t.id,
        name: t.name,
        desc: t.desc,
        bestScore: bestScoreOf(t.id),
        relation: t.id === currentTopic.id ? 'nodo_actual' : 'prerrequisito',
      })),
    };
  }

  // =========================================================================
  // CASO 2: EL ESTUDIANTE APROBÓ EL QUIZ (score >= 51%) -> RECOMENDAR SIGUIENTE NODO
  // =========================================================================
  // 2.1 Priorizar los siguientes nodos directos en el grafo (topicId -> target) que aún no estén dominados
  let recommendedNext = directNextNodes.filter((t) => {
    const b = bestScoreOf(t.id);
    return b === null || b < PASS;
  });

  // 2.2 Si todos los siguientes nodos directos ya fueron aprobados, igual mostrar los siguientes nodos directos o sucesores pendientes
  if (recommendedNext.length === 0 && directNextNodes.length > 0) {
    recommendedNext = directNextNodes;
  }

  // 2.3 Si este nodo es una hoja del grafo (no tiene flechas salientes), buscar el siguiente nodo pendiente en orden topológico del grafo
  if (recommendedNext.length === 0) {
    const unpassedInGraph = topoOrderIds
      .map((id) => topics.find((t) => t.id === id))
      .filter((t) => t && t.id !== topicId && (bestScoreOf(t.id) === null || bestScoreOf(t.id) < PASS));

    if (unpassedInGraph.length > 0) {
      recommendedNext = unpassedInGraph.slice(0, 2);
    }
  }

  // 2.4 Si ya aprobó absolutamente todos los nodos de este grafo, revisar otros grafos de la base de datos o recomendar el siguiente en orden topológico
  if (recommendedNext.length === 0) {
    const myTopoIdx = topoOrderIds.indexOf(topicId);
    if (myTopoIdx >= 0 && myTopoIdx + 1 < topoOrderIds.length) {
      const nextTopo = topics.find((t) => t.id === topoOrderIds[myTopoIdx + 1]);
      if (nextTopo) recommendedNext = [nextTopo];
    }
  }

  const primaryNext = recommendedNext[0];
  const message = primaryNext
    ? `¡Excelente desempeño (${score}%) en «${currentTopic.name}»! Según el grafo de conocimiento de «${currentSubject?.name || 'la materia'}», has desbloqueado la base necesaria y la IA te recomienda avanzar al siguiente nodo: «${primaryNext.name}».`
    : `¡Felicidades! Aprobaste «${currentTopic.name}» con ${score}% y has completado todos los nodos conectados en el grafo de «${currentSubject?.name || 'la materia'}».`;

  return {
    passed: true,
    action: 'advance_next',
    message,
    recommendedTopics: recommendedNext.map((t) => ({
      id: t.id,
      name: t.name,
      desc: t.desc,
      bestScore: bestScoreOf(t.id),
      relation: 'siguiente_nodo',
    })),
  };
}

module.exports = {
  generateStructuredQuiz: generateQuizWithLLM,
  generateGraphRecommendation,

};
