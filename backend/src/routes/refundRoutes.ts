import { Router } from 'express';
import { authenticateMerchant } from '../middleware/authMiddleware';
import { getRefund } from '../controllers/refundController';

const router = Router();

router.use(authenticateMerchant);

// GET /api/v1/refunds/:id
router.get('/:id', getRefund);

export default router;
