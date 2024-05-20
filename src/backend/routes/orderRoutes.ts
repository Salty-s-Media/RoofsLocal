import express from 'express';
import { getOrders, getOrderById } from '../controllers/orderController';

const router = express.Router();

router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

export default router;
