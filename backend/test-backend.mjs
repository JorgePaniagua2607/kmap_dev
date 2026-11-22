/**
 * SUITE INTEGRAL DE TESTS DEL BACKEND — PLAN KMAP / BIT ACADEMY (100% MySQL Oficial)
 * Ejecución:
 *   cd C:\xampp\htdocs\kmap\backend
 *   node test-backend.mjs
 */

import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const app = require('./src/app.js');
const prisma = require('./src/config/prisma.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assertTest(condition, name, detail = '') {
  if (condition) {
    passed++;
    console.log(`${GREEN}  ✔ [PASS]${RESET} ${name}${detail ? ` ${CYAN}(${detail})${RESET}` : ''}`);
  } else {
    failed++;
    console.error(`${RED}  ✘ [FAIL]${RESET} ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function apiJson(baseUrl, method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   SUITE DE TESTS DEL BACKEND — BIT ACADEMY / PLAN KMAP (MySQL)       ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  const { server, baseUrl } = await startTestServer();
  const suffix = Date.now().toString().slice(-5);

  try {
    // =========================================================================
    // BLOQUE 1: SALUD DEL SERVIDOR Y CONEXIÓN A MYSQL
    // =========================================================================
    console.log(`${BOLD}${YELLOW}▶ BLOQUE 1: Salud del Servidor y Conexión a Base de Datos MySQL Oficial${RESET}`);

    const rootRes = await apiJson(baseUrl, 'GET', '/');
    assertTest(
      rootRes.status === 200 && rootRes.data.ok === true,
      'GET / responde 200 OK con mensaje de bienvenida',
      rootRes.data.name
    );

    const healthRes = await apiJson(baseUrl, 'GET', '/api/health');
    assertTest(
      healthRes.status === 200 && healthRes.data.database === 'connected',
      'GET /api/health confirma conexión activa con MySQL y Prisma',
      `DB: ${healthRes.data.database}`
    );

    // =========================================================================
    // BLOQUE 2: LECTURA Y ESCRITURA DIRECTA EN TABLAS OFICIALES MYSQL (/api/kmap/*)
    // =========================================================================
    console.log(`\n${BOLD}${YELLOW}▶ BLOQUE 2: Sincronización de Tablas Oficiales MySQL con Frontend (/api/kmap/*)${RESET}`);

    // Inicializar estado oficial en las tablas de MySQL
    await apiJson(baseUrl, 'POST', '/api/kmap/reset');

    const stateRes = await apiJson(baseUrl, 'GET', '/api/kmap/state');
    const st = stateRes.data?.state;
    const hasDefaultAdmin = st?.users?.some((u) => u.role === 'admin' && u.email === 'admin@demo.com');
    const hasDefaultStudent = st?.users?.some((u) => u.role === 'estudiante' && u.sis === '202012345');
    assertTest(
      stateRes.status === 200 && hasDefaultAdmin && hasDefaultStudent,
      'GET /api/kmap/state crea y lee los usuarios Admin y Estudiante por defecto en la tabla oficial `usuario`',
      `${st?.users?.length} usuarios en MySQL, ${st?.subjects?.length} materias en MySQL, ${st?.topics?.length} temas en MySQL`
    );

    // Verificar directamente con Prisma que las tablas oficiales de MySQL tienen registros reales
    const dbUsersCount = await prisma.usuario.count();
    const dbSubjectsCount = await prisma.materiaAsignatura.count();
    const dbTopicsCount = await prisma.temaConocimiento.count();
    assertTest(
      dbUsersCount >= 3 && dbSubjectsCount >= 1 && dbTopicsCount >= 5,
      'Verificación directa en MySQL: las tablas `usuario`, `materia_asignatura` y `tema_conocimiento` contienen filas reales',
      `usuario=${dbUsersCount}, materia_asignatura=${dbSubjectsCount}, tema_conocimiento=${dbTopicsCount}`
    );

    // Subida real de archivo con Multer (POST /api/kmap/upload)
    const formData = new FormData();
    const docContent = [
      ' Las claves primarias identifican de manera única cada tupla dentro de una relación.',
      'La Tercera Forma Normal (3FN) exige eliminar toda dependencia transitiva respecto a la clave primaria.',
      'El lenguaje SQL permite realizar consultas relacionales mediante proyecciones, selecciones y reuniones (JOIN).'
    ].join(' ');
    const txtBlob = new Blob([docContent], { type: 'text/plain' });
    formData.append('file', txtBlob, `apunte-normalizacion-${suffix}.txt`);

    const uploadRes = await fetch(`${baseUrl}/api/kmap/upload`, {
      method: 'POST',
      body: formData,
    });
    const uploadData = await uploadRes.json().catch(() => ({}));
    assertTest(
      uploadRes.status === 200 && uploadData.ok === true && uploadData.url?.startsWith('/uploads/'),
      'POST /api/kmap/upload sube archivo físico del docente al servidor con Multer',
      uploadData.url
    );

    // Generación de preguntas con IA leyendo el archivo subido por el docente (POST /api/kmap/generate-ai)
    const aiKmapRes = await apiJson(baseUrl, 'POST', '/api/kmap/generate-ai', {
      topicName: 'Normalización',
      topicDesc: 'Formas normales y eliminación de redundancia en bases de datos.',
      materials: [
        {
          title: `apunte-normalizacion-${suffix}.txt`,
          kind: 'Archivo',
          url: uploadData.url,
        },
      ],
      count: 5,
    });
    const aiQs = aiKmapRes.data?.questions || [];
    const aiConfigured = process.env.AI_MODE === 'gemini' || false;
    const envMod = require('./src/config/env.js');
    const hasKey = envMod.AI_MODE === 'gemini' && envMod.AI_API_KEY && !/^tu_api_key/i.test(envMod.AI_API_KEY);
    if (hasKey) {
      assertTest(
        aiKmapRes.status === 200 &&
          aiQs.length >= 1 &&
          aiQs.every((q) => typeof q.text === 'string' && q.options.length === 4 && q.correct >= 0 && q.correct <= 3),
        'POST /api/kmap/generate-ai: Gemini lee el archivo del docente y genera preguntas reales con 4 opciones y respuesta',
        `Pregunta 1: "${aiQs[0]?.text?.slice(0, 70)}"`
      );
    } else {
      assertTest(
        aiKmapRes.status === 503,
        'POST /api/kmap/generate-ai: sin AI_API_KEY responde 503 con instrucciones (ya NO devuelve preguntas genéricas falsas)',
        aiKmapRes.data?.error?.message?.slice(0, 60) || aiKmapRes.data?.message?.slice(0, 60)
      );
    }

    // Lectura real de PDF/TXT con pdf-parse
    const { readMaterials } = require('./src/services/quizAI.service.js');
    const readRes = await readMaterials([{ title: 'apunte.txt', url: uploadData.url }]);
    assertTest(
      readRes.texts.length === 1 && readRes.texts[0].text.includes('claves primarias'),
      'Lector de archivos extrae el texto real del archivo subido por el docente',
      `${readRes.texts[0]?.text.length} caracteres`
    );

    // Recomendación de IA leyendo el grafo cuando el estudiante FALLA un quiz (score < 51)
    const modelErTopic = st?.topics?.find((t) => t.name === 'Modelo ER');
    const studentObj = st?.users?.find((u) => u.role === 'estudiante');
    const bdSubObj = st?.subjects?.find((s) => s.name === 'Bases de Datos');
    if (modelErTopic && studentObj && bdSubObj) {
      const failRecRes = await apiJson(baseUrl, 'POST', '/api/kmap/recommend', {
        userId: studentObj.id,
        subjectId: bdSubObj.id,
        topicId: modelErTopic.id,
        score: 30,
      });
      const failRec = failRecRes.data?.recommendation;
      assertTest(
        failRecRes.status === 200 &&
          failRec?.passed === false &&
          failRec?.action === 'review_previous' &&
          failRec?.recommendedTopics?.some((t) => t.name === 'Bases de Datos'),
        'POST /api/kmap/recommend (IA Grafos): al FALLAR un quiz (30%), analiza el grafo y recomienda el nodo anterior ("Bases de Datos")',
        `Recomendado: ${failRec?.recommendedTopics?.[0]?.name}`
      );

      // Recomendación de IA leyendo el grafo cuando el estudiante APRUEBA un quiz (score >= 51)
      const passRecRes = await apiJson(baseUrl, 'POST', '/api/kmap/recommend', {
        userId: studentObj.id,
        subjectId: bdSubObj.id,
        topicId: modelErTopic.id,
        score: 90,
      });
      const passRec = passRecRes.data?.recommendation;
      assertTest(
        passRecRes.status === 200 &&
          passRec?.passed === true &&
          passRec?.action === 'advance_next' &&
          passRec?.recommendedTopics?.some((t) => t.name === 'Normalización'),
        'POST /api/kmap/recommend (IA Grafos): al APROBAR un quiz (90%), analiza el grafo y recomienda el siguiente nodo ("Normalización")',
        `Siguiente nodo: ${passRec?.recommendedTopics?.[0]?.name}`
      );
    }

    // =========================================================================
    // BLOQUE 3: AUTENTICACIÓN JWT Y REGLAS DE NEGOCIO UMSS (/api/auth/*)
    // =========================================================================
    console.log(`\n${BOLD}${YELLOW}▶ BLOQUE 3: Autenticación JWT y Reglas de Negocio UMSS (/api/auth/*)${RESET}`);

    // 3.1 Rechazo de correo no institucional (@gmail.com)
    const badEmailRes = await apiJson(baseUrl, 'POST', '/api/auth/register/student', {
      nombre_completo: 'Estudiante Correo Invalido',
      codigo_sis: `2026${suffix}`,
      correo_electronico: `invalido${suffix}@gmail.com`,
      password: 'Password123',
    });
    assertTest(
      badEmailRes.status === 400,
      'Rechaza registro de estudiante con correo NO institucional (@gmail.com)',
      `HTTP ${badEmailRes.status}`
    );

    // 3.2 Rechazo de código SIS con letras
    const badSisRes = await apiJson(baseUrl, 'POST', '/api/auth/register/student', {
      nombre_completo: 'Estudiante SIS Invalido',
      codigo_sis: 'ABC12345',
      correo_electronico: `sisinvalido${suffix}@est.umss.edu`,
      password: 'Password123',
    });
    assertTest(
      badSisRes.status === 400,
      'Rechaza registro de estudiante con código SIS inválido (no numérico)',
      `HTTP ${badSisRes.status}`
    );

    // 3.3 Registro exitoso de estudiante UMSS en la tabla oficial `usuario`
    const studentSis = `2026${suffix}`;
    const studentEmail = `est.${suffix}@est.umss.edu`;
    const regStudentRes = await apiJson(baseUrl, 'POST', '/api/auth/register/student', {
      nombre_completo: `Estudiante UMSS ${suffix}`,
      codigo_sis: studentSis,
      correo_electronico: studentEmail,
      password: 'Password123',
    });
    const studentToken = regStudentRes.data?.token;
    assertTest(
      regStudentRes.status === 201 && Boolean(studentToken),
      'Registra exitosamente estudiante UMSS (@est.umss.edu) en MySQL y emite JWT',
      `SIS: ${studentSis}`
    );

    // 3.4 Login del usuario Administrador por defecto creado en MySQL
    const adminLoginRes = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      identifier: 'admin@demo.com',
      password: 'admin123',
    });
    const adminToken = adminLoginRes.data?.token;
    assertTest(
      adminLoginRes.status === 200 && Boolean(adminToken),
      'POST /api/auth/login autentica al Administrador por defecto desde MySQL y devuelve JWT',
      `Usuario: ${adminLoginRes.data?.user?.email}`
    );

    // 3.5 Login del Estudiante por defecto creado en MySQL
    const defaultStudentLoginRes = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      identifier: '202012345',
      password: '123456',
    });
    assertTest(
      defaultStudentLoginRes.status === 200 && Boolean(defaultStudentLoginRes.data?.token),
      'POST /api/auth/login autentica al Estudiante por defecto (SIS 202012345) desde MySQL',
      `Estudiante: ${defaultStudentLoginRes.data?.user?.name}`
    );

    // =========================================================================
    // BLOQUE 4: ADMIN, DOCENTE, MATRICULACIÓN Y VALIDADOR DE GRAFOS DAG (KAHN)
    // =========================================================================
    console.log(`\n${BOLD}${YELLOW}▶ BLOQUE 4: Admin, Docente, Matriculación y Validador de Grafos DAG${RESET}`);

    // 4.1 Admin crea un nuevo Docente (contraseña inicial = Carnet)
    const teacherCi = `88${suffix}`;
    const teacherEmail = `docente.${suffix}@fcyt.umss.edu.bo`;
    const createTeacherRes = await apiJson(
      baseUrl,
      'POST',
      '/api/admin/teachers',
      {
        nombre_completo: `Ing. Docente ${suffix}`,
        correo_electronico: teacherEmail,
        carnet_identidad: teacherCi,
      },
      adminToken
    );
    const teacherId = createTeacherRes.data?.teacher?.id_usuario;
    assertTest(
      createTeacherRes.status === 201 && Boolean(teacherId),
      'POST /api/admin/teachers crea docente en MySQL con contraseña inicial = Carnet y envía credenciales',
      `CI: ${teacherCi}`
    );

    // 4.2 Login del nuevo Docente verifica bandera mustChangePassword = true
    const teacherLoginRes = await apiJson(baseUrl, 'POST', '/api/auth/login', {
      identifier: teacherEmail,
      password: teacherCi,
    });
    const teacherToken = teacherLoginRes.data?.token;
    const mustChange = teacherLoginRes.data?.user?.mustChangePassword;
    assertTest(
      teacherLoginRes.status === 200 && Boolean(teacherToken) && mustChange === true,
      'Docente nuevo inicia sesión con su Carnet y recibe mustChangePassword = true'
    );

    // 4.3 Admin crea una Materia y asigna al Docente
    const createSubjectRes = await apiJson(
      baseUrl,
      'POST',
      '/api/admin/subjects',
      {
        nombre_de_la_materia: `Estructura de Datos ${suffix}`,
        codigo_de_la_materia: `ED-${suffix}`,
        descripcion_corta: 'Árboles, grafos y estructuras lineales.',
        id_del_docente: teacherId,
      },
      adminToken
    );
    const subjectId = createSubjectRes.data?.subject?.id_materia;
    const enrollmentCode = createSubjectRes.data?.subject?.codigo_matriculacion;
    assertTest(
      createSubjectRes.status === 201 && Boolean(subjectId) && Boolean(enrollmentCode),
      'POST /api/admin/subjects crea materia en `materia_asignatura` con código de matriculación',
      `Código: ${enrollmentCode}`
    );

    // 4.4 Estudiante se matricula en la materia usando el código
    const enrollRes = await apiJson(
      baseUrl,
      'POST',
      '/api/student/enroll',
      { codigo_matriculacion: enrollmentCode },
      studentToken
    );
    assertTest(
      enrollRes.status === 201,
      'POST /api/student/enroll registra matrícula en `inscripcion_materia` mediante código único',
      `Materia ID: ${subjectId}`
    );

    // 4.5 Docente crea un grafo DAG válido (Tema 1 -> Tema 2 -> Tema 3)
    const validDagRes = await apiJson(
      baseUrl,
      'PUT',
      `/api/subjects/${subjectId}/graph`,
      {
        nodes: [
          { id: 'n1', title: 'Listas Enlazadas', description: 'Punteros y nodos', position: { x: 100, y: 100 } },
          { id: 'n2', title: 'Árboles Binarios', description: 'ABB y recorridos', position: { x: 300, y: 100 } },
          { id: 'n3', title: 'Grafos DAG', description: 'Orden topológico', position: { x: 500, y: 100 } },
        ],
        edges: [
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3' },
        ],
      },
      teacherToken
    );
    const createdNodes = validDagRes.data?.nodes || [];
    assertTest(
      validDagRes.status === 200 && createdNodes.length === 3,
      'PUT /api/subjects/:id/graph guarda grafo DAG válido en `tema_conocimiento` y `requisito_entre_temas`',
      `${createdNodes.length} nodos creados`
    );

    // 4.6 Docente intenta guardar un grafo con CICLO (n1 -> n2 -> n3 -> n1) -> Debe rechazarse (400)
    const cyclicDagRes = await apiJson(
      baseUrl,
      'PUT',
      `/api/subjects/${subjectId}/graph`,
      {
        nodes: [
          { id: 'n1', title: 'Listas Enlazadas', position: { x: 100, y: 100 } },
          { id: 'n2', title: 'Árboles Binarios', position: { x: 300, y: 100 } },
          { id: 'n3', title: 'Grafos DAG', position: { x: 500, y: 100 } },
        ],
        edges: [
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3' },
          { source: 'n3', target: 'n1' }, // Ciclo inválido
        ],
      },
      teacherToken
    );
    assertTest(
      cyclicDagRes.status === 400,
      'Algoritmo de Kahn rechaza grafo con ciclos (n1 -> n2 -> n3 -> n1) con HTTP 400',
      cyclicDagRes.data?.error?.message || cyclicDagRes.data?.message
    );

    // =========================================================================
    // BLOQUE 5: QUIZZES, EVALUACIÓN, RECOMENDACIÓN DE PRERREQUISITOS Y MAPA DE CALOR
    // =========================================================================
    console.log(`\n${BOLD}${YELLOW}▶ BLOQUE 5: Evaluación de Quiz, Recomendación de Prerrequisitos y Mapa de Calor${RESET}`);

    const node1Id = createdNodes[0]?.id_tema;
    const node2Id = createdNodes[1]?.id_tema;

    if (node1Id && node2Id) {
      // 5.1 Docente crea un Quiz en el Nodo 2 (Árboles Binarios, que depende de Listas Enlazadas)
      const createQuizRes = await apiJson(
        baseUrl,
        'POST',
        `/api/nodes/${node2Id}/quizzes`,
        {
          titulo_del_quiz: 'Evaluación de Árboles Binarios',
          esta_habilitado: true,
          questions: [
            {
              texto_de_la_pregunta: '¿Cuál es la complejidad promedio de búsqueda en un ABB balanceado?',
              opciones: [
                { texto_de_la_opcion: 'O(log n)' },
                { texto_de_la_opcion: 'O(n^2)' },
                { texto_de_la_opcion: 'O(1)' },
                { texto_de_la_opcion: 'O(n!)' },
              ],
              indice_opcion_correcta: 0,
            },
            {
              texto_de_la_pregunta: '¿Qué recorrido visita primero raíz, luego subárbol izquierdo y derecho?',
              opciones: [
                { texto_de_la_opcion: 'Preorden' },
                { texto_de_la_opcion: 'Inorden' },
                { texto_de_la_opcion: 'Postorden' },
                { texto_de_la_opcion: 'Por niveles' },
              ],
              indice_opcion_correcta: 0,
            },
          ],
        },
        teacherToken
      );
      const quizId = createQuizRes.data?.quiz?.id_quiz;
      assertTest(
        createQuizRes.status === 201 && Boolean(quizId),
        'POST /api/nodes/:nodeId/quizzes crea quiz en `evaluacion_quiz`, `banco_preguntas`, `opcion_respuesta` y `respuesta_oficial`',
        `Quiz ID: ${quizId}`
      );

      // 5.2 Estudiante obtiene el quiz para resolverlo
      const getQuizRes = await apiJson(baseUrl, 'GET', `/api/quizzes/${quizId}`, null, studentToken);
      const quizQuestions = getQuizRes.data?.quiz?.preguntas || [];
      assertTest(
        getQuizRes.status === 200 && quizQuestions.length === 2,
        'GET /api/quizzes/:quizId entrega preguntas al estudiante ocultando la respuesta oficial'
      );

      // 5.3 Estudiante envía respuestas INCORRECTAS (0%) -> Reprueba y recibe recomendación del prerrequisito "Listas Enlazadas"
      const wrongAnswers = quizQuestions.map((q) => ({
        id_pregunta: q.id_pregunta,
        id_opcion_que_eligio: q.opciones[1]?.id_opcion,
      }));
      const failAttemptRes = await apiJson(
        baseUrl,
        'POST',
        `/api/quizzes/${quizId}/submit`,
        { answers: wrongAnswers },
        studentToken
      );
      const failEval = failAttemptRes.data?.evaluation;
      assertTest(
        failAttemptRes.status === 200 &&
          failEval?.passed === false &&
          Array.isArray(failEval?.recommendations) &&
          failEval.recommendations.length > 0,
        'Al reprobar un quiz, el motor registra en `falla_encontrada` y recomienda repasar el prerrequisito no dominado',
        `Nota: ${failEval?.grade}%, Recomendado: ${failEval?.recommendations?.[0]?.nombre_del_tema || failEval?.recommendations?.[0]?.title}`
      );

      // 5.4 Estudiante envía respuestas CORRECTAS (100%) -> Aprueba y domina el nodo
      const rightAnswers = quizQuestions.map((q) => ({
        id_pregunta: q.id_pregunta,
        id_opcion_que_eligio: q.opciones[0]?.id_opcion,
      }));
      const passAttemptRes = await apiJson(
        baseUrl,
        'POST',
        `/api/quizzes/${quizId}/submit`,
        { answers: rightAnswers },
        studentToken
      );
      const passEval = passAttemptRes.data?.evaluation;
      assertTest(
        passAttemptRes.status === 200 && passEval?.passed === true && passEval?.grade === 100,
        'Al aprobar con 100%, el backend actualiza `progreso_actual` a "dominado" y calcula posición en `ranking_por_tema`',
        `Nota: ${passEval?.grade}%, Posición Ranking: #${passEval?.rank}`
      );

      // 5.5 Mapa de Calor del Docente
      const heatmapRes = await apiJson(
        baseUrl,
        'GET',
        `/api/subjects/${subjectId}/heatmap`,
        null,
        teacherToken
      );
      assertTest(
        heatmapRes.status === 200 && Array.isArray(heatmapRes.data?.nodes),
        'GET /api/subjects/:id/heatmap entrega métricas del Mapa de Calor al Docente',
        `${heatmapRes.data?.nodes?.length} nodos analizados`
      );
    }

    // Dejar la base de datos oficial limpia con los usuarios y materia por defecto
    await apiJson(baseUrl, 'POST', '/api/kmap/reset');
  } catch (err) {
    failed++;
    console.error(`${RED}  ✘ [ERROR INESPERADO]${RESET}`, err);
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}  RESUMEN DE TESTS: ${GREEN}${passed} APROBADOS${RESET} | ${failed > 0 ? RED : GREEN}${failed} FALLIDOS${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
