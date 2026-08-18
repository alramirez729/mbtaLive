const express = require('express');
const router = express.Router();
const userHighlights = require('../models/userHighlights');

router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { lineId, stationId } = req.body;

    try {
        const updatedHighlight = await userHighlights.findByIdAndUpdate(id, {
            lineId: lineId,
            stationId: stationId
        }, { new: true });

        if (!updatedHighlight) {
            return res.status(404).send({ message: 'Highlight not found' });
        }

        res.send({ message: "Highlight updated successfully", highlight: updatedHighlight });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Internal server error' });
    }
});

module.exports = router;
