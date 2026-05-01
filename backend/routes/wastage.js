const express = require('express');
const {
  getWastage,
  getWastageByDate,
  createWastage,
  updateWastage,
  deleteWastage,
} = require('../controllers/wastageController');

const router = express.Router();

router.get('/', getWastage);
router.get('/:date(\\d{4}-\\d{2}-\\d{2})', getWastageByDate);
router.post('/', createWastage);
router.put('/:id(\\d+)', updateWastage);
router.delete('/:id(\\d+)', deleteWastage);

module.exports = router;

