const GRID_SIZE = 8;
const TILE_SIZE = 40;  
const PREVIEW_TILE_SIZE = 24; 
const GAP = 2;

let BOARD_COLOR = '#34495e'; 
let EMPTY_COLOR = '#2c3e50'; 
let isLightTheme = false; 

const FINGER_OFFSET = 80; 

const bgm = new Audio('bgm.mp3');
bgm.loop = true;
const blastSound = new Audio('blast.mp3');
const make1Sound = new Audio('make1.mp3');
const make2Sound = new Audio('make2.mp3');
const make3Sound = new Audio('make3.mp3');
let isBgmPlaying = false;

const specialImg = new Image();
specialImg.src = 'icon.png'; 

const specialImg2 = new Image();
specialImg2.src = 'icon2.png';

const specialImg3 = new Image();
specialImg3.src = 'icon3.png';

const COLORS = [
    '#e74c3c', '#e67e22', '#2ecc71', '#3498db', '#9b59b6'  
];

let grid = []; 
let specialGrid = []; 
let shapes = []; 
let score = 0;
let isAnimating = false; 
let firstGenerationMode = true;

let gameStartTime = 0; 
let accumulatedTime = 0; 

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

function initAudio() {
    if (!isBgmPlaying) {
        let promise = bgm.play();
        if (promise !== undefined) {
            promise.then(() => {
                isBgmPlaying = true;
                document.removeEventListener('pointerdown', initAudio);
                document.removeEventListener('keydown', initAudio);
            }).catch(e => console.warn("BGM play prevented:", e));
        }
    }
}
document.addEventListener('pointerdown', initAudio);
document.addEventListener('keydown', initAudio);

function saveGame() {
    accumulatedTime += (Date.now() - gameStartTime);
    gameStartTime = Date.now();

    const stickersData = Array.from(document.querySelectorAll('.sticker')).map(el => ({
        tier: el.dataset.tier,
        left: el.style.left,
        top: el.style.top,
        rot: el.dataset.rot || "0"
    }));

    const shapesData = shapes.map(s => ({
        data: s.data,
        color: s.color,
        specialCell: s.specialCell,
        previewScale: s.previewScale
    }));

    const gameState = {
        grid: grid,
        specialGrid: specialGrid,
        score: score,
        accumulatedTime: accumulatedTime,
        shapes: shapesData,
        stickers: stickersData,
        firstGenerationMode: firstGenerationMode
    };

    try {
        localStorage.setItem('pikaBlastSave', JSON.stringify(gameState));
    } catch (e) {
        console.warn("無法儲存遊戲進度", e);
    }
}

function restoreShapes(savedShapes) {
    shapeContainer.innerHTML = ''; 
    shapes = [];

    savedShapes.forEach((sData, i) => {
        const template = sData.data;
        const shapeColor = sData.color;
        const specialCell = sData.specialCell;
        const previewScale = sData.previewScale;

        const slot = document.createElement('div');
        slot.className = 'shape-slot';

        const shapeCanvas = document.createElement('canvas');
        const rows = template.length;
        const cols = template[0].length;
        
        shapeCanvas.width = cols * TILE_SIZE;
        shapeCanvas.height = rows * TILE_SIZE;
        shapeCanvas.className = 'shape-preview';
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
    });
}

function setupGameClearModal() {
    if (document.getElementById('game-clear-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'game-clear-modal';
    modal.className = 'hidden'; 
    
    Object.assign(modal.style, {
        position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '2000', borderRadius: '8px', backdropFilter: 'blur(4px)'
    });

    const content = document.createElement('div');
    content.id = 'game-clear-content'; 
    content.className = 'modal-content';
    content.style.borderColor = '#f1c40f'; 
    content.style.textAlign = 'center';

    modal.appendChild(content);
    document.getElementById('game-container').appendChild(modal);
}

function renderMainView() {
    const content = document.getElementById('game-clear-content');
    if (!content) return;

    const currentTimeElapsed = accumulatedTime + (Date.now() - gameStartTime);
    const totalSeconds = Math.floor(currentTimeElapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    content.innerHTML = `
        <h2 style="color: #f1c40f; margin: 0 0 15px 0; font-size: 2rem; text-shadow: 0 0 10px rgba(241,196,15,0.5);">Thank You for Playing!</h2>
        <p style="font-size: 1.2rem; margin-bottom: 5px;">Your donation will directly help me!</p>
        <p style="font-size: 1rem; margin-bottom: 25px; color: #bdc3c7;">Clear Time: ${timeString}</p>
        <div style="display: flex; justify-content: center; gap: 15px;">
            <button id="btn-no" style="background-color: #95a5a6; color: white; border: none; padding: 10px 20px; font-size: 1.1rem; border-radius: 50px; cursor: pointer; transition: transform 0.1s;">No Thanks</button>
            <button id="btn-yes" style="background-color: #e74c3c; color: white; border: none; padding: 10px 20px; font-size: 1.1rem; border-radius: 50px; cursor: pointer; transition: transform 0.1s;">Support!</button>
        </div>
    `;
    
    document.getElementById('btn-no').onclick = renderNoView;
    document.getElementById('btn-yes').onclick = renderYesView;
    addClickEffect('btn-no');
    addClickEffect('btn-yes');
}

function renderNoView() {
    const content = document.getElementById('game-clear-content');
    content.innerHTML = `
        <h2 style="color: #f1c40f; margin: 0 0 25px 0; font-size: 2rem;">Oh.</h2>
        <button id="btn-confirm" style="background-color: #f1c40f; color: #2c3e50; border: none; padding: 12px 24px; font-size: 1.1rem; border-radius: 50px; cursor: pointer; font-weight: bold; transition: transform 0.1s;">Confirm</button>
    `;
    document.getElementById('btn-confirm').onclick = closeModal;
    addClickEffect('btn-confirm');
}

function renderYesView() {
    const content = document.getElementById('game-clear-content');
    content.innerHTML = `
        <h2 style="color: #f1c40f; margin: 0 0 15px 0; font-size: 2rem;">Just Kidding Haha</h2>
        <p style="font-size: 1.2rem; margin-bottom: 25px; line-height: 1.5;">Did anyone actually believe that?<br>Anyway, congratulations on clearing the game!</p>
        <button id="btn-creator" style="background-color: #f1c40f; color: #2c3e50; border: none; padding: 12px 24px; font-size: 1.1rem; border-radius: 50px; cursor: pointer; font-weight: bold; transition: transform 0.1s;">Creator: shiRay</button>
    `;
    document.getElementById('btn-creator').onclick = closeModal;
    addClickEffect('btn-creator');
}

function closeModal() {
    document.getElementById('game-clear-modal').classList.add('hidden');
}

function addClickEffect(id) {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
    btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.95)', {passive: true});
    btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
}

function showGameClearScreen() {
    renderMainView(); 
    document.getElementById('game-clear-modal').classList.remove('hidden');
}

function getPatternProbability() {
    let prob = 0.2 + (Math.floor(score / 2) * 0.01);
    return Math.min(prob, 0.8);
}

function bindCheatKeys() {
    document.addEventListener('keydown', (e) => {
        if (e.key === '*') {
            showGameClearScreen();
        }
    });
}

function initGame(forceReset = false) {
    document.querySelectorAll('.sticker').forEach(el => el.remove());
    gameOverModal.classList.add('hidden');
    isAnimating = false;
    
    let loaded = false;
    
    if (!forceReset) {
        try {
            const savedStr = localStorage.getItem('pikaBlastSave');
            if (savedStr) {
                const state = JSON.parse(savedStr);
                grid = state.grid;
                specialGrid = state.specialGrid;
                score = state.score;
                accumulatedTime = state.accumulatedTime || 0;
                gameStartTime = Date.now();
                firstGenerationMode = state.firstGenerationMode !== undefined ? state.firstGenerationMode : false;
                
                updateScore(score);
                restoreShapes(state.shapes);
                
                state.stickers.forEach(st => {
                    const { img } = createStickerNode(parseInt(st.tier));
                    img.style.left = st.left;
                    img.style.top = st.top;
                    img.dataset.rot = st.rot;
                    img.style.setProperty('--rot', st.rot + 'deg');
                    highestZIndex++;
                    img.style.zIndex = highestZIndex;
                    document.body.appendChild(img);
                    makeStickerDraggable(img);
                });
                
                loaded = true;
            }
        } catch (e) {
            console.warn("讀取存檔失敗", e);
        }
    }

    if (!loaded) {
        grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        specialGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        score = 0;
        firstGenerationMode = true;
        accumulatedTime = 0;
        gameStartTime = Date.now();
        updateScore(0);
        generateShapes(); 
    }

    setupGameClearModal(); 
    drawBoard();
    
    if (!window.gameInitialized) {
        bindInputEvents();
        bindTitleTaps(); 
        bindScoreTaps(); 
        bindCheatKeys(); 
        window.gameInitialized = true;
    }
}

restartBtn.addEventListener('click', () => {
    localStorage.removeItem('pikaBlastSave'); 
    initGame(true);
});

function toggleTheme() {
    isLightTheme = !isLightTheme;
    if (isLightTheme) {
        document.body.classList.add('light-theme');
        BOARD_COLOR = '#bdc3c7'; 
        EMPTY_COLOR = '#ecf0f1'; 
    } else {
        document.body.classList.remove('light-theme');
        BOARD_COLOR = '#34495e'; 
        EMPTY_COLOR = '#2c3e50'; 
    }
    drawBoard(); 
}

function bindTitleTaps() {
    const titleElement = document.querySelector('.header h1');
    if (!titleElement) return;
    
    let lastTapTime = 0;
    let clickTimer = null;

    const handleTitleTap = (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength > 0 && tapLength < 300) {
            clearTimeout(clickTimer);
            document.body.classList.toggle('hide-stickers');
            lastTapTime = 0; 
            if (window.getSelection) window.getSelection().removeAllRanges();
        } else {
            lastTapTime = currentTime;
            clickTimer = setTimeout(() => {
                toggleTheme(); 
                lastTapTime = 0;
            }, 300);
        }
    };
    
    titleElement.addEventListener('pointerdown', handleTitleTap);
}

function bindScoreTaps() {
    if (!scoreElement) return;
    
    let lastTapTime = 0;
    let clickTimer = null;
    let isScoreTapLocked = false; 

    const handleScoreTap = (e) => {
        if (isScoreTapLocked) return;

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength > 0 && tapLength < 300) {
            clearTimeout(clickTimer);
            isScoreTapLocked = true; 
            
            const allStickers = Array.from(document.querySelectorAll('.sticker'));
            const tier1Stickers = allStickers.filter(el => parseInt(el.dataset.tier || 1) === 1);
            const tier2Stickers = allStickers.filter(el => parseInt(el.dataset.tier || 1) === 2);
            
            let targetStickers = null;
            
            if (tier1Stickers.length >= 15) {
                targetStickers = tier1Stickers;
            } else if (tier2Stickers.length >= 15) {
                targetStickers = tier2Stickers;
            }
            
            if (targetStickers) {
                const toMerge = targetStickers.sort(() => 0.5 - Math.random()).slice(0, 15);
                const currentSize = parseFloat(toMerge[0].style.width) || TILE_SIZE;
                const pos = getRandomValidPosition(currentSize);
                
                toMerge.forEach(el => {
                    el.style.pointerEvents = 'none'; 
                    el.classList.add('shuffling'); 
                    el.style.left = pos.x + 'px';
                    el.style.top = pos.y + 'px';
                    setTimeout(() => {
                        if (document.body.contains(el)) {
                            el.classList.remove('shuffling');
                            el.style.pointerEvents = '';
                        }
                    }, 500);
                });
                
                setTimeout(() => {
                    checkMerge(toMerge[0]);
                    saveGame();
                    isScoreTapLocked = false; 
                }, 550);
            } else {
                allStickers.forEach(el => {
                    el.style.pointerEvents = 'none'; 
                    el.classList.add('shuffling');
                    const currentSize = parseFloat(el.style.width) || TILE_SIZE;
                    const pos = getRandomValidPosition(currentSize);
                    el.style.left = pos.x + 'px';
                    el.style.top = pos.y + 'px';
                    setTimeout(() => {
                        if (document.body.contains(el)) {
                            el.classList.remove('shuffling');
                            el.style.pointerEvents = ''; 
                        }
                    }, 500);
                });
                setTimeout(() => {
                    saveGame();
                    isScoreTapLocked = false; 
                }, 550);
            }
            
            lastTapTime = 0;
            if (window.getSelection) window.getSelection().removeAllRanges();
        } else {
            lastTapTime = currentTime;
            clickTimer = setTimeout(() => {
                isScoreTapLocked = true; 
                const stickers = document.querySelectorAll('.sticker');
                stickers.forEach(el => {
                    el.style.pointerEvents = 'none'; 
                    el.classList.add('spinning'); 
                    let currentRot = parseFloat(el.dataset.rot || 0);
                    currentRot += 360;
                    el.dataset.rot = currentRot;
                    el.style.setProperty('--rot', currentRot + 'deg');
                    setTimeout(() => {
                        if (document.body.contains(el)) {
                            el.classList.remove('spinning');
                            el.style.pointerEvents = ''; 
                        }
                    }, 800);
                });
                setTimeout(() => {
                    saveGame();
                    isScoreTapLocked = false; 
                }, 850); 
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
            
            if (!hasLines) {
                if (shapes.length === 0) {
                    generateShapes();
                } else {
                    saveGame(); 
                }
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
            finalScoreElement.innerText = score;
            gameOverModal.classList.remove('hidden'); 
            localStorage.removeItem('pikaBlastSave'); 
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
            shouldHaveIcon = (Math.random() < getPatternProbability());
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
    
    saveGame(); 
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
    blastSound.currentTime = 0;
    blastSound.play().catch(e => console.warn("Blast sound prevented:", e));
    
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
        
        const stickersToSpawn = iconsCleared * iconsCleared;
        for (let i = 0; i < stickersToSpawn; i++) {
            spawnSticker();
        }
    }
    
    isAnimating = false; 
    drawBoard(); 

    if (shapes.length === 0) {
        generateShapes();
    } else {
        saveGame(); 
    }
}

function createStickerNode(tier) {
    const img = document.createElement('img');
    
    if (tier === 1) {
        img.src = 'icon.png';
    } else if (tier === 2) {
        img.src = 'icon2.png';
    } else {
        img.src = 'icon3.png';
    }

    img.className = 'sticker evolve-anim'; 
    img.dataset.rot = "0";
    img.dataset.tier = tier;

    const size = TILE_SIZE * Math.pow(1.5, tier - 1);
    img.style.width = size + 'px';
    img.style.height = size + 'px';

    if (tier > 3) {
        const hueShift = (tier - 3) * 70; 
        img.style.setProperty('--hue', hueShift + 'deg');
    } else {
        img.style.setProperty('--hue', '0deg');
    }

    setTimeout(() => img.classList.remove('evolve-anim'), 600);
    
    return { img, size };
}

function spawnSticker() {
    const { img, size } = createStickerNode(1);
    const pos = getRandomValidPosition(size);

    img.style.left = pos.x + 'px';
    img.style.top = pos.y + 'px';
    highestZIndex++;
    img.style.zIndex = highestZIndex;
    document.body.appendChild(img);

    makeStickerDraggable(img);
}

function spawnMergedSticker(cx, cy, tier) {
    const { img, size } = createStickerNode(tier);
    
    let left = cx - size / 2;
    let top = cy - size / 2;

    img.style.left = left + 'px';
    img.style.top = top + 'px';
    highestZIndex++;
    img.style.zIndex = highestZIndex;
    document.body.appendChild(img);

    makeStickerDraggable(img);
}

function checkMerge(droppedSticker) {
    const tier = parseInt(droppedSticker.dataset.tier || 1);
    
    if (tier >= 4) {
        saveGame();
        return;
    }

    const rect1 = droppedSticker.getBoundingClientRect();
    const cx1 = rect1.left + rect1.width / 2;
    const cy1 = rect1.top + rect1.height / 2;

    const allStickers = Array.from(document.querySelectorAll('.sticker'));
    const sameTierStickers = allStickers.filter(el => parseInt(el.dataset.tier || 1) === tier);

    let cluster = [];
    const MERGE_RADIUS = 40; 

    for (let el of sameTierStickers) {
        const rect2 = el.getBoundingClientRect();
        const cx2 = rect2.left + rect2.width / 2;
        const cy2 = rect2.top + rect2.height / 2;
        const dist = Math.hypot(cx1 - cx2, cy1 - cy2);
        
        if (dist <= MERGE_RADIUS) {
            cluster.push(el);
        }
    }

    if (cluster.length >= 15) {
        const toMerge = cluster.slice(0, 15);
        
        let avgCx = 0, avgCy = 0;
        toMerge.forEach(el => {
            const r = el.getBoundingClientRect();
            avgCx += r.left + r.width / 2;
            avgCy += r.top + r.height / 2;
            el.remove(); 
        });
        avgCx /= 15;
        avgCy /= 15;

        if (tier === 1) {
            make1Sound.currentTime = 0;
            make1Sound.play().catch(e => console.warn("Merge 1 sound prevented:", e));
            spawnMergedSticker(avgCx, avgCy, 2);
        } else if (tier === 2) {
            make2Sound.currentTime = 0;
            make2Sound.play().catch(e => console.warn("Merge 2 sound prevented:", e));
            spawnMergedSticker(avgCx, avgCy, 3);
        } else if (tier === 3) {
            make3Sound.currentTime = 0;
            make3Sound.play().catch(e => console.warn("Merge 3 sound prevented:", e));
            showGameClearScreen();
            spawnMergedSticker(avgCx, avgCy, 4);
        } else {
            spawnMergedSticker(avgCx, avgCy, tier + 1);
        }
    }
    saveGame(); 
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
            let currentRotation = parseFloat(el.dataset.rot || 0);
            currentRotation += 45;
            el.dataset.rot = currentRotation;
            el.style.setProperty('--rot', currentRotation + 'deg');
            lastTapTime = 0; 
            saveGame(); 
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
            document.removeEventListener('touchmove', endDrag);
            
            checkMerge(el);
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