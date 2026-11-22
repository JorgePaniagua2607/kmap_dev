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
console.log('🧪 TEST DE VERIFICACIÓN — FASE 2 (AUTH + JWT + RBAC)');
console.log('====================================================\n');

const requiredPhase2Files = [
  'backend/src/config/env.js',
  'backend/src/config/prisma.js',
  'backend/src/utils/AppError.js',
  'backend/src/utils/roleMapper.js',
  'backend/src/middlewares/error.middleware.js',
  'backend/src/middlewares/auth.middleware.js',
  'backend/src/services/auth.service.js',
  'backend/src/controllers/auth.controller.js',
  'backend/src/routes/auth.routes.js',
  'backend/src/app.js',
  'backend/src/server.js',
  'backend/prisma/seed.js',
  'frontend/src/api/client.js',
  'frontend/src/main.jsx',
  'frontend/src/App.jsx'
];

for (const relPath of requiredPhase2Files) {
  const fullPath = path.join(ROOT, relPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;
  check(`Archivo Fase 2 existente y no vacío: ${relPath}`, exists);
}

// Verificar reglas de negocio en auth.service.js y auth.middleware.js
const authServiceCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/services/auth.service.js'),
  'utf8'
);
check(
  'Validación estricta de código SIS con "est.umss" en auth.service.js',
  authServiceCode.includes("includes('est.umss')")
);
check(
  'Reseteo de bandera debe_cambiar_contrasena = false al cambiar contraseña',
  authServiceCode.includes('debe_cambiar_contrasena: false')
);
check(
  'Registro en tabla registro_auditoria en auth.service.js',
  authServiceCode.includes('registroAuditoria.create')
);

const authMiddlewareCode = fs.readFileSync(
  path.join(ROOT, 'backend/src/middlewares/auth.middleware.js'),
  'utf8'
);
check(
  'Middleware authenticateJWT implementado',
  authMiddlewareCode.includes('authenticateJWT')
);
check(
  'Middleware authorizeRoles implementado',
  authMiddlewareCode.includes('authorizeRoles')
);

const frontendClientCode = fs.readFileSync(
  path.join(ROOT, 'frontend/src/api/client.js'),
  'utf8'
);
check(
  'Inyección automática de Authorization: Bearer <token> en frontend/src/api/client.js',
  frontendClientCode.includes('Bearer ${token}')
);

console.log('\n====================================================');
console.log(`📊 RESULTADO FASE 2: ${passed} pruebas exitosas, ${failed} fallidas.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
