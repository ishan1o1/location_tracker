const express = require('express');
const router = express.Router();
const { getRoute } = require('../controllers/locationController');

router.post('/getRoute', getRoute);

module.exports = router;