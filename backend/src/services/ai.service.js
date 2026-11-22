const { generateQuizWithLLM, readMaterials, callGemini, hasGeminiKey } = require('./quizAI.service');

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'ante', 'bajo',
  'con', 'contra', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'segun', 'sin', 'sobre',
  'tras', 'y', 'e', 'o', 'u', 'ni', 'que', 'cual', 'cuales', 'quien', 'quienes', 'como', 'cuando',
  'donde', 'es', 'son', 'fue', 'fueron', 'ser', 'esta', 'estan', 'este', 'esta', 'estos', 'estas',
  'eso', 'esa', 'esos', 'esas', 'se', 'su', 'sus', 'le', 'les', 'lo', 'me', 'te', 'nos', 'mi', 'tu',
  'mas', 'menos', 'muy', 'ya', 'no', 'si', 'pero', 'sino', 'porque', 'aunque', 'tambien', 'solo',
  'todo', 'toda', 'todos', 'todas', 'cada', 'otro', 'otra', 'otros', 'otras', 'mismo', 'misma',
  'siguiente', 'siguientes', 'correcta', 'correcto', 'incorrecta', 'afirmacion', 'opcion', 'pregunta',
]);

function normalizeText(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str = '') {
  return normalizeText(str)
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !SPANISH_STOPWORDS.has(w));
}

function formatListEs(items = []) {
  const arr = items.map((x) => `«${x}»`);
  if (arr.length <= 1) return arr[0] || '';
  if (arr.length === 2) return `${arr[0]} y ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`;
}

function pluralFallo(n) {
  return `${n} ${n === 1 ? 'fallo' : 'fallos'}`;
}

/**
 * Construye el perfil de conocimiento de cada nodo prerrequisito
 * (nombre, descripción, preguntas propias del nodo y extractos de sus materiales).
 */
async function buildPrerequisiteProfiles(prereqs, allQuestions = []) {
  const profiles = [];
  for (const p of prereqs) {
    const topicQuestions = allQuestions
      .filter((q) => q.topicId === p.id)
      .slice(0, 6)
      .map((q) => q.text);

    let materialExcerpts = '';
    const materialTitles = (p.materials || [])
      .map((m) => m.title || m.titulo_del_material)
      .filter(Boolean);

    if ((p.materials || []).length > 0) {
      try {
        const { texts } = await readMaterials(p.materials);
        materialExcerpts = texts
          .map((t) => `${t.title}: ${t.text.slice(0, 600)}`)
          .join('\n')
          .slice(0, 1200);
      } catch {
        materialExcerpts = '';
      }
    }

    profiles.push({
      id: p.id,
      name: p.name,
      desc: p.desc || '',
      materialTitles,
      materialExcerpts,
      sampleQuestions: topicQuestions,
    });
  }
  return profiles;
}

/**
 * Clasificador determinístico de respaldo (cuando Gemini no está disponible)
 * que relaciona cada pregunta del quiz con el nodo prerrequisito más afín por vocabulario/conceptos.
 */
function classifyByKeywords(answers, profiles) {
  const profileTokens = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    nameTokens: new Set(tokenize(p.name)),
    descTokens: new Set(tokenize(p.desc)),
    extraTokens: new Set(tokenize([...p.materialTitles, p.materialExcerpts, ...p.sampleQuestions].join(' '))),
  }));

  return answers.map((a, idx) => {
    const qTokens = tokenize(`${a.text || ''} ${a.correctOption || ''} ${a.selectedOption || ''}`);
    let bestId = null;
    let bestScore = 0;

    for (const pt of profileTokens) {
      let score = 0;
      for (const tok of qTokens) {
        if (pt.nameTokens.has(tok)) score += 3;
        else if (pt.descTokens.has(tok)) score += 2;
        else if (pt.extraTokens.has(tok)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestId = pt.id;
      }
    }

    return {
      index: idx,
      prereqId: bestScore > 0 ? bestId : null,
      reason: bestScore > 0 ? 'Coincidencia conceptual con el contenido del tema prerrequisito' : null,
    };
  });
}

/**
 * Usa Gemini AI para identificar a cuál de los nodos prerrequisito (ej. Tema 2 vs Tema 2.2)
 * corresponde cada pregunta respondida en el quiz del tema actual (ej. Tema 3).
 */
async function classifyQuestionsWithAI({ subjectName, currentTopic, profiles, answers }) {
  const validIds = new Set(profiles.map((p) => p.id));

  if (!hasGeminiKey() || answers.length === 0) {
    return {
      provider: 'heuristic',
      model: null,
      mappings: classifyByKeywords(answers, profiles),
    };
  }

  const prereqsSummary = profiles
    .map((p) => {
      const lines = [`- ID: "${p.id}" | Nombre: "${p.name}"`];
      if (p.desc) lines.push(`  Descripción: ${p.desc}`);
      if (p.materialTitles.length) lines.push(`  Materiales: ${p.materialTitles.join(', ')}`);
      if (p.sampleQuestions.length) lines.push(`  Preguntas propias del tema: ${p.sampleQuestions.join(' | ')}`);
      if (p.materialExcerpts) lines.push(`  Extracto de material: ${p.materialExcerpts}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const answersSummary = answers
    .map(
      (a, idx) =>
        `[${idx}] (${a.isCorrect ? 'CORRECTA' : 'FALLADA'}) Pregunta: "${a.text || ''}"` +
        (a.correctOption ? ` | Respuesta correcta: "${a.correctOption}"` : '') +
        (!a.isCorrect && a.selectedOption ? ` | Estudiante eligió: "${a.selectedOption}"` : '')
    )
    .join('\n');

  const prompt = [
    'Eres un motor de diagnóstico educativo experto en grafos de conocimiento (DAG) para BIT ACADEMY - KMAP.',
    `Materia: «${subjectName}»`,
    `El estudiante acaba de reprobar el quiz del tema actual: «${currentTopic.name}»${currentTopic.desc ? ` (${currentTopic.desc})` : ''}.`,
    `Según el grafo de prerrequisitos, para dominar «${currentTopic.name}» se requieren los siguientes nodos anteriores (prerrequisitos directos):`,
    '',
    prereqsSummary,
    '',
    'Estas son las preguntas del quiz que respondió el estudiante:',
    answersSummary,
    '',
    'TAREA OBLIGATORIA:',
    'Para CADA pregunta (índices 0 a ' + (answers.length - 1) + '), identifica a cuál de los nodos prerrequisito anteriores corresponde principalmente su contenido conceptual.',
    '- Usa EXACTAMENTE uno de los IDs listados arriba en "prereqId" (el prerrequisito cuyo conocimiento es más necesario para responder bien esa pregunta).',
    '- Usa null en "prereqId" ÚNICAMENTE si la pregunta no guarda relación conceptual con ninguno de los prerrequisitos.',
    '- Incluye una razón muy breve (máximo 15 palabras) en español.',
    '',
    'Responde ÚNICAMENTE con JSON válido con esta estructura exacta:',
    '{"mappings":[{"index":0,"prereqId":"t-2","reason":"Evalúa conceptos de ..."}]}',
  ].join('\n');

  try {
    const { data, model } = await callGemini({ prompt, pdfs: [] });
    const rawList = Array.isArray(data?.mappings) ? data.mappings : [];
    const byIndex = new Map();
    for (const item of rawList) {
      const idx = Number(item?.index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= answers.length) continue;
      const pid = item?.prereqId && validIds.has(String(item.prereqId)) ? String(item.prereqId) : null;
      byIndex.set(idx, {
        index: idx,
        prereqId: pid,
        reason: String(item?.reason || '').trim() || null,
      });
    }

    // Completar con respaldo de palabras clave si algún índice faltó
    const fallback = classifyByKeywords(answers, profiles);
    const mappings = answers.map((_, idx) => byIndex.get(idx) || fallback[idx]);

    return {
      provider: 'gemini',
      model,
      mappings,
    };
  } catch (err) {
    console.warn('[AI] Fallback a clasificador de palabras clave en recomendación de grafo:', err.message);
    return {
      provider: 'heuristic',
      model: null,
      mappings: classifyByKeywords(answers, profiles),
    };
  }
}

/**
 * Motor de IA que escanea y entiende el grafo de conocimiento (DAG) de la materia
 * cuando el estudiante termina un quiz:
 *  - Si REPRUEBA (score < 51):
 *      1) Escanea el grafo para detectar los nodos anteriores (prerrequisitos incidentes en el tema actual).
 *      2) Si hay un único nodo anterior (ej. Tema 2 -> Tema 3), recomienda estudiar ese nodo («Tema 2»).
 *      3) Si inciden múltiples nodos anteriores (ej. Tema 2 y Tema 2.2 -> Tema 3), usa IA para identificar
 *         qué preguntas del quiz corresponden a cada prerrequisito, cuenta en cuál falló más el estudiante
 *         y recomienda primero el nodo con más preguntas falladas.
 *  - Si APRUEBA (score >= 51):
 *      Recomienda el siguiente nodo en el grafo DAG para continuar su ruta de aprendizaje.
 */
async function generateGraphRecommendation({
  state,
  userId,
  subjectId,
  topicId,
  score,
  answers = [],
  PASS = 51,
}) {
  const topics = (state.topics || []).filter((t) => t.subjectId === subjectId);
  const edges = (state.edges || []).filter((e) => e.subjectId === subjectId);
  const currentTopic = topics.find((t) => t.id === topicId);
  const currentSubject = (state.subjects || []).find((s) => s.id === subjectId);
  const subjectName = currentSubject?.name || 'la materia';

  if (!currentTopic) {
    return {
      passed: score >= PASS,
      action: score >= PASS ? 'advance_next' : 'review_previous',
      message: 'Continúa explorando el grafo de conocimiento de tu materia.',
      recommendedTopics: [],
    };
  }

  // Calcular mejor nota histórica del estudiante en cada nodo del grafo
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

  // Prerrequisitos directos que inciden en el tema actual (source -> topicId)
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

  const passed = Number(score) >= PASS;

  // =========================================================================
  // CASO 1: EL ESTUDIANTE REPRUEBA EL QUIZ (score < 51%) -> ESCANEAR GRAFO Y RECOMENDAR NODO ANTERIOR
  // =========================================================================
  if (!passed) {
    const normalizedAnswers = Array.isArray(answers)
      ? answers.map((a) => ({
          questionId: a.questionId || null,
          text: String(a.text || '').trim(),
          selectedOption: String(a.selectedOption || '').trim(),
          correctOption: String(a.correctOption || '').trim(),
          isCorrect: Boolean(a.isCorrect),
        }))
      : [];

    // 1A. MÚLTIPLES PRERREQUISITOS DIRECTOS (ej. Tema 2 y Tema 2.2 inciden en Tema 3)
    if (directPrereqs.length >= 2) {
      const profiles = await buildPrerequisiteProfiles(directPrereqs, state.questions || []);
      const classification = await classifyQuestionsWithAI({
        subjectName,
        currentTopic,
        profiles,
        answers: normalizedAnswers,
      });

      const statsById = new Map(
        directPrereqs.map((p) => [
          p.id,
          {
            topic: p,
            failedCount: 0,
            passedCount: 0,
            totalMapped: 0,
            failedQuestions: [],
            bestScore: bestScoreOf(p.id),
          },
        ])
      );

      const questionMapping = classification.mappings.map((m) => {
        const ans = normalizedAnswers[m.index];
        const stat = m.prereqId ? statsById.get(m.prereqId) : null;
        if (stat && ans) {
          stat.totalMapped += 1;
          if (ans.isCorrect) {
            stat.passedCount += 1;
          } else {
            stat.failedCount += 1;
            stat.failedQuestions.push(ans.text);
          }
        }
        return {
          question: ans?.text || '',
          isCorrect: Boolean(ans?.isCorrect),
          mappedTopicId: stat ? stat.topic.id : null,
          mappedTopicName: stat ? stat.topic.name : null,
          reason: m.reason || null,
        };
      });

      // Ordenar prerrequisitos: 1) más fallos, 2) mayor tasa de fallo, 3) menor nota histórica
      const ranked = [...statsById.values()].sort((a, b) => {
        if (b.failedCount !== a.failedCount) return b.failedCount - a.failedCount;
        const rateA = a.totalMapped > 0 ? a.failedCount / a.totalMapped : 0;
        const rateB = b.totalMapped > 0 ? b.failedCount / b.totalMapped : 0;
        if (rateB !== rateA) return rateB - rateA;
        const scoreA = a.bestScore === null ? -1 : a.bestScore;
        const scoreB = b.bestScore === null ? -1 : b.bestScore;
        return scoreA - scoreB;
      });

      const top = ranked[0];
      const second = ranked[1];
      const prereqNamesList = formatListEs(directPrereqs.map((p) => p.name));
      const totalFailed = normalizedAnswers.filter((a) => !a.isCorrect).length;

      let message;
      if (top.failedCount > 0 && top.failedCount > second.failedCount) {
        const comparison = ranked
          .map((r) => `«${r.topic.name}» (${pluralFallo(r.failedCount)})`)
          .join(' frente a ');
        message =
          `Obtuviste ${score}% en «${currentTopic.name}». Según el grafo de «${subjectName}», para dominar este tema necesitas ${prereqNamesList}. ` +
          `Al analizar tus respuestas, fallaste más preguntas correspondientes a «${top.topic.name}» (${comparison}), por lo que deberías estudiar primero «${top.topic.name}».`;
      } else if (top.failedCount > 0 && top.failedCount === second.failedCount) {
        message =
          `Obtuviste ${score}% en «${currentTopic.name}». Según el grafo de «${subjectName}», este tema depende de ${prereqNamesList}. ` +
          `Detecté ${pluralFallo(top.failedCount)} tanto en «${top.topic.name}» como en «${second.topic.name}»; te recomiendo comenzar estudiando «${top.topic.name}» y luego repasar «${second.topic.name}».`;
      } else {
        message =
          `Obtuviste ${score}% en «${currentTopic.name}». Según el grafo de «${subjectName}», este tema requiere dominar ${prereqNamesList}. ` +
          `Deberías estudiar primero «${top.topic.name}» para reforzar la base antes de volver a intentar el quiz.`;
      }

      return {
        passed: false,
        action: 'review_previous',
        message,
        recommendedTopics: ranked.map((r) => ({
          id: r.topic.id,
          name: r.topic.name,
          desc: r.topic.desc,
          bestScore: r.bestScore,
          relation: 'prerrequisito',
          failedCount: r.failedCount,
          totalMapped: r.totalMapped,
        })),
        analysis: {
          provider: classification.provider,
          model: classification.model,
          analyzedQuestions: normalizedAnswers.length,
          failedQuestions: totalFailed,
          prerequisiteBreakdown: ranked.map((r) => ({
            topicId: r.topic.id,
            name: r.topic.name,
            failedCount: r.failedCount,
            totalMapped: r.totalMapped,
            failedQuestions: r.failedQuestions,
          })),
          questionMapping,
        },
      };
    }

    // 1B. UN ÚNICO PRERREQUISITO DIRECTO (ej. Tema 2 -> Tema 3)
    if (directPrereqs.length === 1) {
      const primaryPrev = directPrereqs[0];
      // Si hay otros ancestros no aprobados detrás del prerrequisito directo, ofrecerlos como secundarios
      const extraAncestors = allAncestors.filter(
        (t) => t.id !== primaryPrev.id && (bestScoreOf(t.id) === null || bestScoreOf(t.id) < PASS)
      );
      const recommendedPrev = [primaryPrev, ...extraAncestors];

      const message =
        `Obtuviste ${score}% en «${currentTopic.name}». Al escanear el grafo de «${subjectName}», detecté que el nodo anterior es «${primaryPrev.name}», ` +
        `por lo que deberías estudiar «${primaryPrev.name}» para reforzar la base antes de volver a intentar «${currentTopic.name}».`;

      return {
        passed: false,
        action: 'review_previous',
        message,
        recommendedTopics: recommendedPrev.map((t) => ({
          id: t.id,
          name: t.name,
          desc: t.desc,
          bestScore: bestScoreOf(t.id),
          relation: 'prerrequisito',
        })),
      };
    }

    // 1C. NODO RAÍZ (sin aristas entrantes): revisar nodo anterior en orden topológico o el propio nodo base
    let fallbackPrev = [];
    const myTopoIdx = topoOrderIds.indexOf(topicId);
    if (myTopoIdx > 0) {
      const prevTopoTopic = topics.find((t) => t.id === topoOrderIds[myTopoIdx - 1]);
      if (prevTopoTopic) fallbackPrev = [prevTopoTopic];
    }
    if (fallbackPrev.length === 0) {
      fallbackPrev = [currentTopic];
    }

    const primaryPrev = fallbackPrev[0];
    const isSelfRoot = primaryPrev.id === currentTopic.id;
    const message = isSelfRoot
      ? `Obtuviste ${score}% en «${currentTopic.name}» (nodo raíz de «${subjectName}»). Deberías repasar nuevamente los materiales de estudio de «${currentTopic.name}» antes de volver a intentar el quiz.`
      : `Obtuviste ${score}% en «${currentTopic.name}». Al escanear el grafo de «${subjectName}», deberías estudiar primero «${primaryPrev.name}» antes de volver a intentar «${currentTopic.name}».`;

    return {
      passed: false,
      action: 'review_previous',
      message,
      recommendedTopics: fallbackPrev.map((t) => ({
        id: t.id,
        name: t.name,
        desc: t.desc,
        bestScore: bestScoreOf(t.id),
        relation: isSelfRoot ? 'nodo_actual' : 'prerrequisito',
      })),
    };
  }

  // =========================================================================
  // CASO 2: EL ESTUDIANTE APROBÓ EL QUIZ (score >= 51%) -> RECOMENDAR SIGUIENTE NODO
  // =========================================================================
  let recommendedNext = directNextNodes.filter((t) => {
    const b = bestScoreOf(t.id);
    return b === null || b < PASS;
  });

  if (recommendedNext.length === 0 && directNextNodes.length > 0) {
    recommendedNext = directNextNodes;
  }

  if (recommendedNext.length === 0) {
    const unpassedInGraph = topoOrderIds
      .map((id) => topics.find((t) => t.id === id))
      .filter((t) => t && t.id !== topicId && (bestScoreOf(t.id) === null || bestScoreOf(t.id) < PASS));

    if (unpassedInGraph.length > 0) {
      recommendedNext = unpassedInGraph.slice(0, 2);
    }
  }

  if (recommendedNext.length === 0) {
    const myTopoIdx = topoOrderIds.indexOf(topicId);
    if (myTopoIdx >= 0 && myTopoIdx + 1 < topoOrderIds.length) {
      const nextTopo = topics.find((t) => t.id === topoOrderIds[myTopoIdx + 1]);
      if (nextTopo) recommendedNext = [nextTopo];
    }
  }

  const primaryNext = recommendedNext[0];
  const message = primaryNext
    ? `¡Excelente desempeño (${score}%) en «${currentTopic.name}»! Según el grafo de conocimiento de «${subjectName}», has desbloqueado la base necesaria y te recomiendo avanzar al siguiente nodo: «${primaryNext.name}».`
    : `¡Felicidades! Aprobaste «${currentTopic.name}» con ${score}% y has completado todos los nodos conectados en el grafo de «${subjectName}».`;

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
