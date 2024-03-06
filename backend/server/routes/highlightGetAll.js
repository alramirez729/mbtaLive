const express = require("express");
const router = express.Router();
const allHighlight = require('../models/userHighlights')

router.get('/getAll', async (req, res) => {
    const highlights = await allHighlight.find();
    return res.json(highlights);
  })

  module.exports = router;