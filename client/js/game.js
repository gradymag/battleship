const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    backgroundColor: '#2b2b2b',
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

const game = new Phaser.Game(config);

let shipsLocked = false;
const placedShips = []; //Stores placed ship data
const grid = []; //Stores grid cell info

function preload() {
    //Load ship image
    this.load.image('ship2', 'images/ShipBattleshipHull.png');
}

function create() {
    const cellSize = 30;
    const gridSize = 10; //For both grids
    const offsetX = 150; //Center grid horizontally

    //Player's Grid
    this.add.text(offsetX, 20, "Your Board", { fontSize: '20px', color: '#ffffff' });
    createGrid(this, offsetX, 60, gridSize, cellSize, false);

    //Opponent's Grid
    this.add.text(offsetX + 400, 20, "Opponent's Board", { fontSize: '20px', color: '#ffffff' });
    createGrid(this, offsetX + 400, 60, gridSize, cellSize - 10, true); // Smaller cells for the opponent

    //Draggable ship
    const ship = this.add.image(offsetX + 30, 500, 'ship2').setInteractive();
    this.input.setDraggable(ship);
    ship.size = 7; //Hardcoded int size
    ship.anchorOffsetX = -15; //Set anchor point (x-offset)
    ship.anchorOffsetY = -105; //Set anchor point (y-offset)
    ship.orientation = 'vertical'; //Initial orientation

    // Handle dragging the ship
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (!shipsLocked) {
            gameObject.x = dragX;
            gameObject.y = dragY;
            highlightCells(gameObject, cellSize); 
        }
    });

    
    this.input.on('dragend', (pointer, gameObject) => {
        if (!shipsLocked) {
            snapToHighlight(gameObject, cellSize); 
        }
    });

    //Lock ships button
    const lockButton = this.add.text(offsetX + 310, 327, 'Lock Ships', { fontSize: '16px', color: '#ffffff', backgroundColor: '#4CAF50', padding: 8 }).setInteractive();
    lockButton.on('pointerdown', () => {
        if (!shipsLocked) {
            if (validateShipPlacement(ship)) {
                shipsLocked = true;
                lockButton.setAlpha(0.5); 
                lockButton.setInteractive(false);
                alert("Ships locked! You can now attack.");
            } else {
                alert("Invalid ship placement!");
            }
        }
    });

    // Status box
    const statusBox = this.add.text(offsetX + 650, 100, "Hit or Miss", { fontSize: '18px', color: '#ffffff' });
    addControlButtons(this, statusBox, offsetX + 650, 200);
}

function createGrid(scene, x, y, size, cellSize, isClickable) {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cellX = x + col * cellSize;
            const cellY = y + row * cellSize;
            const cell = scene.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, 0x5c5c5c).setOrigin(0);
            cell.id = String.fromCharCode(65 + col) + (row + 1); // Unique IDs for grid

            if (isClickable) {
                cell.setInteractive();
                cell.on('pointerdown', () => {
                    cell.setFillStyle(0xff0000); // Attack feedback
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

    //Calculate closest grid position based on ship anchor
    const closestX = Math.round((ship.x + ship.anchorOffsetX) / cellSize) * cellSize;
    const closestY = Math.round((ship.y + ship.anchorOffsetY) / cellSize) * cellSize;

    const startColumnIndex = Math.floor((closestX - 150) / cellSize); 
    const startRowIndex = Math.floor((closestY - 60) / cellSize); 

    //highlight cells based on orientation
    for (let i = 0; i < ship.size; i++) {
        const cellIndex = ship.orientation === 'horizontal'
            ? (startColumnIndex + i) + startRowIndex * 10
            : startColumnIndex + (startRowIndex + i) * 10; // Adjust for vertical

        if (cellIndex >= 0 && cellIndex < 100) { // Check within bounds
            grid[cellIndex].setFillStyle(0x0000ff); // Highlight
        }
    }
}
    //highlight snap to cell
function snapToHighlight(ship, cellSize) {
    const closestX = Math.round((ship.x + ship.anchorOffsetX) / cellSize) * cellSize; 
    const closestY = Math.round((ship.y + ship.anchorOffsetY) / cellSize) * cellSize; 

    const anchorOffsetX = ship.anchorOffsetX; 
    const anchorOffsetY = ship.anchorOffsetY; 

    const finalX = closestX - anchorOffsetX;
    const finalY = closestY - anchorOffsetY;

    //Ensure ship is within bounds
    if (finalX >= 150 && finalX < 150 + (cellSize * 10) && finalY >= 60 && finalY < 60 + (cellSize * 10)) {
        ship.setPosition(finalX, finalY); 
        placedShips.push({ x: finalX, y: finalY, id: grid[closestX / cellSize + (closestY / cellSize - 60 / cellSize) * 10].id }); // Store placed ship's grid position
    } else {
        alert("Ship placement is outside the grid!");
    }
}

//Validate ship placement
function validateShipPlacement(ship) {
    const closestX = Math.round((ship.x + ship.anchorOffsetX) / 30) * 30;
    const closestY = Math.round((ship.y + ship.anchorOffsetY) / 30) * 30;

    const startColumnIndex = Math.floor((closestX - 150) / 30);
    const startRowIndex = Math.floor((closestY - 60) / 30);
    
    let highlightedCellsCount = 0;

    for (let i = 0; i < ship.size; i++) {
        const cellIndex = ship.orientation === 'horizontal'
            ? (startColumnIndex + i) + startRowIndex * 10
            : startColumnIndex + (startRowIndex + i) * 10;

        if (cellIndex >= 0 && cellIndex < grid.length) {
            if (grid[cellIndex].fillColor === 0x0000ff) { //Check if highlighted
                highlightedCellsCount++;
            }
        }
    }

    return highlightedCellsCount === ship.size; //Validate size match
}

function addControlButtons(scene, statusBox, x, y) {
    const buttonConfig = { fontSize: '14px', color: '#ffffff', backgroundColor: '#4CAF50', padding: 8, borderRadius: 5 };

    //Attack button
    const attackButton = scene.add.text(x - 35, y + 30, 'Attack', buttonConfig).setInteractive();
    attackButton.on('pointerdown', () => {
        if (shipsLocked) {
            statusBox.setText("Choose a cell to attack!");
        } else {
            alert("Lock your ships first!");
        }
    });

    //Restart button
    const restartButton = scene.add.text(x, y + 160, 'Restart Game', buttonConfig).setInteractive();
    restartButton.on('pointerdown', () => {
        alert("Restarting game...");
        statusBox.setText("Game restarted.");
        shipsLocked = false; // Reset ship lock status
        placedShips.length = 0; // Clear placed ships
        location.reload(); // Reload the game
    });

    //End Game button
    const endGameButton = scene.add.text(x, y + 200, 'End Game', buttonConfig).setInteractive();
    endGameButton.on('pointerdown', () => {
        alert("Ending game...");
        statusBox.setText("Game ended.");
    });
}

function update() {
    //Placeholder for game loop
}
