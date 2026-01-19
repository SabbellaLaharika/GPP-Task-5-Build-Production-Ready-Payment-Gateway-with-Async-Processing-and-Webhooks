import { Router } from 'express';
import { createOrder, getOrder } from '../controllers/orderController';
import { authenticateMerchant } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all order routes
router.use(authenticateMerchant);

router.post('/', createOrder);
router.get('/:id', getOrder);

export default router;
