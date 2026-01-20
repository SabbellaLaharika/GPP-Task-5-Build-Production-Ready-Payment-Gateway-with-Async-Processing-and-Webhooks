import { Router } from 'express';
import { getTestMerchant, getJobStatus } from '../controllers/testController';

const router = Router();

router.get('/merchant', getTestMerchant);
router.get('/jobs/status', getJobStatus);

export default router;
