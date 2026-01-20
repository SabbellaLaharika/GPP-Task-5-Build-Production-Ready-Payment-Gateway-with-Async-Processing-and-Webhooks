import { Router } from 'express';
import { getTestMerchant } from '../controllers/testController';

const router = Router();

router.get('/merchant', getTestMerchant);

export default router;
