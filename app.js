const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const router = require('./router');
const services = require('./services.js'); // Import services
const gameTurns = {}; // { gameSessionId: playerId }



const app = express();


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const connection = services.connection;


// Serve static files from the client folder
app.use(express.static(path.join(__dirname, '../client/js')));

// Apply routes from the router
app.use(router);


// Middleware to ensure correct MIME type for JavaScript files
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});


// Create an HTTP server and attach socket.io
const server = http.createServer(app);
const io = socketIo(server); // Attach socket.io to the server

// Track connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Handle joinLobby event
    socket.on('joinLobby', ({ gameSessionId, playerId }) => {
        if (!gameSessionId || !playerId) {
            console.error('Invalid joinLobby request:', { gameSessionId, playerId });
            return;
        }

        console.log(`Player ${playerId} joining lobby ${gameSessionId}`);
        socket.join(gameSessionId);

        // Initialize turn for the game session if not already set
        if (!gameTurns[gameSessionId]) {
            gameTurns[gameSessionId] = playerId; // First player to join gets the first turn
            console.log(`Game ${gameSessionId}: Turn initialized for Player ${playerId}`);
        }

        // Notify players of the current turn
        io.to(gameSessionId).emit('currentTurn', {
            currentTurn: gameTurns[gameSessionId],
        });
    });

    // Handle playerAttack event
    socket.on('playerAttack', ({ gameSessionId, playerId, targetCell }) => {
        if (!gameSessionId || !playerId || !targetCell) {
            console.error('Invalid attack event:', { gameSessionId, playerId, targetCell });
            return;
        }

        // Validate the turn
        if (gameTurns[gameSessionId] !== playerId) {
            console.error(`Not Player ${playerId}'s turn in game session ${gameSessionId}`);
            socket.emit('notYourTurn', { msg: "It's not your turn!" });
            return;
        }

        console.log(`Player ${playerId} attacked cell ${targetCell} in game session ${gameSessionId}`);

        // Query the database for the attack result
        const query = `
            SELECT ps.ship_id 
            FROM PlayerShips ps
            JOIN GameSessions gs ON gs.player_one_id = ps.player_id OR gs.player_two_id = ps.player_id
            WHERE gs.game_session_id = ? 
            AND ps.player_id != ? 
            AND ps.position = ?
        `;

        connection.query(query, [gameSessionId, playerId, targetCell], (err, results) => {
            if (err) {
                console.error('Error validating attack:', err);
                return;
            }

            const result = results.length > 0 ? 'hit' : 'miss';
            console.log(`Attack result: ${targetCell} - ${result}`);

            // Broadcast the attack result to both players
            io.to(gameSessionId).emit('attackResult', {
                targetCell,
                result,
                attackerId: playerId,
            });

            // Switch turns
            connection.query(
                `SELECT player_one_id, player_two_id FROM GameSessions WHERE game_session_id = ?`,
                [gameSessionId],
                (err, players) => {
                    if (err) {
                        console.error('Error fetching player IDs for turn switch:', err);
                        return;
                    }

                    if (players.length > 0) {
                        const { player_one_id, player_two_id } = players[0];
                        gameTurns[gameSessionId] =
                            gameTurns[gameSessionId] === player_one_id ? player_two_id : player_one_id;
                        console.log(`Game ${gameSessionId}: Turn switched to Player ${gameTurns[gameSessionId]}`);

                        io.to(gameSessionId).emit('currentTurn', {
                            currentTurn: gameTurns[gameSessionId],
                        });
                    }
                }
            );
        });
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log(`A user disconnected: ${socket.id}`);
    });
});

/*socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);

    // Optional cleanup
    for (const [gameSessionId, currentTurn] of Object.entries(gameTurns)) {
        const socketsInRoom = io.sockets.adapter.rooms.get(gameSessionId) || new Set();
        if (socketsInRoom.size < 2) {
            console.log(`Cleaning up game session ${gameSessionId} due to disconnection`);
            delete gameTurns[gameSessionId];
        }
    }
});
*/











// Attach `io` and `app` to `services.js`
services(app, io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
