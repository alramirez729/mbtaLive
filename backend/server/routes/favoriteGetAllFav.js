const express = require("express");
const router = express.Router();
const newFavoriteModel = require('../models/favoriteModel')

router.get('/getAll', async (req, res) => {
    const user = await newFavoriteModel.find();
    return res.json(user)
  })

  module.exports = router;