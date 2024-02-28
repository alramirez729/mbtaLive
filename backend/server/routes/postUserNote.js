const express = require("express");
const router = express.Router();
const z = require('zod')
const { newUserValidation } = require('../models/userValidator')
const noteModel = require('../models/noteModel')

router.post('/postNote', async (req, res) => {
    const { error } = newUserValidation(req.body);
    console.log(error)
    if (error) return res.status(400).send({ message: error.errors[0].message });
    
    const { userId, stationId, note } = req.body

    const postNote = new noteModel({
        userId: userId, 
        stationId: stationId,
        note: note,
    });

    try {
        const postNewNote = await postNote.save();
        res.send(postNewNote);
    } catch (error) {
        res.status(400).send({ message: "Error trying to post new note" });
    }

})


module.exports = router;