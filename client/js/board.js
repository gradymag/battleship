class Board {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 30; // Size of each cell
        this.grid = this.createGrid();
        this.cells = this.createCellGraphics(); // Store cell graphics for highlighting
    }

    createGrid() {
        const grid = [];
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const cell = {
                    x: i * this.gridSize,
                    y: j * this.gridSize,
                    occupied: false
                };
                grid.push(cell);
            }
        }
        return grid;
    }

    createCellGraphics() {
        const graphics = [];
        for (let i = 0; i < this.grid.length; i++) {
            const cell = this.grid[i];
            const rect = this.scene.add.rectangle(cell.x + this.gridSize / 2, cell.y + this.gridSize / 2, this.gridSize - 2, this.gridSize - 2, 0x5c5c5c).setOrigin(0);
            rect.setVisible(false); // Start hidden
            graphics.push(rect);
        }
        return graphics;
    }

    highlightCells(ship) {
        this.resetHighlights(); // Reset highlights before applying new ones
        const closestX = Math.round(ship.x / this.gridSize) * this.gridSize;
        const closestY = Math.round(ship.y / this.gridSize) * this.gridSize;

        const startX = Math.floor(closestX / this.gridSize);
        const startY = Math.floor(closestY / this.gridSize);
        const cellsNeededX = Math.ceil(ship.width / this.gridSize);
        const cellsNeededY = Math.ceil(ship.height / this.gridSize);

        // Highlight cells that the ship will occupy
        for (let i = startX; i < startX + cellsNeededX; i++) {
            for (let j = startY; j < startY + cellsNeededY; j++) {
                const cellIndex = i + j * 10;
                if (this.grid[cellIndex]) {
                    this.cells[cellIndex].setFillStyle(0x0000ff); // Change to blue
                    this.cells[cellIndex].setVisible(true); // Make visible
                }
            }
        }
    }

    resetHighlights() {
        for (let cell of this.cells) {
            cell.setFillStyle(0x5c5c5c); // Reset to original color
            cell.setVisible(false); // Hide the rectangle
        }
    }

    snapToGrid(ship) {
        const closestX = Math.round(ship.x / this.gridSize) * this.gridSize;
        const closestY = Math.round(ship.y / this.gridSize) * this.gridSize;

        const startX = Math.floor(closestX / this.gridSize);
        const startY = Math.floor(closestY / this.gridSize);
        const cellsNeededX = Math.ceil(ship.width / this.gridSize);
        const cellsNeededY = Math.ceil(ship.height / this.gridSize);

        let canPlace = true;
        for (let i = startX; i < startX + cellsNeededX; i++) {
            for (let j = startY; j < startY + cellsNeededY; j++) {
                const cellIndex = i + j * 10;
                if (this.grid[cellIndex] && this.grid[cellIndex].occupied) {
                    canPlace = false; // If any cell is occupied, mark as unable to place
                    break;
                }
            }
        }

        // Place the ship if valid
        if (canPlace) {
            ship.setPosition(closestX, closestY); // Snap ship to the closest grid position
            for (let i = startX; i < startX + cellsNeededX; i++) {
                for (let j = startY; j < startY + cellsNeededY; j++) {
                    const cellIndex = i + j * 10;
                    this.grid[cellIndex].occupied = true; // Mark cell as occupied
                }
            }
        } else {
            ship.setPosition(ship.x, ship.y); // Reset position if not valid
        }
    }
}
