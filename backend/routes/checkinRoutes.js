const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');

router.post('/:registrationId', checkinController.checkinStudent);

module.exports = router;
