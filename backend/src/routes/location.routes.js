const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

router.get('/hospitals-by-name', locationController.getHospitalsByName);
router.get('/', locationController.getNestedLocations);

module.exports = router;
