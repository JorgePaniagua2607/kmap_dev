const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const { ensureOfficialDefaultsInMySQL } = require('./services/kmapSync.service');

const server = app.listen(env.PORT, '0.0.0.0', async () => {
  console.log('====================================================');
  console.log(`🚀 Plan Kmap Backend corriendo en http://localhost:${env.PORT}`);
  console.log(`🔗 Healthcheck: http://localhost:${env.PORT}/api/health`);
  console.log(`🌐 CORS habilitado para: ${env.FRONTEND_URL}`);
  console.log(`📧 EMAIL_MODE=${env.EMAIL_MODE} | 🤖 AI_MODE=${env.AI_MODE}`);
  console.log('====================================================');

  try {
    await ensureOfficialDefaultsInMySQL();
    const [usersCount, subjectsCount, topicsCount, questionsCount] = await Promise.all([
      prisma.usuario.count(),
      prisma.materiaAsignatura.count(),
      prisma.temaConocimiento.count(),
      prisma.bancoPregunta.count(),
    ]);
    console.log(
      `✅ Base de datos MySQL oficial (kmap) sincronizada: ${usersCount} usuarios, ${subjectsCount} materias, ${topicsCount} temas, ${questionsCount} preguntas.`
    );
  } catch (err) {
    console.error('⚠️ Error inicializando datos por defecto en MySQL:', err.message);
  }
});

async function shutdown(signal) {
  console.log(`\n[${signal}] Cerrando servidor y desconectando Prisma...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
