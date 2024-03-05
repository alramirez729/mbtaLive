const express = require("express");
const router = express.Router();
const newUserModel = require('../models/userHighlights')

router.get('/highlightGetAll', async (req, res) => {
    const highlights = await userHighlights.find();
    return res.json(highlights)
  })

  module.exports = router;