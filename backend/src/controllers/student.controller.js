const studentService = require('../services/student.service');
const { asyncHandler } = require('../utils/AppError');

const enrollByCode = asyncHandler(async (req, res) => {
  const inscripcion = await studentService.enrollByCode(
    req.user.id_usuario,
    req.body
  );
  res.status(201).json({
    ok: true,
    message: 'Te has matriculado exitosamente en la materia',
    inscripcion
  });
});

const listMySubjects = asyncHandler(async (req, res) => {
  const result = await studentService.listEnrolledSubjects(req.user.id_usuario);
  res.status(200).json({
    ok: true,
    ...result
  });
});

module.exports = {
  enrollByCode,
  listMySubjects
};
