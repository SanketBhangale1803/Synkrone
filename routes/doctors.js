const express = require('express');
const router = express.Router();
const User = require('../models/users');
const auth = require('../middleware/auth');

// GET /api/doctors?hospitalId=...
router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const { hospitalId } = req.query;
    if (!hospitalId) return res.status(400).json({ error: 'hospitalId required' });
    const doctors = await User.find({ role: 'doctor', hospitalId }).select('_id fullname specialization');
    res.json({ doctors });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load doctors' });
  }
});

module.exports = router;


