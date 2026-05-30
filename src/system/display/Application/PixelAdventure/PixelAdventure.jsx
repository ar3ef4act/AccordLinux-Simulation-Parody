import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playBGM as _playBGM, stopBGM as _stopBGM, playSound as _playSound } from '../../sound';

import playerStandUrl from "./sprite/sprite_stand.png";
import playerWalk1Url from "./sprite/sprite_walk1.png";
import playerWalk2Url from "./sprite/sprite_walk2.png";
import playerRun0Url from "./sprite/sprite_run0.png";
import playerRun1Url from "./sprite/sprite_run1.png";
import playerRun2Url from "./sprite/sprite_run2.png";
import playerRunJum0Url from "./sprite/sprite_runjum0.png";
import playerRunJum1Url from "./sprite/sprite_runjum1.png";
import playerRunJum2Url from "./sprite/sprite_runjum2.png";
import playerWalkJumUrl from "./sprite/sprite_walkjum.png";
import coinStillUrl from "./sprite/sprite_coinstill.png";
import coinGetUrl from "./sprite/sprite_coinget.png";
import platfGrassLongUrl from "./sprite/sprite_platfgrasslong.png";
import platfGrassShortUrl from "./sprite/sprite_platfgrassshort.png";
import platfCloudUrl from "./sprite/sprite_platfcloud.png";

import bgmUrl from "./sfx/bgm_pa.mp3"
import sfxJump from "./sfx/sfx_jump.mp3";
import sfxCoin from "./sfx/sfx_coin.mp3";
import sfxDie from "./sfx/sfx_die.mp3";
import sfxRun from "./sfx/sfx_run.mp3";

const AUDIO = {
    bgm: bgmUrl,
    coin: sfxCoin,
    jump: sfxJump,
    run: sfxRun,
    die: sfxDie
};

function playBGM() {
    _playBGM(AUDIO.bgm);
}

function stopBGM() {
    _stopBGM();
}

function playSound(key) {
    if (!AUDIO[key] || key === 'bgm') return;
    _playSound(AUDIO[key]);
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CANVAS_W = 1000;
const CANVAS_H = 600;
const GRAVITY = 0.55;
const JUMP_POWER = -10;
const WALK_ACC = 0.5;
const RUN_ACC = 0.9;
const MAX_WALK = 3.0;
const MAX_RUN = 5.5;
// Fix 1: friction lebih kuat di ground supaya tidak licin
const FRICTION_GROUND = 0.70;   // sebelumnya 0.92 — jauh lebih nge-rem
const FRICTION_AIR = 0.97;
const PLAYER_W = 32;            // Fix 2: sesuaikan dengan proporsi sprite
const PLAYER_H = 32;
const PLATFORM_H = 16;
const CULL_LEFT = 400;         // Fix 5: hapus platform > 400px di kiri kamera
const CULL_RIGHT = 500;         // generate jika batas kanan < kamera + 500

const PLATFORM_TYPES = {
    GRASS_LONG: { w: 100, imgKey: 'sprite_platfgrasslong.png' },
    GRASS_SHORT: { w: 60, imgKey: 'sprite_platfgrassshort.png' },
    CLOUD: { w: 80, imgKey: 'sprite_platfcloud.png' },
};

const SPRITE_MAP = {
    'sprite_stand.png': playerStandUrl,
    'sprite_walk1.png': playerWalk1Url,
    'sprite_walk2.png': playerWalk2Url,
    'sprite_run0.png': playerRun0Url,
    'sprite_run1.png': playerRun1Url,
    'sprite_run2.png': playerRun2Url,
    'sprite_runjum0.png': playerRunJum0Url,
    'sprite_runjum1.png': playerRunJum1Url,
    'sprite_runjum2.png': playerRunJum2Url,
    'sprite_walkjum.png': playerWalkJumUrl,
    'sprite_coinstill.png': coinStillUrl,
    'sprite_coinget.png': coinGetUrl,
    'sprite_platfgrasslong.png': platfGrassLongUrl,
    'sprite_platfgrassshort.png': platfGrassShortUrl,
    'sprite_platfcloud.png': platfCloudUrl,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

function initPlatforms() {
    return [
        { x: 0, y: 340, type: 'GRASS_LONG', w: 100 },
        { x: 160, y: 300, type: 'GRASS_SHORT', w: 60 },
        { x: 280, y: 320, type: 'CLOUD', w: 80 },
        { x: 430, y: 270, type: 'GRASS_LONG', w: 100 },
        { x: 600, y: 290, type: 'GRASS_SHORT', w: 60 },
        { x: 740, y: 250, type: 'CLOUD', w: 80 },
    ];
}

function generateNextPlatform(lastPlat) {
    const gap = 50 + Math.random() * 90;
    const yDiff = -40 + Math.random() * 90;
    const newY = Math.min(Math.max(lastPlat.y + yDiff, 170), 350);
    const types = ['GRASS_LONG', 'GRASS_SHORT', 'CLOUD'];
    const type = types[Math.floor(Math.random() * types.length)];
    return { x: lastPlat.x + lastPlat.w + gap, y: newY, type, w: PLATFORM_TYPES[type].w };
}

function maybeAddCoin(plat, seed) {
    if (Math.random() < 0.25) {
        return {
            id: `coin-${seed}-${plat.x}`,
            x: plat.x + plat.w / 2 - 8,
            y: plat.y - 20,
            w: 16, h: 16,
            collected: false,
        };
    }
    return null;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function PixelAdventure() {
    const canvasRef = useRef(null);
    const animIdRef = useRef(null);
    const images = useRef({});
    const input = useRef({ left: false, right: false, running: false, jumpPressed: false });
    const wasOnGround = useRef(true);
    const runSoundTimer = useRef(0);

    const [screen, setScreen] = useState('landing'); // 'landing' | 'playing' | 'gameover'
    const [imagesLoaded, setLoaded] = useState(false);
    const [score, setScore] = useState(0);
    const [frameTimer, setFrameTimer] = useState(0);

    const [player, setPlayer] = useState(null);
    const [platforms, setPlatforms] = useState([]);
    const [coins, setCoins] = useState([]);

    // ── Preload sprites ───────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all(
            Object.entries(SPRITE_MAP).map(([k, url]) =>
                new Promise(res => {
                    const img = new Image();
                    img.onload = () => { images.current[k] = img; res(); };
                    img.onerror = res; // don't block on missing sprites
                    img.src = url;
                })
            )
        ).then(() => setLoaded(true));
    }, []);

    // ── Animation frame timer ─────────────────────────────────────────────────
    useEffect(() => {
        if (screen !== 'playing') return;
        const id = setInterval(() => setFrameTimer(t => (t + 1) % 12), 100);
        return () => clearInterval(id);
    }, [screen]);

    // ── World init ────────────────────────────────────────────────────────────
    const initWorld = useCallback(() => {
        const plats = initPlatforms();
        const newCoins = [];
        plats.forEach((p, i) => { const c = maybeAddCoin(p, i); if (c) newCoins.push(c); });
        setPlatforms(plats);
        setCoins(newCoins);
        setScore(0);
        setPlayer({
            x: 20, y: plats[0].y - PLAYER_H,
            vx: 0, vy: 0,
            isOnGround: true,
            facingRight: true,
            animState: 'idle',
        });
        input.current = { left: false, right: false, running: false, jumpPressed: false };
        wasOnGround.current = true;
    }, []);

    // ── World extension + culling (Fix 5) ─────────────────────────────────────
    // Pure function — no state reads, avoids stale closure issues
    function extendWorld(cameraX, curPlats, curCoins) {
        // Fix 5 — guard: should never be empty but just in case
        if (!curPlats || curPlats.length === 0) return { platforms: curPlats, coins: curCoins };

        let plats = [...curPlats];
        let cs = [...curCoins];

        // Generate ahead
        const rightBound = cameraX + CANVAS_W + CULL_RIGHT;
        while (plats[plats.length - 1].x + plats[plats.length - 1].w < rightBound) {
            const next = generateNextPlatform(plats[plats.length - 1]);
            plats.push(next);
            const coin = maybeAddCoin(next, plats.length);
            if (coin) cs.push(coin);
        }

        // Cull left (Fix 5)
        const leftBound = cameraX - CULL_LEFT;
        plats = plats.filter(p => p.x + p.w > leftBound);
        cs = cs.filter(c => c.x + c.w > leftBound);

        return { platforms: plats, coins: cs };
    }

    // ── Collision ─────────────────────────────────────────────────────────────
    function applyCollision(p, plats) {
        let np = { ...p, isOnGround: false };

        // Horizontal first
        np.x += np.vx;
        for (const plat of plats) {
            if (np.x < plat.x + plat.w && np.x + PLAYER_W > plat.x &&
                np.y + PLAYER_H > plat.y && np.y < plat.y + PLATFORM_H) {
                np.x = np.vx > 0 ? plat.x - PLAYER_W : plat.x + plat.w;
                np.vx = 0;
            }
        }

        // Vertical
        np.y += np.vy;
        for (const plat of plats) {
            if (np.x < plat.x + plat.w && np.x + PLAYER_W > plat.x &&
                np.y + PLAYER_H > plat.y && np.y < plat.y + PLATFORM_H) {
                if (np.vy >= 0 && np.y + PLAYER_H - np.vy <= plat.y + 4) {
                    np.vy = 0;
                    np.y = plat.y - PLAYER_H;
                    np.isOnGround = true;
                } else if (np.vy < 0) {
                    np.vy = 0;
                    np.y = plat.y + PLATFORM_H;
                }
            }
        }
        return np;
    }

    // ── Game loop ─────────────────────────────────────────────────────────────
    const gameLoop = useCallback(() => {
        if (screen !== 'playing' || !player || platforms.length === 0) return;

        const inp = input.current;
        const isRun = inp.running && (inp.left || inp.right);
        const acc = isRun ? RUN_ACC : WALK_ACC;
        const maxV = isRun ? MAX_RUN : MAX_WALK;

        let vx = player.vx;
        if (inp.left) vx -= acc;
        if (inp.right) vx += acc;
        vx = Math.sign(vx) * Math.min(Math.abs(vx), maxV);

        // Fix 1: apply strong friction when no key pressed
        const friction = player.isOnGround ? FRICTION_GROUND : FRICTION_AIR;
        if (!inp.left && !inp.right) vx *= friction;
        // Fix 1: snap to zero below threshold to eliminate sliding
        if (Math.abs(vx) < 0.05) vx = 0;

        let vy = player.vy + GRAVITY;
        if (inp.jumpPressed && player.isOnGround) {
            vy = JUMP_POWER;
            inp.jumpPressed = false;
            playSound('jump');
        }

        let np = applyCollision({ ...player, vx, vy }, platforms);

        // Landing SFX
        if (np.isOnGround && !wasOnGround.current) playSound('land');
        wasOnGround.current = np.isOnGround;

        // Facing
        if (inp.left) np.facingRight = false;
        if (inp.right) np.facingRight = true;

        // Animation state
        const moving = inp.left || inp.right;
        const jumping = !np.isOnGround;
        if (jumping && isRun) np.animState = 'runJump';
        else if (jumping) np.animState = 'walkJump';
        else if (isRun && moving) {
            np.animState = 'run';
            // Throttle run sfx — play tiap ~300ms bukan tiap frame
            runSoundTimer.current++;
            if (runSoundTimer.current >= 18) { playSound('run'); runSoundTimer.current = 0; }
        }
        else if (moving) { np.animState = 'walk'; runSoundTimer.current = 0; }
        else { np.animState = 'idle'; runSoundTimer.current = 0; }

        setPlayer(np);

        // Coin collection
        let earned = 0;
        const updCoins = coins.map(c => {
            if (c.collected) return c;
            if (np.x < c.x + c.w && np.x + PLAYER_W > c.x &&
                np.y < c.y + c.h && np.y + PLAYER_H > c.y) {
                earned++;
                playSound('coin');
                return { ...c, collected: true };
            }
            return c;
        });
        if (earned) { setScore(s => s + earned); setCoins(updCoins); }

        // Camera
        const cameraX = Math.max(0, np.x + PLAYER_W / 2 - CANVAS_W / 2);

        // Extend/cull world
        const { platforms: newPlats, coins: newCoins } = extendWorld(cameraX, platforms, earned ? updCoins : coins);
        setPlatforms(newPlats);
        if (newCoins !== (earned ? updCoins : coins)) setCoins(newCoins);

        // Death
        if (np.y > CANVAS_H + 60) {
            playSound('die');
            stopBGM();
            setScreen('gameover');
            return;
        }

        // ── Draw ──────────────────────────────────────────────────────────────
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        sky.addColorStop(0, '#87CEEB');
        sky.addColorStop(1, '#c9e8f5');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const ox = -cameraX; // draw offset

        // Platforms
        newPlats.forEach(plat => {
            const img = images.current[PLATFORM_TYPES[plat.type].imgKey];
            if (img) ctx.drawImage(img, plat.x + ox, plat.y, plat.w, PLATFORM_H);
            else {
                ctx.fillStyle = '#4a7c3f';
                ctx.fillRect(plat.x + ox, plat.y, plat.w, PLATFORM_H);
            }
        });

        // Coins
        newCoins.forEach(c => {
            if (c.collected) return;
            const img = images.current['sprite_coinstill.png'];
            if (img) ctx.drawImage(img, c.x + ox, c.y, c.w, c.h);
            else {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(c.x + c.w / 2 + ox, c.y + c.h / 2, 7, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Player sprite — Fix 2: draw at natural proportions
        const frame = Math.floor(frameTimer / 4) % 3;
        let spriteKey = 'sprite_stand.png';
        const anim = np.animState;
        if (anim === 'walk') spriteKey = frame < 2 ? 'sprite_walk1.png' : 'sprite_walk2.png';
        else if (anim === 'run') spriteKey = `sprite_run${frame}.png`;
        else if (anim === 'walkJump') spriteKey = 'sprite_walkjum.png';
        else if (anim === 'runJump') spriteKey = `sprite_runjum${frame}.png`;

        const pImg = images.current[spriteKey];
        ctx.save();
        if (pImg) {
            // Fix 2: use natural image size to avoid stretching
            const sw = pImg.naturalWidth || PLAYER_W;
            const sh = pImg.naturalHeight || PLAYER_H;
            // Scale so height = PLAYER_H, maintain aspect ratio
            const scale = PLAYER_H / sh;
            const drawW = sw * scale;
            const drawH = PLAYER_H;
            const drawX = np.x + ox + (PLAYER_W - drawW) / 2; // center in hitbox
            const drawY = np.y;

            if (!np.facingRight) {
                ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
                ctx.scale(-1, 1);
                ctx.drawImage(pImg, -drawW / 2, -drawH / 2, drawW, drawH);
            } else {
                ctx.drawImage(pImg, drawX, drawY, drawW, drawH);
            }
        } else {
            // Fallback rect
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(np.x + ox, np.y, PLAYER_W, PLAYER_H);
        }
        ctx.restore();

        // HUD
        ctx.font = 'bold 18px "Courier New"';
        ctx.fillStyle = '#222';
        ctx.fillText(`⭐ ${score + earned}`, 16, 32);

    }, [screen, player, platforms, coins, score, frameTimer]);

    // Animation loop
    useEffect(() => {
        if (screen !== 'playing' || !imagesLoaded) return;
        const step = () => { gameLoop(); animIdRef.current = requestAnimationFrame(step); };
        animIdRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animIdRef.current);
    }, [gameLoop, screen, imagesLoaded]);

    // Cleanup BGM saat unmount
    useEffect(() => { return () => stopBGM(); }, []);

    // Keyboard
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = true;
            if (e.key === 'Shift') input.current.running = true;
            if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !input.current.jumpPressed) {
                e.preventDefault();
                input.current.jumpPressed = true;
            }
        };
        const up = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = false;
            if (e.key === 'Shift') input.current.running = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    // ── Start game ────────────────────────────────────────────────────────────
    const startGame = () => {
        initWorld();
        setScreen('playing');
        playBGM();
    };

    // ── SCREENS ───────────────────────────────────────────────────────────────

    // Landing screen (Fix 4)
    if (screen === 'landing') {
        return (
            <div style={styles.landingRoot}>
                <div style={styles.landingCard}>
                    <div style={styles.landingTitle}>🐧 Pixel Adventure</div>
                    <div style={styles.landingSubtitle}>An infinite side-scrolling coin collector</div>
                    <div style={styles.landingDesc}>
                        Run and jump across procedurally generated platforms.<br />
                        Collect as many ⭐ coins as you can — the game never ends!
                    </div>
                    <button
                        style={styles.playBtn}
                        onClick={startGame}
                        disabled={!imagesLoaded}
                    >
                        {imagesLoaded ? '▶  PLAY' : 'Loading…'}
                    </button>
                    <div style={styles.controls}>
                        <div style={styles.controlsTitle}>Controls</div>
                        <div style={styles.controlRow}><kbd style={styles.kbd}>← A</kbd><kbd style={styles.kbd}>→ D</kbd> Move</div>
                        <div style={styles.controlRow}><kbd style={styles.kbd}>↑ W</kbd><kbd style={styles.kbd}>Space</kbd> Jump</div>
                        <div style={styles.controlRow}><kbd style={styles.kbd}>Shift</kbd> Run</div>
                    </div>
                </div>
            </div>
        );
    }

    // Game over screen
    if (screen === 'gameover') {
        return (
            <div style={styles.landingRoot}>
                <div style={styles.landingCard}>
                    <div style={{ fontSize: 48 }}>💀</div>
                    <div style={styles.landingTitle}>Game Over</div>
                    <div style={{ fontSize: 20, color: '#ffd700', margin: '12px 0 24px' }}>Score: {score} ⭐</div>
                    <button style={styles.playBtn} onClick={startGame}>▶  PLAY AGAIN</button>
                </div>
            </div>
        );
    }

    // Playing
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#111', width: '100%', height: '100%',
            boxSizing: 'border-box', padding: 0, margin: 0, overflow: 'hidden',
        }}>
            <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{
                    maxWidth: '100%', maxHeight: 'calc(100% - 32px)',
                    border: '2px solid #444', borderRadius: 4,
                    boxShadow: '0 0 20px rgba(0,0,0,0.8)',
                    display: 'block',
                }}
            />
            <div style={{ height: 28, display: 'flex', gap: 20, color: '#666', fontSize: 12, fontFamily: 'monospace', alignItems: 'center', flexShrink: 0 }}>
                <span>← → — move</span>
                <span>Shift — run</span>
                <span>↑ W Space — jump</span>
            </div>
        </div>
    );
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles = {
    landingRoot: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        fontFamily: "'Courier New', monospace",
    },
    landingCard: {
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '40px 48px', textAlign: 'center', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)', color: '#fff',
    },
    landingTitle: { fontSize: 36, fontWeight: 800, letterSpacing: 2, marginBottom: 8 },
    landingSubtitle: { fontSize: 14, color: '#aaa', marginBottom: 20 },
    landingDesc: { fontSize: 14, color: '#ccc', lineHeight: 1.8, marginBottom: 28 },
    playBtn: {
        background: 'linear-gradient(135deg, #f7971e, #ffd200)',
        border: 'none', borderRadius: 10, padding: '14px 40px',
        fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#111',
        boxShadow: '0 4px 20px rgba(255,210,0,0.4)', marginBottom: 28,
        letterSpacing: 1, transition: 'filter 0.2s',
    },
    controls: {
        background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
    },
    controlsTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#888', marginBottom: 4 },
    controlRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: '#ccc' },
    kbd: {
        background: '#333', border: '1px solid #555', borderRadius: 4,
        padding: '2px 8px', fontSize: 12, color: '#fff', fontFamily: 'monospace',
    },
};