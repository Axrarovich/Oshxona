const express = require('express');
const {
  getConsumption,
  getConsumptionByDate,
  createConsumption,
  updateConsumption,
  deleteConsumption,
} = require('../controllers/consumptionController');

const router = express.Router();

router.get('/', getConsumption);
router.get('/:date(\\d{4}-\\d{2}-\\d{2})', getConsumptionByDate);
router.post('/', createConsumption);
router.put('/:id(\\d+)', updateConsumption);
router.delete('/:id(\\d+)', deleteConsumption);

module.exports = router;

