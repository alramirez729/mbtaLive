const express = require("express");
const router = express.Router();
const userHighlight = require('../models/userHighlights');

router.post ('/deleteAll', async (req, res) =>{
    try{
        await userHighlight.deleteMany({});

        return res.status(200).json({message: 'All highlights deleted successfully'})
    } catch(error) {
        console.error('Error deleting highlights', error);
        return res.status(500).json({error: 'Failed to delete highlights'});
    }
}); 

module.exports = router;