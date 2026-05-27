const express = require('express');

const { analytics } = require('../data/adminData');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(analytics);
});

module.exports = router;
