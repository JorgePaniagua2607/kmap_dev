const express = require('express');
const { kmapSyncController } = require('../controllers/kmapSync.controller');
const { uploadMiddleware } = require('../services/storage.service');

const router = express.Router();

router.get('/state', kmapSyncController.getState);
router.put('/sync', kmapSyncController.syncState);
router.post('/reset', kmapSyncController.resetState);
router.post('/generate-ai', kmapSyncController.generateAI);
router.post('/recommend', kmapSyncController.getRecommendation);
router.post('/upload', uploadMiddleware.single('file'), kmapSyncController.uploadFile);

module.exports = router;
