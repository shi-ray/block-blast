// --- 設定參數 ---
const GRID_SIZE = 8;        // 8x8 網格
const TILE_SIZE = 40;       // 每個格子 40px
const GAP = 2;              // 格子間距
const BOARD_COLOR = '#34495e'; 
const EMPTY_COLOR = '#2c3e50';

// --- 遊戲狀態 ---
let grid = []; // 0=空, 1=有方塊
let score = 0;

// --- 方塊形狀定義 (矩陣表示法) ---
const SHAPES = {
    'I': [[1, 1, 1, 1]], 
    'O': [[1, 1], [1, 1]],
    'L': [[1, 0], [1, 0], [1, 1]],
    'T': [[1, 1, 1], [0, 1, 0]]
};

// --- 初始化 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function initGame() {
    // 1. 初始化 8x8 空網格
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // 2. 畫出初始盤面
    drawBoard();
    
    // 3. 測試：在控制台印出 "遊戲開始"
    console.log("Game initialized!");
}

// --- 繪圖函數 ---
function drawBoard() {
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            // 計算每個格子的 x, y 座標
            let x = c * TILE_SIZE + GAP;
            let y = r * TILE_SIZE + GAP;
            let size = TILE_SIZE - GAP * 2;

            // 根據 grid 數值決定顏色 (目前都是 0，所以是深色)
            ctx.fillStyle = grid[r][c] === 0 ? EMPTY_COLOR : '#e74c3c';
            
            // 畫出圓角矩形 (這裡簡化為普通矩形)
            ctx.fillRect(x, y, size, size);
        }
    }
}

// 啟動遊戲
initGame();