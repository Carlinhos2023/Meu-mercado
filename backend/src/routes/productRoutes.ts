import { Router } from 'express';
import {
  getProducts,
  createOrUpdateProduct,
  adjustProductQuantity,
  restockProductsBatch,
  deleteProduct,
} from '../controllers/productController';

const router = Router();

router.get('/', getProducts);
router.post('/', createOrUpdateProduct);
router.put('/:id', createOrUpdateProduct);
router.patch('/:id/quantity', adjustProductQuantity);
router.post('/restock', restockProductsBatch);
router.delete('/:id', deleteProduct);

export default router;
