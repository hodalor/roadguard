const express = require('express');

const { emergencyServices } = require('../data/adminData');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(emergencyServices);
});

module.exports = router;
