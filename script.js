const GRID_SIZE = 8;
const TILE_SIZE = 40;  
const PREVIEW_TILE_SIZE = 24; 
const GAP = 2;
const BOARD_COLOR = '#34495e'; 
const EMPTY_COLOR = '#2c3e50'; 
const BLOCK_COLOR = '#e74c3c'; 

let grid = []; 
let shapes = []; 
let score = 0;
let isAnimating = false; 

let draggingShape = null; 
let dragOffsetX = 0;
let dragOffsetY = 0;

const ALL_SHAPES = [
    [[1]],
    [[1, 1]], [[1], [1]],
    [[1, 1, 1]], [[1], [1], [1]],
    [[1, 1, 1, 1]], [[1], [1], [1], [1]],
    [[1, 1, 1, 1, 1]], [[1], [1], [1], [1], [1]],

    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1]],
    [[1, 1], [1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],

    [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[1, 1], [1, 0]], [[1, 1], [0, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]],
    [[1, 1, 1], [1, 0, 0]], 
    [[1, 1, 1], [0, 0, 1]],  

    [[1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[0, 1], [1, 1], [0, 1]], 

    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]], 
    [[1, 0], [1, 1], [0, 1]], 
    [[0, 1], [1, 1], [1, 0]],

    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    [[1, 0, 1], [1, 1, 1]],
    [[1, 1, 1], [1, 0, 1]],
    [[1, 1], [1, 0], [1, 0]], 
    [[1, 0], [0, 1]],
    [[0, 1], [1, 0]],
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 0, 1], [0, 1, 0], [1, 0, 0]], 
    [[1, 0, 0], [1, 1, 1], [0, 0, 1]], 
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shapeContainer = document.getElementById('shape-container');
const scoreElement = document.getElementById('score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

function initGame() {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    isAnimating = false;
    updateScore(0);
    gameOverModal.classList.add('hidden');
    generateShapes();
    drawBoard();
    
    if (!window.gameInitialized) {
        bindInputEvents();
        window.gameInitialized = true;
    }
}

restartBtn.addEventListener('click', () => {
    initGame();
});

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            drawCell(r, c, grid[r][c] === 1 ? BLOCK_COLOR : EMPTY_COLOR);
        }
    }
}

function drawCell(r, c, color) {
    let x = c * TILE_SIZE + GAP;
    let y = r * TILE_SIZE + GAP;
    let size = TILE_SIZE - GAP * 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}

function generateShapes() {
    shapeContainer.innerHTML = ''; 
    shapes = [];

    let safeBatch = null;

    for (let attempt = 0; attempt < 10; attempt++) {
        let candidates = [];
        for(let i=0; i<3; i++) {
            candidates.push(ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)]);
        }

        if (isBatchAbsolutelySafe(grid, candidates)) {
            safeBatch = candidates;
            break;
        }
    }

    if (!safeBatch) {
        const smallShapes = ALL_SHAPES.filter(s => getShapeSize(s) <= 2);
        for (let attempt = 0; attempt < 10; attempt++) {
            let candidates = [];
            for(let i=0; i<3; i++) {
                candidates.push(smallShapes[Math.floor(Math.random() * smallShapes.length)]);
            }
            if (isBatchAbsolutelySafe(grid, candidates)) {
                safeBatch = candidates;
                break;
            }
        }
    }

    if (!safeBatch) {
        safeBatch = [[[1]], [[1]], [[1]]];
        if (!isBatchAbsolutelySafe(grid, safeBatch)) {
            showGameOverScreen();
            return;
        }
    }

    for (let i = 0; i < 3; i++) {
        const template = safeBatch[i];
        
        const slot = document.createElement('div');
        slot.className = 'shape-slot';

        const shapeCanvas = document.createElement('canvas');
        const rows = template.length;
        const cols = template[0].length;
        
        shapeCanvas.width = cols * TILE_SIZE;
        shapeCanvas.height = rows * TILE_SIZE;
        shapeCanvas.className = 'shape-preview';
        shapeCanvas.style.width = (cols * PREVIEW_TILE_SIZE) + 'px';
        shapeCanvas.style.height = (rows * PREVIEW_TILE_SIZE) + 'px';
        
        const sCtx = shapeCanvas.getContext('2d');
        sCtx.fillStyle = BLOCK_COLOR;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (template[r][c] === 1) {
                    sCtx.fillRect(c * TILE_SIZE + GAP, r * TILE_SIZE + GAP, TILE_SIZE - GAP*2, TILE_SIZE - GAP*2);
                }
            }
        }

        const shapeObj = {
            id: Date.now() + i,
            data: template,
            element: shapeCanvas,
            rows: rows,
            cols: cols
        };

        slot.appendChild(shapeCanvas);
        shapeContainer.appendChild(slot);
        shapes.push(shapeObj);
    }
}

function getShapeSize(matrix) {
    let count = 0;
    for(let r=0; r<matrix.length; r++) {
        for(let c=0; c<matrix[0].length; c++) {
            if(matrix[r][c]===1) count++;
        }
    }
    return count;
}

function isBatchAbsolutelySafe(currentGrid, batchShapes) {
    let emptyCount = 0;
    for(let r=0; r<GRID_SIZE; r++) for(let c=0; c<GRID_SIZE; c++) if(currentGrid[r][c]===0) emptyCount++;
    if(emptyCount > 50) return true; 

    const gridClone = currentGrid.map(row => [...row]);
    return canSurviveAllPaths(gridClone, batchShapes);
}

function canSurviveAllPaths(simGrid, remainingShapes) {
    if (remainingShapes.length === 0) return true;

    for (let shape of remainingShapes) {
        const moves = getAllValidMoves(simGrid, shape);
        if (moves.length === 0) return false; 
    }

    for (let i = 0; i < remainingShapes.length; i++) {
        const shapeToCheck = remainingShapes[i];
        const otherShapes = remainingShapes.filter((_, index) => index !== i);
        
        const possibleMoves = getAllValidMoves(simGrid, shapeToCheck);
        
        if (possibleMoves.length === 0) return false;

        let movesToCheck = possibleMoves;
        if (movesToCheck.length > 15) {
            movesToCheck = movesToCheck.sort(() => 0.5 - Math.random()).slice(0, 15);
        }

        for (let move of movesToCheck) {
            const nextGrid = applyMoveClone(simGrid, shapeToCheck, move.r, move.c);
            handleLineClearSim(nextGrid);

            if (otherShapes.length > 0) {
                if (!canSurviveAllPaths(nextGrid, otherShapes)) {
                    return false; 
                }
            }
        }
    }

    return true; 
}

function getAllValidMoves(g, shapeMatrix) {
    let moves = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (canPlace(g, shapeMatrix, r, c)) {
                moves.push({r, c});
            }
        }
    }
    return moves;
}

function applyMoveClone(g, shapeMatrix, r, c) {
    let newG = g.map(row => [...row]);
    for (let i = 0; i < shapeMatrix.length; i++) {
        for (let j = 0; j < shapeMatrix[0].length; j++) {
            if (shapeMatrix[i][j] === 1) {
                newG[r + i][c + j] = 1;
            }
        }
    }
    return newG;
}

function handleLineClearSim(g) {
    let rowsToClear = [];
    let colsToClear = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        if (g[r].every(val => val === 1)) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (g[r][c] === 0) { full = false; break; }
        }
        if (full) colsToClear.push(c);
    }

    rowsToClear.forEach(r => g[r].fill(0));
    colsToClear.forEach(c => {
        for(let r=0; r<GRID_SIZE; r++) g[r][c] = 0;
    });
}

function canPlace(currentGrid, matrix, r, c) {
    if (matrix === undefined) { 
        return false;
    }
    
    let g = currentGrid;
    let m = matrix;
    let rr = r;
    let cc = c;

    if (rr + m.length > GRID_SIZE) return false;
    if (cc + m[0].length > GRID_SIZE) return false;

    for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < m[0].length; j++) {
            if (m[i][j] === 1) {
                if (g[rr + i][cc + j] === 1) return false;
            }
        }
    }
    return true;
}

function bindInputEvents() {
    const startDrag = (e) => {
        if (isAnimating) return; 

        const pos = getPointerPos(e);
        const target = document.elementFromPoint(pos.x, pos.y);
        const shape = shapes.find(s => s.element === target);

        if (shape) {
            e.preventDefault();
            draggingShape = shape;
            shape.element.classList.remove('shape-preview');
            shape.element.classList.add('shape-dragging');
            shape.element.style.width = (shape.cols * TILE_SIZE) + 'px';
            shape.element.style.height = (shape.rows * TILE_SIZE) + 'px';
            dragOffsetX = shape.element.width / 2;
            dragOffsetY = shape.element.height / 2;
            moveShape(pos.x, pos.y);
        }
    };

    const moveDrag = (e) => {
        if (!draggingShape) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        moveShape(pos.x, pos.y);
    };

    const endDrag = (e) => {
        if (!draggingShape) return;

        const boardRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / boardRect.width;
        const scaleY = canvas.height / boardRect.height;
        const shapeRect = draggingShape.element.getBoundingClientRect();

        const relativeX = (shapeRect.left - boardRect.left) * scaleX;
        const relativeY = (shapeRect.top - boardRect.top) * scaleY;

        const c = Math.round(relativeX / TILE_SIZE);
        const r = Math.round(relativeY / TILE_SIZE);

        if (r >= 0 && c >= 0 && canPlace(grid, draggingShape.data, r, c)) {
            placeShape(draggingShape.data, r, c);
            draggingShape.element.remove();
            shapes = shapes.filter(s => s !== draggingShape);
            
            const hasLines = checkAndAnimateLines();
            
            if (!hasLines && shapes.length === 0) {
                generateShapes();
            }
        } else {
            resetShapeStyle(draggingShape);
        }

        draggingShape = null;
    };

    document.addEventListener('mousedown', startDrag);
    document.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

function resetShapeStyle(shape) {
    shape.element.classList.remove('shape-dragging');
    shape.element.classList.add('shape-preview');
    shape.element.style.position = '';
    shape.element.style.left = '';
    shape.element.style.top = '';
    shape.element.style.width = (shape.cols * PREVIEW_TILE_SIZE) + 'px';
    shape.element.style.height = (shape.rows * PREVIEW_TILE_SIZE) + 'px';
}

function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function moveShape(x, y) {
    draggingShape.element.style.left = (x - dragOffsetX) + 'px';
    draggingShape.element.style.top = (y - dragOffsetY) + 'px';
}

function placeShape(matrix, r, c) {
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1) {
                grid[r + i][c + j] = 1;
            }
        }
    }
    drawBoard();
}

function showGameOverScreen() {
    finalScoreElement.innerText = score;
    gameOverModal.classList.remove('hidden'); 
}

function checkAndAnimateLines() {
    let linesToClearRows = [];
    let linesToClearCols = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(val => val === 1)) linesToClearRows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === 0) { full = false; break; }
        }
        if (full) linesToClearCols.push(c);
    }

    if (linesToClearRows.length > 0 || linesToClearCols.length > 0) {
        runClearAnimation(linesToClearRows, linesToClearCols);
        return true; 
    }
    return false;
}

function runClearAnimation(rows, cols) {
    isAnimating = true; 
    let opacity = 1.0; 
    
    function animate() {
        opacity -= 0.1; 
        if (opacity <= 0) {
            finalizeClear(rows, cols);
        } else {
            drawBoard(); 
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`; 
            rows.forEach(r => {
                for(let c=0; c<GRID_SIZE; c++) {
                    let x = c * TILE_SIZE + GAP;
                    let y = r * TILE_SIZE + GAP;
                    let size = TILE_SIZE - GAP * 2;
                    ctx.fillRect(x, y, size, size);
                }
            });
            cols.forEach(c => {
                for(let r=0; r<GRID_SIZE; r++) {
                    let x = c * TILE_SIZE + GAP;
                    let y = r * TILE_SIZE + GAP;
                    let size = TILE_SIZE - GAP * 2;
                    ctx.fillRect(x, y, size, size);
                }
            });
            requestAnimationFrame(animate); 
        }
    }
    animate();
}

function finalizeClear(rows, cols) {
    rows.forEach(r => grid[r].fill(0));
    cols.forEach(c => {
        for(let r=0; r<GRID_SIZE; r++) grid[r][c] = 0;
    });

    const totalLines = rows.length + cols.length;
    if (totalLines > 0) {
        score += 10 * Math.pow(totalLines, 2);
    }
    updateScore(score);
    isAnimating = false; 
    drawBoard(); 

    if (shapes.length === 0) {
        generateShapes();
    }
}

function updateScore(s) {
    scoreElement.innerText = `Score: ${s}`;
}

initGame();