const express = require("express");
const router = express.Router();
const highlightModel = require('../models/userHighlights');

router.get('/getAll', async (req, res) => {
  const { userId } = req.query;

  try {
    const highlights = await highlightModel.find({ userId: userId });
    if (highlights.length === 0) {
      return res.status(404).json({ message: "No highlights found for the user" });
    }
    return res.json(highlights);
  } catch (error) {
    console.error('Error getting all highlights:', error);
    return res.status(500).json({ error: 'Failed to get all highlights' });
  }
});

module.exports = router;
