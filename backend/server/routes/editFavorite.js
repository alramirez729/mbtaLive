const express = require("express");
const router = express.Router();
const FavoriteModel = require('../models/favoriteModel');
const z = require('zod');
const { generateAccessToken } = require('../utilities/generateToken');

// Define Zod schema for validation
const editFavoriteSchema = z.object({
  userID: z.string().nonempty(), // Required string
  stationId: z.string(), // Optional string
  note: z.string(), // Optional string
});

router.post('/editFavorite', async (req, res) => {
    try {
      // Validate request body
      const { error, data } = editFavoriteSchema.safeParse(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }
  
      // Extract data from request body
      const { _id, line, station } = data;
  
      // Find the favorite by _id and update if found
      const favorite = await FavoriteModel.findOneAndUpdate({ _id: _id }, { line: line, station: station }, { new: true });
  
      if (!favorite) {
        return res.status(404).json({ message: 'Favorite not found' });
      }
  
      // Generate access token
      const accessToken = generateAccessToken(favorite.userID, line, station);
  
      return res.json({ message: 'Favorite updated successfully', favorite: favorite, accessToken: accessToken });
    } catch (error) {
      console.error('Error editing favorite:', error);
      res.status(500).json({ message: 'Failed to edit favorite' });
    }
  });
  

module.exports = router;
