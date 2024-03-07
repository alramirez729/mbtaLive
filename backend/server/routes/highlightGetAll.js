const express = require("express");
const router = express.Router();
const allHighlight = require('../models/userHighlights')

router.get('/getAll', async (req, res) => {
  
  try{
    const highlights = await allHighlight.find();
    const presentHighlightStatus = await allHighlight.findOne();
    if(presentHighlightStatus == null)
    {
      return res.json({string: "No highlights to get"});
    }

    return res.json(highlights);
    
  }catch (error){
      console.error('Error getting all highlights:', error);
      return res.status(500).json({error: 'Failed to get all highlights/'});
  }
    
  })

  module.exports = router;