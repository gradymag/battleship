const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const router = require('./router');
const services = require('./services.js'); 

const app = express();

// State tracking
const sessionPlayers = {}; // { gameSessionId: { playerOne: 1, playerTwo: 2 } }
const gameTurns = {}; // { gameSessionId: currentPlayerId }
const shipsLocked = {}; // { gameSessionId: { playerOne: boolean, playerTwo: boolean } }

// CORS configuration
const corsOptions = {
    origin: 'https://battleship-demo-e5ad5cbce653.herokuapp.com', // Use Heroku app's URL
    methods: ['GET', 'POST'],
    credentials: true, 
};

// Middleware
app.use(cors(corsOptions)); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(express.static(path.join(__dirname, '../client/js'))); 
app.use(router); 

// MIME type for JavaScript files
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});

// Database connection
const connection = services.connection;

// Create server
const server = http.createServer(app);

//http://localhost:5000
//https://battleship-demo-e5ad5cbce653.herokuapp.com

// Initialize Socket.IO and configure CORS for Heroku
const io = socketIo(server, {
    cors: {
        origin: 'https://battleship-demo-e5ad5cbce653.herokuapp.com', // Us Heroku app's URL
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Socket.IO logic
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Player joins a lobby
    socket.on('joinLobby', ({ gameSessionId, playerId }) => {
        if (!gameSessionId || !playerId) {
            console.error('Invalid joinLobby request:', { gameSessionId, playerId });
            return;
        }
    
        console.log(`Player ${playerId} joining lobby ${gameSessionId}`);
        socket.join(gameSessionId);
    
        if (!shipsLocked[gameSessionId]) {
            shipsLocked[gameSessionId] = { playerOne: false, playerTwo: false };
        }
    
        if (!sessionPlayers[gameSessionId]) {
            sessionPlayers[gameSessionId] = { playerOne: playerId, playerTwo: null };
            console.log(`Session initialized: ${JSON.stringify(sessionPlayers[gameSessionId])}`);
        } else if (!sessionPlayers[gameSessionId].playerTwo) {
            sessionPlayers[gameSessionId].playerTwo = playerId;
            console.log(`Player Two joined. Updated session: ${JSON.stringify(sessionPlayers[gameSessionId])}`);
        }
    });
    

    // Player locks ships
    socket.on('shipsLocked', ({ gameSessionId, playerId }) => {
        const players = sessionPlayers[gameSessionId];
    
        console.log(`Players in session ${gameSessionId}:`, players);
        console.log(`Initial shipsLocked state for ${gameSessionId}:`, shipsLocked[gameSessionId]);
    
        // Check if session exists and both players are assigned
        if (!players || !players.playerOne || !players.playerTwo) {
            console.error(`Both players must join the session before locking ships. Session: ${JSON.stringify(players)}`);
            return;
        }
    
        // Explicitly parse playerId and compare
        const parsedPlayerId = parseInt(playerId, 10); 
        if (parsedPlayerId === players.playerOne) {
            shipsLocked[gameSessionId].playerOne = true;
            console.log(`Player ${parsedPlayerId} (Player One) locked ships.`);
        } else if (parsedPlayerId === players.playerTwo) {
            shipsLocked[gameSessionId].playerTwo = true;
            console.log(`Player ${parsedPlayerId} (Player Two) locked ships.`);
        } else {
            console.error(
                `Invalid player ID ${playerId} for session ${gameSessionId}. Session players: ${JSON.stringify(players)}`
            );
            return;
        }
    
        console.log(`Updated shipsLocked state for ${gameSessionId}:`, shipsLocked[gameSessionId]);
    
        // Check if both players have locked their ships
        if (shipsLocked[gameSessionId].playerOne && shipsLocked[gameSessionId].playerTwo) {
            // Determine the first turn based on the lower player ID
            gameTurns[gameSessionId] =
                players.playerOne < players.playerTwo ? players.playerOne : players.playerTwo;
    
            console.log(`Both players locked ships for session ${gameSessionId}. First turn: Player ${gameTurns[gameSessionId]}`);
    
            // Notify all players in the session that both ships are locked
            io.to(gameSessionId).emit('bothShipsLocked', {
                currentTurn: gameTurns[gameSessionId],
            });
        }
    });
    
    
    
    
    
    

    // Player attacks
    socket.on('playerAttack', ({ gameSessionId, playerId, targetCell }) => {
        console.log(`Player ${playerId} attacked cell ${targetCell} in session ${gameSessionId}`);
    
        // Validate turn
        if (gameTurns[gameSessionId] !== playerId) {
            socket.emit('notYourTurn', { msg: "It's not your turn!" });
            return;
        }
    
        // Validate attack
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
                console.error('Error processing attack:', err);
                socket.emit('attackError', { msg: "An error occurred while processing your attack." });
                return;
            }
    
            const result = results.length > 0 ? 'hit' : 'miss';
    
            // Broadcast attack result
            io.to(gameSessionId).emit('attackResult', {
                targetCell,
                result,
                attackerId: playerId,
            });
    
            // Update turn
            const players = sessionPlayers[gameSessionId];
            gameTurns[gameSessionId] =
                gameTurns[gameSessionId] === players.playerOne
                    ? players.playerTwo
                    : players.playerOne;
    
            console.log(`Game ${gameSessionId}: Turn switched to Player ${gameTurns[gameSessionId]}`);
            io.to(gameSessionId).emit('currentTurn', { currentTurn: gameTurns[gameSessionId] });
        });
    });
    
    
    
    
    

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`A user disconnected: ${socket.id}`);
    });
});

// Attach `io` and `app` to `services.js`
services(app, io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
