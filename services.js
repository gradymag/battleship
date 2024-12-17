const mysql = require('mysql2'); 

const connection = mysql.createConnection({
    host: 'gx97kbnhgjzh3efb.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'ggi9lwdzlbqdgb04',
    password: 'k6u5n58y3mvvft7u',
    database: 'eabh9evmkhtwf4bq',
    port: 3306
});
/*
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'battleship'
});
*/
connection.connect(function(err) {
    if (err) throw err;
    console.log('Connected to MySQL!');
});



const services = function(app,io) {
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

    app.get('/get-test-player-id', async function (req, res) {
        const gameSessionId = req.query.gameSessionId;
    
        if (!gameSessionId) {
            return res.status(400).json({ msg: "Missing gameSessionId" });
        }
    
        connection.query(
            `SELECT player_one_id FROM GameSessions WHERE game_session_id = ?`,
            [gameSessionId],
            function (err, results) {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ msg: "ERROR: " + err });
                }
    
                if (results.length === 0) {
                    return res.status(404).json({ msg: "Game session not found" });
                }
    
                return res.status(200).json({ playerOneId: results[0].player_one_id });
            }
        );
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
            console.log("Received data for overlap check:", { playerId, occupiedCells });
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
        console.log("POST /attack triggered:", req.body);
    
        if (!gameSessionId || !playerId || !targetCell) {
            console.error("Missing parameters:", { gameSessionId, playerId, targetCell });
            return res.status(400).json({ msg: "Missing parameters" });
        }
    
        try {
            console.log("Attack request received:", { gameSessionId, playerId, targetCell });
    
            // Fetch players in the session
            const query = `
                SELECT player_one_id, player_two_id
                FROM GameSessions
                WHERE game_session_id = ?
            `;
            const [results] = await connection.promise().query(query, [gameSessionId]);
    
            if (!results.length) {
                console.error("Invalid game session:", gameSessionId);
                return res.status(400).json({ msg: "Invalid game session" });
            }
    
            const { player_one_id, player_two_id } = results[0];
            console.log("Game session players:", { player_one_id, player_two_id });
    
            // Turn validation
            const attackCountQuery = `
                SELECT COUNT(*) AS totalAttacks
                FROM Attacks
                WHERE game_session_id = ?
            `;
            const [attackCountResults] = await connection.promise().query(attackCountQuery, [gameSessionId]);
            const totalAttacks = attackCountResults[0].totalAttacks;
    
            const isPlayerOneTurn = totalAttacks % 2 === 0;
            const expectedPlayerId = isPlayerOneTurn ? player_one_id : player_two_id;
    
            console.log("Turn details:", { totalAttacks, isPlayerOneTurn, expectedPlayerId, playerId });
    
            if (playerId !== expectedPlayerId) {
                console.error("Invalid turn. Expected:", expectedPlayerId, "but got:", playerId);
                return res.status(400).json({ msg: "Not your turn" });
            }
    
            // Check for hit or miss
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
    
            console.log("Opponent occupied cells:", opponentOccupiedCells);
    
            const isHit = opponentOccupiedCells.includes(targetCell);
            console.log("Attack result for cell", targetCell, ":", isHit ? "hit" : "miss");
    
            // Log attack in the database
            const logAttackQuery = `
                INSERT INTO Attacks (game_session_id, target_position, result)
                VALUES (?, ?, ?)
            `;
            await connection.promise().query(logAttackQuery, [gameSessionId, targetCell, isHit ? 'hit' : 'miss']);
            console.log("Attack logged successfully:", { targetCell, result: isHit ? 'hit' : 'miss' });
    
            // Fetch all hit cells for this game session
            const hitCellsQuery = `
                SELECT target_position
                FROM Attacks
                WHERE game_session_id = ? AND result = 'hit'
            `;
            const [hitCellsResults] = await connection.promise().query(hitCellsQuery, [gameSessionId]);
            const hitCells = hitCellsResults.map(row => row.target_position);
    
            console.log("Hit cells so far:", hitCells);
    
            const sunkShips = [];
            ships.forEach(({ player_id, ship_id, position, orientation, size }) => {
                const offsets = shipOffsets[size];
                const shipCells = calculateOccupiedCells(position, orientation, size, offsets);
    
                if (shipCells.every(cell => hitCells.includes(cell))) {
                    console.log(`Ship ${ship_id} for player ${player_id} is sunk.`);
                    sunkShips.push({ playerId: player_id, shipId: ship_id, cells: shipCells });
                }
            });
    
            console.log("Sunk ships:", sunkShips);
    
            // Notify players about the attack result
            io.to(gameSessionId).emit('attackResult', {
                targetCell,
                result: isHit ? 'hit' : 'miss',
                attackerId: playerId,
                opponentId: playerId === player_one_id ? player_two_id : player_one_id,
                sunkShips, 
            });
    
            // Calculate the next turn
            const nextTurnPlayerId = isPlayerOneTurn ? player_two_id : player_one_id;
            console.log("Next turn belongs to Player ID:", nextTurnPlayerId);
    
            // Notify all players about the turn update via WebSocket
            io.to(gameSessionId).emit('currentTurn', { currentTurn: nextTurnPlayerId });
    
            // Return the attack result to the attacking player
            return res.json({
                success: true,
                result: isHit ? 'Hit' : 'Miss',
                msg: `Attack on ${targetCell}: ${isHit ? 'Hit' : 'Miss'}!`,
                sunkShips,
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
            /*
            // Create dummy player
            const dummyUsername = `Dummy_${Date.now()}`;
            const insertPlayerQuery = `INSERT INTO Players (username) VALUES (?)`;
            const [insertResult] = await connection.promise().query(insertPlayerQuery, [dummyUsername]);
            const playerTwoId = insertResult.insertId;
    
            console.log(`Dummy Player2 added with ID: ${playerTwoId}`);
    
            // Step 1: Add random ship placement
            const shipSizes = [5, 4, 3, 3, 2]; // Ship sizes for Carrier, Battleship, Cruiser, Submarine, Patrol
            const gridSize = 10;
    
            const generateRandomShipPlacement = () => {
                const placements = [];
                const occupiedCells = new Set();
    
                shipSizes.forEach((size, index) => {
                    let placed = false;
    
                    while (!placed) {
                        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                        const startRow = Math.floor(Math.random() * gridSize);
                        const startCol = Math.floor(Math.random() * gridSize);
    
                        const shipCells = [];
                        let valid = true;
    
                        for (let i = 0; i < size; i++) {
                            const row = orientation === 'horizontal' ? startRow : startRow + i;
                            const col = orientation === 'horizontal' ? startCol + i : startCol;
    
                            if (row >= gridSize || col >= gridSize || occupiedCells.has(`${row},${col}`)) {
                                valid = false;
                                break;
                            }
    
                            shipCells.push(`${String.fromCharCode(65 + row)}${col + 1}`);
                        }
    
                        if (valid) {
                            shipCells.forEach(cell => occupiedCells.add(cell));
                            placements.push({
                                shipId: index + 1, // Ensure ship IDs are unique
                                position: shipCells[0], // Anchor position
                                orientation,
                            });
                            placed = true;
                        }
                    }
                });
    
                return placements;
            };
    
            // Insert dummy player ships
            const dummyShipPlacements = generateRandomShipPlacement();
    
            for (const { shipId, position, orientation } of dummyShipPlacements) {
                await connection.promise().query(
                    `INSERT INTO PlayerShips (player_id, ship_id, position, orientation) VALUES (?, ?, ?, ?)`,
                    [playerTwoId, shipId, position, orientation]
                );
            }
    
            console.log(`Dummy Player2 ships placed successfully.`);
            */
    
            // Create game session without a dummy player
            const createSessionQuery = `
                INSERT INTO GameSessions (player_one_id, session_status)
                VALUES (?, 'waiting')
            `;
            const [sessionResult] = await connection.promise().query(createSessionQuery, [playerOneId]);
            const gameSessionId = sessionResult.insertId;
    
            console.log(`Game session created with ID: ${gameSessionId}`);
    
            return res.status(200).json({
                success: true,
                msg: "Game session created successfully!",
                gameSessionId,
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
            console.error('Missing gameSessionId or playerTwoId:', { gameSessionId, playerTwoId });
            return res.status(400).json({ msg: 'Missing gameSessionId or playerTwoId' });
        }
    
        const updateQuery = `
            UPDATE GameSessions
            SET player_two_id = ?
            WHERE game_session_id = ? AND session_status = 'waiting'
        `;
    
        connection.query(updateQuery, [playerTwoId, gameSessionId], (err, results) => {
            if (err) {
                console.error('Error updating player_two_id:', err);
                return res.status(500).json({ msg: 'Database update failed' });
            }
    
            console.log('Database update results:', results);
    
            if (results.affectedRows === 0) {
                console.error(`Game session ${gameSessionId} not updated.`);
                return res.status(400).json({ msg: 'Game session not found or already full' });
            }
    
            const fetchQuery = `
                SELECT player_one_id, player_two_id
                FROM GameSessions
                WHERE game_session_id = ?
            `;
    
            connection.query(fetchQuery, [gameSessionId], (fetchErr, fetchResults) => {
                if (fetchErr) {
                    console.error('Error fetching player details:', fetchErr);
                    return res.status(500).json({ msg: 'Error fetching session details' });
                }
    
                if (fetchResults.length === 0) {
                    console.error(`No game session found for ID ${gameSessionId}.`);
                    return res.status(404).json({ msg: 'Game session not found' });
                }
    
                const { player_one_id, player_two_id } = fetchResults[0];
                console.log(`Players in session ${gameSessionId}:`, { player_one_id, player_two_id });
    
                // Wait for both players to join the WebSocket room
                setTimeout(() => {
                    io.in(gameSessionId).allSockets().then((roomMembers) => {
                        console.log(`Room ${gameSessionId} members:`, [...roomMembers]);
    
                        if (roomMembers.size === 2) {
                            io.to(gameSessionId).emit('lobbyFull', {
                                gameSessionId,
                                redirectTo: '/battleshipboard.html',
                                playerOneId: player_one_id,
                                playerTwoId: player_two_id,
                            });
    
                            console.log(`Emitted 'lobbyFull' for session ${gameSessionId}.`);
                        } else {
                            console.error(`Not all players are in the room for session ${gameSessionId}.`);
                        }
                    });
                }, 500); // Short delay to ensure WebSocket join event processing
            });
    
            res.json({ success: true, msg: 'Player joined the game session' });
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
            // Generate unattacked cells for the current game session
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
    
            // Randomly select an unattacked cell
            const randomIndex = Math.floor(Math.random() * results.length);
            const targetCell = results[randomIndex].target;
    
            // Insert the attack into the database
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
    
    app.post('/get-player-two-id', async (req, res) => {
        const { gameSessionId } = req.body;
    
        if (!gameSessionId) {
            return res.status(400).json({ success: false, msg: "Missing gameSessionId" });
        }
    
        try {
            const query = `
                SELECT player_two_id 
                FROM GameSessions 
                WHERE game_session_id = ?
            `;
            const [results] = await connection.promise().query(query, [gameSessionId]);
    
            if (results.length === 0) {
                return res.status(404).json({ success: false, msg: "Game session not found" });
            }
    
            const playerTwoId = results[0].player_two_id;
            res.status(200).json({ success: true, playerId: playerTwoId });
        } catch (error) {
            console.error("Error fetching player_two_id:", error);
            res.status(500).json({ success: false, msg: "Server error" });
        }
    });
    
    app.post('/get-session-players', async (req, res) => {
        const { gameSessionId } = req.body;
    
        if (!gameSessionId) {
            return res.status(400).json({ msg: "Missing gameSessionId" });
        }
    
        try {
            const query = `
                SELECT player_one_id, player_two_id 
                FROM GameSessions 
                WHERE game_session_id = ?
            `;
            const [results] = await connection.promise().query(query, [gameSessionId]);
    
            if (results.length === 0) {
                return res.status(404).json({ msg: "Game session not found" });
            }
    
            const { player_one_id, player_two_id } = results[0];
            res.status(200).json({
                success: true,
                playerOneId: player_one_id,
                playerTwoId: player_two_id,
            });
        } catch (error) {
            console.error("Error fetching session players:", error);
            res.status(500).json({ msg: "Server error" });
        }
    });
    

    app.get('/get-latest-session', (req, res) => {
        const query = `
            SELECT MAX(game_session_id) AS latestGameSessionId 
            FROM GameSessions 
            WHERE session_status = 'waiting'
        `;
    
        connection.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching latest game session:', err);
                return res.status(500).json({ success: false, msg: 'Server error' });
            }
    
            if (results.length === 0 || !results[0].latestGameSessionId) {
                return res.status(404).json({ success: false, msg: 'No available game sessions' });
            }
    
            res.status(200).json({ success: true, latestGameSessionId: results[0].latestGameSessionId });
        });
    });
    

    
    module.exports = services;
    
    






};
services.connection = connection;


module.exports = services;

