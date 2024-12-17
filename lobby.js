

document.addEventListener('DOMContentLoaded', function () {
    const socket = io();
    const usernameInput = document.getElementById('username');
    const createLobbyBtn = document.getElementById('createLobbyBtn');
    const lockUsernameBtn = document.getElementById('lockUsernameBtn');
    const joinLobbyBtn = document.getElementById('joinLobbyBtn'); 
    const joinButtons = document.querySelectorAll('.lobby-item button'); 
    const playerId = localStorage.getItem('playerId');
    const gameSessionId = localStorage.getItem('gameSessionId');


    let usernameLocked = false;
    let playerOneId;
    let currentGameSessionId;

    // Check if username is valid
    function checkUsername() {
        const username = usernameInput.value.trim();
        lockUsernameBtn.disabled = username.length === 0;
    }

    usernameInput.addEventListener('input', checkUsername);

    // Lock Username
    async function lockUsername() {
        const username = usernameInput.value.trim();
        if (username) {
            console.log(`Username locked: ${username}`);
            usernameLocked = true;
    
            
            enableButton(createLobbyBtn);
            enableButton(joinLobbyBtn);
    
            lockUsernameBtn.disabled = true;
            lockUsernameBtn.classList.add('disabled');
    
            try {
                const response = await fetch('/write-record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username }),
                });
    
                const result = await response.json();
                if (result.msg === "SUCCESS!") {
                    const idResponse = await fetch('/get-player-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username }),
                    });
    
                    const idResult = await idResponse.json();
                    if (idResult.playerId) {
                        playerOneId = idResult.playerId;
                        console.log(`Player ID: ${playerOneId}`);
                    }
                }
    
                alert(`Username "${username}" locked! You can now create or join a lobby.`);
            } catch (error) {
                console.error('Error locking username:', error);
            }
        } else {
            alert('Please enter a username.');
        }
    }

    lockUsernameBtn.addEventListener('click', lockUsername);

    // Create Lobby
    createLobbyBtn.addEventListener('click', async function () {
        if (usernameLocked && playerOneId) {
            try {
                const response = await fetch('/create-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerOneId }),
                });

                const result = await response.json();

                if (result.success && result.gameSessionId) {
                    currentGameSessionId = result.gameSessionId;
                    localStorage.setItem('gameSessionId', currentGameSessionId);
                    localStorage.setItem('playerId', playerOneId); 
                    // Join the WebSocket room
                    socket.emit('joinLobby', { gameSessionId: currentGameSessionId, playerId: playerOneId });
                    alert(`Lobby created with Game Session ID: ${result.gameSessionId}!`);
                } else {
                    alert(`Failed to create lobby: ${result.msg}`);
                }
            } catch (error) {
                console.error('Error creating lobby:', error);
                alert('Error creating lobby. Please try again.');
            }
        } else {
            alert('Please lock your username first!');
        }
    });

    // Main Join Lobby Button
    joinLobbyBtn?.addEventListener('click', async function () {
        if (!usernameLocked || !playerOneId) {
            alert('Please lock your username first!');
            return;
        }

        const gameSessionId = prompt('Enter Game Session ID:');
        if (gameSessionId) {
            try {
                const response = await fetch('/join-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameSessionId,
                        playerTwoId: playerOneId,
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    alert(`Joined lobby with Game Session ID: ${gameSessionId}!`);
                } else {
                    alert(`Failed to join session: ${result.msg}`);
                }
            } catch (error) {
                console.error('Error joining session:', error);
            }
        }
    });

    // Handle clicks on specific lobby join buttons
    joinButtons.forEach(button => {
        button.addEventListener('click', async function () {
            if (!usernameLocked || !playerOneId) {
                alert('Please lock your username first!');
                return;
            }
    
            try {
                // Fetch the highest available Game Session ID
                const response = await fetch('/get-latest-session', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
    
                const result = await response.json();
                const latestGameSessionId = result.latestGameSessionId;
    
                if (latestGameSessionId) {
                    const joinResponse = await fetch('/join-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            gameSessionId: latestGameSessionId,
                            playerTwoId: playerOneId,
                        }),
                    });
    
                    const joinResult = await joinResponse.json();
                    if (joinResult.success) {
                        // Store in localStorage
                        localStorage.setItem('gameSessionId', latestGameSessionId);
                        localStorage.setItem('playerId', playerOneId);
    
                        // Emit WebSocket join
                        socket.emit('joinLobby', {
                            gameSessionId: latestGameSessionId,
                            playerId: playerOneId,
                        });
    
                        alert(`Joined lobby with Game Session ID: ${latestGameSessionId}!`);
                    } else {
                        alert(`Failed to join session: ${joinResult.msg}`);
                    }
                } else {
                    alert('No available lobbies to join.');
                }
            } catch (error) {
                console.error('Error fetching latest session or joining session:', error);
            }
        });
    });
    

    // Handle full lobby
    socket.on('lobbyFull', (data) => {
        console.log("Lobby is full. Redirecting:", data);
    
        // Store player IDs in localStorage
        if (data.playerOneId && data.playerTwoId) {
            const playerId = localStorage.getItem('playerId');
    
            // Determine if this player is Player 1 or Player 2
            if (playerId == data.playerOneId) {
                localStorage.setItem('role', 'playerOne');
            } else if (playerId == data.playerTwoId) {
                localStorage.setItem('role', 'playerTwo');
            }
    
            localStorage.setItem('playerOneId', data.playerOneId);
            localStorage.setItem('playerTwoId', data.playerTwoId);
        }
    
        // Redirect to the board
        window.location.href = data.redirectTo;
    });
    
    
    
    function enableButton(button) {
        button.disabled = false; // Remove 'disabled' attribute
        button.classList.remove('disabled'); // Remove 'disabled' class
        button.style.cursor = 'pointer'; // Ensure proper cursor
    }
    
    function disableButton(button) {
        button.disabled = true; // Add 'disabled' attribute
        button.classList.add('disabled'); // Add 'disabled' class
        button.style.cursor = 'not-allowed'; // Ensure proper cursor
    }
    
    

    // Reconnection logic
    socket.on('disconnect', () => {
        console.warn('Disconnected from server. Attempting to reconnect...');
        setTimeout(() => {
            socket.connect();
        }, 3000);
    });

    socket.on('connect', () => {
        console.log('Reconnected to server.');
        // Rejoin the room if needed
        if (currentGameSessionId && playerId) {
            socket.emit('joinLobby', {gameSessionId: localStorage.getItem('gameSessionId'),
                playerId: localStorage.getItem('playerId'),
            });
            
        }
    });
});
