const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { AppError } = require('../utils/AppError');

const uploadDirAbs = path.resolve(__dirname, '../..', env.UPLOAD_DIR);
if (!fs.existsSync(uploadDirAbs)) {
  fs.mkdirSync(uploadDirAbs, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDirAbs);
  },
  filename(req, file, cb) {
    const safeOriginal = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${uniquePrefix}-${safeOriginal}`);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.originalname) {
      return cb(new AppError('Nombre de archivo inválido', 400));
    }
    cb(null, true);
  }
});

function inferFileTypeName(fileOrUrl = '') {
  const lower = String(fileOrUrl).toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.mp4') || lower.endsWith('.webm')) return 'Video MP4';
  if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'Presentacion PPTX';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'Documento DOCX';
  if (lower.endsWith('.png')) return 'Imagen PNG';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'Imagen JPG';
  if (lower.endsWith('.mp3') || lower.endsWith('.wav')) return 'Audio MP3';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'Hoja de calculo XLSX';
  if (lower.endsWith('.zip') || lower.endsWith('.rar')) return 'Archivo comprimido ZIP';
  return 'Enlace externo';
}

module.exports = {
  uploadMiddleware,
  inferFileTypeName
};
