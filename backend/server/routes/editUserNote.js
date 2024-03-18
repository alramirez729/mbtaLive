const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel');
const { generateAccessToken } = require('../utilities/generateToken');

router.put('', async (req, res) => {

    var {userId, stationId} = req.body

    const userNoteId = await noteModel.findOne({ userId: userId })
    tempUserNoteId = userNoteId

    if (userNoteId != null){
        
        Object.assign(tempUserNoteId.stationId,stationId)
        stationId = tempUserNoteId.stationId
        

        noteModel.updateOne(userNoteId, 
        {
            stationId : stationId
        } ,function (err, noteInfo) {
        if (err){
            console.log(err);
        } else {
            // create and send new access token to local storage
            const accessToken = generateAccessToken(userId, stationId)  
            res.header('Authorization', accessToken).send({ accessToken: accessToken })
        }
        });
    }
    else{
        res.status(404).send({ message: "Error: User not found." })
    }
})


module.exports = router;