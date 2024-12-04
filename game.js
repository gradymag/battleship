


const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 700,
    backgroundColor: '#2b2b2b',
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

const game = new Phaser.Game(config);

let playerOneId;
let playerTwoId;
let shipsLocked = false;
const placedShips = [];
const grid = [];
let currentShip = null;
const currentGameSessionId = localStorage.getItem('gameSessionId');
let playerGrid = []; 
let currentTurn = null;
let attackButton = null; 


const shipsData = [
    { name: 'Carrier',shipId: 1, size: 4, imageKey: 'ship1', scale: 0.5, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -55, horizontalAnchorOffsetX: -105, horizontalAnchorOffsetY: -15,verticalOffsetFront: 1,verticalOffsetBack: 3, horizontalOffsetFront: 3, horizontalOffsetBack: 1  },
    { name: 'Battleship',shipId: 2 ,size: 5, imageKey: 'ship2', scale: 0.7, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -75, horizontalAnchorOffsetX: -125, horizontalAnchorOffsetY: -15, verticalOffsetFront: 2, verticalOffsetBack: 2, horizontalOffsetFront: 2, horizontalOffsetBack: 2},
    { name: 'Cruiser',shipId: 3, size: 3, imageKey: 'ship3', scale: 0.9, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -45, horizontalAnchorOffsetX: -95, horizontalAnchorOffsetY: -15, verticalOffsetFront: 1, verticalOffsetBack: 1, horizontalOffsetFront: 1, horizontalOffsetBack: 1},
    { name: 'Submarine',shipId: 4, size: 3, imageKey: 'ship4', scale: 0.8, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -45, horizontalAnchorOffsetX: -95, horizontalAnchorOffsetY: -15, verticalOffsetFront: 1, verticalOffsetBack: 1, horizontalOffsetFront: 1, horizontalOffsetBack: 1},
    { name: 'Patrol',shipId: 5, size: 2, imageKey: 'ship5', scale: 0.9, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -30, horizontalAnchorOffsetX: -80, horizontalAnchorOffsetY: -15,  verticalOffsetFront: 1, verticalOffsetBack: 0, horizontalOffsetFront: 0, horizontalOffsetBack: 1}
];

function preload() {
    this.load.image('ship1', 'images/ShipCarrierHull.png');
    this.load.image('ship2', 'images/ShipBattleshipHull.png');
    this.load.image('ship3', 'images/ShipDestroyerHull.png');
    this.load.image('ship4', 'images/ShipRescue.png');
    this.load.image('ship5', 'images/ShipPatrolHull.png');
}

function create() {
    const cellSize = 30;
    const opponentCellSize = 20; 
    const gridSize = 10;
    const offsetX = 200;

    let attackButton = null; // Declare attackButton at the top
    let selectedCell = null; 
    const opponentGrid = []; 
    const attackedCells = {}; // To track attacked cells

    // Spawn boundary for ships
    const spawnBoundary = this.add.rectangle(offsetX, 540, 400, 150, 0x4CAF50, 0.2).setOrigin(0, 0);

    // Create player's grid
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cellX = offsetX + col * cellSize;
            const cellY = 60 + row * cellSize;
            const cell = this.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, 0x5c5c5c).setOrigin(0);
            cell.id = String.fromCharCode(65 + row) + (col + 1); 
            playerGrid.push(cell); 
            cell.setInteractive();
        }
    }

    this.add.text(offsetX, 20, "Your Board", { fontSize: '20px', color: '#ffffff' });
    createGrid(this, offsetX, 60, gridSize, cellSize, false); 

    // Create opponent's grid
    this.add.text(offsetX + 500, 20, "Opponent's Board", { fontSize: '20px', color: '#ffffff' });
    for (let col = 0; col < gridSize; col++) {
        const colX = offsetX + 500 + col * opponentCellSize + opponentCellSize / 2; 
        this.add.text(colX, 60 - opponentCellSize / 2, (col + 1).toString(), {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);
    }
    for (let row = 0; row < gridSize; row++) {
        const rowY = 60 + row * opponentCellSize + opponentCellSize / 2; 
        this.add.text(offsetX + 500 - opponentCellSize / 2, rowY, String.fromCharCode(65 + row), {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);
    }
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cellX = offsetX + 500 + col * opponentCellSize;
            const cellY = 60 + row * opponentCellSize;
            const cell = this.add.rectangle(cellX, cellY, opponentCellSize - 2, opponentCellSize - 2, 0x5c5c5c).setOrigin(0);
            cell.id = String.fromCharCode(65 + row) + (col + 1); 
            opponentGrid.push(cell);
            cell.setInteractive();
            cell.on('pointerdown', () => {
                if (!shipsLocked) return; 
                selectedCell = highlightOpponentGridCell(opponentGrid, selectedCell, cell);
            });
        }
    }

    // Place and move ships
    let xOffset = 30;
    const yOffset = 610;

    shipsData.forEach((shipData) => {
        const ship = this.add.image(offsetX + xOffset, yOffset, shipData.imageKey).setInteractive();
        this.input.setDraggable(ship);

        ship.setDepth(2);
        ship.size = shipData.size;
        ship.setScale(shipData.scale);
        ship.anchorOffsetX = shipData.verticalAnchorOffsetX;
        ship.anchorOffsetY = shipData.verticalAnchorOffsetY;
        ship.orientation = 'vertical';
        ship.spawnX = offsetX + xOffset;
        ship.spawnY = yOffset;
        xOffset += 70;

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!shipsLocked && gameObject === ship) {
                gameObject.x = dragX;
                gameObject.y = dragY;
                highlightCells(gameObject, cellSize);
                currentShip = gameObject;
            }
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (!shipsLocked && gameObject === ship) {
                snapToHighlight(gameObject, cellSize);
            }
        });
    });

    // Lock Ships Button
    const lockButton = this.add.text(offsetX + 310, 427, 'Lock Ships', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#4CAF50',
        padding: 8
    }).setInteractive();

    

    lockButton.on('pointerdown', async () => {
        const localPlayerId = localStorage.getItem('playerId');
        if (!shipsLocked) {
            try {
                const allShipsHavePosition = await Promise.all(
                    shipsData.map(async (shipData) => {
                        const response = await fetch('/check-ship-position', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ playerId: localPlayerId, shipId: shipData.shipId }),
                        });
                        const result = await response.json();
                        return result.positionFound; 
                    })
                );

                if (allShipsHavePosition.every(Boolean)) {
                    shipsLocked = true;
                    lockButton.setAlpha(0.5);
                    lockButton.setInteractive(false);
                    alert("Ships locked! You can now attack.");
                } else {
                    alert("Place all ships on the grid to lock them.");
                }
            } catch (error) {
                console.error('Error checking ship positions:', error);
            }
        }
    });

    // Toggle Orientation Button
    const toggleOrientationButton = this.add.text(offsetX + 310, 470, 'Toggle Orientation', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#4CAF50',
        padding: 8
    }).setInteractive();

    toggleOrientationButton.on('pointerdown', () => {
        if (!shipsLocked && currentShip) {
            const shipData = shipsData.find(s => s.imageKey === currentShip.texture.key);
            currentShip.orientation = currentShip.orientation === 'vertical' ? 'horizontal' : 'vertical';

            if (currentShip.orientation === 'vertical') {
                currentShip.setRotation(0);
                currentShip.anchorOffsetX = shipData.verticalAnchorOffsetX;
                currentShip.anchorOffsetY = shipData.verticalAnchorOffsetY;
            } else {
                currentShip.setRotation(-Math.PI / 2);
                currentShip.anchorOffsetX = shipData.horizontalAnchorOffsetX;
                currentShip.anchorOffsetY = shipData.horizontalAnchorOffsetY;
            }

            snapToHighlight(currentShip, cellSize);
            highlightCells(currentShip, cellSize);
        }
    });

    // Control Buttons
    const statusBox = this.add.text(offsetX + 750, 150, "Hit or Miss", {
        fontSize: '18px',
        color: '#ffffff'
    });
    const controlButtons = addControlButtons(this, statusBox, offsetX + 750, 250);
    attackButton = controlButtons.attackButton;

    attackButton.on('pointerdown', () => {
        const localPlayerId = localStorage.getItem('playerId'); // Get the local player ID
        console.log("Local Player ID:", localPlayerId); // Debugging
    
        console.log("Current Turn ID:", currentTurn); // Debugging
        if (currentTurn !== localPlayerId) {
            alert("It's not your turn!");
            return;
        }
    
        if (selectedCell && shipsLocked) {
            const cellId = selectedCell.id;
    
            if (attackedCells[cellId]) {
                alert('You have already attacked this cell!');
                return;
            }
    
            socket.emit('playerAttack', {
                gameSessionId: currentGameSessionId,
                playerId: localPlayerId,
                targetCell: cellId,
            });
    
            console.log(`Attack sent: Cell ${cellId}`);
        } else {
            alert('Select a cell to attack first!');
        }
    });
    

    // Socket Event Listeners
    socket.on('currentTurn', ({ currentTurn: newTurn }) => {
        const localPlayerId = localStorage.getItem('playerId');
        currentTurn = newTurn; // Update the current turn
    
        console.log("Updated Current Turn:", currentTurn); // Debugging
    
        if (currentTurn === localPlayerId) {
            alert("It's your turn! Make your move.");
            enableAttack();
        } else {
            alert("Waiting for opponent's move...");
            disableAttack();
        }
    });
    

    socket.on('currentTurn', ({ currentTurn }) => {
        const localPlayerId = localStorage.getItem('playerId');
        if (currentTurn === localPlayerId) {
            alert("It's your turn! Make your move.");
            enableAttack();
        } else {
            alert("Waiting for opponent's move...");
            disableAttack();
        }
    });

    socket.on('notYourTurn', ({ msg }) => {
        alert(msg);
    });
}







function createGrid(scene, x, y, size, cellSize, isClickable) {
    
    for (let col = 0; col < size; col++) {
        const colX = x + col * cellSize + cellSize / 2; 
        scene.add.text(colX, y - cellSize / 2, (col + 1).toString(), {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);
    }

    
    for (let row = 0; row < size; row++) {
        const rowY = y + row * cellSize + cellSize / 2; 
        scene.add.text(x - cellSize / 2, rowY, String.fromCharCode(65 + row), {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);
    }

    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cellX = x + col * cellSize;
            const cellY = y + row * cellSize;
            const cell = scene.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, 0x5c5c5c).setOrigin(0);
            cell.id = String.fromCharCode(65 + row) + (col + 1); 

            if (isClickable) {
                cell.setInteractive();
                cell.on('pointerdown', () => {
                    cell.setFillStyle(0xff0000);
                    scene.time.delayedCall(200, () => cell.setFillStyle(0x5c5c5c));
                });
            }
            grid.push(cell);
        }
    }
}

function highlightOpponentGridCell(grid, selectedCell, cell) {
    
    if (cell.isAttacked) return selectedCell;

    
    if (selectedCell && !selectedCell.isAttacked) {
        selectedCell.setFillStyle(0x5c5c5c); 
    }

    
    if (!cell.isAttacked) {
        cell.setFillStyle(0x0000ff); 
    }

    return cell; 
}



function highlightCells(ship, cellSize) {
    grid.forEach(cell => {
        cell.setFillStyle(0x5c5c5c);
    });

    const startX = Math.round((ship.x + ship.anchorOffsetX) / cellSize) * cellSize;
    const startY = Math.round((ship.y + ship.anchorOffsetY) / cellSize) * cellSize;
    const gridLeftBound = 150;
    const gridRightBound = gridLeftBound + cellSize * 10;
    const gridTopBound = 60;
    const gridBottomBound = gridTopBound + cellSize * 10;

    if (startX < gridLeftBound || startX >= gridRightBound || startY < gridTopBound || startY >= gridBottomBound) {
        return;
    }

    const startColumnIndex = Math.floor((startX - gridLeftBound) / cellSize);
    const startRowIndex = Math.floor((startY - gridTopBound) / cellSize);

    for (let i = 0; i < ship.size; i++) {
        let cellIndex;

        if (ship.orientation === 'horizontal') {
            if (startColumnIndex + i >= 10) break;
            cellIndex = (startColumnIndex + i) + startRowIndex * 10;
        } else {
            if (startRowIndex + i >= 10) break;
            cellIndex = startColumnIndex + (startRowIndex + i) * 10;
        }

        if (cellIndex >= 0 && cellIndex < 100) {
            grid[cellIndex].setFillStyle(0x0000ff);
        }
    }
}

async function snapToHighlight(ship, cellSize) {
    const closestX = Math.round((ship.x + ship.anchorOffsetX) / cellSize) * cellSize;
    const closestY = Math.round((ship.y + ship.anchorOffsetY) / cellSize) * cellSize;

    const finalX = closestX - ship.anchorOffsetX;
    const finalY = closestY - ship.anchorOffsetY;

    const gridStartX = 200;
    const gridStartY = 60;

    console.log(`Snapping ship to: (${finalX}, ${finalY})`);

    if (
        finalX >= gridStartX &&
        finalX < gridStartX + cellSize * 10 &&
        finalY >= gridStartY &&
        finalY < gridStartY + cellSize * 10
    ) {
        ship.setPosition(finalX, finalY);

        const column = Math.floor((finalX - gridStartX) / cellSize) + 1;
        const row = String.fromCharCode(65 + Math.floor((finalY - gridStartY) / cellSize));

        const anchor = `${row}${column}`;
        const shipId = shipsData.find((s) => s.imageKey === ship.texture.key).shipId;
        const orientation = ship.orientation;

        const shipData = shipsData.find((s) => s.imageKey === ship.texture.key);
        const offsets = {
            verticalOffsetFront: shipData.verticalOffsetFront,
            verticalOffsetBack: shipData.verticalOffsetBack,
            horizontalOffsetFront: shipData.horizontalOffsetFront,
            horizontalOffsetBack: shipData.horizontalOffsetBack,
        };

        const occupiedCells = calculateOccupiedCells(anchor, orientation, ship.size, offsets);

        // Use localPlayerId from localStorage to identify the current player
        const localPlayerId = localStorage.getItem('playerId');
        console.log("Player ID being checked for overlap:", localPlayerId);

        const isValid = await checkOverlap(localPlayerId, occupiedCells);

        if (!isValid) {
            alert("Overlap detected! Ship will be reset to spawn location.");
            ship.setPosition(ship.spawnX, ship.spawnY); 
        } else {
            await updateShipPositionInDatabase(localPlayerId, shipId, anchor, orientation);
        }
    } else {
        alert("Ship placement is outside the grid!");
        ship.setPosition(ship.spawnX, ship.spawnY); 
    }
}









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









async function checkOverlap(playerId, occupiedCells) {
    console.log("Checking overlap for playerId:", playerId, "occupiedCells:", occupiedCells);

    if (!playerId || !occupiedCells || occupiedCells.length === 0) {
        console.error("Invalid data for overlap check:", { playerId, occupiedCells });
        return false;
    }
    
    try {
        const response = await fetch('/check-ship-overlap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, occupiedCells })
        });

        const data = await response.json();
        console.log("Response from /check-ship-overlap:", data);
        if (!data.success) {
            console.error("Overlap detected:", data.overlaps);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error checking overlap:", error);
        return false;
    }
}


function pixelToGrid(x, y, offsetX = 150, offsetY = 60, cellSize = 30) {
    const adjustedX = x - offsetX;
    const adjustedY = y - offsetY;

    const colIndex = Math.floor(adjustedX / cellSize);
    const rowIndex = Math.floor(adjustedY / cellSize);

    const rowLetter = String.fromCharCode(65 + rowIndex); 
    const colNumber = colIndex + 1; 

    return `${rowLetter}${colNumber}`;
}


function addControlButtons(scene, statusBox, x, y) {
    const buttonConfig = { fontSize: '14px', backgroundColor: '#4CAF50', padding: 8, borderRadius: 5 };

    
    const attackButton = scene.add.text(x - 35, y + 30, 'Attack', {
        ...buttonConfig,
        color: '#808080', 
    })
        .setAlpha(0.5) 
        .setInteractive()
        .on('pointerdown', () => {
            if (!shipsLocked) {
                alert("Lock your ships first!");
            } else {
                statusBox.setText("Choose a cell to attack!");
            }
        });

    
    const restartButton = scene.add.text(x, y + 160, 'Restart Game', {
        ...buttonConfig,
        color: '#ffffff',
    }).setInteractive();

    restartButton.on('pointerdown', () => {
        alert("Restarting game...");
        shipsLocked = false;
        statusBox.setText("Game restarted.");
        location.reload();
    });

    
    const endGameButton = scene.add.text(x, y + 200, 'End Game', {
        ...buttonConfig,
        color: '#ffffff',
    }).setInteractive();

    endGameButton.on('pointerdown', () => {
        alert("Ending game...");
        statusBox.setText("Game ended.");
    });

    return { attackButton, restartButton, endGameButton };
}





async function updateShipPositionInDatabase(playerId, shipId, gridId, orientation) {
    try {
        const response = await fetch('/update-ship-position', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ playerId, shipId, position: gridId, orientation }),
        });

        const result = await response.json();
        console.log(result.msg);
    } catch (error) {
        console.error('Error updating ship position:', error);
    }
}




document.addEventListener('DOMContentLoaded', async function () {
    const gameSessionId = localStorage.getItem('gameSessionId');
    const localPlayerId = localStorage.getItem('playerId');

    console.log("Local playerId:", localPlayerId);
    console.log("Game sessionId:", gameSessionId);
    
    if (!gameSessionId) {
        alert('Game session ID not found. Please return to the lobby.');
        window.location.href = '/battleshiplobby.html';
        return;
    }

    // Fetch session details
    const sessionDetails = await fetchSessionDetails(gameSessionId);
    if (!sessionDetails) {
        alert('Failed to fetch session details. Please return to the lobby.');
        window.location.href = '/battleshiplobby.html';
        return;
    }

    // Set playerOneId or playerTwoId based on the current user
    console.log('Local playerId:', localPlayerId);
    console.log('Session playerOneId:', sessionDetails.playerOneId);
    console.log('Session playerTwoId:', sessionDetails.playerTwoId);

    if (localPlayerId == sessionDetails.playerOneId) {
        playerOneId = sessionDetails.playerOneId;
        console.log('Initialized board with playerOneId:', playerOneId);
    } else if (localPlayerId == sessionDetails.playerTwoId) {
        playerTwoId = sessionDetails.playerTwoId; // Assign to playerTwoId
        console.log('Initialized board with playerTwoId:', playerTwoId);
    } else {
        alert('Failed to identify player role. Please return to the lobby.');
        window.location.href = '/battleshiplobby.html';
    }
});




//http://localhost:5000/get-test-player-id
//https://battleship-demo-e5ad5cbce653.herokuapp.com/get-test-player-id

async function fetchPlayerOneId() {
    if (playerOneId) {
        // Prevent fetching if playerOneId is already set
        console.log('playerOneId already set:', playerOneId);
        return playerOneId;
    }

    try {
        const response = await fetch('https://battleship-demo-e5ad5cbce653.herokuapp.com/get-test-player-id');
        if (!response.ok) {
            console.error('Network response was not ok');
            return null;
        }

        const data = await response.json();
        console.log("Fetched data:", data);
        const fetchedPlayerOneId = data.playerOneId;

        if (fetchedPlayerOneId === undefined) {
            console.error("Error: playerOneId is undefined in fetched data");
            return null;
        }

        console.log("playerOneId retrieved:", fetchedPlayerOneId);
        return fetchedPlayerOneId;
    } catch (error) {
        console.error('Error fetching playerOneId:', error);
        return null;
    }
}



const createGameSession = async (playerId) => {
    try {
        const response = await fetch('/create-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ playerOneId: playerId }),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Game session created:", result.gameSessionId);

            // Store the game session ID in localStorage
            localStorage.setItem('gameSessionId', result.gameSessionId);

            // Redirect to the Battleship board screen
            window.location.href = '/battleshipboard.html';
        } else {
            console.error("Error creating session:", result.msg);
            alert(`Failed to create game session: ${result.msg}`);
        }
    } catch (error) {
        console.error("Error creating session:", error);
        alert("An error occurred while creating the game session. Please try again.");
    }
};


const joinGameSession = async (gameSessionId, playerId) => {
    try {
        const response = await fetch('/join-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameSessionId,
                playerTwoId: playerId,
            }),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Player joined the session:", result.msg);
        } else {
            console.error("Error joining session:", result.msg);
        }
    } catch (error) {
        console.error("Error joining session:", error);
    }
};

const allGridPositions = []; 
for (let row = 65; row <= 74; row++) { 
    for (let col = 1; col <= 10; col++) { 
        allGridPositions.push(`${String.fromCharCode(row)}${col}`);
    }
}

const attackedCells = {}; 
/*
async function playerTwoRandomAttack() {
    console.log("Player 2 is attacking...");
    try {
        const responsePlayerTwo = await fetch(`/get-player-two-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameSessionId: currentGameSessionId }),
        });

        const playerTwoData = await responsePlayerTwo.json();
        if (!playerTwoData.success) {
            console.error('Failed to fetch Player 2 ID:', playerTwoData.msg);
            return;
        }
        const playerTwoId = playerTwoData.playerId;

        const remainingPositions = allGridPositions.filter(cell => !attackedCells[cell]);
        if (remainingPositions.length === 0) {
            console.log("Player 2 has no moves left.");
            return;
        }

        const targetCell = remainingPositions[Math.floor(Math.random() * remainingPositions.length)];
        console.log(`Player 2 chose: ${targetCell}`);

        try {
            const response = await fetch('/attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameSessionId: currentGameSessionId,
                    playerId: playerTwoId,
                    targetCell: targetCell,
                }),
            });

            const result = await response.json();

            if (result.success) {
                console.log(`Player 2 attacked ${targetCell}: ${result.result}`);
                attackedCells[targetCell] = result.result.toLowerCase(); // Track the result
                
                // Update the player's grid with the result
                updatePlayerGrid(targetCell, result.result.toLowerCase());
            } else {
                console.log(`Player 2 attack failed: ${result.msg}`);
            }
        } catch (error) {
            console.error("Error during Player 2 attack:", error);
        }
    } catch (error) {
        console.error("Error during Player 2 attack setup:", error);
    }
}
*/




const generateAllGridPoints = (gridSize = 10) => {
    const gridPoints = [];
    for (let row = 0; row < gridSize; row++) {
        const rowLetter = String.fromCharCode(65 + row);
        for (let col = 1; col <= gridSize; col++) {
            gridPoints.push(`${rowLetter}${col}`);
        }
    }
    return gridPoints;
};


const allGridPoints = generateAllGridPoints();



function updatePlayerGrid(targetCell, result) {
    console.log(`Player 2 is attacking cell: ${targetCell} on your grid with result: ${result}`);
    
    // Find the target cell in the player's grid
    const cell = playerGrid.find(c => c.id === targetCell);
    console.log("Player Grid IDs:", playerGrid.map(cell => cell.id));

    if (cell) {
        console.log(`Found cell on your grid: ${cell.id}`);

        // Update the cell's color based on attack result
        if (result === 'hit') {
            console.log(`Marking cell ${cell.id} as hit`);
            cell.setFillStyle(0xff0000); // Red for hit
            cell.setDepth(1); // Ensure the cell is on top
            cell.visible = false; // Force re-render
            cell.visible = true; 
            console.log("Cell fill color after update:", cell.fillColor); // Should match the applied color

        } else if (result === 'miss') {
            console.log(`Marking cell ${cell.id} as miss`);
            cell.setFillStyle(0xffffff); // White for miss
            cell.setDepth(1); // Ensure the cell is on top
            cell.visible = false; // Force re-render
            cell.visible = true; 
            console.log("Cell fill color after update:", cell.fillColor); // Should match the applied color
        }

        // Prevent further interaction with this cell
        cell.setInteractive(false);
    } else {
        console.error(`Cell ${targetCell} not found in player's grid.`);
    }
}






async function fetchSessionDetails(gameSessionId) {
    try {
        const response = await fetch('/get-session-players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameSessionId }),
        });

        const data = await response.json();

        console.log("Session details fetched:", data); // Add this log

        if (response.ok && data.success) {
            return data;
        } else {
            console.error('Failed to fetch session details:', data.msg);
            return null;
        }
    } catch (error) {
        console.error('Error fetching session details:', error);
        return null;
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const gameSessionId = localStorage.getItem('gameSessionId');
    const playerId = localStorage.getItem('playerId'); // Store or retrieve player ID

    if (!gameSessionId) {
        alert('No game session found. Redirecting to lobby.');
        window.location.href = '/battleshiplobby.html';
    }

    // Emit an event to join the game session room
    socket.emit('joinLobby', { gameSessionId, playerId });

    // Handle 'lobbyFull' event
    socket.on('lobbyFull', (data) => {
        console.log('Lobby is full:', data);

        // Check player roles
        if (data.playerOneId === playerId) {
            console.log('You are Player One.');
        } else if (data.playerTwoId === playerId) {
            console.log('You are Player Two.');
        } else {
            console.error('Unexpected player role.');
        }

        // Redirect to game board
        if (data.redirectTo) {
            window.location.href = data.redirectTo;
        } else {
            console.error('Redirect URL missing in lobbyFull event.');
        }
    });
});



const socket = io('http://localhost:5000');
//const socket = io('https://battleship-demo-e5ad5cbce653.herokuapp.com/'); // Use your deployed URL

document.addEventListener('DOMContentLoaded', function () {
    const gameSessionId = localStorage.getItem('gameSessionId');
    const playerId = localStorage.getItem('playerId'); // Store or retrieve player ID

    if (!gameSessionId) {
        alert('No game session found. Redirecting to lobby.');
        window.location.href = '/battleshiplobby.html';
    }

    // Emit an event to join the game session room
    socket.emit('joinLobby', { gameSessionId, playerId });

    // Handle attack logic
    const attackCell = (targetCell) => {
        socket.emit('attack', { gameSessionId, targetCell });
    };

    // Listen for attack results
    socket.on('attackResult', (data) => {
        const { targetCell, result } = data;
        console.log(`Attack on ${targetCell}: ${result}`);

        // Update the grid based on attack results
        updatePlayerGrid(targetCell, result); // Assume this function exists in your game.js
    });

    // Example function to handle attack button click
    document.getElementById('attackBtn').addEventListener('click', function () {
        const targetCell = prompt('Enter cell to attack (e.g., A5):');
        attackCell(targetCell);
    });
});



socket.on('notYourTurn', ({ msg }) => {
    alert(msg); // Notify the player it's not their turn
});

function enableAttack() {
    // Enable attack button or interaction logic
    attackButton.setInteractive(true);
    attackButton.setAlpha(1); // Optional: visually enable
}

function disableAttack() {
    // Disable attack button or interaction logic
    attackButton.setInteractive(false);
    attackButton.setAlpha(0.5); // Optional: visually disable
}


function update() {
    // Placeholder for game loop
}
