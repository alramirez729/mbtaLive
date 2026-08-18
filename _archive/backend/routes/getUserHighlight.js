const express = require("express");
const router = express.Router();
const highlightModel = require('../models/userHighlights');

router.get("/byId", async (req, res) => {
  const { userId } = req.query;

  try {
    const user = await highlightModel.findOne({ userId: userId });
    if (!user) {
      return res.status(404).send("User not found");
    }
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
});


router.get("/byStationId", async (req, res) => {
  var { userId, stationId } = req.body;

  const userHiglightId = await highlightModel.findOne({ userId: userId })
  const highlight = userHighlights.stationId[stationId]

  if (highlight == null){ 
    res.status(404).send("userId does not exist.");
  }
  else {
    return res.json(highlights);
  }

});

module.exports = router;
