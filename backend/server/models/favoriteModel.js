const mongoose = require("mongoose");

//user schema/model
const favSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
      label: "userID",
    },
    line: {
      type: String,
      required: true,
      label: "line",
    },
    station: {
        type: String,
        required: true,
        label: "station",
      },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "favorites" }
);

module.exports = mongoose.model('favorites', favSchema)