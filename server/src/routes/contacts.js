const express = require('express');

const { emergencyContacts } = require('../data/adminData');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(emergencyContacts);
});

module.exports = router;
