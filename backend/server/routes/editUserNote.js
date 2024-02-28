const express = require("express");
const router = express.Router();
const z = require('zod')
const noteModel = require('../models/noteModel')
const { newUserValidation } = require('../models/userValidator');
const { generateAccessToken } = require('../utilities/generateToken');

router.post('/editNote', async (req, res) =>
{
    // don't know if i need this
    const { error } = newUserValidation(req.body);
    if (error) return res.status(400).send({ message: error.errors[0].message });

    const {userId, stationId, note} = req.body

    noteModel.findByIdAndUpdate(userId, {
        userId : userId, 
        stationId : stationId, 
        note : note
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