const express = require("express");
const router = express.Router();
const userHighlight = require('../models/userHighlights');

router.delete('/delete/:highlightId', async (req, res) => {
    const highlightId = req.params.highlightId;

    try {
        const deletedHighlight = await userHighlight.findByIdAndDelete(highlightId);
        //confirmation of deletetion. 
        console.log("_id: ", highlightId, "deleted successfully.");
        if (!deletedHighlight) {
            return res.status(404).json({ error: 'Highlight not found' });
        }

        return res.status(200).json({ message: 'Highlight deleted successfully' });
    } catch (error) {
        console.error('Error deleting highlight', error);
        return res.status(500).json({ error: 'Failed to delete highlight' });
    }
});

module.exports = router;