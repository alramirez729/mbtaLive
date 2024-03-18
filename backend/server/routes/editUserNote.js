const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel');
const { generateAccessToken } = require('../utilities/generateToken');

router.put('', async (req, res) => {

    var {userId, stationId} = req.body

    const userNoteId = await noteModel.findOne({ userId: userId })
    var tempUserNoteId = userNoteId

    if (userNoteId != null){
        const thing = Object.keys(stationId)[0]
        const things = Object.values(userNoteId.stationId)
        

        if (Object.keys(userNoteId.stationId).indexOf(Object.keys(stationId)[0]) > -1){

            Object.assign(tempUserNoteId.stationId,stationId)
            stationId = tempUserNoteId.stationId
            
            noteModel.findByIdAndUpdate(userNoteId._id, 
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
            res.status(404).send({ message: "Error: Note not found." })
        }
    }
    else{
        res.status(404).send({ message: "Error: User not found." })
    }
})


module.exports = router;