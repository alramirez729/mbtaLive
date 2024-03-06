const express = require("express");
const router = express.Router();
const newFavoriteModel = require('../models/favoriteModel');

router.get('/getAll', async (req, res) => {
    try {
        const favorites = await newFavoriteModel.find();
        return res.json(favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

module.exports = router;
