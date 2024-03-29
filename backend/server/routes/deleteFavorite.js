const express = require("express");
const router = express.Router();
const FavoriteModel = require('../models/favoriteModel');

// Delete a single favorite by ID
router.delete('/deleteFavorite/:id', async (req, res) => {
  try {
    const { id } = req.params; // Extract the ID from the route parameter

    const favorite = await FavoriteModel.findByIdAndRemove(id);
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.json({ message: 'Favorite deleted successfully' });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return res.status(500).json({ message: 'Failed to delete favorite' });
  }
});

module.exports = router;
