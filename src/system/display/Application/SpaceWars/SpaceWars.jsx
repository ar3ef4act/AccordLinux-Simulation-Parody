import { useEffect, useRef, useState, useCallback } from 'react';
import './SpaceWars.css';

// ---------- CONFIGURATION (🛠️ ADJUSTABLE) ----------
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const ENEMY_WIDTH = 30;
const ENEMY_HEIGHT = 20;
const BULLET_SIZE = 4;
const PLAYER_SPEED = 7;

// Base speeds
const BASE_ENEMY_SPEED = 2.2;
const BASE_BULLET_SPEED = 3;

// Difficulty scaling
const ENEMY_SPEED_INCREMENT = 0.5;    // added every 50 points
const BULLET_SPEED_INCREMENT = 1;       // added every 100 points
const MAX_ENEMY_SPEED = 6.0;          // cap
const MAX_BULLET_SPEED = 9.0;           // cap

const ENEMY_SHOOT_DELAY = 50;

const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_SPACING_X = 45;
const ENEMY_SPACING_Y = 35;
const ENEMY_OFFSET_TOP_RATIO = 0.1;

let nextBulletId = 0;

function getCanvasSize(displaySource) {
    return displaySource === 'monitor'
        ? { width: 800, height: 539 }
        : { width: 800, height: 480 };
}

function createEnemy(canvasWidth, canvasHeight) {
    const enemies = [];
    const totalWidth = (ENEMY_COLS - 1) * ENEMY_SPACING_X;
    const startX = (canvasWidth - totalWidth) / 2 - ENEMY_WIDTH / 2;
    const offsetTop = canvasHeight * ENEMY_OFFSET_TOP_RATIO;

    for (let row = 0; row < ENEMY_ROWS; row++) {
        for (let col = 0; col < ENEMY_COLS; col++) {
            enemies.push({
                id: `${row}-${col}`,
                x: startX + col * ENEMY_SPACING_X,
                y: offsetTop + row * ENEMY_SPACING_Y,
                width: ENEMY_WIDTH,
                height: ENEMY_HEIGHT,
                alive: true,
                type: row,
            });
        }
    }
    return enemies;
}

export default function SpaceWars({ displaySource, onExit, startSignal }) {
    const animationRef = useRef(null);
    const { width: CANVAS_WIDTH, height: CANVAS_HEIGHT } = getCanvasSize(displaySource);

    const [score, setScore] = useState(0);
    const [gameStatus, setGameStatus] = useState('running');
    const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2);
    const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 30;
    const [enemy, setEnemy] = useState(() => createEnemy(CANVAS_WIDTH, CANVAS_HEIGHT));
    const [bullets, setBullets] = useState([]);
    const [enemyBullets, setEnemyBullets] = useState([]);
    const [enemyDirection, setEnemyDirection] = useState(1);
    const [frameCounter, setFrameCounter] = useState(0);

    // Difficulty state
    const [currentEnemySpeed, setCurrentEnemySpeed] = useState(BASE_ENEMY_SPEED);
    const [currentBulletSpeed, setCurrentBulletSpeed] = useState(BASE_BULLET_SPEED);

    const keys = useRef({ left: false, right: false, space: false });
    const spaceCooldown = useRef(false);

    // Update difficulty based on score
    useEffect(() => {
        // Enemy movement speed: +ENEMY_SPEED_INCREMENT every 50 points
        const enemySteps = Math.floor(score / 50);
        let newEnemySpeed = BASE_ENEMY_SPEED + (enemySteps * ENEMY_SPEED_INCREMENT);
        newEnemySpeed = Math.min(newEnemySpeed, MAX_ENEMY_SPEED);
        setCurrentEnemySpeed(newEnemySpeed);

        // Enemy bullet speed: +BULLET_SPEED_INCREMENT every 100 points
        const bulletSteps = Math.floor(score / 100);
        let newBulletSpeed = BASE_BULLET_SPEED + (bulletSteps * BULLET_SPEED_INCREMENT);
        newBulletSpeed = Math.min(newBulletSpeed, MAX_BULLET_SPEED);
        setCurrentBulletSpeed(newBulletSpeed);
    }, [score]);

    const resetGame = useCallback(() => {
        setScore(0);
        setGameStatus('running');
        setPlayerX(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2);
        setEnemy(createEnemy(CANVAS_WIDTH, CANVAS_HEIGHT));
        setBullets([]);
        setEnemyBullets([]);
        setEnemyDirection(1);
        setFrameCounter(0);
        keys.current = { left: false, right: false, space: false };
        spaceCooldown.current = false;
        nextBulletId = 0;
        // Reset speeds to base (will be recalculated as score 0)
        setCurrentEnemySpeed(BASE_ENEMY_SPEED);
        setCurrentBulletSpeed(BASE_BULLET_SPEED);
    }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

    useEffect(() => {
        resetGame();
    }, [resetGame, startSignal]);

    // Input handling (unchanged)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key;
            if (key === 'Escape') {
                setGameStatus(prev => (prev === 'running' ? 'paused' : prev === 'paused' ? 'running' : prev));
                return;
            }
            if (key.toLowerCase() === 'e') {
                if (typeof onExit === 'function') onExit();
                return;
            }
            if (key.toLowerCase() === 'r') {
                resetGame();
                return;
            }
            if (gameStatus !== 'running') return;

            if (key === 'ArrowLeft') keys.current.left = true;
            if (key === 'ArrowRight') keys.current.right = true;
            if (key === ' ' || key === 'Space') {
                e.preventDefault();
                if (!spaceCooldown.current) {
                    keys.current.space = true;
                    spaceCooldown.current = true;
                    setTimeout(() => { spaceCooldown.current = false; }, 200);
                }
            }
        };

        const handleKeyUp = (e) => {
            const key = e.key;
            if (key === 'ArrowLeft') keys.current.left = false;
            if (key === 'ArrowRight') keys.current.right = false;
            if (key === ' ' || key === 'Space') keys.current.space = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameStatus, onExit, resetGame]);

    // Game logic update (now uses currentEnemySpeed and currentBulletSpeed)
    const updateGame = useCallback(() => {
        if (gameStatus !== 'running') return;

        // 1. Move player
        let newPlayerX = playerX;
        if (keys.current.left) newPlayerX -= PLAYER_SPEED;
        if (keys.current.right) newPlayerX += PLAYER_SPEED;
        newPlayerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, newPlayerX));
        setPlayerX(newPlayerX);

        // 2. Player shooting
        if (keys.current.space) {
            const newBullet = {
                id: nextBulletId++,
                x: newPlayerX + PLAYER_WIDTH / 2 - BULLET_SIZE / 2,
                y: playerY - 5,
                width: BULLET_SIZE,
                height: BULLET_SIZE,
            };
            setBullets(prev => [...prev, newBullet]);
            keys.current.space = false;
        }

        // 3. Move player bullets using currentBulletSpeed
        setBullets(prev => prev.map(b => ({ ...b, y: b.y - currentBulletSpeed })).filter(b => b.y + b.height > 0));

        // 4. Move enemy bullets using currentBulletSpeed
        setEnemyBullets(prev => prev.map(b => ({ ...b, y: b.y + currentBulletSpeed })).filter(b => b.y < CANVAS_HEIGHT));

        // 5. Enemy movement (every 20 frames) using currentEnemySpeed
        setFrameCounter(fc => {
            if (fc % 20 === 0) {
                setEnemy(prevEnemy => {
                    let needStepDown = false;
                    let newDirection = enemyDirection;
                    const anyAtEdge = prevEnemy.some(inv => inv.alive && (
                        (enemyDirection === 1 && inv.x + inv.width >= CANVAS_WIDTH) ||
                        (enemyDirection === -1 && inv.x <= 0)
                    ));
                    if (anyAtEdge) {
                        newDirection = -enemyDirection;
                        needStepDown = true;
                        setEnemyDirection(newDirection);
                    }
                    return prevEnemy.map(inv => {
                        if (!inv.alive) return inv;
                        let newX = inv.x + (needStepDown ? 0 : enemyDirection * currentEnemySpeed);
                        let newY = inv.y + (needStepDown ? 15 : 0);
                        return { ...inv, x: newX, y: newY };
                    });
                });
            }
            return fc + 1;
        });

        // 6. Enemy shooting (delay unchanged, speed already increased via currentBulletSpeed)
        if (frameCounter % ENEMY_SHOOT_DELAY === 0) {
            const aliveEnemies = enemy.filter(inv => inv.alive);
            if (aliveEnemies.length > 0) {
                const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                setEnemyBullets(prev => [...prev, {
                    id: `inv-${Date.now()}-${Math.random()}`,
                    x: randomEnemy.x + ENEMY_WIDTH / 2 - BULLET_SIZE / 2,
                    y: randomEnemy.y + ENEMY_HEIGHT,
                    width: BULLET_SIZE,
                    height: BULLET_SIZE,
                }]);
            }
        }

        // 7. Collision: player bullets vs enemies (bullet disappears on hit)
        setBullets(prevBullets => {
            if (prevBullets.length === 0) return prevBullets;
            const newEnemy = enemy.map(e => ({ ...e }));
            let scoreIncrease = 0;
            const bulletsToKeep = [];

            for (const bullet of prevBullets) {
                let hit = false;
                for (let i = 0; i < newEnemy.length; i++) {
                    const inv = newEnemy[i];
                    if (!inv.alive) continue;
                    if (bullet.x < inv.x + inv.width &&
                        bullet.x + bullet.width > inv.x &&
                        bullet.y < inv.y + inv.height &&
                        bullet.y + bullet.height > inv.y) {
                        inv.alive = false;
                        hit = true;
                        scoreIncrease += 10;
                        break;
                    }
                }
                if (!hit) bulletsToKeep.push(bullet);
            }
            if (scoreIncrease > 0) setScore(prev => prev + scoreIncrease);
            setEnemy(newEnemy);
            return bulletsToKeep;
        });

        // 8. Collision: enemy bullets vs player
        setEnemyBullets(prev => {
            const remaining = [];
            for (const bullet of prev) {
                if (bullet.x < newPlayerX + PLAYER_WIDTH &&
                    bullet.x + bullet.width > newPlayerX &&
                    bullet.y < playerY + PLAYER_HEIGHT &&
                    bullet.y + bullet.height > playerY) {
                    setGameStatus('gameOver');
                    return [];
                }
                remaining.push(bullet);
            }
            return remaining;
        });

        // 9. Win condition
        if (!enemy.some(inv => inv.alive) && gameStatus === 'running') setGameStatus('win');

        // 10. Enemy reaches bottom
        const enemyBottom = Math.max(...enemy.filter(inv => inv.alive).map(inv => inv.y + inv.height), 0);
        if (enemyBottom >= CANVAS_HEIGHT - 80) setGameStatus('gameOver');
    }, [playerX, gameStatus, enemy, enemyDirection, frameCounter, playerY, CANVAS_WIDTH, CANVAS_HEIGHT, currentEnemySpeed, currentBulletSpeed]);

    // Draw function (adds difficulty display)
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#0f0';
        ctx.fillRect(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT);

        enemy.forEach(inv => {
            if (!inv.alive) return;
            const hue = (inv.type * 20) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(inv.x, inv.y, inv.width, inv.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(inv.x + 5, inv.y + 5, 5, 5);
            ctx.fillRect(inv.x + inv.width - 10, inv.y + 5, 5, 5);
        });

        ctx.fillStyle = '#ff0';
        bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
        ctx.fillStyle = '#f00';
        enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

        ctx.font = '20px "Courier New", monospace';
        ctx.fillStyle = '#fff';
        if (gameStatus === 'gameOver') {
            ctx.font = '30px monospace';
            ctx.fillStyle = '#f66';
            ctx.fillText('GAME OVER', CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2);
        } else if (gameStatus === 'win') {
            ctx.font = '30px monospace';
            ctx.fillStyle = '#6f6';
            ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2);
        } else if (gameStatus === 'paused') {
            ctx.font = '30px monospace';
            ctx.fillStyle = '#ffa500';
            ctx.fillText('PAUSED', CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2);
        }
    }, [playerX, playerY, enemy, bullets, enemyBullets, score, gameStatus, CANVAS_WIDTH, CANVAS_HEIGHT, currentEnemySpeed, currentBulletSpeed]);

    useEffect(() => {
        const animate = () => {
            updateGame();
            draw();
            animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationRef.current);
    }, [updateGame, draw]);

    const canvasRef = useRef(null);

    return (
        <div className="space-wars-wrapper">
            <div className="game-info-bar">
                <span>Score: {score}</span>
                <span>Status: {gameStatus}</span>
                <span className="controls-hint">
                    ← → move | Space shoot | Esc pause/resume | R restart | E exit
                </span>
            </div>
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="game-canvas"
                style={{ display: 'block' }}
            />
        </div>
    );
}