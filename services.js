const mysql = require('mysql2'); 

const connection = mysql.createConnection({
    host: 'gx97kbnhgjzh3efb.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'ggi9lwdzlbqdgb04',
    password: 'k6u5n58y3mvvft7u',
    database: 'eabh9evmkhtwf4bq',
    port: 3306
});

connection.connect(function(err) {
    if (err) throw err;
    console.log('Connected to MySQL!');
});

const services = function(app) {
    app.post('/write-record', async function(req, res) {
        const username = req.body.username; 

        if (!username) {
            return res.status(400).json({ msg: "ERROR: No username provided" });
        }

        connection.query("INSERT INTO Players (username) VALUES (?)", [username], function(err) {
            if (err) {
                console.error("Error inserting player:", err);
                return res.status(500).json({ msg: "ERROR: " + err });
            } else {
                return res.status(200).json({ msg: "SUCCESS!" });
            }
        });
    });

    //app.post('/create-session', async function(req, res) {
   //     const playerOneId = req.body.playerOneId; 

    //    if (!playerOneId) {
   //         return res.status(400).json({ msg: "ERROR: No player one ID provided" });
  //      }

   //     connection.query("INSERT INTO GameSessions (player_one_id, player_two_id) VALUES (?, NULL)", [playerOneId], function(err, results) {
   //         if (err) {
   //             console.error("Error creating session:", err);
  //              return res.status(500).json({ msg: "ERROR: " + err });
  //          } else {
  //              return res.status(200).json({ msg: "Game session created successfully!", gameSessionId: results.insertId });
   //         }
   //     });
   // });

    app.post('/get-player-id', async function(req, res) {
        const username = req.body.username; 

        if (!username) {
            return res.status(400).json({ msg: "ERROR: No username provided" });
        }

        connection.query("SELECT player_id FROM Players WHERE username = ?", [username], function(err, results) {
            if (err || results.length === 0) {
                console.error("Error fetching player ID:", err || "No results");
                return res.status(500).json({ msg: "ERROR: " + err });
            } else {
                return res.status(200).json({ playerId: results[0].player_id });
            }
        });
    });

    app.get('/get-test-player-id', async function(req, res) {
        connection.query("SELECT player_id FROM Players LIMIT 1", function(err, results) {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ msg: "ERROR: " + err });
            } 
            if (results.length === 0) {
                return res.status(404).json({ msg: "No players found" });
            } else {
                return res.status(200).json({ playerOneId: results[0].player_id });
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
            ON DUPLICATE KEY UPDATE position = VALUES(position), orientation = VALUES(orientation)`;
    
        connection.query(query, [playerId, shipId, position, orientation], (err, results) => {
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
                    console.error('Error checking ship position:', error);
                    return res.status(500).json({ msg: "Error checking ship position" });
                }
                const positionFound = results.length > 0 && results[0].position !== null;
                res.json({ positionFound });
            }
        );
    });

    app.post('/check-ship-overlap', (req, res) => {
        try {
            const { playerId, occupiedCells } = req.body;
    
            console.log("Received playerId:", playerId);
            console.log("Received occupiedCells:", occupiedCells);
    
            if (!playerId || !occupiedCells || !Array.isArray(occupiedCells)) {
                return res.status(400).json({ msg: "Invalid input data" });
            }
    
            connection.query(
                "SELECT DISTINCT position, orientation, size FROM PlayerShips ps JOIN Ships s ON ps.ship_id = s.ship_id WHERE player_id = ?",
                [playerId],
                (err, rows) => {
                    if (err) {
                        console.error("Error fetching ships:", err);
                        return res.status(500).json({ msg: "Server error" });
                    }
    
                    console.log("Fetched rows for player:", rows);
    
                    const allOccupiedCells = rows.reduce((accumulatedCells, { position, orientation, size }) => {
                        const offsets = shipOffsets[size];
                        if (!offsets) {
                            console.error(`Offsets not defined for ship size ${size}`);
                            return accumulatedCells;
                        }
                        const shipCells = calculateOccupiedCells(position, orientation, size, offsets);
                        console.log(`Ship at ${position} (${orientation}, size ${size}) occupies:`, shipCells);
                        return accumulatedCells.concat(shipCells);
                    }, []);
    
                    console.log("All occupied cells for player:", [...new Set(allOccupiedCells)]);
    
                    const overlaps = occupiedCells.filter(cell => allOccupiedCells.includes(cell));
                    console.log("Overlap result:", overlaps);
    
                    if (overlaps.length > 0) {
                        return res.status(200).json({ success: false, overlaps });
                    }
    
                    return res.status(200).json({ success: true, msg: "No overlaps detected" });
                }
            );
        } catch (error) {
            console.error("Error checking overlap:", error);
            res.status(500).json({ msg: "Server error" });
        }
    });

    const shipOffsets = {
        4: { verticalOffsetFront: 1, verticalOffsetBack: 2, horizontalOffsetFront: 2, horizontalOffsetBack: 1 },
        5: { verticalOffsetFront: 2, verticalOffsetBack: 2, horizontalOffsetFront: 2, horizontalOffsetBack: 2 },
        3: { verticalOffsetFront: 1, verticalOffsetBack: 1, horizontalOffsetFront: 1, horizontalOffsetBack: 1 },
        2: { verticalOffsetFront: 1, verticalOffsetBack: 0, horizontalOffsetFront: 0, horizontalOffsetBack: 1 },
    };
    
    function calculateOccupiedCells(anchor, orientation, size, offsets) {
        if (!anchor || !orientation || !size || !offsets) {
            console.error("Missing or invalid parameters in calculateOccupiedCells:", {
                anchor,
                orientation,
                size,
                offsets,
            });
            return [];
        }
    
        const [rowLetter, colNumber] = [anchor[0], parseInt(anchor.slice(1))];
        if (!rowLetter || isNaN(colNumber)) {
            console.error("Invalid anchor format:", anchor);
            return [];
        }
    
        const occupiedCells = [];
        if (orientation === 'horizontal') {
            for (let i = 0; i < size; i++) {
                const adjustedCol = colNumber + i - offsets.horizontalOffsetFront;
                if (adjustedCol >= 1 && adjustedCol <= 10) {
                    occupiedCells.push(`${rowLetter}${adjustedCol}`);
                }
            }
        } else if (orientation === 'vertical') {
            for (let i = 0; i < size; i++) {
                const adjustedRow = String.fromCharCode(rowLetter.charCodeAt(0) + i - offsets.verticalOffsetFront);
                if (
                    adjustedRow.charCodeAt(0) >= 'A'.charCodeAt(0) &&
                    adjustedRow.charCodeAt(0) <= 'J'.charCodeAt(0)
                ) {
                    occupiedCells.push(`${adjustedRow}${colNumber}`);
                }
            }
        }
    
        console.log(`Calculated occupied cells for size ${size} (${orientation}):`, occupiedCells);
        return occupiedCells;

    }

    app.post('/attack', async (req, res) => {
        const { gameSessionId, playerId, targetCell } = req.body;
    
        if (!gameSessionId || !playerId || !targetCell) {
            return res.status(400).json({ msg: "Missing parameters" });
        }
    
        try {
            
            const query = `
                SELECT player_one_id, player_two_id
                FROM GameSessions
                WHERE game_session_id = ?
            `;
            const [results] = await connection.promise().query(query, [gameSessionId]);
    
            if (!results.length) {
                return res.status(400).json({ msg: "Invalid game session" });
            }
    
            const { player_one_id, player_two_id } = results[0];
    
            
            const attackCountQuery = `
                SELECT COUNT(*) AS totalAttacks
                FROM Attacks
                WHERE game_session_id = ?
            `;
            const [attackCountResults] = await connection.promise().query(attackCountQuery, [gameSessionId]);
            const totalAttacks = attackCountResults[0].totalAttacks;
    
            
            const isPlayerOneTurn = totalAttacks % 2 === 0; 
            const expectedPlayerId = isPlayerOneTurn ? player_one_id : player_two_id;
    
            if (playerId !== expectedPlayerId) {
                return res.status(400).json({ msg: "Not your turn" });
            }
    
            
            const attackQuery = `
                SELECT ps.player_id, ps.ship_id, s.size, ps.position, ps.orientation
                FROM PlayerShips ps
                JOIN Ships s ON ps.ship_id = s.ship_id
                WHERE ps.player_id != ? AND ps.player_id IN (?, ?)
            `;
            const [ships] = await connection.promise().query(attackQuery, [playerId, player_one_id, player_two_id]);
    
            
            const opponentOccupiedCells = ships.reduce((allCells, { position, orientation, size }) => {
                const offsets = shipOffsets[size];
                const shipCells = calculateOccupiedCells(position, orientation, size, offsets);
                return allCells.concat(shipCells);
            }, []);
    
            const isHit = opponentOccupiedCells.includes(targetCell);
    
            
            const logAttackQuery = `
                INSERT INTO Attacks (game_session_id, target_position, result)
                VALUES (?, ?, ?)
            `;
            await connection.promise().query(logAttackQuery, [gameSessionId, targetCell, isHit ? 'hit' : 'miss']);
    
            
            return res.json({
                success: true,
                result: isHit ? 'Hit' : 'Miss',
                msg: `Attack on ${targetCell}: ${isHit ? 'Hit' : 'Miss'}!`,
            });
        } catch (error) {
            console.error("Error handling attack:", error);
            return res.status(500).json({ msg: "Error handling attack" });
        }
    });
    
    
    app.post('/create-session', async function (req, res) {
        const playerOneId = req.body.playerOneId;
    
        if (!playerOneId) {
            return res.status(400).json({ msg: "ERROR: No player one ID provided" });
        }
    
        try {
            
            const dummyUsername = 'Player2'; 
            const insertPlayerQuery = `
                INSERT INTO Players (username)
                VALUES (?)
            `;
    
            const [insertResult] = await connection.promise().query(insertPlayerQuery, [dummyUsername]);
            const playerTwoId = insertResult.insertId; 
    
            console.log(`Dummy Player2 added with ID: ${playerTwoId}`);
    
            
            const createSessionQuery = `
                INSERT INTO GameSessions (player_one_id, player_two_id, session_status)
                VALUES (?, ?, 'waiting')
            `;
    
            const [sessionResult] = await connection.promise().query(createSessionQuery, [playerOneId, playerTwoId]);
    
            console.log(`Game session created with ID: ${sessionResult.insertId}`);
    
            return res.status(200).json({
                success: true,
                msg: "Game session created successfully!",
                gameSessionId: sessionResult.insertId,
            });
        } catch (error) {
            console.error("Error creating session:", error);
            return res.status(500).json({ success: false, msg: "Error creating session" });
        }
    });
    
    
    
    
    
    
    

   // app.post('/create-session', (req, res) => {
   //     const { playerOneId } = req.body;
   // 
   //     if (!playerOneId) {
  //          return res.status(400).json({ msg: "Missing playerOneId" });
   //     }
   // 
   //     const query = `
   //         INSERT INTO GameSessions (player_one_id)
   //         VALUES (?)
   //     `;
    //
   //     connection.query(query, [playerOneId], (err, results) => {
   //         if (err) {
   //             console.error("Error creating game session:", err);
   //             return res.status(500).json({ msg: "Error creating game session" });
   //         }
   // 
   //         res.json({
   //             success: true,
   //             gameSessionId: results.insertId,
   //         });
   //     });
    //});
    
    app.post('/join-session', (req, res) => {
        const { gameSessionId, playerTwoId } = req.body;
    
        if (!gameSessionId || !playerTwoId) {
            return res.status(400).json({ msg: "Missing gameSessionId or playerTwoId" });
        }
    
        const query = `
            UPDATE GameSessions
            SET player_two_id = ?
            WHERE game_session_id = ? AND session_status = 'waiting'
        `;
    
        connection.query(query, [playerTwoId, gameSessionId], (err, results) => {
            if (err) {
                console.error("Error joining game session:", err);
                return res.status(500).json({ msg: "Error joining game session" });
            }
    
            if (results.affectedRows === 0) {
                return res.status(400).json({ msg: "Game session not found or already started" });
            }
    
            res.json({ success: true, msg: "Player joined the game session" });
        });
    });
    
    app.post('/end-session', (req, res) => {
        const { gameSessionId } = req.body;
    
        if (!gameSessionId) {
            return res.status(400).json({ msg: "Missing gameSessionId" });
        }
    
        const query = `
            UPDATE GameSessions
            SET session_status = 'ended'
            WHERE game_session_id = ?
        `;
    
        connection.query(query, [gameSessionId], (err, results) => {
            if (err) {
                console.error("Error ending game session:", err);
                return res.status(500).json({ msg: "Error ending game session" });
            }
    
            res.json({ success: true, msg: "Game session ended" });
        });
    });
    

    const generateRandomAttack = (gridSize) => {
        const row = String.fromCharCode(65 + Math.floor(Math.random() * gridSize)); 
        const col = Math.floor(Math.random() * gridSize) + 1; 
        return `${row}${col}`;
    };
    
    app.post('/random-attack', async (req, res) => {
        const { gameSessionId } = req.body;
    
        if (!gameSessionId) {
            return res.status(400).json({ msg: "ERROR: Missing gameSessionId" });
        }
    
        try {
            
            const unattackedCellsQuery = `
                WITH all_grid_points AS (
                    SELECT 
                        CONCAT(CHAR(65 + FLOOR(num / 10)), (num % 10) + 1) AS position
                    FROM (
                        SELECT n1.num * 10 + n2.num AS num
                        FROM (SELECT 0 AS num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) n1,
                             (SELECT 0 AS num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) n2
                    ) grid
                )
                SELECT agp.position AS target
                FROM all_grid_points agp
                WHERE agp.position NOT IN (
                    SELECT target_position FROM Attacks WHERE game_session_id = ?
                )
            `;
    
            const [results] = await connection.promise().query(unattackedCellsQuery, [gameSessionId]);
    
            if (results.length === 0) {
                return res.json({ success: false, msg: "No available cells to attack" });
            }
    
            
            const randomIndex = Math.floor(Math.random() * results.length);
            const targetCell = results[randomIndex].target;
    
           
            const insertAttackQuery = `
                INSERT INTO Attacks (game_session_id, target_position, result)
                VALUES (?, ?, 'miss')
            `;
    
            await connection.promise().query(insertAttackQuery, [gameSessionId, targetCell]);
    
            res.json({
                success: true,
                targetCell,
                result: 'miss', 
            });
        } catch (error) {
            console.error("Error in random attack:", error);
            res.status(500).json({ msg: "ERROR: Failed to execute random attack" });
        }
    });
    
    
    
    










};


module.exports = services;
