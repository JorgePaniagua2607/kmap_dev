const graphService = require('../services/graph.service');
const evaluationService = require('../services/evaluation.service');
const { asyncHandler } = require('../utils/AppError');

const getSubjectGraph = asyncHandler(async (req, res) => {
  const result = await graphService.getSubjectGraph(req.params.subjectId);
  res.status(200).json({
    ok: true,
    ...result
  });
});

const saveSubjectGraph = asyncHandler(async (req, res) => {
  const result = await graphService.saveSubjectGraph(
    req.params.subjectId,
    req.body,
    req.user
  );
  res.status(200).json({
    ok: true,
    message:
      'Grafo de conocimiento validado como DAG (sin ciclos) y guardado exitosamente',
    ...result
  });
});

const getSubjectHeatmap = asyncHandler(async (req, res) => {
  const heatmap = await evaluationService.getSubjectHeatmap(
    req.params.subjectId
  );
  res.status(200).json({
    ok: true,
    ...heatmap
  });
});

module.exports = {
  getSubjectGraph,
  saveSubjectGraph,
  getSubjectHeatmap
};
