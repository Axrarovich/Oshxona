const express = require('express');
const { getLogs, getLogsByDate, getLogsByConsumptionId, createLog, deleteLog } = require('../controllers/logController');

const router = express.Router();

router.get('/', getLogs);
router.get('/:date(\\d{4}-\\d{2}-\\d{2})', getLogsByDate);
router.get('/consumption/:id(\\d+)', getLogsByConsumptionId);
router.post('/', createLog);
router.delete('/:id(\\d+)', deleteLog);

module.exports = router;
