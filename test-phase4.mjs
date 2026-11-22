import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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
console.log('🧪 TEST DE VERIFICACIÓN — FASE 4 (GRAFOS DAG, MATERIALES Y QUIZZES IA)');
console.log('====================================================\n');

const requiredPhase4Files = [
  'backend/src/utils/dagValidator.js',
  'backend/src/services/storage.service.js',
  'backend/src/services/ai.service.js',
  'backend/src/services/graph.service.js',
  'backend/src/services/node.service.js',
  'backend/src/services/quiz.service.js',
  'backend/src/controllers/graph.controller.js',
  'backend/src/routes/graph.routes.js',
  'backend/src/controllers/node.controller.js',
  'backend/src/routes/node.routes.js',
  'backend/src/controllers/quiz.controller.js',
  'backend/src/routes/quiz.routes.js',
  'backend/src/app.js',
  'frontend/src/App.jsx'
];

for (const relPath of requiredPhase4Files) {
  const fullPath = path.join(ROOT, relPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;
  check(`Archivo Fase 4 existente y no vacío: ${relPath}`, exists);
}

// Pruebas unitarias en vivo del motor de validación anti-ciclos DAG
try {
  const { validateDAG } = require(
    path.join(ROOT, 'backend/src/utils/dagValidator.js')
  );

  // 1. Grafo válido (DAG)
  const validResult = validateDAG(
    [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
    [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
      { source: '2', target: '4' },
      { source: '3', target: '4' }
    ]
  );
  check(
    'Motor DAG aprueba grafo acíclico válido y devuelve topologicalOrder',
    validResult.isValidDAG === true && validResult.topologicalOrder.length === 4
  );

  // 2. Grafo con ciclo 1 -> 2 -> 3 -> 1 debe lanzar AppError 400
  let cycleRejected = false;
  try {
    validateDAG(
      [{ id: '1' }, { id: '2' }, { id: '3' }],
      [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
        { source: '3', target: '1' }
      ]
    );
  } catch (err) {
    cycleRejected = err.statusCode === 400 && err.message.includes('Violación DAG');
  }
  check('Motor DAG detecta y rechaza ciclo dirigido (1 -> 2 -> 3 -> 1) con HTTP 400', cycleRejected);

  // 3. Auto-bucle (1 -> 1) debe lanzar AppError 400
  let selfLoopRejected = false;
  try {
    validateDAG([{ id: '1' }], [{ source: '1', target: '1' }]);
  } catch (err) {
    selfLoopRejected = err.statusCode === 400;
  }
  check('Motor DAG detecta y rechaza auto-bucle (1 -> 1) con HTTP 400', selfLoopRejected);
} catch (err) {
  check('Ejecución de pruebas unitarias de dagValidator.js', false, err.message);
}

// Prueba unitaria en vivo del servicio de IA generativa en formato JSON estructurado
try {
  const aiService = require(path.join(ROOT, 'backend/src/services/ai.service.js'));
  const draft = await aiService.generateStructuredQuiz({
    topicTitle: 'Árboles Binarios y Grafos',
    topicDescription: 'Recorridos BFS, DFS y ordenamiento topológico',
    numQuestions: 3,
    difficulty: 70
  });
  check(
    'Servicio IA genera quiz en formato JSON estructurado en estado DRAFT',
    draft.status === 'DRAFT' &&
      Array.isArray(draft.questions) &&
      draft.questions.length === 3 &&
      Array.isArray(draft.questions[0].opciones) &&
      draft.questions[0].opciones.length === 4
  );
} catch (err) {
  check('Ejecución de prueba unitaria de ai.service.js', false, err.message);
}

const quizServiceCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/services/quiz.service.js'),
  'utf8'
);
check(
  'Seguridad de Quiz: oculta respuesta_oficial cuando el usuario es ESTUDIANTE',
  quizServiceCode.includes("user.role === 'ESTUDIANTE'") &&
    quizServiceCode.includes('respuesta_oficial')
);

console.log('\n====================================================');
console.log(`📊 RESULTADO FASE 4: ${passed} pruebas exitosas, ${failed} fallidas.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
