import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as quranController from '../controllers/quran.controller.js';
import {
  quranReadSchema,
  quranSummarySchema,
  quranProfileSchema,
  quranReadAyatSchema,
  quranBookmarkSchema,
  quranHistorySchema,
  quranTafsirSchema,
  quranResumeSchema,
  quranDuaBookmarkSchema,
  quranSessionSaveSchema,
  quranSessionsQuerySchema,
} from '../validation/quran.schemas.js';

const router = Router();

// POST /api/quran/read — add pages for a day (optionally advance the bookmark)
router.post('/read', requireAuth, validate(quranReadSchema), quranController.read);

// POST /api/quran/read-ayat — v4 ayah engine (surah credit + khatam advance)
router.post('/read-ayat', requireAuth, validate(quranReadAyatSchema), quranController.readAyat);

// POST /api/quran/bookmark — toggle a saved ayah
router.post(
  '/bookmark',
  requireAuth,
  validate(quranBookmarkSchema),
  quranController.toggleBookmark
);

// GET /api/quran/history?days=&today= — daily units for analytics
router.get('/history', requireAuth, validate(quranHistorySchema), quranController.getHistory);

// GET /api/quran/tafsir?surah=&ayah=&editionId= — authentic tafsir (quran.com)
router.get('/tafsir', requireAuth, validate(quranTafsirSchema), quranController.getTafsir);

// POST /api/quran/session — periodic upsert of the in-progress reading session
router.post('/session', requireAuth, validate(quranSessionSaveSchema), quranController.saveSession);

// GET /api/quran/sessions?date= — reading sessions for a day (history list)
router.get(
  '/sessions',
  requireAuth,
  validate(quranSessionsQuerySchema),
  quranController.getSessions
);

// GET /api/quran/summary?today= — profile, streak, khatm progress, pace
router.get('/summary', requireAuth, validate(quranSummarySchema), quranController.getSummary);

// PATCH /api/quran/profile — daily goal / bookmark position
router.patch('/profile', requireAuth, validate(quranProfileSchema), quranController.updateProfile);

// PUT /api/quran/resume — per-surah reader position (cross-device continue)
router.put('/resume', requireAuth, validate(quranResumeSchema), quranController.setResume);

// POST /api/quran/dua-bookmark — toggle a curated dua in the saved list
router.post(
  '/dua-bookmark',
  requireAuth,
  validate(quranDuaBookmarkSchema),
  quranController.toggleDuaBookmark
);

// Khatam journey is OPT-IN: explicit start + reset (Istiak's spec)
router.post('/khatam/start', requireAuth, quranController.startKhatam);
router.post('/khatam/reset', requireAuth, quranController.resetKhatam);
router.post('/reset-reading', requireAuth, quranController.resetReading);

// DELETE /api/quran/all — wipe all Quran data for the user
router.delete('/all', requireAuth, quranController.deleteAll);

export default router;
