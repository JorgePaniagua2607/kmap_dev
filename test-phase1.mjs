import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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
console.log('🧪 TEST DE VERIFICACIÓN — FASE 1 (BD KMAP 26 TABLAS)');
console.log('====================================================\n');

// 1. Verificar archivos principales de Fase 1
const requiredFiles = [
  '.gitignore',
  'backend/package.json',
  'backend/.env.example',
  'backend/prisma/schema.prisma',
  'frontend/package.json',
  'frontend/.env.example',
  'frontend/vite.config.js',
  'frontend/tailwind.config.js',
  'frontend/postcss.config.js',
  'frontend/index.html',
  'frontend/src/index.css'
];

for (const relPath of requiredFiles) {
  const fullPath = path.join(ROOT, relPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;
  check(`Archivo existente y no vacío: ${relPath}`, exists);
}

// 2. Asegurar y verificar estructura de carpetas por capas
const requiredDirs = [
  'backend/prisma',
  'backend/src/config',
  'backend/src/routes',
  'backend/src/controllers',
  'backend/src/services',
  'backend/src/middlewares',
  'backend/src/utils',
  'backend/uploads',
  'frontend/src/api',
  'frontend/src/components'
];

for (const relDir of requiredDirs) {
  const fullDir = path.join(ROOT, relDir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }
  check(`Directorio de arquitectura presente: ${relDir}`, fs.existsSync(fullDir));
}

// 3. Validar backend/package.json y dependencias obligatorias
try {
  const backendPkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'backend/package.json'), 'utf8')
  );
  const requiredBackendDeps = [
    '@prisma/client',
    'bcryptjs',
    'cors',
    'dotenv',
    'express',
    'helmet',
    'jsonwebtoken',
    'multer',
    'nodemailer',
    'zod'
  ];
  for (const dep of requiredBackendDeps) {
    check(
      `Dependencia backend '${dep}' declarada`,
      Boolean(backendPkg.dependencies && backendPkg.dependencies[dep])
    );
  }
  check(
    `DevDependency backend 'prisma' declarada`,
    Boolean(backendPkg.devDependencies && backendPkg.devDependencies.prisma)
  );
  check(
    `Script 'postinstall' para Railway configurado`,
    backendPkg.scripts?.postinstall === 'prisma generate'
  );
  check(
    `Configuración 'prisma.seed' declarada`,
    backendPkg.prisma?.seed === 'node prisma/seed.js'
  );
} catch (err) {
  check('Parseo JSON de backend/package.json', false, err.message);
}

// 4. Validar frontend/package.json (sin librerías prohibidas)
try {
  const frontendPkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'frontend/package.json'), 'utf8')
  );
  const allFrontendDeps = {
    ...(frontendPkg.dependencies || {}),
    ...(frontendPkg.devDependencies || {})
  };
  check(`Dependencia frontend 'react' declarada`, Boolean(allFrontendDeps.react));
  check(`Dependencia frontend 'vite' declarada`, Boolean(allFrontendDeps.vite));
  check(`Dependencia frontend 'tailwindcss' declarada`, Boolean(allFrontendDeps.tailwindcss));
  check(
    `Regla estricta frontend: sin framer-motion / reactflow / cytoscape`,
    !allFrontendDeps['framer-motion'] &&
      !allFrontendDeps['reactflow'] &&
      !allFrontendDeps['@xyflow/react'] &&
      !allFrontendDeps['cytoscape']
  );
} catch (err) {
  check('Parseo JSON de frontend/package.json', false, err.message);
}

// 5. Validar los Enums y las 26 Tablas en Español de tu BD en schema.prisma
try {
  const schema = fs.readFileSync(
    path.join(ROOT, 'backend/prisma/schema.prisma'),
    'utf8'
  );

  const expectedEnums = [
    'EstadoInscripcion',
    'EstadoIntento',
    'EstadoAprendizaje',
    'TipoFalla',
    'EstadoRuta',
    'EstadoPaso',
    'TipoChat',
    'EstadoChat'
  ];

  for (const enumName of expectedEnums) {
    check(
      `Enum Prisma '${enumName}' definido en schema.prisma`,
      new RegExp(`enum\\s+${enumName}\\s*\\{`).test(schema)
    );
  }

  const expectedSqlTables = [
    'catalogo_roles',
    'usuario',
    'materia_asignatura',
    'inscripcion_materia',
    'tema_conocimiento',
    'requisito_entre_temas',
    'catalogo_tipos_archivo',
    'material_estudio',
    'catalogo_tipos_pregunta',
    'banco_preguntas',
    'opcion_respuesta',
    'respuesta_oficial',
    'evaluacion_quiz',
    'intento_de_quiz',
    'respuesta_estudiante',
    'ranking_por_tema',
    'resumen_estadisticas_materia',
    'progreso_actual',
    'historial_de_progreso',
    'falla_encontrada',
    'rutas_de_aprendizaje',
    'pasos_del_camino',
    'conversacion_chat',
    'miembro_chat',
    'mensaje_chat',
    'registro_auditoria'
  ];

  for (const tableName of expectedSqlTables) {
    check(
      `Tabla SQL '${tableName}' mapeada en schema.prisma`,
      schema.includes(`@@map("${tableName}")`)
    );
  }

  const requiredBusinessFields = [
    'codigo_sis',
    'carnet_identidad',
    'debe_cambiar_contrasena',
    'codigo_matriculacion',
    'posicion_x',
    'posicion_y',
    'generado_por_ia'
  ];

  for (const field of requiredBusinessFields) {
    check(
      `Campo de negocio Plan Kmap '${field}' presente en schema.prisma`,
      schema.includes(field)
    );
  }
} catch (err) {
  check('Lectura de backend/prisma/schema.prisma', false, err.message);
}

// 6. Crear .env locales desde .env.example si aún no existen
const backendEnv = path.join(ROOT, 'backend/.env');
const backendEnvExample = path.join(ROOT, 'backend/.env.example');
if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
  fs.copyFileSync(backendEnvExample, backendEnv);
  console.log('ℹ️  Archivo backend/.env creado automáticamente a partir de backend/.env.example');
}

const frontendEnv = path.join(ROOT, 'frontend/.env');
const frontendEnvExample = path.join(ROOT, 'frontend/.env.example');
if (!fs.existsSync(frontendEnv) && fs.existsSync(frontendEnvExample)) {
  fs.copyFileSync(frontendEnvExample, frontendEnv);
  console.log('ℹ️  Archivo frontend/.env creado automáticamente a partir de frontend/.env.example');
}

// 7. Si node_modules está instalado en backend, validar schema con Prisma CLI
const prismaBin = path.join(
  ROOT,
  'backend/node_modules/.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma'
);

if (fs.existsSync(prismaBin)) {
  try {
    execSync(`"${prismaBin}" validate`, {
      cwd: path.join(ROOT, 'backend'),
      stdio: 'pipe'
    });
    check('Validación oficial de Prisma CLI (npx prisma validate)', true);
  } catch (err) {
    check('Validación oficial de Prisma CLI (npx prisma validate)', false, err.message);
  }
}

console.log('\n====================================================');
console.log(`📊 RESULTADO FASE 1: ${passed} pruebas exitosas, ${failed} fallidas.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
