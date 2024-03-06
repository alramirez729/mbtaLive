const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel')

router.post('/postUserNote', async (req, res) => {
    
    const { userId, stationId} = req.body

    const {userNoteId} = await noteModel.findOne({ userId: userId }).catch((err)=>{console.log(err);})    

    if (userNoteId == null){
        const postNote = new noteModel({
            userId: userId, 
            stationId: stationId,
        })    

        try {
            const postNewNote = await postNote.save();
            res.send(postNewNote);
        } catch (error) {
            res.status(400).send({ message: "Error trying to post new note" });
        }
    }
    else {        

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
        })
    }

})


module.exports = router;