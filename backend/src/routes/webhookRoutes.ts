import { Router } from 'express';
import { authenticateMerchant } from '../middleware/authMiddleware';
import { getWebhooks, retryWebhook } from '../controllers/webhookController';

const router = Router();

router.use(authenticateMerchant);

router.get('/', getWebhooks);
router.post('/:id/retry', retryWebhook);

export default router;
