const express = require("express");
const router = express.Router();
const newFavoriteModel = require('../models/favoriteModel');

router.get('/getByUserId', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const favorites = await newFavoriteModel.find({ userId });
      return res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

module.exports = router;