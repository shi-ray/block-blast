// --- 設定參數 ---
const GRID_SIZE = 8;
const TILE_SIZE = 40;
const GAP = 2;
const BOARD_COLOR = '#34495e'; // 深色背景
const EMPTY_COLOR = '#2c3e50'; // 空格子顏色
const BLOCK_COLOR = '#e74c3c'; // 方塊顏色 (紅色)

// --- 遊戲狀態 ---
let grid = []; 
let shapes = []; // 存放目前的三個待選方塊
let draggingShape = null; // 目前正在拖曳的方塊
let dragOffsetX = 0;
let dragOffsetY = 0;

// --- 方塊形狀定義 (0:空, 1:實) ---
const SHAPE_TEMPLATES = [
    [[1]], // 單點
    [[1, 1, 1, 1]], // I型 (橫)
    [[1], [1], [1], [1]], // I型 (直)
    [[1, 1], [1, 1]], // O型 (田)
    [[1, 0], [1, 0], [1, 1]], // L型
    [[0, 1, 0], [1, 1, 1]] // T型
];

// --- DOM 元素 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shapeContainer = document.getElementById('shape-container');

// --- 初始化 ---
function initGame() {
    // 1. 初始化 8x8 空網格
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // 2. 產生三個隨機方塊
    generateShapes();
    
    // 3. 畫出主畫面
    drawBoard();
    
    // 4. 綁定拖放事件 (同時支援滑鼠與觸控)
    bindInputEvents();
}

// --- 繪圖：主網格 ---
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空畫布
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let x = c * TILE_SIZE + GAP;
            let y = r * TILE_SIZE + GAP;
            let size = TILE_SIZE - GAP * 2;

            // 如果格子是 1 (已放置) 則畫紅色，否則畫深色
            ctx.fillStyle = grid[r][c] === 1 ? BLOCK_COLOR : EMPTY_COLOR;
            ctx.fillRect(x, y, size, size);
        }
    }
}

// --- 邏輯：產生 3 個隨機方塊 ---
function generateShapes() {
    shapeContainer.innerHTML = ''; // 清空容器
    shapes = [];

    for (let i = 0; i < 3; i++) {
        // 隨機選一個形狀模板
        const template = SHAPE_TEMPLATES[Math.floor(Math.random() * SHAPE_TEMPLATES.length)];
        
        // 建立方塊物件
        const shape = {
            id: i,
            data: template,
            element: document.createElement('canvas'), // 每個方塊都有自己的小 Canvas
            x: 0, y: 0 // 拖曳時的座標
        };
        
        // 設定小 Canvas 大小
        const rows = template.length;
        const cols = template[0].length;
        const cellSize = 20; // 待選區的格子比較小
        shape.element.width = cols * cellSize;
        shape.element.height = rows * cellSize;
        shape.element.className = 'shape-preview';
        
        // 畫出這個小方塊
        const sCtx = shape.element.getContext('2d');
        sCtx.fillStyle = BLOCK_COLOR;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (template[r][c] === 1) {
                    sCtx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }

        // 將小 Canvas 加入網頁
        shapeContainer.appendChild(shape.element);
        shapes.push(shape);
    }
}

// --- 互動：拖放事件綁定 ---
function bindInputEvents() {
    // 監聽滑鼠/手指按下
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: false });

    // 監聽移動
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('touchmove', onPointerMove, { passive: false });

    // 監聽放開
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);
}

// 取得指標座標 (相容滑鼠與觸控)
function getPointerPos(e) {
    if (e.touches) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function onPointerDown(e) {
    const pos = getPointerPos(e);
    
    // 檢查是否點擊到下方的待選方塊
    // 我們使用 elementFromPoint 來判斷點到了哪個 DOM 元素
    const target = document.elementFromPoint(pos.x, pos.y);
    
    // 找出對應的 shape 物件
    const clickedShape = shapes.find(s => s.element === target);
    
    if (clickedShape) {
        e.preventDefault(); // 防止捲動
        draggingShape = clickedShape;
        
        // 紀錄點擊點與方塊中心的偏移量，讓拖曳手感更好
        const rect = draggingShape.element.getBoundingClientRect();
        dragOffsetX = pos.x - rect.left;
        dragOffsetY = pos.y - rect.top;
        
        // 視覺效果：把方塊變得稍微透明，並設為 absolute 定位以便移動
        draggingShape.element.style.position = 'absolute';
        draggingShape.element.style.opacity = '0.7';
        draggingShape.element.style.zIndex = '1000'; // 確保在最上層
        draggingShape.element.style.pointerEvents = 'none'; // 關鍵：讓滑鼠事件能穿透它偵測下方
        
        moveShape(pos.x, pos.y);
    }
}

function onPointerMove(e) {
    if (!draggingShape) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    moveShape(pos.x, pos.y);
}

function moveShape(x, y) {
    // 更新方塊 DOM 的位置
    draggingShape.element.style.left = (x - dragOffsetX) + 'px';
    draggingShape.element.style.top = (y - dragOffsetY) + 'px';
}

function onPointerUp(e) {
    if (!draggingShape) return;
    
    // 目前先做簡單的「歸位」邏輯 (還沒做放置判定)
    // 當放開手時，方塊會回到原位
    draggingShape.element.style.position = 'static';
    draggingShape.element.style.opacity = '1';
    draggingShape.element.style.zIndex = 'auto';
    draggingShape.element.style.pointerEvents = 'auto';
    draggingShape.element.style.left = '';
    draggingShape.element.style.top = '';
    
    draggingShape = null;
}

// 啟動
initGame();