const mongoose = require("mongoose");


const userNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      label: "userId",
    },
    stationId: {
      type: String,
      required: true,
      label: "stationId",
    },
    note: {
      type: String,
      required: true,
      label : "note",
    },    
  },
  { collection: "userNotes" }
);

module.exports = mongoose.model('userNotes', userNoteSchema)