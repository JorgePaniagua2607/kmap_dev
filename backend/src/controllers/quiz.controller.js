const quizService = require('../services/quiz.service');
const evaluationService = require('../services/evaluation.service');
const { asyncHandler } = require('../utils/AppError');

const getQuizForTaking = asyncHandler(async (req, res) => {
  const quiz = await evaluationService.getQuizForTaking(
    req.params.quizId,
    req.user
  );
  res.status(200).json({
    ok: true,
    quiz
  });
});

const submitQuiz = asyncHandler(async (req, res) => {
  const evaluation = await evaluationService.submitQuiz(
    req.params.quizId,
    req.body,
    req.user
  );
  res.status(200).json({
    ok: true,
    message: evaluation.passed
      ? `¡Felicidades! Aprobaste el quiz con ${evaluation.grade}/100 (Posición #${evaluation.rank} en el ranking).`
      : `Obtuviste ${evaluation.grade}/100 (mínimo requerido: ${evaluation.passingThreshold}). Revisa las recomendaciones de prerrequisitos del grafo.`,
    evaluation
  });
});

const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.updateQuiz(
    req.params.quizId,
    req.body,
    req.user
  );
  res.status(200).json({
    ok: true,
    message: 'Quiz actualizado exitosamente',
    quiz
  });
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const result = await quizService.deleteQuiz(req.params.quizId, req.user);
  res.status(200).json({
    ok: true,
    message: 'Quiz eliminado exitosamente',
    ...result
  });
});

module.exports = {
  getQuizForTaking,
  submitQuiz,
  updateQuiz,
  deleteQuiz
};
