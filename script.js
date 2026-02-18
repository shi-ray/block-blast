// --- script.js (V3: 修正錯位與縮放版) ---

// --- 1. 參數設定 ---
const GRID_SIZE = 8;
const TILE_SIZE = 40; 
const GAP = 2;
const BOARD_COLOR = '#34495e'; 
const EMPTY_COLOR = '#2c3e50'; 
const BLOCK_COLOR = '#e74c3c'; 

// --- 2. 遊戲狀態 ---
let grid = []; 
let shapes = []; 
let score = 0;

// 拖曳相關變數
let draggingShape = null; 
let dragOffsetX = 0;
let dragOffsetY = 0;

// 方塊形狀定義
const SHAPE_TEMPLATES = [
    [[1]], 
    [[1, 1, 1, 1]], 
    [[1], [1], [1], [1]], 
    [[1, 1], [1, 1]], 
    [[1, 0], [1, 0], [1, 1]], 
    [[0, 1, 0], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]], 
    [[0, 1, 1], [1, 1, 0]]
];

// --- 3. DOM 元素 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shapeContainer = document.getElementById('shape-container');
const scoreElement = document.getElementById('score');

// --- 4. 初始化 ---
function initGame() {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    updateScore(0);
    generateShapes();
    drawBoard();
    bindInputEvents();
}

// --- 5. 繪圖邏輯 ---
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let x = c * TILE_SIZE + GAP;
            let y = r * TILE_SIZE + GAP;
            let size = TILE_SIZE - GAP * 2;
            ctx.fillStyle = grid[r][c] === 1 ? BLOCK_COLOR : EMPTY_COLOR;
            ctx.fillRect(x, y, size, size);
        }
    }
}

// --- 6. 方塊生成 ---
function generateShapes() {
    shapeContainer.innerHTML = ''; 
    shapes = [];

    for (let i = 0; i < 3; i++) {
        const template = SHAPE_TEMPLATES[Math.floor(Math.random() * SHAPE_TEMPLATES.length)];
        const shapeCanvas = document.createElement('canvas');
        const rows = template.length;
        const cols = template[0].length;
        
        shapeCanvas.width = cols * TILE_SIZE;
        shapeCanvas.height = rows * TILE_SIZE;
        shapeCanvas.className = 'shape-preview';
        
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

        shapeContainer.appendChild(shapeCanvas);
        shapes.push(shapeObj);
    }
}

// --- 7. 拖曳與放置核心邏輯 (修正版) ---
function bindInputEvents() {
    const startDrag = (e) => {
        const pos = getPointerPos(e);
        const target = document.elementFromPoint(pos.x, pos.y);
        const shape = shapes.find(s => s.element === target);

        if (shape) {
            e.preventDefault();
            draggingShape = shape;
            
            shape.element.classList.remove('shape-preview');
            shape.element.classList.add('shape-dragging');
            
            // === 修改開始 ===
            // 舊程式碼是計算 offset，我們改為直接抓取方塊中心
            // shape.element.width 是方塊的實際寬度 (因為我們是用 canvas 畫的)
            dragOffsetX = shape.element.width / 2;
            dragOffsetY = shape.element.height / 2;

            // (選用) 如果想要方塊出現在手指上方一點點(才不會被手擋住)，可以把 Y 再多減一點
            // dragOffsetY += 50; 
            // === 修改結束 ===

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

        // 修正步驟 C: 取得畫布目前的縮放比例 (解決 RWD 錯位問題)
        // 因為手機上畫布可能只有 300px 寬，但內部邏輯是 320px
        const boardRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / boardRect.width;
        const scaleY = canvas.height / boardRect.height;

        const shapeRect = draggingShape.element.getBoundingClientRect();

        // 計算相對於畫布左上角的座標 (並乘上縮放比例)
        const relativeX = (shapeRect.left - boardRect.left) * scaleX;
        const relativeY = (shapeRect.top - boardRect.top) * scaleY;

        // 轉換成網格索引
        // 這裡加上 TILE_SIZE / 2 是為了讓判定更寬容 (以方塊中心點為主)
        // 但最精準的是直接除
        const c = Math.round(relativeX / TILE_SIZE);
        const r = Math.round(relativeY / TILE_SIZE);

        if (canPlace(draggingShape.data, r, c)) {
            placeShape(draggingShape.data, r, c);
            draggingShape.element.remove();
            shapes = shapes.filter(s => s !== draggingShape);
            checkLines();
            if (shapes.length === 0) generateShapes();
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

function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function moveShape(x, y) {
    // 這裡直接設定 left/top，會依賴 position: fixed (在 CSS .shape-dragging 定義)
    // 為了確保位置正確，我們將其提升到 body 層級或確保它是 fixed
    draggingShape.element.style.left = (x - dragOffsetX) + 'px';
    draggingShape.element.style.top = (y - dragOffsetY) + 'px';
}

function resetShapeStyle(shape) {
    shape.element.classList.remove('shape-dragging');
    shape.element.classList.add('shape-preview');
    shape.element.style.left = '';
    shape.element.style.top = '';
}

// --- 8. 遊戲規則 ---
function canPlace(matrix, r, c) {
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1) {
                let targetR = r + i;
                let targetC = c + j;
                if (targetR < 0 || targetR >= GRID_SIZE || targetC < 0 || targetC >= GRID_SIZE || grid[targetR][targetC] === 1) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placeShape(matrix, r, c) {
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1) {
                grid[r + i][c + j] = 1;
            }
        }
    }
    score += 10;
    updateScore(score);
    drawBoard();
}

function checkLines() {
    let linesCleared = 0;
    
    // 檢查橫排
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(val => val === 1)) {
            grid[r].fill(0);
            linesCleared++;
        }
    }

    // 檢查直排
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            for (let r = 0; r < GRID_SIZE; r++) {
                grid[r][c] = 0;
            }
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        score += linesCleared * 100;
        updateScore(score);
        drawBoard();
    }
}

function updateScore(s) {
    scoreElement.innerText = `Score: ${s}`;
}

initGame();