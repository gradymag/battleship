

document.addEventListener('DOMContentLoaded', function () {
    const usernameInput = document.getElementById('username');
    const createLobbyBtn = document.getElementById('createLobbyBtn');
    const lockUsernameBtn = document.getElementById('lockUsernameBtn');
    const joinButtons = document.querySelectorAll('.lobby-item button'); 

    let usernameLocked = false;
    let playerOneId; 

   
    function checkUsername() {
        const username = usernameInput.value.trim();
        lockUsernameBtn.disabled = username.length === 0; 
    }

    
    usernameInput.addEventListener('input', checkUsername);

   
    async function lockUsername() {
        const username = usernameInput.value.trim();
        if (username) {
            console.log(`Username locked: ${username}`);
            usernameLocked = true;
            createLobbyBtn.disabled = false; 
            joinButtons.forEach(button => {
                button.disabled = false; 
                button.classList.remove('disabled'); 
            });
            lockUsernameBtn.disabled = true; 
            
            
            const response = await fetch('/write-record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            const result = await response.json();
            console.log(result.msg);

            if (result.msg === "SUCCESS!") {
                
                const idResponse = await fetch('/get-player-id', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username }), 
                });

                const idResult = await idResponse.json();
                if (idResult.playerId) {
                    playerOneId = idResult.playerId; 
                    console.log(`Player ID: ${playerOneId}`);
                }
            }

            alert(`Username "${username}" locked! You can now create or join a lobby.`);
        } else {
            alert('Please enter a username.');
        }
    }

  
    lockUsernameBtn.addEventListener('click', lockUsername);

    
    createLobbyBtn.addEventListener('click', async function () {
        if (usernameLocked && playerOneId) { 
            console.log(`Creating lobby for ${usernameInput.value.trim()}`);
            
           
            const response = await fetch('/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerOneId }), 
            });

            const result = await response.json();
            console.log(result.msg); 
            if (result.gamesessionId) {
                alert(`Lobby created for ${usernameInput.value.trim()} with Game Session ID: ${result.gamesessionId}!`); // Show game session ID
            } else {
                alert('Failed to create lobby. Please try again.');
            }
        } else {
            alert('Please lock your username first!');
        }
    });

    
    joinButtons.forEach(button => {
        button.addEventListener('click', function () {
            if (usernameLocked) {
                const username = usernameInput.value.trim();
                console.log(`Joining lobby as ${username}`);
                
                alert(`Joined lobby as ${username}!`); 
            } else {
                alert('Please lock your username first!');
            }
        });
    });
});
