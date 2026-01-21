import { Router } from 'express';
import { authenticateMerchant } from '../middleware/authMiddleware';
import { getMerchantConfig, updateWebhookConfig, regenerateWebhookSecret } from '../controllers/merchantController';

const router = Router();

router.use(authenticateMerchant);

router.get('/', getMerchantConfig);
router.post('/webhook-config', updateWebhookConfig);
router.post('/regenerate-secret', regenerateWebhookSecret);

export default router;
