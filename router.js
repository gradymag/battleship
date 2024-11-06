const express = require('express');
const path = require('path');
const router = express.Router();
//const { connection } = require('./services');
const connection = require('./services');

router.use(express.static(path.join(__dirname, '../client')));
router.use(express.static(path.join(__dirname, '../client/js')));

router.get('/battleshiplobby', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/battleshiplobby.html'));
});

router.get('/battleshipboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/battleshipboard.html'));
});


module.exports = router;
