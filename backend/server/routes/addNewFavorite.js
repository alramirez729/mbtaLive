const express = require("express");
const router = express.Router();
const { z } = require('zod');

// Replace with your actual favorite model definition
const Favorite = require("../models/favoriteModel"); // Adjust path if different

// Define Zod schema for validation
const createFavoriteSchema = z.object({
  userID: z.string().nonempty(), // Required string
  line: z.string(), // Optional string
  station: z.string(), // Optional string
});

router.post("/", async (req, res) => {
  try {
    // Parse the request body according to the schema
    const { userID, line, station } = createFavoriteSchema.parse(req.body);

    // Create a new favorite document
    const newFavorite = new Favorite({
      userID,
      line,
      station,
    });

    // Save the new favorite to the database
    await newFavorite.save();

    res.status(201).json({ message: 'Favorite added successfully', favorite: newFavorite });
  } catch (error) {
    console.error('Error adding favorite:', error);

    // Provide informative error message based on the error type
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message }); // Specific validation error
    } else {
      res.status(500).json({ message: 'Failed to add favorite' }); // Generic error message for non-validation errors
    }
  }
});

module.exports = router;
