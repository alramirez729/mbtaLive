const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

module.exports = async () => {
    const databaseParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };
    
    // Set the strictQuery option before establishing the connection
    mongoose.set('strictQuery', true); // Set to false if you prefer the non-strict behavior

    try {
        await mongoose.connect(process.env.DB_URL, databaseParams);
        console.log("The backend has connected to the MongoDB database.");
    } catch (error) {
        console.error(`Database connection error: ${error}`);
    }
};
