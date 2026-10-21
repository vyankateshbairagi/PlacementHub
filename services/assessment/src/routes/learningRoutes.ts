import { Router } from 'express';
import {
  listRoadmaps,
  getRoadmap,
  toggleTopicProgress,
  getStudentLearningSummary,
} from '../controllers/learningController.js';

const router = Router();

router.get('/roadmaps', listRoadmaps);
router.get('/roadmaps/:identifier', getRoadmap);
router.post('/roadmaps/:identifier/progress', toggleTopicProgress);
router.post('/roadmaps/:identifier/toggle-topic', toggleTopicProgress);
router.get('/summary', getStudentLearningSummary);

export default router;
