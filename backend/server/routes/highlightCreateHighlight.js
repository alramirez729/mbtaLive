const express = require("express");
const router = express.Router();
const userHighlight = require('../models/userHighlights');

// Route to create or update a highlight
router.post('/createHighlight', async (req, res) => {
    const { userId, lineId, stationId } = req.body; // Use correct keys here

    try {
        // Create a new highlight using the UserHighlight model
        const newHighlight = new userHighlight({ userId, lineId, stationId });
        // Save the new highlight to the database
        await newHighlight.save();
        // Return the newly created highlight as JSON response
        return res.status(201).json({ message: 'Highlight created successfully', highlight: newHighlight });
    } catch (error) {
        // If there's an error, return an error response
        console.error('Error creating highlight:', error);
        return res.status(500).json({ error: 'Failed to create highlight' });
    }
});

module.exports = router;
