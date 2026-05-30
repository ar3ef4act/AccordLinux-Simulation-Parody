import { useEffect, useMemo, useState } from 'react';
import './SnakeCLI.css';

const GRID_WIDTH = 40;
const GRID_HEIGHT = 20;
const INITIAL_DIRECTION = { x: 1, y: 0 };

function centeredSnake() {
    const cx = Math.floor(GRID_WIDTH / 2);
    const cy = Math.floor(GRID_HEIGHT / 2);
    return [
        { x: cx,     y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
    ];
}

const DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
};

function getRandomFood(snake) {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    const empty = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const key = `${x},${y}`;
            if (!occupied.has(key)) empty.push({ x, y });
        }
    }
    if (empty.length === 0) return { x: 0, y: 0 };
    return empty[Math.floor(Math.random() * empty.length)];
}

function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
}

function renderAsciiBoard(snake, food) {
    const set = new Set(snake.map(s => `${s.x},${s.y}`));
    const head = snake[0];
    const top = `+${'-'.repeat(GRID_WIDTH)}+`;
    const lines = [top];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        let row = '|';
        for (let x = 0; x < GRID_WIDTH; x++) {
            const key = `${x},${y}`;
            if (head.x === x && head.y === y) row += '@';
            else if (food.x === x && food.y === y) row += 'X';
            else if (set.has(key)) row += 'o';
            else row += '.';
        }
        row += '|';
        lines.push(row);
    }
    lines.push(top);
    return lines.join('\n');
}

export default function SnakeCLI({ onExit, startSignal }) {
    const [snake, setSnake] = useState(centeredSnake());
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [food, setFood] = useState(getRandomFood(snake));
    const [score, setScore] = useState(0);
    const [status, setStatus] = useState('running');

    // speed computed by gentle exponential decay based on score
    const speedMs = useMemo(() => Math.max(70, Math.round(220 * Math.pow(0.95, score))), [score]);

    const board = useMemo(() => renderAsciiBoard(snake, food), [snake, food]);

    const resetGame = () => {
        const start = centeredSnake();
        setSnake(start);
        setDirection(INITIAL_DIRECTION);
        setFood(getRandomFood(start));
        setScore(0);
        setStatus('running');
    };

    useEffect(() => {
        if (typeof startSignal === 'undefined') return;
        // when parent requests a start signal, reset and run
        resetGame();
    }, [startSignal]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const k = e.key;
            if (k === 'Escape') {
                setStatus((s) => (s === 'running' ? 'paused' : (s === 'paused' ? 'running' : s)));
                return;
            }
            if (k.toLowerCase() === 'e') {
                if (typeof onExit === 'function') onExit();
                return;
            }
            if (k.toLowerCase() === 'r') {
                resetGame();
                return;
            }

            if (status !== 'running') return;

            const nd = DIRECTIONS[k];
            if (!nd) return;
            setDirection((cur) => (isOpposite(cur, nd) ? cur : nd));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onExit, status]);

    useEffect(() => {
        if (status !== 'running') return undefined;

        const id = window.setInterval(() => {
            setSnake((cur) => {
                const head = cur[0];
                const next = { x: head.x + direction.x, y: head.y + direction.y };
                const outside = next.x < 0 || next.x >= GRID_WIDTH || next.y < 0 || next.y >= GRID_HEIGHT;
                const hitSelf = cur.some(s => s.x === next.x && s.y === next.y);
                if (outside || hitSelf) {
                    setStatus('Game Over');
                    return cur;
                }
                const ate = next.x === food.x && next.y === food.y;
                const nextSnake = [next, ...cur];
                if (!ate) nextSnake.pop();
                else {
                    setScore(sc => sc + 1);
                    setFood(getRandomFood(nextSnake));
                }
                return nextSnake;
            });
        }, speedMs);

        return () => window.clearInterval(id);
    }, [direction, food, speedMs, status]);

    return (
        <div className="snake-wrapper">
            <div className="snake-console">
                <span>Esc pause/resume R restart E exit</span>
                <div className="snake-board">
                    <pre>{board}</pre>
                </div>
                <div className="snake-caption">
                    <div className="left">
                        <span className="snake-score">Score: {score}</span>
                        <span className="snake-score">Status: {status}</span>
                    </div>
                    <div className="right snake-controls">
                    </div>
                </div>
            </div>
        </div>
    );
}
