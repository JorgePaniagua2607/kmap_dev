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
console.log('🧪 TEST DE VERIFICACIÓN — FASE 3 (ADMIN, DOCENTE, MATRÍCULA)');
console.log('====================================================\n');

const requiredPhase3Files = [
  'backend/src/services/email.service.js',
  'backend/src/utils/codeGenerator.js',
  'backend/src/services/admin.service.js',
  'backend/src/controllers/admin.controller.js',
  'backend/src/routes/admin.routes.js',
  'backend/src/services/teacher.service.js',
  'backend/src/controllers/teacher.controller.js',
  'backend/src/routes/teacher.routes.js',
  'backend/src/services/student.service.js',
  'backend/src/controllers/student.controller.js',
  'backend/src/routes/student.routes.js',
  'backend/src/app.js',
  'frontend/src/App.jsx'
];

for (const relPath of requiredPhase3Files) {
  const fullPath = path.join(ROOT, relPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;
  check(`Archivo Fase 3 existente y no vacío: ${relPath}`, exists);
}

const adminServiceCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/services/admin.service.js'),
  'utf8'
);
check(
  'Alta de docente hashea carnet_identidad con bcrypt como contraseña inicial',
  adminServiceCode.includes('bcrypt.hash') &&
    adminServiceCode.includes('data.carnet_identidad')
);
check(
  'Alta de docente activa debe_cambiar_contrasena: true',
  adminServiceCode.includes('debe_cambiar_contrasena: true')
);
check(
  'Alta de docente envía credenciales por correo (emailService.sendTeacherCredentials)',
  adminServiceCode.includes('sendTeacherCredentials')
);
check(
  'Asignación de materias a docente retorna total_materias_dictadas',
  adminServiceCode.includes('total_materias_dictadas')
);

const teacherServiceCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/services/teacher.service.js'),
  'utf8'
);
check(
  'Docente puede generar/regenerar codigo_matriculacion estilo Classroom',
  teacherServiceCode.includes('generateEnrollmentCode') &&
    teacherServiceCode.includes('codigo_matriculacion')
);

const studentServiceCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/services/student.service.js'),
  'utf8'
);
check(
  'Estudiante puede matricularse por codigo_matriculacion en inscripcion_materia',
  studentServiceCode.includes('inscripcionMateria.upsert')
);

const appCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/app.js'),
  'utf8'
);
check(
  'Rutas /api/admin, /api/teacher y /api/student montadas en app.js',
  appCode.includes("'/api/admin'") &&
    appCode.includes("'/api/teacher'") &&
    appCode.includes("'/api/student'")
);

console.log('\n====================================================');
console.log(`📊 RESULTADO FASE 3: ${passed} pruebas exitosas, ${failed} fallidas.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
