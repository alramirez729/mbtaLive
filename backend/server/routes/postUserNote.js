const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel')

router.post('/postUserNote', async (req, res) => {
    
    var { userId, stationId} = req.body

    var userNoteId = await noteModel.findOne({ userId: userId })

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
        
        //console.log(userNoteId.stationId[Object.keys(stationId)[0]])
        //console.log(stationId)
        //console.log(Object.keys(stationId)[0])
        
        //userNoteId.stationId[Object.keys(stationId)[0]] = Object.values(stationId)[0]

        //console.log(userNoteId.stationId)        

        //stationId = userNoteId.stationId
        
        //console.log(stationId)

        
        //console.log(Object.keys(stationId)[0])                


        const checkForStation = await noteModel.findOne({ userId: userId, stationId: stationId })

        

        if (checkForStation == null){
            stationId = userNoteId.stationId.concat(stationId)
        }
        else{
            res.status(401).send({ message: "Error station note exists go to edit." })
        }        
        


        noteModel.updateOne(userNoteId, 
        {
            userId : userId, 
            stationId : stationId
        } ,function (err, noteInfo) {
        if (err){
            console.log(err);
        }
        })
    }

})


module.exports = router;