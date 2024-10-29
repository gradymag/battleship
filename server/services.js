const mysql = require('mysql2'); 

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'battleship'
});

connection.connect(function(err) {
    if (err) throw err;
    console.log('Connected to MySQL!');
});

var services = function(app) {
    //send username to database
    app.post('/write-record', async function(req, res) {
        const username = req.body.username; 

        if (!username) {
            return res.status(400).send(JSON.stringify({ msg: "ERROR: No username provided" }));
        }

        connection.query("INSERT INTO Players (username) VALUES (?)", [username], function(err) {
            if (err) {
                return res.status(500).send(JSON.stringify({ msg: "ERROR: " + err }));
            } else {
                return res.status(200).send(JSON.stringify({ msg: "SUCCESS!" }));
            }
        });
    });

    //creating game ssession
    app.post('/create-session', async function(req, res) {
        const playerOneId = req.body.playerOneId; 

        if (!playerOneId) {
            return res.status(400).send(JSON.stringify({ msg: "ERROR: No player one ID provided" }));
        }

        connection.query("INSERT INTO GameSessions (player_one_id, player_two_id) VALUES (?, NULL)", [playerOneId], function(err, results) {
            if (err) {
                return res.status(500).send(JSON.stringify({ msg: "ERROR: " + err }));
            } else {
                return res.status(200).send(JSON.stringify({ msg: "Game session created successfully!", gameSessionId: results.insertId }));
            }
        });
    });

    //fetch player_id
    app.post('/get-player-id', async function(req, res) {
        const username = req.body.username; 

        if (!username) {
            return res.status(400).send(JSON.stringify({ msg: "ERROR: No username provided" }));
        }

        connection.query("SELECT player_id FROM Players WHERE username = ?", [username], function(err, results) {
            if (err || results.length === 0) {
                return res.status(500).send(JSON.stringify({ msg: "ERROR: " + err }));
            } else {
                return res.status(200).send(JSON.stringify({ playerId: results[0].player_id }));
            }
        });
    });
};

module.exports = services;
