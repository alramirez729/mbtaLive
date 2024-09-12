const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

module.exports = async () => {
    const databaseParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };
    
    mongoose.set('strictQuery', true);

    try {
        // Use the DB_URL from the .env file
        await mongoose.connect(process.env.DB_URL, databaseParams);
        console.log("Connected to the mbtaLive database.");
    } catch (error) {
        console.error(`Database connection error: ${error}`);
    }
};
