const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');
const env = require('../src/config/env');

async function main() {
  console.log('🌱 Iniciando Seed de Base de Datos Plan Kmap (26 Tablas)...');

  // 1. Catálogo de Roles (idéntico a bd.ins)
  const rolesData = [
    {
      nombre_del_rol: 'administrador',
      descripcion_del_rol: 'Acceso total al sistema, gestiona usuarios, materias y configuracion global'
    },
    {
      nombre_del_rol: 'docente',
      descripcion_del_rol: 'Crea materias, temas, materiales, preguntas y evaluaciones'
    },
    {
      nombre_del_rol: 'estudiante',
      descripcion_del_rol: 'Se inscribe en materias, realiza quizzes y sigue rutas de aprendizaje'
    },
    {
      nombre_del_rol: 'tutor',
      descripcion_del_rol: 'Apoya a estudiantes y puede revisar progreso y chats'
    },
    {
      nombre_del_rol: 'auditor',
      descripcion_del_rol: 'Solo lectura de reportes, estadisticas y registros de auditoria'
    },
    {
      nombre_del_rol: 'invitado',
      descripcion_del_rol: 'Acceso limitado a contenidos publicos sin inscripcion'
    }
  ];

  const rolesMap = {};
  for (const r of rolesData) {
    const rol = await prisma.catalogoRol.upsert({
      where: { nombre_del_rol: r.nombre_del_rol },
      update: { descripcion_del_rol: r.descripcion_del_rol },
      create: r
    });
    rolesMap[r.nombre_del_rol] = rol;
  }
  console.log('✅ Catálogo de roles sincronizado (6 roles).');

  // 2. Catálogo de Tipos de Archivo (idéntico a bd.ins)
  const fileTypes = [
    { nombre_del_tipo: 'PDF', icono_que_lo_representa: 'fa-file-pdf' },
    { nombre_del_tipo: 'Video MP4', icono_que_lo_representa: 'fa-file-video' },
    { nombre_del_tipo: 'Presentacion PPTX', icono_que_lo_representa: 'fa-file-powerpoint' },
    { nombre_del_tipo: 'Documento DOCX', icono_que_lo_representa: 'fa-file-word' },
    { nombre_del_tipo: 'Imagen PNG', icono_que_lo_representa: 'fa-file-image' },
    { nombre_del_tipo: 'Imagen JPG', icono_que_lo_representa: 'fa-file-image' },
    { nombre_del_tipo: 'Audio MP3', icono_que_lo_representa: 'fa-file-audio' },
    { nombre_del_tipo: 'Enlace externo', icono_que_lo_representa: 'fa-link' },
    { nombre_del_tipo: 'Hoja de calculo XLSX', icono_que_lo_representa: 'fa-file-excel' },
    { nombre_del_tipo: 'Archivo comprimido ZIP', icono_que_lo_representa: 'fa-file-archive' }
  ];

  for (const ft of fileTypes) {
    await prisma.catalogoTipoArchivo.upsert({
      where: { nombre_del_tipo: ft.nombre_del_tipo },
      update: { icono_que_lo_representa: ft.icono_que_lo_representa },
      create: ft
    });
  }
  console.log('✅ Catálogo de tipos de archivo sincronizado (10 tipos).');

  // 3. Catálogo de Tipos de Pregunta (idéntico a bd.ins)
  const questionTypes = [
    {
      nombre_del_tipo: 'seleccion_multiple',
      descripcion_del_tipo: 'Pregunta con varias opciones y una sola correcta'
    },
    {
      nombre_del_tipo: 'verdadero_falso',
      descripcion_del_tipo: 'Pregunta de dos opciones'
    },
    {
      nombre_del_tipo: 'respuesta_corta',
      descripcion_del_tipo: 'Respuesta escrita breve'
    },
    {
      nombre_del_tipo: 'ensayo',
      descripcion_del_tipo: 'Respuesta extensa evaluada manualmente'
    },
    {
      nombre_del_tipo: 'emparejamiento',
      descripcion_del_tipo: 'Relacionar columnas'
    },
    {
      nombre_del_tipo: 'completar',
      descripcion_del_tipo: 'Completar espacios en blanco'
    }
  ];

  for (const qt of questionTypes) {
    await prisma.catalogoTipoPregunta.upsert({
      where: { nombre_del_tipo: qt.nombre_del_tipo },
      update: { descripcion_del_tipo: qt.descripcion_del_tipo },
      create: qt
    });
  }
  console.log('✅ Catálogo de tipos de pregunta sincronizado (6 tipos).');

  // 4. Usuario ADMIN inicial desde variables de entorno (.env)
  const adminPasswordHash = await bcrypt.hash(
    env.ADMIN_PASSWORD,
    env.BCRYPT_SALT_ROUNDS
  );

  const adminUser = await prisma.usuario.upsert({
    where: { correo_electronico: env.ADMIN_EMAIL.toLowerCase() },
    update: {
      nombre_completo: env.ADMIN_NAME,
      id_rol: rolesMap.administrador.id_rol,
      contrasena_encriptada: adminPasswordHash,
      esta_habilitado: true,
      debe_cambiar_contrasena: false
    },
    create: {
      id_rol: rolesMap.administrador.id_rol,
      nombre_completo: env.ADMIN_NAME,
      correo_electronico: env.ADMIN_EMAIL.toLowerCase(),
      contrasena_encriptada: adminPasswordHash,
      esta_habilitado: true,
      debe_cambiar_contrasena: false
    }
  });
  console.log(`✅ Usuario ADMIN creado/actualizado: ${adminUser.correo_electronico}`);

  // 5. Docente de prueba (Laura Gimenez Lopez de bd.ins, contraseña inicial = carnet 7654321)
  const teacherCarnet = '7654321';
  const teacherHash = await bcrypt.hash(teacherCarnet, env.BCRYPT_SALT_ROUNDS);
  const docenteUser = await prisma.usuario.upsert({
    where: { correo_electronico: 'laura.gimenez@kmap.edu' },
    update: {
      id_rol: rolesMap.docente.id_rol,
      carnet_identidad: teacherCarnet
    },
    create: {
      id_rol: rolesMap.docente.id_rol,
      nombre_completo: 'Laura Gimenez Lopez',
      correo_electronico: 'laura.gimenez@kmap.edu',
      carnet_identidad: teacherCarnet,
      contrasena_encriptada: teacherHash,
      debe_cambiar_contrasena: true,
      esta_habilitado: true
    }
  });
  console.log(
    `✅ Usuario DOCENTE de prueba listo: ${docenteUser.correo_electronico} (Carnet/Password inicial: ${teacherCarnet})`
  );

  // 6. Estudiante UMSS de prueba (Juan David Torres de bd.ins con código SIS est.umss)
  const studentSis = '2024001.est.umss';
  const studentHash = await bcrypt.hash('Estudiante123!', env.BCRYPT_SALT_ROUNDS);
  const estudianteUser = await prisma.usuario.upsert({
    where: { correo_electronico: 'juan.torres@est.umss.edu' },
    update: {
      id_rol: rolesMap.estudiante.id_rol,
      codigo_sis: studentSis
    },
    create: {
      id_rol: rolesMap.estudiante.id_rol,
      nombre_completo: 'Juan David Torres',
      correo_electronico: 'juan.torres@est.umss.edu',
      codigo_sis: studentSis,
      contrasena_encriptada: studentHash,
      debe_cambiar_contrasena: false,
      esta_habilitado: true
    }
  });
  console.log(
    `✅ Usuario ESTUDIANTE de prueba listo: SIS=${estudianteUser.codigo_sis} (Password: Estudiante123!)`
  );

  // 7. Materia base de bd.ins (MAT101 - Matematicas Basicas) asignada a Laura Gimenez
  await prisma.materiaAsignatura.upsert({
    where: { codigo_de_la_materia: 'MAT101' },
    update: {
      id_del_docente: docenteUser.id_usuario
    },
    create: {
      nombre_de_la_materia: 'Matematicas Basicas',
      codigo_de_la_materia: 'MAT101',
      descripcion_corta: 'Fundamentos de aritmetica, algebra y geometria',
      id_del_docente: docenteUser.id_usuario,
      codigo_matriculacion: 'KMAP-MAT101',
      color_representativo: '#FF5733',
      esta_habilitada: true
    }
  });

  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((err) => {
    console.error('❌ Error ejecutando seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
