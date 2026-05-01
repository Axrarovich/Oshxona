const express = require('express');
const {
  getDailyReport,
  getMonthlyReport,
  getInventoryReport,
  getConsumptionStats,
} = require('../controllers/reportController');

const router = express.Router();

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/inventory', getInventoryReport);
router.get('/consumption-stats', getConsumptionStats);

module.exports = router;

