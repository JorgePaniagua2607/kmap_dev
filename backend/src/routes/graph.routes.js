const express = require('express');
const graphController = require('../controllers/graph.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateJWT);

// Consultar el grafo de una materia en formato listo para React Flow
router.get(
  '/:subjectId/graph',
  authorizeRoles('DOCENTE', 'ESTUDIANTE', 'ADMIN', 'TUTOR', 'AUDITOR'),
  graphController.getSubjectGraph
);

// Guardar nodos y aristas del grafo tras validar que sea un DAG sin ciclos
router.put(
  '/:subjectId/graph',
  authorizeRoles('DOCENTE', 'ADMIN'),
  graphController.saveSubjectGraph
);

// Mapa de calor por materia (mejores/peores calificaciones y nodos con más fallos)
router.get(
  '/:subjectId/heatmap',
  authorizeRoles('DOCENTE', 'ADMIN', 'AUDITOR'),
  graphController.getSubjectHeatmap
);

module.exports = router;
