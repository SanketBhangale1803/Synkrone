const express = require('express');
const router = express.Router();
const Hospital = require('../models/hospital');
const auth = require('../middleware/auth');

// GET /api/hospitals
router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).select('_id name location');
    res.json({ hospitals });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load hospitals' });
  }
});

module.exports = router;


