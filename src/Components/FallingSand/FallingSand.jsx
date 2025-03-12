import react from 'react';
import { ReactP5Wrapper } from "@p5-wrapper/react";
import './css/FallingSand.css';
function gen2DArray(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function inBoundsRows(i, rows) {
    return i >= 0 && i < rows;
}

function inBoundsCols(i, cols) {
    return i >= 0 && i < cols;
}

function sketch(p5) {
    let grid, velocityGrid;
    let sandSize = 5;
    let rows = Math.floor(400 / sandSize);
    let cols = Math.floor(400 / sandSize);
    let sandColor = 200;
    let gravity = 0.1;
    p5.setup = () => {
        p5.createCanvas(400, 400);
        p5.colorMode(p5.HSB, 360, 255, 255);
        grid = gen2DArray(rows, cols);
        velocityGrid = gen2DArray(rows, cols);
    };
    p5.draw = () => {
        p5.background(0);
        if (p5.mouseIsPressed) {
            let mCol = Math.floor(p5.mouseX / sandSize);
            let mRow = Math.floor(p5.mouseY / sandSize);
            let disperse = Math.floor(sandSize / 2);
            for (let i = -disperse; i <= disperse; i++) {
                for (let j = -disperse; j <= disperse; j++) {
                    if (p5.random(1) < .75) {
                        let row = mRow + i;
                        let col = mCol + j;
                        if (inBoundsRows(row, rows) && inBoundsCols(col, cols)) {
                            grid[row][col] = sandColor;
                            velocityGrid[row][col] = 1;
                        }
                    }
                }
            }
            sandColor += 0.5;
            if (sandColor > 360) {
                sandColor = 1;
            }
        }

        //render sand
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                p5.noStroke();
                if (grid[i][j] > 0) {
                    p5.fill(grid[i][j], 255, 255);
                    p5.square(j * sandSize, i * sandSize, sandSize);
                }
            }
        }
        //animation
        let updatedGrid = gen2DArray(rows, cols);
        let updatedVelocityGrid = gen2DArray(rows, cols);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let gridState = grid[i][j];
                let velocity = velocityGrid[i][j];
                let moved = false;
                if (gridState > 0) {
                    let newPos = p5.int(i + velocity);
                    for (let y = newPos; y > i; y--) {
                        if (!inBoundsRows(y, rows)) {
                            break;
                        }
                        let below = grid[y][j];
                        let dir = 1;
                        if (p5.random(1) < .5) {
                            dir *= -1;
                        }
                        let belowA = -1;
                        let belowB = -1;
                        if (inBoundsCols(j + dir, cols)) {
                            belowA = grid[y][j + dir];
                        }
                        if (inBoundsCols(j - dir, cols)) {
                            belowB = grid[y][j - dir];
                        }
                        if (below === 0) {
                            updatedGrid[y][j] = gridState;
                            updatedVelocityGrid[y][j] = velocity + gravity;
                            moved = true;
                            break;
                        }
                        else if (belowA === 0) {
                            updatedGrid[y][j + dir] = gridState;
                            updatedVelocityGrid[y][j + dir] = velocity + gravity;
                            moved = true;
                            break;
                        }
                        else if (belowB === 0) {
                            updatedGrid[y][j - dir] = gridState;
                            updatedVelocityGrid[y][j - dir] = velocity + gravity;
                            moved = true;
                            break;
                        }
                    }
                }
                if (gridState > 0 && !moved) {
                    updatedGrid[i][j] = grid[i][j];
                    updatedVelocityGrid[i][j] = velocityGrid[i][j] + gravity;
                }
            }
        }
        grid = updatedGrid;
        velocityGrid = updatedVelocityGrid;
    }
}
function FallingSand() {

    return (
        <>
            <div className="falling-sand">
                <ReactP5Wrapper sketch={sketch} />;
            </div>
        </>

    );
}

export default FallingSand;