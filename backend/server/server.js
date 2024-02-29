const express = require("express");
const app = express();
const cors = require('cors')
const loginRoute = require('./routes/userLogin')
const getAllUsersRoute = require('./routes/userGetAllUsers')
const registerRoute = require('./routes/userSignUp')
const getUserByIdRoute = require('./routes/userGetUserById')
const dbConnection = require('./config/db.config')
const editUser = require('./routes/userEditUser')
const deleteUser = require('./routes/userDeleteAll')
const favoriteGetAllById = require('./routes/favoriteGetAllById');
const editUserNote = require("./routes/editUserNote")
const postUserNote = require("./routes/postUserNote");
const createHighlight = require("./routes/highlightCreateHighlight");
const highlightGetAll = require("./routes/highlightGetAll");

require('dotenv').config();
const SERVER_PORT = 8081

dbConnection()
app.use(cors({origin: '*'}))
app.use(express.json())
app.use('/user', loginRoute)
app.use('/user', registerRoute)
app.use('/user', getAllUsersRoute)
app.use('/user', getUserByIdRoute)
app.use('/user', editUser)
app.use('/user', deleteUser)
app.use('/favorites', favoriteGetAllById)
app.use('/note', editUserNote)
app.use('/note', postUserNote);
app.use('/highlight', createHighlight);
app.use('/highlight', highlightGetAll);



app.listen(SERVER_PORT, (req, res) => {
    console.log(`The backend service is running on port ${SERVER_PORT} and waiting for requests.`);
})
