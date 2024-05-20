import express from 'express';
import { createOrder, getOrders, getOrderById, updateOrder, deleteOrder, countOrders } from '../controllers/orderController';

const router = express.Router();

router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.get('/orders/count', countOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrder);
router.delete('/orders/:id', deleteOrder);

export default router;
