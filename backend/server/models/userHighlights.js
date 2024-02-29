const mongoose = require("mongoose");

// Highlight schema/model
const userHighlightSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    lineId: {
      type: String,
      //required: false,
    },
    stationId: {
      type: String,
      //required: false,
    },
  },
  { collection: "highlights" }
);

module.exports = mongoose.model('Highlight', userHighlightSchema);
