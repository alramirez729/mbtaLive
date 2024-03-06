const express = require("express");
const router = express.Router();
const newFavoriteModel = require('../models/favoriteModel');

router.post('/deleteAll', async (req, res) => {
    try {
        const favorites = await newFavoriteModel.deleteMany();
        return res.json(favorites);
    } catch (error) {
        console.error('Error deleting favorites:', error);
        return res.status(500).json({ error: 'Failed to delete favorites' });
    }
});

module.exports = router;
