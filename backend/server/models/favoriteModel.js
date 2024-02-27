const mongoose = require("mongoose");

const newFavSchema = new mongoose.Schema(
    {
        username: { //by userID not username
            type: String,
            required: true,
            label: "username",
        },
        favoriteLine: {
            type: String,
            required: false,
            label: "favorite Line",
        },
        favoriteStation: {
            type: String,
            required: false, 
            label: "favorite Station",
        }
    }  
)