const { kmapSyncService } = require('../services/kmapSync.service');

const kmapSyncController = {
  async getState(req, res, next) {
    try {
      const state = await kmapSyncService.getState();
      return res.json({ ok: true, state });
    } catch (error) {
      return next(error);
    }
  },

  async syncState(req, res, next) {
    try {
      const state = await kmapSyncService.syncState(req.body);
      return res.json({ ok: true, state });
    } catch (error) {
      return next(error);
    }
  },

  async generateAI(req, res, next) {
    try {
      const questions = await kmapSyncService.generateQuestionsAI(req.body);
      return res.json({ ok: true, questions });
    } catch (error) {
      return next(error);
    }
  },

  async getRecommendation(req, res, next) {
    try {
      const recommendation = await kmapSyncService.getGraphRecommendation(req.body);
      return res.json({ ok: true, recommendation });
    } catch (error) {
      return next(error);
    }
  },

  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, message: 'No se recibió ningún archivo.' });
      }
      const url = `/uploads/${req.file.filename}`;
      return res.json({
        ok: true,
        url,
        title: req.file.originalname,
        filename: req.file.filename,
      });
    } catch (error) {
      return next(error);
    }
  },
};

module.exports = {
  kmapSyncController,
};
