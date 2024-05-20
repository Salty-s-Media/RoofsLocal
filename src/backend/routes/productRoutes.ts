import express from 'express';
import { getProducts, getProductById } from '../controllers/productController';

const router = express.Router();

router.get('/products', getProducts);
router.get('/products/:id', getProductById);

export default router;
