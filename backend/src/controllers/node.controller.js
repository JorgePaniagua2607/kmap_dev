const nodeService = require('../services/node.service');
const quizService = require('../services/quiz.service');
const { asyncHandler } = require('../utils/AppError');

const getNodeDetail = asyncHandler(async (req, res) => {
  const node = await nodeService.getNodeDetail(req.params.nodeId);
  res.status(200).json({
    ok: true,
    node
  });
});

const updateNode = asyncHandler(async (req, res) => {
  const node = await nodeService.updateNode(
    req.params.nodeId,
    req.body,
    req.user
  );
  res.status(200).json({
    ok: true,
    message: 'Tema / nodo actualizado exitosamente',
    node
  });
});

const addMaterial = asyncHandler(async (req, res) => {
  const material = await nodeService.addMaterialToNode(
    req.params.nodeId,
    req.body,
    req.file,
    req.user
  );
  res.status(201).json({
    ok: true,
    message: 'Material de estudio asociado al tema exitosamente',
    material
  });
});

const deleteMaterial = asyncHandler(async (req, res) => {
  const result = await nodeService.deleteMaterial(
    req.params.materialId,
    req.user
  );
  res.status(200).json({
    ok: true,
    message: 'Material de estudio eliminado',
    ...result
  });
});

const listNodeQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await quizService.listNodeQuizzes(
    req.params.nodeId,
    req.user
  );
  res.status(200).json({
    ok: true,
    total: quizzes.length,
    quizzes
  });
});

const createManualQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.createManualQuiz(
    req.params.nodeId,
    req.body,
    req.user
  );
  res.status(201).json({
    ok: true,
    message: 'Quiz creado manualmente con éxito',
    quiz
  });
});

const generateAiQuiz = asyncHandler(async (req, res) => {
  const result = await quizService.generateAiQuiz(
    req.params.nodeId,
    req.body,
    req.user
  );
  res.status(201).json({
    ok: true,
    message:
      'Quiz generado con IA en formato JSON estructurado (guardado en borrador editable)',
    ...result
  });
});

module.exports = {
  getNodeDetail,
  updateNode,
  addMaterial,
  deleteMaterial,
  listNodeQuizzes,
  createManualQuiz,
  generateAiQuiz
};
