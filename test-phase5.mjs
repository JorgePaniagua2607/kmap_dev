import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`✅ [OK] ${label}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 TEST DE VERIFICACIÓN — FASE 5 (EVALUACIÓN, RANKING Y HEATMAP)');
console.log('====================================================\n');

const requiredPhase5Files = [
  'backend/src/services/evaluation.service.js',
  'backend/src/controllers/quiz.controller.js',
  'backend/src/routes/quiz.routes.js',
  'backend/src/controllers/graph.controller.js',
  'backend/src/routes/graph.routes.js',
  'frontend/src/App.jsx'
];

for (const relPath of requiredPhase5Files) {
  const fullPath = path.join(ROOT, relPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;
  check(`Archivo Fase 5 existente y no vacío: ${relPath}`, exists);
}

const evalServiceCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/services/evaluation.service.js'),
  'utf8'
);

check(
  'Evaluación de Quiz calcula puntaje y nota (grade 0-100) en el servidor',
  evalServiceCode.includes('submitQuiz') &&
    evalServiceCode.includes('feedbackBreakdown')
);
check(
  'Persistencia de intento_de_quiz y respuesta_estudiante',
  evalServiceCode.includes('intentoDeQuiz.create') &&
    evalServiceCode.includes('respuestaEstudiante.create')
);
check(
  'Actualización de progreso_actual e historial_de_progreso',
  evalServiceCode.includes('progresoActual.upsert') &&
    evalServiceCode.includes('historialDeProgreso.create')
);
check(
  'Generación de recomendaciones basadas en prerrequisitos del grafo (requisito_entre_temas) y registro en falla_encontrada',
  evalServiceCode.includes('requisitoEntreTemas.findMany') &&
    evalServiceCode.includes('fallaEncontrada.create') &&
    evalServiceCode.includes('recommendations')
);
check(
  'Cálculo y actualización de posición en el ranking (ranking_por_tema -> rank)',
  evalServiceCode.includes('rankingPorTema.upsert') &&
    evalServiceCode.includes('posicion_en_el_ranking')
);
check(
  'Mapa de calor por nodo (getSubjectHeatmap) con promedio, tasa de fallo, brechas y mejores/peores nodos',
  evalServiceCode.includes('getSubjectHeatmap') &&
    evalServiceCode.includes('bestPerformingNodes') &&
    evalServiceCode.includes('worstPerformingNodes') &&
    evalServiceCode.includes('mostFailedNodes')
);

const quizRoutesCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/routes/quiz.routes.js'),
  'utf8'
);
check(
  'Endpoint POST /api/quizzes/:quizId/submit registrado en quiz.routes.js',
  quizRoutesCode.includes("'/:quizId/submit'")
);

const graphRoutesCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/routes/graph.routes.js'),
  'utf8'
);
check(
  'Endpoint GET /api/subjects/:subjectId/heatmap registrado en graph.routes.js',
  graphRoutesCode.includes("'/:subjectId/heatmap'")
);

console.log('\n====================================================');
console.log(`📊 RESULTADO FASE 5: ${passed} pruebas exitosas, ${failed} fallidas.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
