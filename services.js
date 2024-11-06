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

    app.get('/get-test-player-id', async function(req, res) {
        connection.query("SELECT player_id FROM Players LIMIT 1", function(err, results) {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send({ msg: "ERROR: " + err });
            } 
            if (results.length === 0) {
                return res.status(404).send({ msg: "No players found" });
            } else {
                return res.status(200).send({ playerOneId: results[0].player_id });
            }
        });
    });
    
    app.post('/update-ship-position', (req, res) => {
        const { playerId, shipId, position, orientation } = req.body;
    
        if (!playerId || !shipId || !position || !orientation) {
            return res.status(400).json({ msg: "ERROR: Missing parameters" });
        }
    
        const query = `
            INSERT INTO PlayerShips (player_id, ship_id, position, orientation)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE position = ?, orientation = ?`;
    
        connection.query(query, [playerId, shipId, position, orientation, position, orientation], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ msg: "Error updating ship position" });
            }
            res.json({ msg: "Ship position updated successfully" });
        });
    });
    
    app.post('/check-ship-position', (req, res) => {
        const { playerId, shipId } = req.body;
    
        connection.query(
            "SELECT position FROM PlayerShips WHERE player_id = ? AND ship_id = ?",
            [playerId, shipId],
            (error, results) => {
                if (error) {
                    console.error('Database error:', error);
                    return res.status(500).json({ msg: "Error checking ship position" });
                }
                const positionFound = results.length > 0 && results[0].position !== null;
                res.json({ positionFound });
            }
        );
    });
    
    
    






    
};


//module.exports = { services, connection };
module.exports = services;
//module.exports = connection;