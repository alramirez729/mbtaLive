const mongoose = require("mongoose");


const userNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,      
    },
    stationId: {
      type: Array,
      required: true,      
    },       
  },
  { collection: "userNotes" }
);

module.exports = mongoose.model('userNotes', userNoteSchema)