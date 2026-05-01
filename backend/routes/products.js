const express = require('express');
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventory,
} = require('../controllers/productController');

const router = express.Router();

router.get('/', getAllProducts);
router.get('/inventory', getInventory);
router.get('/:id(\\d+)', getProduct);
router.post('/', createProduct);
router.put('/:id(\\d+)', updateProduct);
router.delete('/:id(\\d+)', deleteProduct);

module.exports = router;

