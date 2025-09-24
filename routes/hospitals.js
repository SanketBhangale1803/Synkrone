const express = require('express');
const router = express.Router();
const Hospital = require('../models/hospital');
const auth = require('../middleware/auth');

// GET /api/hospitals - Allow unauthenticated access for registration
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).select('_id name location');
    res.json({ hospitals });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load hospitals' });
  }
});

// GET /api/hospitals/protected - Keep protected route for authenticated users
router.get('/protected', auth.verifyToken, async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).select('_id name location');
    res.json({ hospitals });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load hospitals' });
  }
});

module.exports = router;


