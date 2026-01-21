import { Router } from 'express';
import { authenticateMerchant } from '../middleware/authMiddleware';
import { createPayment, getPayment, capturePayment, getPayments } from '../controllers/paymentController';
import { createRefund } from '../controllers/refundController';

const router = Router();

router.use(authenticateMerchant);

// Payment Routes
router.post('/', createPayment);
router.get('/', getPayments); // List payments
router.get('/:id', getPayment);
router.post('/:id/capture', capturePayment);

// Nested Refund Route (POST /api/v1/payments/:payment_id/refunds)
router.post('/:payment_id/refunds', createRefund);

export default router;
