const express = require("express");
const router = express.Router();
const FavoriteModel = require('../models/favoriteModel');
const z = require('zod');

// Define the schema for a favorite edit
const editFavoriteSchema = z.object({
  line: z.string(),
  station: z.string(),
});

// Use PUT method for updating existing resources
router.put('/editFavorite/:id', async (req, res) => {
  try {
    const { id } = req.params; // Extracting ID from URL parameters

    const { error, data } = editFavoriteSchema.safeParse(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const { line, station } = data;
    const favorite = await FavoriteModel.findOneAndUpdate({ _id: id }, { line, station }, { new: true });
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    // Send back the updated favorite as confirmation
    return res.json({ message: 'Favorite updated successfully', favorite });
  } catch (error) {
    console.error('Error editing favorite:', error);
    res.status(500).json({ message: 'Failed to edit favorite' });
  }
});

module.exports = router;
