// --- script.js (V28: 單雙擊共存 + 亮色模式 + 全體旋轉版) ---

const GRID_SIZE = 8;
const TILE_SIZE = 40;  
const PREVIEW_TILE_SIZE = 24; 
const GAP = 2;

// 【修改】為了能動態切換亮色/深色主題，將 const 改為 let
let BOARD_COLOR = '#34495e'; 
let EMPTY_COLOR = '#2c3e50'; 
let isLightTheme = false; // 記錄目前的主題狀態

const FINGER_OFFSET = 80; 

const PATTERN_PROBABILITY = 0.15; 
const specialImg = new Image();
specialImg.src = 'icon.png'; 

const COLORS = [
    '#e74c3c', '#e67e22', '#2ecc71', '#3498db', '#9b59b6'  
];

let grid = []; 
let specialGrid = []; 
let shapes = []; 
let score = 0;
let isAnimating = false; 
let firstGenerationMode = true;

let highestZIndex = 100; 

let draggingShape = null; 
let dragOffsetX = 0;
let dragOffsetY = 0;

let previewR = -1;
let previewC = -1;
let isPreviewValid = false;

let previewClearRows = [];
let previewClearCols = [];

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
    [[1, 0, 0], [1, 1, 1], [0, 0, 1]] 
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
    specialGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    isAnimating = false;
    firstGenerationMode = true;
    updateScore(0);
    gameOverModal.classList.add('hidden');
    
    document.querySelectorAll('.sticker').forEach(el => el.remove());
    
    generateShapes(); 
    drawBoard();
    
    if (!window.gameInitialized) {
        bindInputEvents();
        bindTitleTaps(); 
        bindScoreTaps(); 
        window.gameInitialized = true;
    }
}

restartBtn.addEventListener('click', () => {
    initGame();
});

// --- 新增：切換主題函數 ---
function toggleTheme() {
    isLightTheme = !isLightTheme;
    if (isLightTheme) {
        document.body.classList.add('light-theme');
        BOARD_COLOR = '#bdc3c7'; // 亮色系網格邊框
        EMPTY_COLOR = '#ecf0f1'; // 亮色系網格底色
    } else {
        document.body.classList.remove('light-theme');
        BOARD_COLOR = '#34495e'; // 原本的深色
        EMPTY_COLOR = '#2c3e50'; 
    }
    drawBoard(); // 重新繪製畫布以套用新顏色
}

// --- 更新：標題單擊(切換主題)與雙擊(隱藏) ---
function bindTitleTaps() {
    const titleElement = document.querySelector('.header h1');
    if (!titleElement) return;
    
    let lastTapTime = 0;
    let clickTimer = null;

    const handleTitleTap = (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength > 0 && tapLength < 300) {
            // 雙擊成立，取消等待單擊的計時器
            clearTimeout(clickTimer);
            document.body.classList.toggle('hide-stickers');
            lastTapTime = 0; 
            if (window.getSelection) window.getSelection().removeAllRanges();
        } else {
            // 可能是單擊，等待 300 毫秒看有沒有第二下
            lastTapTime = currentTime;
            clickTimer = setTimeout(() => {
                toggleTheme(); // 單擊動作
                lastTapTime = 0;
            }, 300);
        }
    };
    
    // 使用 pointerdown 取代 touch/mouse 避免手機雙重觸發
    titleElement.addEventListener('pointerdown', handleTitleTap);
}

// --- 更新：分數單擊(全體旋轉)與雙擊(洗牌) ---
function bindScoreTaps() {
    if (!scoreElement) return;
    
    let lastTapTime = 0;
    let clickTimer = null;

    const handleScoreTap = (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength > 0 && tapLength < 300) {
            // 雙擊成立：洗牌
            clearTimeout(clickTimer);
            const stickers = document.querySelectorAll('.sticker');
            stickers.forEach(el => {
                el.classList.add('shuffling');
                const pos = getRandomValidPosition(TILE_SIZE);
                el.style.left = pos.x + 'px';
                el.style.top = pos.y + 'px';
                setTimeout(() => el.classList.remove('shuffling'), 500);
            });
            lastTapTime = 0;
            if (window.getSelection) window.getSelection().removeAllRanges();
        } else {
            // 單擊成立：全體旋轉
            lastTapTime = currentTime;
            clickTimer = setTimeout(() => {
                const stickers = document.querySelectorAll('.sticker');
                stickers.forEach(el => {
                    el.classList.add('spinning'); // 掛上長動畫
                    
                    // 讀取該圖片目前的旋轉角度並 +360
                    let currentRot = parseFloat(el.dataset.rot || 0);
                    currentRot += 360;
                    
                    // 寫回 DOM 與 CSS 變數
                    el.dataset.rot = currentRot;
                    el.style.setProperty('--rot', currentRot + 'deg');
                    
                    // 800 毫秒後拔掉長動畫，恢復原本拖曳時的短動畫手感
                    setTimeout(() => el.classList.remove('spinning'), 800);
                });
                lastTapTime = 0;
            }, 300);
        }
    };
    
    scoreElement.addEventListener('pointerdown', handleScoreTap);
}

function getRandomValidPosition(size) {
    const gameContainer = document.getElementById('game-container');
    const rect = gameContainer.getBoundingClientRect();

    let x = 0, y = 0;
    let overlap = true;
    let attempts = 0;
    const padding = 10; 

    while (overlap && attempts < 100) {
        x = padding + Math.random() * (window.innerWidth - size - padding * 2);
        y = padding + Math.random() * (window.innerHeight - size - padding * 2);

        if (x < rect.right && x + size > rect.left &&
            y < rect.bottom && y + size > rect.top) {
            overlap = true;
        } else {
            overlap = false;
        }
        attempts++;
    }
    return { x, y };
}

function updatePreviewClears(r, c, matrix) {
    previewClearRows = [];
    previewClearCols = [];
    if (!isPreviewValid) return;

    let tempGrid = grid.map(row => [...row]);
    
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1) {
                tempGrid[r + i][c + j] = 1; 
            }
        }
    }

    for (let row = 0; row < GRID_SIZE; row++) {
        if (tempGrid[row].every(val => val !== 0)) previewClearRows.push(row);
    }
    for (let col = 0; col < GRID_SIZE; col++) {
        let full = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            if (tempGrid[row][col] === 0) { full = false; break; }
        }
        if (full) previewClearCols.push(col);
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let cellValue = grid[r][c];
            let isToBeCleared = cellValue !== 0 && (previewClearRows.includes(r) || previewClearCols.includes(c));
            let drawImg = specialGrid[r][c] === 1;
            drawCell(r, c, cellValue !== 0 ? cellValue : EMPTY_COLOR, isToBeCleared ? '#ffffff' : null, drawImg);
        }
    }

    if (draggingShape && isPreviewValid) {
        ctx.globalAlpha = 0.5;
        const matrix = draggingShape.data;
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[0].length; j++) {
                if (matrix[i][j] === 1) {
                    let drawImg = draggingShape.specialCell && draggingShape.specialCell.r === i && draggingShape.specialCell.c === j;
                    drawCell(previewR + i, previewC + j, draggingShape.color, null, drawImg);
                }
            }
        }
        ctx.globalAlpha = 1.0; 
    }
}

function drawCell(r, c, color, borderColor = null, drawImg = false) {
    let x = c * TILE_SIZE + GAP;
    let y = r * TILE_SIZE + GAP;
    let size = TILE_SIZE - GAP * 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);

    if (drawImg && specialImg.complete && specialImg.naturalWidth !== 0) {
        ctx.drawImage(specialImg, x, y, size, size);
    }

    if (borderColor) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }
}

function calculateGridPosition(pointerX, pointerY) {
    const boardRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / boardRect.width;
    const scaleY = canvas.height / boardRect.height;
    
    const relativeX = (pointerX - dragOffsetX - boardRect.left) * scaleX;
    const relativeY = (pointerY - dragOffsetY - boardRect.top) * scaleY;

    const c = Math.round(relativeX / TILE_SIZE);
    const r = Math.round(relativeY / TILE_SIZE);
    return { r, c };
}

function bindInputEvents() {
    const startDrag = (e) => {
        if (isAnimating) return; 

        const pos = getPointerPos(e);
        const target = document.elementFromPoint(pos.x, pos.y);
        const shape = shapes.find(s => s.slot === target || s.slot.contains(target));

        if (shape) {
            e.preventDefault();
            draggingShape = shape;
            shape.element.classList.remove('shape-preview');
            shape.element.classList.add('shape-dragging');
            
            shape.element.style.width = (shape.cols * TILE_SIZE) + 'px';
            shape.element.style.height = (shape.rows * TILE_SIZE) + 'px';
            
            dragOffsetX = shape.element.width / 2;
            dragOffsetY = (shape.element.height / 2) + FINGER_OFFSET;
            moveShape(pos.x, pos.y);

            const gridPos = calculateGridPosition(pos.x, pos.y);
            previewR = gridPos.r;
            previewC = gridPos.c;
            isPreviewValid = canPlace(grid, draggingShape.data, previewR, previewC);
            
            updatePreviewClears(previewR, previewC, draggingShape.data);
            drawBoard();
        }
    };

    const moveDrag = (e) => {
        if (!draggingShape) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        moveShape(pos.x, pos.y);

        const gridPos = calculateGridPosition(pos.x, pos.y);
        if (gridPos.r !== previewR || gridPos.c !== previewC) {
            previewR = gridPos.r;
            previewC = gridPos.c;
            isPreviewValid = canPlace(grid, draggingShape.data, previewR, previewC);
            
            updatePreviewClears(previewR, previewC, draggingShape.data);
            drawBoard(); 
        }
    };

    const endDrag = (e) => {
        if (!draggingShape) return;
        
        const r = previewR;
        const c = previewC;

        if (r >= 0 && c >= 0 && isPreviewValid) {
            placeShape(draggingShape, r, c);
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
        previewR = -1;
        previewC = -1;
        isPreviewValid = false;
        
        previewClearRows = [];
        previewClearCols = [];
        
        if (!isAnimating) {
            drawBoard();
        }
    };

    document.addEventListener('mousedown', startDrag);
    document.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

function generateShapes() {
    shapeContainer.innerHTML = ''; 
    shapes = [];

    let safeBatch = null;

    for (let attempt = 0; attempt < 15; attempt++) {
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
        const smallShapes = ALL_SHAPES.filter(s => getShapeSize(s) <= 3);
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

    let availableColors = [...COLORS];
    availableColors.sort(() => 0.5 - Math.random()); 
    let chosenColors = [availableColors[0], availableColors[1], availableColors[2]];

    let guaranteedIconIndex = -1;
    if (firstGenerationMode) {
        guaranteedIconIndex = Math.floor(Math.random() * 3);
        firstGenerationMode = false;
    }

    for (let i = 0; i < 3; i++) {
        const template = safeBatch[i];
        const shapeColor = chosenColors[i]; 
        
        let specialCell = null;
        let shouldHaveIcon = false;

        if (guaranteedIconIndex !== -1) {
            shouldHaveIcon = (i === guaranteedIconIndex);
        } else {
            shouldHaveIcon = (Math.random() < PATTERN_PROBABILITY);
        }

        if (shouldHaveIcon) {
            let ones = [];
            for(let r=0; r<template.length; r++) {
                for(let c=0; c<template[0].length; c++) {
                    if(template[r][c] === 1) ones.push({r, c});
                }
            }
            if(ones.length > 0) {
                specialCell = ones[Math.floor(Math.random() * ones.length)];
            }
        }

        const slot = document.createElement('div');
        slot.className = 'shape-slot';

        const shapeCanvas = document.createElement('canvas');
        const rows = template.length;
        const cols = template[0].length;
        
        shapeCanvas.width = cols * TILE_SIZE;
        shapeCanvas.height = rows * TILE_SIZE;
        shapeCanvas.className = 'shape-preview';
        
        let previewScale = PREVIEW_TILE_SIZE;
        if (cols > 3 || rows > 3) {
            previewScale = 18; 
        }
        
        shapeCanvas.style.width = (cols * previewScale) + 'px';
        shapeCanvas.style.height = (rows * previewScale) + 'px';
        
        const sCtx = shapeCanvas.getContext('2d');
        sCtx.fillStyle = shapeColor; 
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (template[r][c] === 1) {
                    let cellX = c * TILE_SIZE + GAP;
                    let cellY = r * TILE_SIZE + GAP;
                    let cellSize = TILE_SIZE - GAP*2;
                    sCtx.fillRect(cellX, cellY, cellSize, cellSize);
                    
                    if (specialCell && specialCell.r === r && specialCell.c === c) {
                        if (specialImg.complete && specialImg.naturalWidth !== 0) {
                            sCtx.drawImage(specialImg, cellX, cellY, cellSize, cellSize);
                        } else {
                            specialImg.onload = () => {
                                sCtx.drawImage(specialImg, cellX, cellY, cellSize, cellSize);
                            };
                        }
                    }
                }
            }
        }

        const shapeObj = {
            id: Date.now() + i,
            data: template,
            element: shapeCanvas,
            slot: slot, 
            rows: rows,
            cols: cols,
            previewScale: previewScale,
            color: shapeColor,
            specialCell: specialCell 
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
    if(emptyCount > 55) return true; 

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
        if (movesToCheck.length > 12) {
            movesToCheck = movesToCheck.sort(() => 0.5 - Math.random()).slice(0, 12);
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
        if (g[r].every(val => val !== 0)) rowsToClear.push(r);
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
    
    if (r + m.length > GRID_SIZE) return false;
    if (c + m[0].length > GRID_SIZE) return false;

    for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < m[0].length; j++) {
            if (m[i][j] === 1) {
                if (g[r + i][c + j] !== 0) return false;
            }
        }
    }
    return true;
}

function resetShapeStyle(shape) {
    shape.element.classList.remove('shape-dragging');
    shape.element.classList.add('shape-preview');
    shape.element.style.position = '';
    shape.element.style.left = '';
    shape.element.style.top = '';
    shape.element.style.width = (shape.cols * (shape.previewScale || PREVIEW_TILE_SIZE)) + 'px';
    shape.element.style.height = (shape.rows * (shape.previewScale || PREVIEW_TILE_SIZE)) + 'px';
}

function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function moveShape(x, y) {
    draggingShape.element.style.left = (x - dragOffsetX) + 'px';
    draggingShape.element.style.top = (y - dragOffsetY) + 'px';
}

function placeShape(shapeObj, r, c) {
    const matrix = shapeObj.data;
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1) {
                grid[r + i][c + j] = shapeObj.color;
                if (shapeObj.specialCell && shapeObj.specialCell.r === i && shapeObj.specialCell.c === j) {
                    specialGrid[r + i][c + j] = 1;
                }
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
        if (grid[r].every(val => val !== 0)) linesToClearRows.push(r);
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
    let cellsToClear = new Set();
    
    rows.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) {
            cellsToClear.add(`${r},${c}`);
        }
    });
    
    cols.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) {
            cellsToClear.add(`${r},${c}`);
        }
    });

    let iconsCleared = 0;
    
    cellsToClear.forEach(coord => {
        let parts = coord.split(',');
        let r = parseInt(parts[0]);
        let c = parseInt(parts[1]);
        
        if (specialGrid[r][c] === 1) {
            iconsCleared++;
        }
        
        grid[r][c] = 0;
        specialGrid[r][c] = 0;
    });

    if (iconsCleared > 0) {
        score += iconsCleared;
        updateScore(score);
        
        for (let i = 0; i < iconsCleared; i++) {
            spawnSticker();
        }
    }
    
    isAnimating = false; 
    drawBoard(); 

    if (shapes.length === 0) {
        generateShapes();
    }
}

function spawnSticker() {
    const img = document.createElement('img');
    img.src = specialImg.src;
    img.className = 'sticker';
    
    // 【修改】將初始旋轉記錄寫入 DOM
    img.dataset.rot = "0"; 

    const size = TILE_SIZE; 
    img.style.width = size + 'px';
    img.style.height = size + 'px';

    const pos = getRandomValidPosition(size);

    img.style.left = pos.x + 'px';
    img.style.top = pos.y + 'px';
    highestZIndex++;
    img.style.zIndex = highestZIndex;
    document.body.appendChild(img);

    makeStickerDraggable(img);
}

function makeStickerDraggable(el) {
    let startX, startY, initialLeft, initialTop;
    let lastTapTime = 0;     

    const startDrag = (e) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength > 0 && tapLength < 300) {
            // 【修改】透過 dataset 讀寫，以與單擊全體旋轉功能保持同步
            let currentRotation = parseFloat(el.dataset.rot || 0);
            currentRotation += 45;
            el.dataset.rot = currentRotation;
            el.style.setProperty('--rot', currentRotation + 'deg');
            lastTapTime = 0; 
            return; 
        }
        lastTapTime = currentTime;

        highestZIndex++;
        el.style.zIndex = highestZIndex;

        const pos = getPointerPos(e);
        startX = pos.x;
        startY = pos.y;
        initialLeft = parseFloat(el.style.left) || 0;
        initialTop = parseFloat(el.style.top) || 0;

        const moveDrag = (moveEvent) => {
            moveEvent.preventDefault();
            const movePos = getPointerPos(moveEvent);
            const dx = movePos.x - startX;
            const dy = movePos.y - startY;
            el.style.left = (initialLeft + dx) + 'px';
            el.style.top = (initialTop + dy) + 'px';
        };

        const endDrag = () => {
            document.removeEventListener('mousemove', moveDrag);
            document.removeEventListener('touchmove', moveDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);
        };

        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('touchmove', moveDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    };

    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDrag, { passive: false });
}

function updateScore(s) {
    scoreElement.innerText = `Score: ${s}`;
}

initGame();