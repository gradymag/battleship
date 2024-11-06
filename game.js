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


const shipsData = [
    { name: 'Carrier', size: 4, imageKey: 'ship1', scale: 0.5, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -55, horizontalAnchorOffsetX: -105, horizontalAnchorOffsetY: -15 },
    { name: 'Battleship', size: 5, imageKey: 'ship2', scale: 0.7, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -75, horizontalAnchorOffsetX: -125, horizontalAnchorOffsetY: -15 },
    { name: 'Cruiser', size: 3, imageKey: 'ship3', scale: 0.9, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -45, horizontalAnchorOffsetX: -95, horizontalAnchorOffsetY: -15 },
    { name: 'Submarine', size: 3, imageKey: 'ship4', scale: 0.8, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -45, horizontalAnchorOffsetX: -95, horizontalAnchorOffsetY: -15 },
    { name: 'Patrol', size: 2, imageKey: 'ship5', scale: 0.9, verticalAnchorOffsetX: -65, verticalAnchorOffsetY: -30, horizontalAnchorOffsetX: -80, horizontalAnchorOffsetY: -15 }
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
    const gridSize = 10;
    const offsetX = 200;

    const spawnBoundary = this.add.rectangle(offsetX, 540, 400, 150, 0x4CAF50, 0.2).setOrigin(0, 0);

    this.add.text(offsetX, 20, "Your Board", { fontSize: '20px', color: '#ffffff' });
    createGrid(this, offsetX, 60, gridSize, cellSize, false);

    this.add.text(offsetX + 500, 20, "Opponent's Board", { fontSize: '20px', color: '#ffffff' });
    createGrid(this, offsetX + 500, 60, gridSize, cellSize - 10, true);

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

    
    const lockButton = this.add.text(offsetX + 310, 427, 'Lock Ships', { fontSize: '16px', color: '#ffffff', backgroundColor: '#4CAF50', padding: 8 }).setInteractive();

    lockButton.on('pointerdown', async () => {
        if (!shipsLocked) {
            // Ensure all ships have a position saved in the database
            const allShipsHavePosition = await Promise.all(shipsData.map(async (shipData) => {
                const response = await fetch('/check-ship-position', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ playerId: playerOneId, shipId: shipData.size }),
                });
                const result = await response.json();
                return result.positionFound; // Ensure each ship has a position in the database
            }));
    
            if (allShipsHavePosition.every(hasPosition => hasPosition)) {
                shipsLocked = true;
                lockButton.setAlpha(0.5);
                toggleOrientationButton.setAlpha(0.5);
                toggleOrientationButton.setInteractive(false);
                lockButton.setInteractive(false);
                alert("Ships locked! You can now attack.");
            } else {
                alert("Place all ships on the grid to lock them.");
            }
        }
    });
    

    


    const toggleOrientationButton = this.add.text(offsetX + 310, 470, 'Toggle Orientation', { fontSize: '16px', color: '#ffffff', backgroundColor: '#4CAF50', padding: 8 }).setInteractive();
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

    const statusBox = this.add.text(offsetX + 750, 150, "Hit or Miss", { fontSize: '18px', color: '#ffffff' });
    addControlButtons(this, statusBox, offsetX + 750, 250);
}

function createGrid(scene, x, y, size, cellSize, isClickable) {
   
    for (let col = 0; col < size; col++) {
        const colX = x + col * cellSize + cellSize / 2;
        scene.add.text(colX, y - cellSize / 2, (col + 1).toString(), {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5); 
    }

    
    for (let row = 0; row < size; row++) {
        const rowY = y + row * cellSize + cellSize / 2;
        scene.add.text(x - cellSize / 2, rowY, String.fromCharCode(65 + row), {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center'
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

function snapToHighlight(ship, cellSize) {
    const closestX = Math.round((ship.x + ship.anchorOffsetX) / cellSize) * cellSize;
    const closestY = Math.round((ship.y + ship.anchorOffsetY) / cellSize) * cellSize;

    const finalX = closestX - ship.anchorOffsetX;
    const finalY = closestY - ship.anchorOffsetY;

    const gridStartX = 150 + (cellSize * 2); 
    const gridStartY = 60;
    const gridWidth = cellSize * 10;

    
    if (finalX >= gridStartX && finalX < gridStartX + gridWidth && finalY >= gridStartY && finalY < gridStartY + gridWidth) {
        ship.setPosition(finalX, finalY);

       
        let column = Math.floor((finalX - gridStartX) / cellSize) + 1;
        let row = String.fromCharCode(65 + Math.floor((finalY - gridStartY) / cellSize));
        column = Math.max(1, Math.min(10, column));

        const gridId = `${row}${column}`;
        console.log(`Snapped to grid cell: ${gridId}`);

        const shipId = ship.size; 
        updateShipPositionInDatabase(playerOneId, shipId, gridId, ship.orientation);
    } else {
        alert("Ship placement is outside the grid!");
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
    const buttonConfig = { fontSize: '14px', color: '#ffffff', backgroundColor: '#4CAF50', padding: 8, borderRadius: 5 };

    const attackButton = scene.add.text(x - 35, y + 30, 'Attack', buttonConfig).setInteractive();
    attackButton.on('pointerdown', () => {
        if (shipsLocked) {
            statusBox.setText("Choose a cell to attack!");
        } else {
            alert("Lock your ships first!");
        }
    });

    const restartButton = scene.add.text(x, y + 160, 'Restart Game', buttonConfig).setInteractive();
    restartButton.on('pointerdown', () => {
        alert("Restarting game...");
        statusBox.setText("Game restarted.");
        shipsLocked = false;
        placedShips.length = 0;
        location.reload();
    });

    const endGameButton = scene.add.text(x, y + 200, 'End Game', buttonConfig).setInteractive();
    endGameButton.on('pointerdown', () => {
        alert("Ending game...");
        statusBox.setText("Game ended.");
    });
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
        const response = await fetch('http://localhost:5000/get-test-player-id');
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
        const response = await fetch('http://localhost:5000/get-test-player-id');
        
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


function update() {
    // Placeholder for game loop
}
