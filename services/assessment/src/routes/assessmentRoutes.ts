import { Router } from 'express';
import {
  listAssessments,
  getAssessment,
  startAttempt,
  submitAttempt,
  executeCodeSandbox,
  listCodingProblems,
} from '../controllers/assessmentController.js';

const router = Router();

// Assessment catalog & detail routes
router.get('/', listAssessments);
router.get('/coding/problems', listCodingProblems);
router.post('/coding/run', executeCodeSandbox);
router.get('/:identifier', getAssessment);
router.post('/:identifier/start', startAttempt);
router.post('/:identifier/submit', submitAttempt);

export default router;
