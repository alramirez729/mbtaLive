const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel');

router.get("/byId", async (req, res) => {
  var { userId } = req.body;

  noteModel.findOne({userId : userId}, function (err, user) {
    if (err) {
      console.log(err);
    }
    if (user==null) {
      res.status(404).send("userId does not exist.");
    } 
    else {
      return res.json(user);
    }
  });
});

router.get("/byStationId", async (req, res) => {
  var { userId, stationId } = req.body;

  const userNoteId = await noteModel.findOne({ userId: userId })
  const note = userNoteId.stationId[stationId]

  if (note == null){ 
    res.status(404).send("userId does not exist.");
  }
  else {
    return res.json(note);
  }

});

module.exports = router;
