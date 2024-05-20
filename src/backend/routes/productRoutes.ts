import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, countProducts } from '../controllers/productController';

const router = express.Router();

router.post('/products', createProduct);
router.get('/products', getProducts);
router.get('/products/count', countProducts);
router.get('/products/:id', getProductById);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;
