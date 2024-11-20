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
let shipsLocked = false;
const placedShips = [];
const grid = [];
let currentShip = null;
const currentGameSessionId = localStorage.getItem('gameSessionId');
let playerGrid = []; 


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

    
    const spawnBoundary = this.add.rectangle(offsetX, 540, 400, 150, 0x4CAF50, 0.2).setOrigin(0, 0);

    
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

    
    this.add.text(offsetX + 500, 20, "Opponent's Board", { fontSize: '20px', color: '#ffffff' });

    let selectedCell = null; 
    const opponentGrid = []; 

    
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

    
    let xOffset = 30;
    const yOffset = 610;

    shipsData.forEach((shipData, index) => {
        const ship = this.add.image(offsetX + xOffset, yOffset, shipData.imageKey).setInteractive();
        this.input.setDraggable(ship);

        
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

    const lockButton = this.add.text(offsetX + 310, 427, 'Lock Ships', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#4CAF50',
        padding: 8
    }).setInteractive();

    const statusBox = this.add.text(offsetX + 750, 150, "Hit or Miss", {
        fontSize: '18px',
        color: '#ffffff'
    });

    const controlButtons = addControlButtons(this, statusBox, offsetX + 750, 250);

    lockButton.on('pointerdown', async () => {
        if (!shipsLocked) {
            const allShipsHavePosition = await Promise.all(
                shipsData.map(async (shipData) => {
                    const response = await fetch('/check-ship-position', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ playerId: playerOneId, shipId: shipData.shipId }),
                    });
                    const result = await response.json();
                    return result.positionFound; 
                })
            );

            if (allShipsHavePosition.every(hasPosition => hasPosition)) {
                shipsLocked = true;
                lockButton.setAlpha(0.5);
                lockButton.setInteractive(false);

                
                const { attackButton } = controlButtons;
                attackButton.setAlpha(1); 
                attackButton.setColor('#ffffff'); 

                alert("Ships locked! You can now attack.");
            } else {
                alert("Place all ships on the grid to lock them.");
            }
        }
    });

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

    
    const attackedCells = {};
const { attackButton } = controlButtons;
    attackButton.on('pointerdown', async () => {
    if (selectedCell && shipsLocked) {
        const cellId = selectedCell.id; 

        
        if (attackedCells[cellId]) {
            alert('You have already attacked this cell!');
            return;
        }

        
        try {
            const response = await fetch('/attack', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameSessionId: currentGameSessionId, playerId: playerOneId, targetCell: cellId }),
            });

            const result = await response.json();

            if (result.success) {
                
                attackedCells[cellId] = result.result.toLowerCase();

                
                statusBox.setText(`Attack on ${cellId}: ${result.result}`);

                if (attackedCells[cellId] === 'hit') {
                    selectedCell.setFillStyle(0xff0000); 
                } else if (attackedCells[cellId] === 'miss') {
                    selectedCell.setFillStyle(0xffffff); 
                }

                
                selectedCell.isAttacked = true;

                
                selectedCell.removeAllListeners('pointerdown');
                selectedCell.setInteractive(false);

                
                playerTwoRandomAttack();
            } else {
                statusBox.setText(`Attack failed: ${result.msg}`);
            }
        } catch (error) {
            console.error('Error sending attack:', error);
            alert('Error during attack. Please try again.');
        }
    } else {
        alert('Select a cell to attack first!');
    }
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

        const isValid = await checkOverlap(playerOneId, occupiedCells);

        if (!isValid) {
            alert("Overlap detected! Ship will be reset to spawn location.");
            ship.setPosition(ship.spawnX, ship.spawnY); 
        } else {
            await updateShipPositionInDatabase(playerOneId, shipId, anchor, orientation);
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
    try {
        const response = await fetch('/check-ship-overlap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, occupiedCells })
        });

        const data = await response.json();
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
    try {
        const response = await fetch('https://battleship-demo-e5ad5cbce653.herokuapp.com/get-test-player-id');
        if (response.ok) {
            const data = await response.json();
            if (data.playerOneId) {
                playerOneId = data.playerOneId;
                console.log(`playerOneId retrieved: ${playerOneId}`);
            } else {
                console.error('No playerOneId found in response');
            }
        } else {
            console.error(`Failed to fetch playerOneId, status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching playerOneId:', error);
    }
});




async function fetchPlayerOneId() {
    try {
        const response = await fetch('https://battleship-demo-e5ad5cbce653.herokuapp.com/get-test-player-id');
        
        if (!response.ok) {
            console.error('Network response was not ok');
            return;
        }
        
        const data = await response.json();
        console.log("Fetched data:", data); 
        const playerOneId = data.playerOneId;

        if (playerOneId === undefined) {
            console.error("Error: playerOneId is undefined in fetched data");
            return;
        }

        console.log("playerOneId retrieved:", playerOneId);
        return playerOneId;
    } catch (error) {
        console.error('Error fetching playerOneId:', error);
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
            currentGameSessionId = result.gameSessionId; 
        } else {
            console.error("Error creating session:", result.msg);
        }
    } catch (error) {
        console.error("Error creating session:", error);
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

async function playerTwoRandomAttack() {
    console.log("Player 2 is attacking...");
    try {
        
        const remainingPositions = allGridPositions.filter(cell => !attackedCells[cell]);
        if (remainingPositions.length === 0) {
            console.log("Player 2 has no moves left.");
            return;
        }

        const targetCell = remainingPositions[Math.floor(Math.random() * remainingPositions.length)];
        console.log(`Player 2 chose: ${targetCell}`);

        
        attackedCells[targetCell] = true; 

        const response = await fetch('/attack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gameSessionId: currentGameSessionId, playerId: 2, targetCell }),
        });

        const result = await response.json();

        if (result.success) {
            console.log(`Player 2 attacked ${targetCell}: ${result.result}`);
            updatePlayerGrid(targetCell, result.result); 
        } else {
            console.log(`Player 2 failed to attack: ${result.msg}`);
        }
    } catch (error) {
        console.error("Error during Player 2 attack:", error);
    }
}



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


let currentTurn = 'player1'; 

async function handleAttack(cellId) {
    if (currentTurn === 'player1') {
        
        await handlePlayerAttack(cellId);
        currentTurn = 'player2'; 

        
        setTimeout(() => {
            handlePlayerTwoAttack();
            currentTurn = 'player1'; 
        }, 2000); 
    }
}

function updatePlayerGrid(targetCell, result) {
    console.log(`Updating grid for targetCell: ${targetCell}, result: ${result}`);
    
    const cell = playerGrid.find(c => c.id === targetCell);

    if (cell) {
        console.log(`Found cell: ${cell.id}`);
        
        if (result === 'hit') {
            cell.setFillStyle(0xff0000); 
        } else if (result === 'miss') {
            cell.setFillStyle(0xffffff); 
        }
        cell.setInteractive(false); 
    } else {
        console.error(`Cell ${targetCell} not found on the player's grid.`);
    }
}







function update() {
    // Placeholder for game loop
}
