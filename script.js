// --- script.js (完整遊戲版) ---

// --- 1. 參數設定 ---
const GRID_SIZE = 8;
const TILE_SIZE = 40; // 格子大小 (必須與 canvas width/8 一致)
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
let startX = 0;
let startY = 0;

// 方塊形狀定義 (矩陣)
const SHAPE_TEMPLATES = [
    [[1]], 
    [[1, 1, 1, 1]], 
    [[1], [1], [1], [1]], 
    [[1, 1], [1, 1]], 
    [[1, 0], [1, 0], [1, 1]], 
    [[0, 1, 0], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]], // Z型
    [[0, 1, 1], [1, 1, 0]]  // S型
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
    
    // 畫背景
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let x = c * TILE_SIZE + GAP;
            let y = r * TILE_SIZE + GAP;
            let size = TILE_SIZE - GAP * 2;
            
            // 畫格子：1是紅色，0是深色
            ctx.fillStyle = grid[r][c] === 1 ? BLOCK_COLOR : EMPTY_COLOR;
            ctx.fillRect(x, y, size, size);
        }
    }
}

// --- 6. 方塊生成與管理 ---
function generateShapes() {
    shapeContainer.innerHTML = ''; 
    shapes = [];

    for (let i = 0; i < 3; i++) {
        const template = SHAPE_TEMPLATES[Math.floor(Math.random() * SHAPE_TEMPLATES.length)];
        
        // 建立方塊 Canvas
        const shapeCanvas = document.createElement('canvas');
        const rows = template.length;
        const cols = template[0].length;
        
        // 這裡我們用和主畫布一樣的 TILE_SIZE (40)，這樣拖上去時大小才會剛好
        shapeCanvas.width = cols * TILE_SIZE;
        shapeCanvas.height = rows * TILE_SIZE;
        shapeCanvas.className = 'shape-preview';
        
        // 畫出小方塊
        const sCtx = shapeCanvas.getContext('2d');
        sCtx.fillStyle = BLOCK_COLOR;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (template[r][c] === 1) {
                    sCtx.fillRect(c * TILE_SIZE + GAP, r * TILE_SIZE + GAP, TILE_SIZE - GAP*2, TILE_SIZE - GAP*2);
                }
            }
        }

        // 綁定資料
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

// --- 7. 拖曳與放置核心邏輯 ---
function bindInputEvents() {
    const startDrag = (e) => {
        const pos = getPointerPos(e);
        const target = document.elementFromPoint(pos.x, pos.y);
        const shape = shapes.find(s => s.element === target);

        if (shape) {
            e.preventDefault();
            draggingShape = shape;
            
            // 記錄初始位置，以便放開時如果無效可以彈回去
            const rect = shape.element.getBoundingClientRect();
            dragOffsetX = pos.x - rect.left;
            dragOffsetY = pos.y - rect.top;
            startX = rect.left;
            startY = rect.top;

            // 切換樣式：變大、浮起
            shape.element.classList.remove('shape-preview');
            shape.element.classList.add('shape-dragging');
            
            // 移動到手指位置
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

        // 1. 計算方塊左上角對應到網格的哪一格
        const boardRect = canvas.getBoundingClientRect();
        const shapeRect = draggingShape.element.getBoundingClientRect();

        // 相對座標
        const relativeX = shapeRect.left - boardRect.left;
        const relativeY = shapeRect.top - boardRect.top;

        // 轉換成網格索引 (四捨五入取最近的格子)
        const c = Math.round(relativeX / TILE_SIZE);
        const r = Math.round(relativeY / TILE_SIZE);

        // 2. 嘗試放置
        if (canPlace(draggingShape.data, r, c)) {
            placeShape(draggingShape.data, r, c);
            
            // 移除該方塊 DOM
            draggingShape.element.remove();
            shapes = shapes.filter(s => s !== draggingShape);
            
            // 檢查是否消除
            checkLines();
            
            // 如果沒方塊了，產生新的
            if (shapes.length === 0) {
                generateShapes();
            }
        } else {
            // 放失敗，彈回原位
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

// --- 輔助函數 ---
function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function moveShape(x, y) {
    draggingShape.element.style.left = (x - dragOffsetX) + 'px';
    draggingShape.element.style.top = (y - dragOffsetY) + 'px';
}

function resetShapeStyle(shape) {
    shape.element.classList.remove('shape-dragging');
    shape.element.classList.add('shape-preview');
    shape.element.style.left = '';
    shape.element.style.top = '';
}

// --- 8. 遊戲規則判斷 ---
function canPlace(matrix, r, c) {
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1) {
                let targetR = r + i;
                let targetC = c + j;
                // 檢查邊界 與 是否已有方塊
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
    score += 10; // 放下加分
    updateScore(score);
    drawBoard();
}

function checkLines() {
    let linesCleared = 0;
    
    // 檢查橫排
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(val => val === 1)) {
            grid[r].fill(0); // 清空該行
            linesCleared++;
        }
    }

    // 檢查直排 (稍微複雜一點，要轉置檢查)
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
                grid[r][c] = 0; // 清空該列
            }
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        score += linesCleared * 100; // 消除加分
        updateScore(score);
        drawBoard();
    }
}

function updateScore(s) {
    scoreElement.innerText = `Score: ${s}`;
}

// 啟動遊戲
initGame();