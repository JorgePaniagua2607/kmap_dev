const adminService = require('../services/admin.service');
const { asyncHandler } = require('../utils/AppError');

const listTeachers = asyncHandler(async (req, res) => {
  const teachers = await adminService.listTeachers();
  res.status(200).json({
    ok: true,
    total: teachers.length,
    teachers
  });
});

const createTeacher = asyncHandler(async (req, res) => {
  const result = await adminService.createTeacher(req.body, req.user.id_usuario);
  res.status(201).json({
    ok: true,
    message:
      'Docente registrado exitosamente. Credenciales iniciales (contraseña = carnet) enviadas por correo.',
    ...result
  });
});

const listSubjects = asyncHandler(async (req, res) => {
  const subjects = await adminService.listSubjects();
  res.status(200).json({
    ok: true,
    total: subjects.length,
    subjects
  });
});

const createSubject = asyncHandler(async (req, res) => {
  const subject = await adminService.createSubject(req.body, req.user.id_usuario);
  res.status(201).json({
    ok: true,
    message: 'Materia creada exitosamente',
    subject
  });
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await adminService.updateSubject(
    req.params.subjectId,
    req.body,
    req.user.id_usuario
  );
  res.status(200).json({
    ok: true,
    message: 'Materia actualizada exitosamente',
    subject
  });
});

const deleteSubject = asyncHandler(async (req, res) => {
  const result = await adminService.deleteSubject(
    req.params.subjectId,
    req.user.id_usuario
  );
  res.status(200).json({
    ok: true,
    message: 'Materia eliminada exitosamente',
    ...result
  });
});

const assignSubjects = asyncHandler(async (req, res) => {
  const result = await adminService.assignSubjectsToTeacher(
    req.body,
    req.user.id_usuario
  );
  res.status(200).json({
    ok: true,
    message: 'Asignación de materias actualizada correctamente',
    ...result
  });
});

module.exports = {
  listTeachers,
  createTeacher,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjects
};
