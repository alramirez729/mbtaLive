const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel');
const { generateAccessToken } = require('../utilities/generateToken');

router.post('/editUserNote', async (req, res) =>
{
    const {userId, stationId, stationName} = req.body

    const {userNoteId} = await noteModel.findOne({ userId: userId });

    noteModel.updateOne(userNoteId, 
    {
        userId : userId, 
        stationId : stationId, 
        stationName : stationName
    } ,function (err, noteInfo) {
    if (err){
        console.log(err);
    } else {
        // create and send new access token to local storage
        const accessToken = generateAccessToken(userId, stationId, note)  
        res.header('Authorization', accessToken).send({ accessToken: accessToken })
    }
    });
})


module.exports = router;