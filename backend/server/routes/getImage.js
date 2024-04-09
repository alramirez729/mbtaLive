const express = require("express");
const router = express.Router();
const Image = require('../models/imageModel'); // Adjust the path as necessary

// Fetch an image by its name
router.get('/getByName/:name', async (req, res) => {
    const { name } = req.params;
    try {
      const image = await Image.findOne({ name: name });
      console.log('Retrieved image:', image); // Log the retrieved image object
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }
      res.json(image);
    } catch (error) {
      console.error('Error fetching image:', error);
      res.status(500).json({ error: 'Failed to fetch image' });
    }
  });

module.exports = router;
