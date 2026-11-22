const teacherService = require('../services/teacher.service');
const { asyncHandler } = require('../utils/AppError');

const listMySubjects = asyncHandler(async (req, res) => {
  const result = await teacherService.listTeacherSubjects(req.user);
  res.status(200).json({
    ok: true,
    ...result
  });
});

const regenerateEnrollmentCode = asyncHandler(async (req, res) => {
  const subject = await teacherService.regenerateEnrollmentCode(
    req.params.subjectId,
    req.user
  );
  res.status(200).json({
    ok: true,
    message: 'Código de matriculación generado/regenerado exitosamente',
    codigo_matriculacion: subject.codigo_matriculacion,
    subject
  });
});

module.exports = {
  listMySubjects,
  regenerateEnrollmentCode
};
