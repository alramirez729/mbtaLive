const express = require("express");
const router = express.Router();
const userHighlight = require('../models/userHighlights');

// Route to create or update a highlight
router.post('/createHighlight', async (req, res) => {
    const { userId, lineId, stationId } = req.body;

    try {
        // Check if highlight already exists
        const existingHighlight = await userHighlight.findOne({ userId, lineId, stationId });
        if (existingHighlight) {
            return res.status(409).json({ error: 'User highlight already exists' });
        }

        // Create a new highlight using the UserHighlight model
        const newHighlight = new userHighlight({ userId, lineId, stationId });
        await newHighlight.save();

        return res.status(201).json({ message: 'Highlight created successfully', highlight: newHighlight });
    } catch (error) {
        console.error('Error creating highlight:', error);

        // Check for specific error types and return relevant messages
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: 'Failed to create highlight' });
    }
});

module.exports = router;
