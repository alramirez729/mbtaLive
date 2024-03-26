const express = require('express');
const router = express.Router();
const userHighlights = require('../models/userHighlights');
const { newUserValidation } = require('../models/userValidator');
const { generateAccessToken } = require('../utilities/generateToken');

router.put('/update', async (req, res) => {
    
    // Store new highlight information
    const { userId, lineId, stationId } = req.body;

    try {
        const userHighlight = await userHighlights.findOne({ userId: userId });
        if (!userHighlight) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Update user highlight
        userHighlights.findByIdAndUpdate(userHighlight._id, {
            lineId: lineId,
            stationId: stationId
        }); 

        return res.send({message: "Highlight updated Successfully"})
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Internal server error' });
    }
});

module.exports = router;
