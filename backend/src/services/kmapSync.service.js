const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const emailService = require('./email.service');
const aiService = require('./ai.service');

// Mapa en memoria de contraseñas legibles para sincronización con auth.jsx del Frontend
const plainPasswordsByEmail = new Map([
  ['admin@demo.com', 'admin123'],
  ['admin@kmap.edu', 'Admin123!'],
  ['docente@demo.com', '1234567'],
  ['laura.gimenez@kmap.edu', '7654321'],
  ['jhoselyn@est.umss.edu', '123456'],
  ['juan.torres@est.umss.edu', 'Estudiante123!'],
]);

const notifiedTeacherEmails = new Set(['docente@demo.com', 'laura.gimenez@kmap.edu']);

/**
 * 1. Asegura que existan los catálogos base y los usuarios por defecto (Admin, Estudiante y Docente)
 *    en las tablas oficiales de MySQL (`catalogo_roles`, `catalogo_tipos_archivo`, `catalogo_tipos_pregunta`, `usuario`).
 */
async function ensureOfficialDefaultsInMySQL() {
  // 1.1 Roles oficiales en `catalogo_roles`
  const rolesData = [
    { key: 'admin', nombre_del_rol: 'administrador', descripcion_del_rol: 'Administrador general del sistema Kmap' },
    { key: 'docente', nombre_del_rol: 'docente', descripcion_del_rol: 'Docente encargado de materias y grafos' },
    { key: 'estudiante', nombre_del_rol: 'estudiante', descripcion_del_rol: 'Estudiante matriculado en asignaturas' },
  ];
  const roleMap = {};
  for (const r of rolesData) {
    const row = await prisma.catalogoRol.upsert({
      where: { nombre_del_rol: r.nombre_del_rol },
      update: {},
      create: {
        nombre_del_rol: r.nombre_del_rol,
        descripcion_del_rol: r.descripcion_del_rol,
      },
    });
    roleMap[r.key] = row.id_rol;
  }

  // 1.2 Tipos de archivo en `catalogo_tipos_archivo`
  const fileTypes = [
    { key: 'PDF', nombre_del_tipo: 'PDF', icono_que_lo_representa: '📄' },
    { key: 'Ejercicios', nombre_del_tipo: 'Documento DOCX', icono_que_lo_representa: '📝' },
    { key: 'Archivo', nombre_del_tipo: 'Archivo', icono_que_lo_representa: '📎' },
    { key: 'Enlace', nombre_del_tipo: 'Enlace externo', icono_que_lo_representa: '🔗' },
  ];
  const fileTypeMap = {};
  for (const ft of fileTypes) {
    const row = await prisma.catalogoTipoArchivo.upsert({
      where: { nombre_del_tipo: ft.nombre_del_tipo },
      update: {},
      create: {
        nombre_del_tipo: ft.nombre_del_tipo,
        icono_que_lo_representa: ft.icono_que_lo_representa,
      },
    });
    fileTypeMap[ft.key] = row.id_tipo_archivo;
  }

  // 1.3 Tipo de pregunta en `catalogo_tipos_pregunta`
  const qType = await prisma.catalogoTipoPregunta.upsert({
    where: { nombre_del_tipo: 'seleccion_multiple' },
    update: {},
    create: {
      nombre_del_tipo: 'seleccion_multiple',
      descripcion_del_tipo: 'Pregunta de opción múltiple con 4 alternativas y 1 respuesta oficial',
    },
  });

  // 1.4 Usuarios por defecto en la tabla oficial `usuario` (Admin, Estudiante y Docente)
  const adminHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.usuario.upsert({
    where: { correo_electronico: 'admin@demo.com' },
    update: {
      id_rol: roleMap.admin,
      contrasena_encriptada: adminHash,
      esta_habilitado: true,
    },
    create: {
      id_rol: roleMap.admin,
      nombre_completo: 'Administrador',
      correo_electronico: 'admin@demo.com',
      contrasena_encriptada: adminHash,
      codigo_sis: null,
      carnet_identidad: 'ADMIN-001',
      debe_cambiar_contrasena: false,
      esta_habilitado: true,
    },
  });

  const studentHash = await bcrypt.hash('123456', 10);
  const studentUser = await prisma.usuario.upsert({
    where: { correo_electronico: 'jhoselyn@est.umss.edu' },
    update: {
      id_rol: roleMap.estudiante,
      codigo_sis: '202012345',
      contrasena_encriptada: studentHash,
      esta_habilitado: true,
    },
    create: {
      id_rol: roleMap.estudiante,
      nombre_completo: 'Jhoselyn Lopez',
      correo_electronico: 'jhoselyn@est.umss.edu',
      contrasena_encriptada: studentHash,
      codigo_sis: '202012345',
      carnet_identidad: null,
      debe_cambiar_contrasena: false,
      esta_habilitado: true,
    },
  });

  const teacherHash = await bcrypt.hash('1234567', 10);
  const teacherUser = await prisma.usuario.upsert({
    where: { correo_electronico: 'docente@demo.com' },
    update: {
      id_rol: roleMap.docente,
      carnet_identidad: '1234567',
      contrasena_encriptada: teacherHash,
      esta_habilitado: true,
    },
    create: {
      id_rol: roleMap.docente,
      nombre_completo: 'Prof. Rivera',
      correo_electronico: 'docente@demo.com',
      contrasena_encriptada: teacherHash,
      codigo_sis: null,
      carnet_identidad: '1234567',
      debe_cambiar_contrasena: false,
      esta_habilitado: true,
    },
  });

  // Docente oficial de bd.ins / seed.js: Laura Gimenez Lopez (laura.gimenez@kmap.edu) en tabla `usuario`
  const lauraHash = await bcrypt.hash('7654321', 10);
  const lauraUser = await prisma.usuario.upsert({
    where: { correo_electronico: 'laura.gimenez@kmap.edu' },
    update: {
      id_rol: roleMap.docente,
      carnet_identidad: '7654321',
      contrasena_encriptada: lauraHash,
      esta_habilitado: true,
    },
    create: {
      id_rol: roleMap.docente,
      nombre_completo: 'Laura Gimenez Lopez',
      correo_electronico: 'laura.gimenez@kmap.edu',
      contrasena_encriptada: lauraHash,
      codigo_sis: null,
      carnet_identidad: '7654321',
      debe_cambiar_contrasena: true,
      esta_habilitado: true,
    },
  });

  // Materia oficial de bd.ins / seed.js asignada a Laura Gimenez Lopez
  await prisma.materiaAsignatura.upsert({
    where: { codigo_de_la_materia: 'MAT101' },
    update: {
      id_del_docente: lauraUser.id_usuario,
    },
    create: {
      nombre_de_la_materia: 'Matematicas Basicas',
      codigo_de_la_materia: 'MAT101',
      descripcion_corta: 'Fundamentos de aritmetica, algebra y geometria',
      id_del_docente: lauraUser.id_usuario,
      enlace_al_icono: '🧮',
      color_representativo: 'green',
      codigo_matriculacion: 'MAT101',
      esta_habilitada: true,
    },
  });

  // 1.5 Si la tabla oficial `tema_conocimiento` está vacía, sembrar la materia y grafo base oficial en MySQL
  const topicCount = await prisma.temaConocimiento.count();
  if (topicCount === 0) {
    const dbSub = await prisma.materiaAsignatura.upsert({
      where: { codigo_de_la_materia: 'sub-bd' },
      update: {
        id_del_docente: teacherUser.id_usuario,
        codigo_matriculacion: 'BDD3K9',
      },
      create: {
        nombre_de_la_materia: 'Bases de Datos',
        codigo_de_la_materia: 'sub-bd',
        descripcion_corta: 'Explora el grafo de conocimiento y avanza por los temas de modelado y SQL.',
        id_del_docente: teacherUser.id_usuario,
        enlace_al_icono: '🗄️',
        color_representativo: 'purple',
        codigo_matriculacion: 'BDD3K9',
        esta_habilitada: true,
      },
    });

    // Matricular al estudiante por defecto en la materia oficial en `inscripcion_materia`
    await prisma.inscripcionMateria.upsert({
      where: {
        id_materia_id_estudiante: {
          id_materia: dbSub.id_materia,
          id_estudiante: studentUser.id_usuario,
        },
      },
      update: { estado_de_la_inscripcion: 'activo' },
      create: {
        id_materia: dbSub.id_materia,
        id_estudiante: studentUser.id_usuario,
        estado_de_la_inscripcion: 'activo',
      },
    });

    // Crear los 5 nodos oficiales del grafo DAG en `tema_conocimiento`
    const initialTopics = [
      {
        nombre: 'Bases de Datos',
        desc: 'Fundamentos de sistemas gestores de bases de datos, arquitectura y modelos de datos.',
        x: 380,
        y: 55,
      },
      {
        nombre: 'Modelo ER',
        desc: 'El modelo Entidad-Relación representa la estructura de una base de datos mediante entidades, atributos y relaciones.',
        x: 180,
        y: 195,
      },
      {
        nombre: 'Modelo Relacional',
        desc: 'Representación de datos mediante relaciones (tablas), tuplas, claves primarias y foráneas.',
        x: 580,
        y: 195,
      },
      {
        nombre: 'Normalización',
        desc: 'Aplicación de formas normales (1FN, 2FN, 3FN, BCNF) para eliminar redundancia y anomalías.',
        x: 180,
        y: 345,
      },
      {
        nombre: 'SQL',
        desc: 'Lenguaje de consulta estructurado: DDL, DML, JOINs, agregaciones y subconsultas.',
        x: 580,
        y: 345,
      },
    ];

    const createdTopics = {};
    for (const t of initialTopics) {
      const topicRow = await prisma.temaConocimiento.create({
        data: {
          id_materia: dbSub.id_materia,
          nombre_del_tema: t.nombre,
          descripcion_del_tema: t.desc,
          nota_minima_para_aprobar: 51,
          importancia_del_tema: 1,
          posicion_x: t.x,
          posicion_y: t.y,
          esta_habilitado: true,
        },
      });
      createdTopics[t.nombre] = topicRow;

      // Material de estudio oficial en `material_estudio`
      await prisma.materialEstudio.create({
        data: {
          id_materia: dbSub.id_materia,
          id_tema: topicRow.id_tema,
          id_del_docente_que_lo_subio: teacherUser.id_usuario,
          id_tipo_archivo: fileTypeMap.PDF,
          titulo_del_material: `Apunte - ${t.nombre}.pdf`,
          descripcion_del_material: 'PDF',
          enlace_para_descargar: 'https://es.wikipedia.org/wiki/Base_de_datos',
          esta_visible_para_estudiantes: true,
        },
      });
    }

    // Aristas del grafo DAG en `requisito_entre_temas`
    const initialEdges = [
      ['Bases de Datos', 'Modelo ER'],
      ['Bases de Datos', 'Modelo Relacional'],
      ['Modelo ER', 'Normalización'],
      ['Modelo Relacional', 'SQL'],
    ];
    for (const [srcName, tgtName] of initialEdges) {
      await prisma.requisitoEntreTemas.create({
        data: {
          id_del_tema_que_se_necesita_primero: createdTopics[srcName].id_tema,
          id_tema: createdTopics[tgtName].id_tema,
          necesidad_de_saber_el_tema_anterior: 100,
        },
      });
    }

    // Preguntas oficiales en `evaluacion_quiz`, `banco_preguntas`, `opcion_respuesta`, `respuesta_oficial`
    const initialQuestions = [
      {
        topic: 'Bases de Datos',
        text: '¿Qué es un SGBD (DBMS)?',
        options: [
          'Un software para gestionar y consultar bases de datos',
          'Un protocolo de red inalámbrica',
          'Un compilador de hojas de estilo',
          'Un sistema operativo móvil',
        ],
        correct: 0,
      },
      {
        topic: 'Modelo ER',
        text: '¿Qué representa el modelo Entidad-Relación (ER)?',
        options: [
          'La estructura conceptual de una base de datos mediante entidades y relaciones',
          'El diseño visual de una página web',
          'El código binario del procesador',
          'Un protocolo de correo electrónico',
        ],
        correct: 0,
      },
      {
        topic: 'Modelo ER',
        text: '¿Qué elemento describe una propiedad o característica de una entidad?',
        options: ['Atributo', 'Tupla', 'Índice', 'Trigger'],
        correct: 0,
      },
      {
        topic: 'Modelo Relacional',
        text: 'En el modelo relacional, ¿qué garantiza una clave foránea (Foreign Key)?',
        options: [
          'La integridad referencial entre dos tablas',
          'Que todos los campos sean de texto',
          'Que la tabla no tenga filas',
          'La encriptación de contraseñas',
        ],
        correct: 0,
      },
      {
        topic: 'Normalización',
        text: '¿Qué exige la Primera Forma Normal (1FN)?',
        options: [
          'Que todos los atributos sean atómicos (sin grupos repetitivos)',
          'Tener al menos cinco claves foráneas',
          'Eliminar todas las claves primarias',
          'Unir todas las tablas en una sola',
        ],
        correct: 0,
      },
      {
        topic: 'SQL',
        text: '¿Qué comando SQL se utiliza para consultar registros de una tabla?',
        options: ['SELECT', 'UPDATE', 'DROP', 'ALTER'],
        correct: 0,
      },
    ];

    for (const q of initialQuestions) {
      const topicRow = createdTopics[q.topic];
      if (!topicRow) continue;

      let quizRow = await prisma.evaluacionQuiz.findFirst({
        where: { id_tema: topicRow.id_tema },
      });
      if (!quizRow) {
        quizRow = await prisma.evaluacionQuiz.create({
          data: {
            id_materia: dbSub.id_materia,
            id_tema: topicRow.id_tema,
            titulo_del_quiz: `Quiz - ${topicRow.nombre_del_tema}`,
            tiempo_limite_en_milisegundos: 600000,
            esta_habilitado: true,
          },
        });
      }

      const pregRow = await prisma.bancoPregunta.create({
        data: {
          id_tema: topicRow.id_tema,
          id_tipo_pregunta: qType.id_tipo_pregunta,
          id_quiz: quizRow.id_quiz,
          texto_de_la_pregunta: q.text,
          nivel_de_dificultad: 50,
          generada_por_ia: false,
          esta_habilitada: true,
        },
      });

      let correctOptionId = null;
      for (let i = 0; i < q.options.length; i++) {
        const optRow = await prisma.opcionRespuesta.create({
          data: {
            id_pregunta: pregRow.id_pregunta,
            orden_en_que_aparece: i + 1,
            texto_de_la_opcion: q.options[i],
          },
        });
        if (i === q.correct) {
          correctOptionId = optRow.id_opcion;
        }
      }

      if (correctOptionId) {
        await prisma.respuestaOficial.create({
          data: {
            id_pregunta: pregRow.id_pregunta,
            id_opcion_correcta: correctOptionId,
          },
        });
      }
    }
  }

  return { roleMap, fileTypeMap, qTypeId: qType.id_tipo_pregunta, adminUser, studentUser, teacherUser };
}

/**
 * 2. Construye el estado que consume el Frontend leyendo DIRECTAMENTE de las tablas oficiales de MySQL
 */
async function readStateFromMySQL() {
  await ensureOfficialDefaultsInMySQL();

  const [
    dbUsers,
    dbSubjects,
    dbTopics,
    dbEdges,
    dbMaterials,
    dbQuestions,
    dbEnrollments,
    dbAttempts,
  ] = await Promise.all([
    prisma.usuario.findMany({
      where: { esta_habilitado: true },
      include: { rol: true },
      orderBy: { id_usuario: 'asc' },
    }),
    prisma.materiaAsignatura.findMany({
      where: { esta_habilitada: true },
      orderBy: { id_materia: 'asc' },
    }),
    prisma.temaConocimiento.findMany({
      where: { esta_habilitado: true },
      orderBy: { id_tema: 'asc' },
    }),
    prisma.requisitoEntreTemas.findMany({
      include: { tema: true },
      orderBy: { id_requisito: 'asc' },
    }),
    prisma.materialEstudio.findMany({
      where: { esta_visible_para_estudiantes: true },
      include: { tipo_archivo: true },
      orderBy: { id_material: 'asc' },
    }),
    prisma.bancoPregunta.findMany({
      where: { esta_habilitada: true },
      include: {
        opciones: { orderBy: { orden_en_que_aparece: 'asc' } },
        respuesta_oficial: true,
      },
      orderBy: { id_pregunta: 'asc' },
    }),
    prisma.inscripcionMateria.findMany({
      where: { estado_de_la_inscripcion: 'activo' },
      orderBy: { id_inscripcion: 'asc' },
    }),
    prisma.intentoDeQuiz.findMany({
      where: { estado_del_intento: 'completado' },
      include: { quiz: true },
      orderBy: { id_intento: 'asc' },
    }),
  ]);

  // Mapear `usuario` -> `state.users`
  const users = dbUsers.map((u) => {
    const rawRole = (u.rol?.nombre_del_rol || '').toLowerCase();
    const role =
      rawRole.includes('admin')
        ? 'admin'
        : rawRole.includes('docente')
        ? 'docente'
        : 'estudiante';

    const emailLower = u.correo_electronico.toLowerCase();
    const knownPass =
      plainPasswordsByEmail.get(emailLower) ||
      u.carnet_identidad ||
      (role === 'admin' ? 'admin123' : role === 'docente' ? '1234567' : '123456');

    const altPasswords = [];
    if (role === 'admin') altPasswords.push('admin123', '123456', 'admin');
    if (role === 'docente') altPasswords.push('1234567', '123456');
    if (role === 'estudiante') altPasswords.push('123456');

    return {
      id: `u-${u.id_usuario}`,
      dbId: u.id_usuario,
      role,
      name: u.nombre_completo,
      username: role === 'admin' ? 'admin' : u.correo_electronico.split('@')[0],
      sis: u.codigo_sis || undefined,
      email: u.correo_electronico,
      carnet: u.carnet_identidad || undefined,
      password: knownPass,
      altPasswords,
      mustChange: Boolean(u.debe_cambiar_contrasena),
    };
  });

  // Mapear `materia_asignatura` -> `state.subjects`
  const themes = ['purple', 'blue', 'green', 'cyan'];
  const subjects = dbSubjects.map((s, idx) => ({
    id: `sub-${s.id_materia}`,
    dbId: s.id_materia,
    name: s.nombre_de_la_materia,
    desc: s.descripcion_corta || '',
    icon: s.enlace_al_icono || '📘',
    theme: s.color_representativo || themes[idx % themes.length],
    teacherId: s.id_del_docente ? `u-${s.id_del_docente}` : null,
    code: s.codigo_matriculacion || `KMAP${s.id_materia}`,
  }));

  // Agrupar `material_estudio` por `id_tema`
  const materialsByTopic = new Map();
  for (const m of dbMaterials) {
    const list = materialsByTopic.get(m.id_tema) || [];
    const kind =
      m.descripcion_del_material ||
      (m.tipo_archivo?.nombre_del_tipo?.includes('PDF')
        ? 'PDF'
        : m.tipo_archivo?.nombre_del_tipo?.includes('Enlace')
        ? 'Enlace'
        : 'Archivo');
    list.push({
      id: `mat-${m.id_material}`,
      dbId: m.id_material,
      title: m.titulo_del_material,
      kind,
      url: m.enlace_para_descargar || '',
    });
    materialsByTopic.set(m.id_tema, list);
  }

  // Mapear `tema_conocimiento` -> `state.topics`
  const topics = dbTopics.map((t) => ({
    id: `t-${t.id_tema}`,
    dbId: t.id_tema,
    subjectId: `sub-${t.id_materia}`,
    name: t.nombre_del_tema,
    desc: t.descripcion_del_tema || '',
    icon: '📘',
    x: Number(t.posicion_x || 180),
    y: Number(t.posicion_y || 180),
    materials: materialsByTopic.get(t.id_tema) || [],
  }));

  // Mapear `requisito_entre_temas` -> `state.edges`
  const edges = dbEdges.map((e) => ({
    subjectId: `sub-${e.tema.id_materia}`,
    source: `t-${e.id_del_tema_que_se_necesita_primero}`,
    target: `t-${e.id_tema}`,
  }));

  // Mapear `banco_preguntas` + `opcion_respuesta` + `respuesta_oficial` -> `state.questions`
  const questions = dbQuestions
    .filter((q) => q.opciones && q.opciones.length >= 2)
    .map((q) => {
      const opts = q.opciones.map((o) => o.texto_de_la_opcion);
      while (opts.length < 4) opts.push(`Opción ${opts.length + 1}`);
      const correctOptId = q.respuesta_oficial?.id_opcion_correcta;
      const correctIdx = q.opciones.findIndex((o) => o.id_opcion === correctOptId);
      return {
        id: `q-${q.id_pregunta}`,
        dbId: q.id_pregunta,
        topicId: `t-${q.id_tema}`,
        text: q.texto_de_la_pregunta,
        options: opts.slice(0, 4),
        correct: correctIdx >= 0 ? correctIdx : 0,
        source: q.generada_por_ia ? 'ia' : 'manual',
      };
    });

  // Mapear `inscripcion_materia` -> `state.enrollments`
  const enrollments = dbEnrollments.map((enr) => ({
    userId: `u-${enr.id_estudiante}`,
    subjectId: `sub-${enr.id_materia}`,
  }));

  // Mapear `intento_de_quiz` -> `state.attempts`
  const attempts = dbAttempts
    .filter((att) => att.quiz?.id_tema)
    .map((att) => ({
      id: `att-${att.id_intento}`,
      dbId: att.id_intento,
      userId: `u-${att.id_estudiante}`,
      topicId: `t-${att.quiz.id_tema}`,
      score: Math.round(Number(att.puntaje_que_obtuvo || 0)),
      date: (att.fecha_en_que_termino || att.fecha_en_que_inicio || new Date()).toISOString(),
    }));

  return {
    users,
    subjects,
    topics,
    edges,
    questions,
    enrollments,
    attempts,
  };
}

/**
 * 3. Sincroniza cualquier cambio hecho en el Frontend directamente hacia las tablas oficiales de MySQL
 */
async function syncStateToMySQL(incomingState) {
  const { roleMap, fileTypeMap, qTypeId, teacherUser } = await ensureOfficialDefaultsInMySQL();

  // 3.1 Sincronizar Usuarios (`usuario`)
  const userIdMap = new Map(); // frontend id -> MySQL id_usuario
  for (const u of incomingState.users || []) {
    const idRol = roleMap[u.role] || roleMap.estudiante;
    const email = (u.email || `${u.id}@est.umss.edu`).trim().toLowerCase();
    if (u.password) {
      plainPasswordsByEmail.set(email, String(u.password));
    }
    const rawPass = plainPasswordsByEmail.get(email) || String(u.password || '123456');
    const passwordHash = await bcrypt.hash(rawPass, 10);

    let dbUser = null;
    const numericId = u.id?.startsWith('u-') ? Number(u.id.slice(2)) : null;
    if (numericId && !Number.isNaN(numericId)) {
      dbUser = await prisma.usuario.findUnique({ where: { id_usuario: numericId } });
    }
    if (!dbUser) {
      dbUser = await prisma.usuario.findUnique({ where: { correo_electronico: email } });
    }

    if (dbUser) {
      dbUser = await prisma.usuario.update({
        where: { id_usuario: dbUser.id_usuario },
        data: {
          id_rol: idRol,
          nombre_completo: u.name || dbUser.nombre_completo,
          contrasena_encriptada: passwordHash,
          codigo_sis: u.sis || dbUser.codigo_sis,
          carnet_identidad: u.carnet || dbUser.carnet_identidad,
          debe_cambiar_contrasena: Boolean(u.mustChange),
        },
      });
    } else {
      dbUser = await prisma.usuario.create({
        data: {
          id_rol: idRol,
          nombre_completo: u.name || 'Usuario Kmap',
          correo_electronico: email,
          contrasena_encriptada: passwordHash,
          codigo_sis: u.sis || null,
          carnet_identidad: u.carnet || null,
          debe_cambiar_contrasena: Boolean(u.mustChange),
          esta_habilitado: true,
        },
      });

      if (u.role === 'docente' && !notifiedTeacherEmails.has(email)) {
        notifiedTeacherEmails.add(email);
        emailService
          .sendTeacherCredentials({
            nombre_completo: u.name,
            correo_electronico: email,
            carnet_identidad: u.carnet || rawPass,
          })
          .catch(() => {});
      }
    }
    userIdMap.set(u.id, dbUser.id_usuario);
  }

  // 3.2 Sincronizar Materias (`materia_asignatura`)
  const subjectIdMap = new Map(); // frontend subject.id -> MySQL id_materia
  for (const s of incomingState.subjects || []) {
    const teacherDbId = s.teacherId ? userIdMap.get(s.teacherId) || null : null;
    const numericSubId = s.id?.startsWith('sub-') ? Number(s.id.slice(4)) : null;

    let dbSub = null;
    if (numericSubId && !Number.isNaN(numericSubId)) {
      dbSub = await prisma.materiaAsignatura.findUnique({ where: { id_materia: numericSubId } });
    }
    if (!dbSub && s.code) {
      dbSub = await prisma.materiaAsignatura.findUnique({ where: { codigo_matriculacion: s.code } });
    }

    if (dbSub) {
      dbSub = await prisma.materiaAsignatura.update({
        where: { id_materia: dbSub.id_materia },
        data: {
          nombre_de_la_materia: s.name,
          descripcion_corta: s.desc || '',
          id_del_docente: teacherDbId,
          enlace_al_icono: s.icon || '📘',
          color_representativo: s.theme || 'cyan',
          codigo_matriculacion: s.code || dbSub.codigo_matriculacion,
        },
      });
    } else {
      dbSub = await prisma.materiaAsignatura.create({
        data: {
          nombre_de_la_materia: s.name,
          codigo_de_la_materia: `MAT-${Date.now().toString().slice(-5)}`,
          descripcion_corta: s.desc || '',
          id_del_docente: teacherDbId,
          enlace_al_icono: s.icon || '📘',
          color_representativo: s.theme || 'cyan',
          codigo_matriculacion: s.code || `KM${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          esta_habilitada: true,
        },
      });
    }
    subjectIdMap.set(s.id, dbSub.id_materia);
  }

  // 3.3 Sincronizar Temas (`tema_conocimiento`) y eliminar los que el docente haya borrado en el Editor de Grafo
  const topicIdMap = new Map(); // frontend topic.id -> MySQL id_tema
  const keptTopicDbIds = new Set();

  for (const t of incomingState.topics || []) {
    const idMateria = subjectIdMap.get(t.subjectId);
    if (!idMateria) continue;

    const numericTopicId = t.id?.startsWith('t-') ? Number(t.id.slice(2)) : null;
    let dbTopic = null;
    if (numericTopicId && !Number.isNaN(numericTopicId)) {
      dbTopic = await prisma.temaConocimiento.findUnique({ where: { id_tema: numericTopicId } });
    }
    if (!dbTopic) {
      dbTopic = await prisma.temaConocimiento.findFirst({
        where: { id_materia: idMateria, nombre_del_tema: t.name.trim() },
      });
    }

    if (dbTopic) {
      dbTopic = await prisma.temaConocimiento.update({
        where: { id_tema: dbTopic.id_tema },
        data: {
          nombre_del_tema: t.name.trim(),
          descripcion_del_tema: t.desc || '',
          posicion_x: Number(t.x || 180),
          posicion_y: Number(t.y || 180),
          esta_habilitado: true,
        },
      });
    } else {
      dbTopic = await prisma.temaConocimiento.create({
        data: {
          id_materia: idMateria,
          nombre_del_tema: t.name.trim(),
          descripcion_del_tema: t.desc || '',
          nota_minima_para_aprobar: 51,
          importancia_del_tema: 1,
          posicion_x: Number(t.x || 180),
          posicion_y: Number(t.y || 180),
          esta_habilitado: true,
        },
      });
    }

    topicIdMap.set(t.id, dbTopic.id_tema);
    keptTopicDbIds.add(dbTopic.id_tema);

    // Sincronizar materiales de este tema en `material_estudio`
    const subjectRow = await prisma.materiaAsignatura.findUnique({ where: { id_materia: idMateria } });
    const uploaderId = subjectRow?.id_del_docente || teacherUser.id_usuario;

    await prisma.materialEstudio.deleteMany({ where: { id_tema: dbTopic.id_tema } });
    for (const m of t.materials || []) {
      const idTipoArchivo = fileTypeMap[m.kind] || fileTypeMap.Archivo;
      await prisma.materialEstudio.create({
        data: {
          id_materia: idMateria,
          id_tema: dbTopic.id_tema,
          id_del_docente_que_lo_subio: uploaderId,
          id_tipo_archivo: idTipoArchivo,
          titulo_del_material: m.title,
          descripcion_del_material: m.kind || 'Archivo',
          enlace_para_descargar: m.url || 'https://es.wikipedia.org/wiki/Base_de_datos',
          esta_visible_para_estudiantes: true,
        },
      });
    }
  }

  // Eliminar temas que fueron borrados en el Editor de Grafo
  if (keptTopicDbIds.size > 0) {
    await prisma.temaConocimiento.deleteMany({
      where: { id_tema: { notIn: Array.from(keptTopicDbIds) } },
    });
  }

  // 3.4 Sincronizar Aristas del Grafo DAG (`requisito_entre_temas`)
  await prisma.requisitoEntreTemas.deleteMany({});
  for (const e of incomingState.edges || []) {
    const srcId = topicIdMap.get(e.source);
    const tgtId = topicIdMap.get(e.target);
    if (!srcId || !tgtId || srcId === tgtId) continue;

    await prisma.requisitoEntreTemas
      .create({
        data: {
          id_del_tema_que_se_necesita_primero: srcId,
          id_tema: tgtId,
          necesidad_de_saber_el_tema_anterior: 100,
        },
      })
      .catch(() => {});
  }

  // 3.5 Sincronizar Preguntas (`banco_preguntas`, `opcion_respuesta`, `respuesta_oficial`)
  const existingQuestions = await prisma.bancoPregunta.findMany({ select: { id_pregunta: true } });
  const existingQSet = new Set(existingQuestions.map((q) => q.id_pregunta));
  const keptQuestionDbIds = new Set();

  for (const q of incomingState.questions || []) {
    const idTema = topicIdMap.get(q.topicId);
    if (!idTema) continue;

    const numericQId = q.id?.startsWith('q-') ? Number(q.id.slice(2)) : null;
    if (numericQId && existingQSet.has(numericQId)) {
      keptQuestionDbIds.add(numericQId);
      continue;
    }

    const topicRow = await prisma.temaConocimiento.findUnique({ where: { id_tema: idTema } });
    if (!topicRow) continue;

    let quizRow = await prisma.evaluacionQuiz.findFirst({ where: { id_tema: idTema } });
    if (!quizRow) {
      quizRow = await prisma.evaluacionQuiz.create({
        data: {
          id_materia: topicRow.id_materia,
          id_tema: idTema,
          titulo_del_quiz: `Quiz - ${topicRow.nombre_del_tema}`,
          tiempo_limite_en_milisegundos: 600000,
          esta_habilitado: true,
        },
      });
    }

    const pregRow = await prisma.bancoPregunta.create({
      data: {
        id_tema: idTema,
        id_tipo_pregunta: qTypeId,
        id_quiz: quizRow.id_quiz,
        texto_de_la_pregunta: q.text,
        nivel_de_dificultad: 50,
        generada_por_ia: q.source === 'ia',
        esta_habilitada: true,
      },
    });
    keptQuestionDbIds.add(pregRow.id_pregunta);

    let correctOptId = null;
    const opts = Array.isArray(q.options) ? q.options : [];
    for (let i = 0; i < opts.length; i++) {
      const optRow = await prisma.opcionRespuesta.create({
        data: {
          id_pregunta: pregRow.id_pregunta,
          orden_en_que_aparece: i + 1,
          texto_de_la_opcion: opts[i],
        },
      });
      if (i === Number(q.correct || 0)) {
        correctOptId = optRow.id_opcion;
      }
    }
    if (correctOptId) {
      await prisma.respuestaOficial.create({
        data: {
          id_pregunta: pregRow.id_pregunta,
          id_opcion_correcta: correctOptId,
        },
      });
    }
  }

  // Eliminar preguntas que el docente haya borrado
  const toDeleteQIds = Array.from(existingQSet).filter((id) => !keptQuestionDbIds.has(id));
  if (toDeleteQIds.length > 0) {
    await prisma.bancoPregunta.deleteMany({
      where: { id_pregunta: { in: toDeleteQIds } },
    });
  }

  // 3.6 Sincronizar Matrículas (`inscripcion_materia`)
  for (const enr of incomingState.enrollments || []) {
    const idEstudiante = userIdMap.get(enr.userId);
    const idMateria = subjectIdMap.get(enr.subjectId);
    if (!idEstudiante || !idMateria) continue;

    await prisma.inscripcionMateria
      .upsert({
        where: {
          id_materia_id_estudiante: {
            id_materia: idMateria,
            id_estudiante: idEstudiante,
          },
        },
        update: { estado_de_la_inscripcion: 'activo' },
        create: {
          id_materia: idMateria,
          id_estudiante: idEstudiante,
          estado_de_la_inscripcion: 'activo',
        },
      })
      .catch(() => {});
  }

  // 3.7 Sincronizar Intentos de Quiz (`intento_de_quiz`), Progreso (`progreso_actual`) y Ranking (`ranking_por_tema`)
  const existingAttempts = await prisma.intentoDeQuiz.findMany({ select: { id_intento: true } });
  const existingAttemptSet = new Set(existingAttempts.map((a) => a.id_intento));

  for (const att of incomingState.attempts || []) {
    const numericAttId = att.id?.startsWith('att-') ? Number(att.id.slice(4)) : null;
    if (numericAttId && existingAttemptSet.has(numericAttId)) continue;

    const idEstudiante = userIdMap.get(att.userId);
    const idTema = topicIdMap.get(att.topicId);
    if (!idEstudiante || !idTema) continue;

    const topicRow = await prisma.temaConocimiento.findUnique({ where: { id_tema: idTema } });
    if (!topicRow) continue;

    let quizRow = await prisma.evaluacionQuiz.findFirst({ where: { id_tema: idTema } });
    if (!quizRow) {
      quizRow = await prisma.evaluacionQuiz.create({
        data: {
          id_materia: topicRow.id_materia,
          id_tema: idTema,
          titulo_del_quiz: `Quiz - ${topicRow.nombre_del_tema}`,
          tiempo_limite_en_milisegundos: 600000,
          esta_habilitado: true,
        },
      });
    }

    const score = Number(att.score || 0);
    await prisma.intentoDeQuiz.create({
      data: {
        id_quiz: quizRow.id_quiz,
        id_estudiante: idEstudiante,
        fecha_en_que_inicio: att.date ? new Date(att.date) : new Date(),
        fecha_en_que_termino: att.date ? new Date(att.date) : new Date(),
        tiempo_total_en_milisegundos: 60000,
        puntaje_que_obtuvo: score,
        estado_del_intento: 'completado',
      },
    });

    const estadoAprendizaje =
      score >= 71 ? 'dominado' : score >= 51 ? 'en_progreso' : 'debil';

    const existingProg = await prisma.progresoActual.findUnique({
      where: {
        id_estudiante_id_tema: {
          id_estudiante: idEstudiante,
          id_tema: idTema,
        },
      },
    });

    const bestScore = existingProg
      ? Math.max(existingProg.nota_actual_del_tema, score)
      : score;

    await prisma.progresoActual.upsert({
      where: {
        id_estudiante_id_tema: {
          id_estudiante: idEstudiante,
          id_tema: idTema,
        },
      },
      update: {
        nota_actual_del_tema: bestScore,
        seguridad_del_sistema_en_su_nota: Math.min(100, bestScore),
        cantidad_de_intentos: { increment: 1 },
        estado_de_aprendizaje:
          bestScore >= 71 ? 'dominado' : bestScore >= 51 ? 'en_progreso' : 'debil',
      },
      create: {
        id_estudiante: idEstudiante,
        id_tema: idTema,
        nota_actual_del_tema: bestScore,
        seguridad_del_sistema_en_su_nota: Math.min(100, bestScore),
        cantidad_de_intentos: 1,
        estado_de_aprendizaje: estadoAprendizaje,
      },
    });

    await prisma.rankingPorTema.upsert({
      where: {
        id_tema_id_estudiante: {
          id_tema: idTema,
          id_estudiante: idEstudiante,
        },
      },
      update: {
        mejor_puntaje_obtenido: bestScore,
        mejor_tiempo_en_milisegundos: 60000,
      },
      create: {
        id_tema: idTema,
        id_estudiante: idEstudiante,
        mejor_puntaje_obtenido: bestScore,
        mejor_tiempo_en_milisegundos: 60000,
        posicion_en_el_ranking: 1,
      },
    });
  }

  return readStateFromMySQL();
}

const kmapSyncService = {
  async getState() {
    return readStateFromMySQL();
  },

  async syncState(newState) {
    if (!newState || !Array.isArray(newState.users)) {
      return readStateFromMySQL();
    }
    return syncStateToMySQL(newState);
  },

  async resetState() {
    // Limpiar tablas transaccionales y restaurar únicamente los datos oficiales en MySQL
    await prisma.respuestaEstudiante.deleteMany({});
    await prisma.intentoDeQuiz.deleteMany({});
    await prisma.progresoActual.deleteMany({});
    await prisma.rankingPorTema.deleteMany({});
    await prisma.respuestaOficial.deleteMany({});
    await prisma.opcionRespuesta.deleteMany({});
    await prisma.bancoPregunta.deleteMany({});
    await prisma.evaluacionQuiz.deleteMany({});
    await prisma.materialEstudio.deleteMany({});
    await prisma.requisitoEntreTemas.deleteMany({});
    await prisma.temaConocimiento.deleteMany({});
    await prisma.inscripcionMateria.deleteMany({});
    await prisma.materiaAsignatura.deleteMany({});
    await prisma.usuario.deleteMany({});
    return readStateFromMySQL();
  },

  async generateQuestionsAI(input = {}, legacyCount = 5) {
    const isObj = typeof input === 'object' && input !== null;
    const topicName = isObj ? input.topicName : input;
    const topicId = isObj ? input.topicId : null;
    const count = isObj ? input.count : legacyCount;
    const frontendDesc = isObj ? input.topicDesc : '';
    const frontendMaterials = isObj && Array.isArray(input.materials) ? input.materials : [];

    const n = Math.min(15, Math.max(1, Number(count) || 5));

    let dbTopic = null;
    const numericTopicId = topicId?.startsWith('t-') ? Number(topicId.slice(2)) : null;
    if (numericTopicId && !Number.isNaN(numericTopicId)) {
      dbTopic = await prisma.temaConocimiento.findUnique({
        where: { id_tema: numericTopicId },
        include: { materiales: true },
      });
    }
    if (!dbTopic && topicName) {
      dbTopic = await prisma.temaConocimiento.findFirst({
        where: { nombre_del_tema: String(topicName || '').trim() },
        include: { materiales: true },
      });
    }

    // Combinar materiales de la BD con los que el docente acaba de subir en el frontend
    const seenUrls = new Set();
    const combinedMaterials = [...frontendMaterials, ...(dbTopic?.materiales || [])].filter((m) => {
      const key = m.url || m.enlace_para_descargar || m.title || m.titulo_del_material;
      if (!key || seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    const aiResult = await aiService.generateStructuredQuiz({
      topicTitle: topicName || dbTopic?.nombre_del_tema || 'Tema Académico',
      topicDescription:
        frontendDesc ||
        dbTopic?.descripcion_del_tema ||
        `Conceptos fundamentales, aplicaciones y propiedades de ${topicName}.`,
      materials: combinedMaterials,
      numQuestions: n,
    });

    const rawQuestions = Array.isArray(aiResult?.questions) ? aiResult.questions : [];
    return rawQuestions.slice(0, n).map((q) => ({
      text: q.texto_de_la_pregunta,
      options: q.opciones.map((o) => o.texto_de_la_opcion),
      correct: q.indice_opcion_correcta,
      explanation: q.explicacion || undefined,
    }));
  },

  async getGraphRecommendation({ userId, subjectId, topicId, score, answers = [], graph = null }) {
    let state = await readStateFromMySQL();
    const hasTopicInDb = (state.topics || []).some((t) => t.id === topicId && t.subjectId === subjectId);
    if (!hasTopicInDb && graph && Array.isArray(graph.topics)) {
      state = {
        subjects: Array.isArray(graph.subjects) ? graph.subjects : [],
        topics: graph.topics,
        edges: Array.isArray(graph.edges) ? graph.edges : [],
        questions: Array.isArray(graph.questions) ? graph.questions : [],
        attempts: Array.isArray(graph.attempts) ? graph.attempts : [],
      };
    }
    return aiService.generateGraphRecommendation({
      state,
      userId,
      subjectId,
      topicId,
      score,
      answers,
    });
  },
};

module.exports = {
  kmapSyncService,
  ensureOfficialDefaultsInMySQL,
};
