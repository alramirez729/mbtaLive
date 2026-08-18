const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel')
const MINLIMIT = 3
const MAXLIMIT = 100

router.post('', async (req, res) => {    
    var { userId, stationId} = req.body

    const userNoteId = await noteModel.findOne({ userId: userId })
    note = stationId[Object.keys(stationId)[0]]

    if(note && note.length >= MINLIMIT && note.length <= MAXLIMIT){
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
            stationArray = Object.keys(userNoteId.stationId)

            if (!stationArray.includes(Object.keys(stationId)[0])){
                Object.assign(stationId, userNoteId.stationId)
                

                noteModel.updateOne(userNoteId, 
                    {
                        stationId : stationId
                    } ,function (err, noteInfo) {
                    if (err){
                        console.log(err);
                    }
                    else{
                        res.status(200).send({ message: "Successfully posted note" })
                    }
                    })        
            }
            else{
                res.status(409).send({ message: "Error: station note already exists, please go to edit." })
            }        
            


            
        }
    }
    else {
        res.status(404).send({ message: "Error: input too long or short." })
    }

})


module.exports = router;