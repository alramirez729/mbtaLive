const express = require("express");
const router = express.Router();
const noteModel = require('../models/noteModel');

router.delete('', async (req, res) => {

    var {userId ,stationId} = req.body

    const userNoteId = await noteModel.findOne({ userId: userId })
    const stationKey = Object.keys(stationId)[0]
    

    if (userNoteId != null){        

        if (Object.keys(userNoteId.stationId).indexOf(stationKey) > -1){

            stationId = userNoteId.stationId
            delete stationId[stationKey]
            
                        
            
            noteModel.findByIdAndUpdate(userNoteId._id, 
            {
                stationId : stationId
            } ,function (err, noteInfo) {
            if (err){
                console.log(err);
            } else {
                res.status(200).send({ message: "Note deleted successfully"})
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