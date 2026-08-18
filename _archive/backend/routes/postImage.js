const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const Image = require('../models/imageModel'); // Adjust the path to your model as necessary

// Endpoint to upload a new image
router.post('/upload', async (req, res) => {
  try {
    const { name, imageData } = req.body;

    if (!name || !imageData) {
      return res.status(400).send('Missing image name or data');
    }

    // Decode the base64 image data
    const buffer = Buffer.from(imageData, 'base64');

    // Resize the image using sharp
    const resizedBuffer = await sharp(buffer)
      .resize({ width: 500 }) // Resize the image to a width of 500 pixels
      .toBuffer();

    // Convert the resized buffer back to base64
    const resizedImageData = resizedBuffer.toString('base64');

    const newImage = new Image({ name, imageData: resizedImageData });
    await newImage.save();

    res.status(201).send('Image uploaded successfully');
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;