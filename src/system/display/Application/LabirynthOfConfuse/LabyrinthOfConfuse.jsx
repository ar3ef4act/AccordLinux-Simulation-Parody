import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playBGM as _playBGM, stopBGM as _stopBGM, playSound as _playSound } from '../../sound';
import bgm from './sfx/bgm_loc.mp3';
import sfxFire from './sfx/fireshot.mp3';
import sfxReload from './sfx/reload.mp3';
import sfxBlade from './sfx/blade.mp3';
import sfxDamage from './sfx/damage.mp3';

const AUDIO = {
    bgm,
    fire: sfxFire,
    reload: sfxReload,
    blade: sfxBlade,
    damage: sfxDamage
};

function playBGM() {
    _playBGM(AUDIO.bgm);
}

function stopBGM() {
    _stopBGM();
}

const lastSoundTime = {};
function playSound(key) {
    const now = performance.now();
    if (lastSoundTime[key] && now - lastSoundTime[key] < 80) return;
    lastSoundTime[key] = now;
    _playSound(AUDIO[key] || key);
}
// ── GAME CONFIG ───────────────────────────────────────────────────────────────
const CONFIG = {
    title: 'Labyrinth of Confuse',
    fps: 60,
    // World
    CHUNK_SIZE: 40,
    SAFE_RADIUS: 20,
    GEN_RADIUS: 80,
    CLEANUP_RADIUS: 120,
    CELL_SIZE: 5,
    WALL_HEIGHT: 8,          // ← was 3, now tall enough to block sightlines
    // Player
    PLAYER_SPEED: 8,
    PLAYER_RUN: 14,
    PLAYER_JUMP: 7,
    GRAVITY: 18,
    PLAYER_HP: 100,
    // Firearms (LMB)
    MELEE_RANGE: 2.5,
    MELEE_DAMAGE: 35,
    MELEE_COOLDOWN: 0.5,
    BULLET_SPEED: 40,
    BULLET_DAMAGE: 25,
    MAX_AMMO: 30,
    START_AMMO: 30,
    RELOAD_TIME: 2.0,
    FIRE_RATE: 0.15,
    // Blade close combat (RMB) — one-hit kill, longer cooldown
    BLADE_RANGE: 3.2,
    BLADE_COOLDOWN: 1.2,
    // Enemies
    ENEMY_SPEED: 3.2,
    ENEMY_HP_BASE: 60,
    ENEMY_DAMAGE: 10,
    ENEMY_ATTACK_CD: 1.2,
    ENEMY_RANGE: 1.8,
    SPAWN_INTERVAL: 3.5,
    MAX_ENEMIES: 35,
    // Ranged enemy (tier 3)
    RANGED_SHOOT_RANGE: 22,
    RANGED_SHOOT_CD: 2.2,
    RANGED_BULLET_SPD: 14,
    RANGED_BULLET_DMG: 15,
    // Difficulty
    DIFF_INTERVAL: 30,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LabyrinthOfConfuse({ onExit, startSignal, displaySource }) {

    const [screen, setScreen] = useState('landing');
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(CONFIG.PLAYER_HP);
    const [ammo, setAmmo] = useState(CONFIG.START_AMMO);
    const [reloading, setReloading] = useState(false);
    const [kills, setKills] = useState(0);
    const [wave, setWave] = useState(1);
    const [dmgFlash, setDmgFlash] = useState(false);
    const [bladeReady, setBladeReady] = useState(true);   // blade cooldown indicator
    const [weapon, setWeapon] = useState('gun');  // 'gun' | 'blade' for crosshair style

    const mountRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(null);
    const threeRef = useRef(null);

    useEffect(() => {
        if (startSignal !== undefined) handleRestart();
    }, [startSignal]);

    const handleRestart = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        destroyThree();
        setScreen('landing');
        setScore(0); setHp(CONFIG.PLAYER_HP);
        setAmmo(CONFIG.START_AMMO); setReloading(false);
        setKills(0); setWave(1); setDmgFlash(false);
        setBladeReady(true); setWeapon('gun');
        stateRef.current = null;
        stopBGM();
    }, []);

    const handleStart = useCallback(() => {
        setScore(0); setHp(CONFIG.PLAYER_HP);
        setAmmo(CONFIG.START_AMMO); setReloading(false);
        setKills(0); setWave(1); setDmgFlash(false);
        setBladeReady(true); setWeapon('gun');
        setScreen('playing');
        playBGM();
    }, []);

    useEffect(() => {
        if (screen !== 'playing') return;
        initThree();
        return () => {
            cancelAnimationFrame(rafRef.current);
            destroyThree();
        };
    }, [screen]);

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        destroyThree();
        stopBGM();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    function destroyThree() {
        const t = threeRef.current;
        if (!t) return;
        if (t.renderer) { t.renderer.dispose(); t.renderer.forceContextLoss(); }
        try { document.exitPointerLock(); } catch (e) { }
        threeRef.current = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INIT THREE
    // ─────────────────────────────────────────────────────────────────────────
    function initThree() {
        if (!mountRef.current) return;

        // Load Three.js only once
        if (window.THREE) { bootGame(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = bootGame;
        document.head.appendChild(script);

        function bootGame() {
            if (!mountRef.current) return;
            const THREE = window.THREE;
            const W = mountRef.current.clientWidth || 800;
            const H = mountRef.current.clientHeight || 500;

            // ── Renderer ──────────────────────────────────────────────────────
            const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.setSize(W, H);
            renderer.setClearColor(0x1a1a2e);  // ← brighter background
            renderer.shadowMap.enabled = false;
            mountRef.current.appendChild(renderer.domElement);
            const canvas = renderer.domElement;
            canvas.style.cursor = 'none';
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            // ── Scene + Fog ───────────────────────────────────────────────────
            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x1a2040, 18, 75);  // ← brighter fog

            // ── Camera ────────────────────────────────────────────────────────
            const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 200);
            camera.position.set(0, 1.7, 0);

            // ── Lights (brighter) ─────────────────────────────────────────────
            const ambient = new THREE.AmbientLight(0x4466aa, 1.1);   // ← was 0.6
            scene.add(ambient);
            const dirLight = new THREE.DirectionalLight(0x88aaff, 1.2); // ← was 0.8
            dirLight.position.set(10, 20, 10);
            scene.add(dirLight);
            // Extra fill light from below for less cave-like feel
            const fillLight = new THREE.DirectionalLight(0x334466, 0.4);
            fillLight.position.set(-5, 2, -10);
            scene.add(fillLight);

            // ── Game State ────────────────────────────────────────────────────
            const gs = {
                playerPos: new THREE.Vector3(0, 1.7, 0),
                playerVel: new THREE.Vector3(),
                yaw: 0,
                pitch: 0,
                onGround: false,
                hp: CONFIG.PLAYER_HP,
                ammo: CONFIG.START_AMMO,
                reloading: false,
                reloadTimer: 0,
                meleeCd: 0,
                bladeCd: 0,          // RMB blade cooldown
                score: 0,
                kills: 0,
                wave: 1,
                diffTimer: 0,
                spawnTimer: 0,
                chunks: new Map(),
                enemies: [],
                bullets: [],         // player bullets
                enemyBullets: [],         // enemy ranged bullets
                loot: [],
                keys: {},
                locked: false,
                elapsed: 0,
                muzzleTimer: 0,
                bladeSwing: 0,          // blade visual timer
            };
            stateRef.current = gs;

            // ── Materials (brighter palette) ──────────────────────────────────
            const MAT = {
                crate: new THREE.MeshLambertMaterial({ color: 0x8b6030 }),  // warmer brown
                concrete: new THREE.MeshLambertMaterial({ color: 0x505468 }),  // blue-grey
                barrier: new THREE.MeshLambertMaterial({ color: 0x3a6e3a }),  // green
                pillar: new THREE.MeshLambertMaterial({ color: 0x445566 }),
                wall: new THREE.MeshLambertMaterial({ color: 0x2e3050 }),  // navy
                container: new THREE.MeshLambertMaterial({ color: 0x2a5a2a }),  // green steel
                ammoBox: new THREE.MeshLambertMaterial({ color: 0xffdd00, emissive: 0x664400 }),
                bullet: new THREE.MeshLambertMaterial({ color: 0xffee44, emissive: 0xffaa00 }),
                // melee enemy: red-orange
                enemy0: new THREE.MeshLambertMaterial({ color: 0xdd3333, emissive: 0x330000 }),
                // brute: orange
                enemy1: new THREE.MeshLambertMaterial({ color: 0xee7722, emissive: 0x331100 }),
                // ranged shooter: cyan-teal  ← new type
                enemy2: new THREE.MeshLambertMaterial({ color: 0x22ccdd, emissive: 0x004455 }),
                muzzle: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xff8800 }),
                // enemy projectile: hot pink/magenta
                eBullet: new THREE.MeshLambertMaterial({ color: 0xff44aa, emissive: 0xaa0066 }),
                // blade slash visual
                blade: new THREE.MeshLambertMaterial({ color: 0xaaddff, emissive: 0x2266aa, transparent: true, opacity: 0.75 }),
                floor: new THREE.MeshLambertMaterial({ color: 0x1c1c30 }),
            };

            // ── Floor ─────────────────────────────────────────────────────────
            const floorGeo = new THREE.PlaneGeometry(500, 500);
            const floor = new THREE.Mesh(floorGeo, MAT.floor);
            floor.rotation.x = -Math.PI / 2;
            scene.add(floor);

            // ── RNG ───────────────────────────────────────────────────────────
            function rng(a, b, seed) {
                let x = Math.sin(a * 127.1 + b * 311.7 + seed * 74.3) * 43758.5453;
                return x - Math.floor(x);
            }

            // ── Chunk generation ──────────────────────────────────────────────
            function chunkKey(cx, cz) { return `${cx},${cz}`; }

            function generateChunk(cx, cz) {
                const key = chunkKey(cx, cz);
                if (gs.chunks.has(key)) return;

                const group = new THREE.Group();
                group.position.set(cx * CONFIG.CHUNK_SIZE, 0, cz * CONFIG.CHUNK_SIZE);
                scene.add(group);

                const obstacles = [];

                if (rng(cx, cz, 1) > 0.35) addBorderWall(group, cx, cz, obstacles);

                const halfC = CONFIG.CHUNK_SIZE / 2;
                const cells = CONFIG.CHUNK_SIZE / CONFIG.CELL_SIZE;
                for (let gx = 0; gx < cells; gx++) {
                    for (let gz = 0; gz < cells; gz++) {
                        if (rng(cx * 100 + gx, cz * 100 + gz, 0) > 0.72) continue;
                        const lx = -halfC + gx * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE * 0.5 + (rng(gx, gz, 2) * 2 - 1);
                        const lz = -halfC + gz * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE * 0.5 + (rng(gz, gx, 3) * 2 - 1);
                        if (cx === 0 && cz === 0 && Math.abs(lx) < 8 && Math.abs(lz) < 8) continue;
                        const type = Math.floor(rng(cx + gx, cz + gz, 4) * 6);
                        placeObstacle(group, cx, cz, lx, lz, type, obstacles);
                    }
                }

                const lootCount = Math.floor(rng(cx, cz, 9) * 3) + 1;
                for (let i = 0; i < lootCount; i++) {
                    const lx = (rng(cx * 7 + i, cz, 5) - 0.5) * (CONFIG.CHUNK_SIZE - 4);
                    const lz = (rng(cx, cz * 7 + i, 6) - 0.5) * (CONFIG.CHUNK_SIZE - 4);
                    spawnAmmoBox(cx * CONFIG.CHUNK_SIZE + lx, cz * CONFIG.CHUNK_SIZE + lz);
                }

                gs.chunks.set(key, { group, obstacles, cx, cz });
            }

            function addBorderWall(group, cx, cz, obstacles) {
                const h = CONFIG.CHUNK_SIZE;
                const wH = CONFIG.WALL_HEIGHT;   // ← now 8
                const t = 0.6;
                const sides = [
                    [0, h / 2, h, t, wH, t],
                    [0, -h / 2, h, t, wH, t],
                    [h / 2, 0, t, h, wH, t],
                    [-h / 2, 0, t, h, wH, t],
                ];
                sides.forEach(([lx, lz, sx, sy, sz]) => {
                    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), MAT.wall);
                    m.position.set(lx, sy / 2, lz);
                    group.add(m);
                    const wx = cx * CONFIG.CHUNK_SIZE + lx;
                    const wz = cz * CONFIG.CHUNK_SIZE + lz;
                    obstacles.push({ minX: wx - sx / 2, maxX: wx + sx / 2, minZ: wz - sz / 2, maxZ: wz + sz / 2 });
                });
            }

            function placeObstacle(group, cx, cz, lx, lz, type, obstacles) {
                let sx, h, sz, mat;
                switch (type) {
                    case 0: sx = 1.3; h = 1.3; sz = 1.3; mat = MAT.crate; break;
                    case 1: sx = 2.2; h = 1.1; sz = 2.2; mat = MAT.concrete; break;
                    case 2: sx = 4.0; h = 0.9; sz = 0.6; mat = MAT.barrier; break;
                    case 3: sx = 0.6; h = 3.5; sz = 0.6; mat = MAT.pillar; break;
                    case 4: sx = 2.2; h = 2.0; sz = 0.5; mat = MAT.wall; break;
                    case 5: sx = 2.2; h = 1.8; sz = 1.1; mat = MAT.container; break;
                    default: sx = 1.0; h = 1.0; sz = 1.0; mat = MAT.crate;
                }
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), mat);
                mesh.position.set(lx, h / 2, lz);
                group.add(mesh);
                const wx = cx * CONFIG.CHUNK_SIZE + lx;
                const wz = cz * CONFIG.CHUNK_SIZE + lz;
                obstacles.push({ minX: wx - sx / 2 - 0.3, maxX: wx + sx / 2 + 0.3, minZ: wz - sz / 2 - 0.3, maxZ: wz + sz / 2 + 0.3 });
            }

            function spawnAmmoBox(wx, wz) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), MAT.ammoBox);
                mesh.position.set(wx, 0.28, wz);
                scene.add(mesh);
                gs.loot.push({ mesh, wx, wz, amount: 10 });
            }

            // ── Enemy spawning ────────────────────────────────────────────────
            // tier 0 = melee red, tier 1 = brute orange (melee+tougher), tier 2 = ranged cyan
            function spawnEnemy() {
                if (gs.enemies.length >= CONFIG.MAX_ENEMIES) return;
                const px = gs.playerPos.x, pz = gs.playerPos.z;
                const fwdX = -Math.sin(gs.yaw), fwdZ = -Math.cos(gs.yaw);

                let ex, ez, attempts = 0;
                do {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = CONFIG.SAFE_RADIUS + Math.random() * 30;
                    ex = px + Math.cos(angle) * dist;
                    ez = pz + Math.sin(angle) * dist;
                    const dx = ex - px, dz = ez - pz;
                    const len = Math.sqrt(dx * dx + dz * dz);
                    const dot = (dx / len) * fwdX + (dz / len) * fwdZ;
                    attempts++;
                    if (dot < 0.7) break;
                } while (attempts < 10);

                // Decide type: after wave 4, 30% chance ranged
                const waveRangedChance = Math.min(0.35, (gs.wave - 3) * 0.07);
                const isRanged = gs.wave >= 4 && Math.random() < waveRangedChance;
                const tier = isRanged ? 2 : Math.min(Math.floor(gs.wave / 4), 1);

                const hp = CONFIG.ENEMY_HP_BASE * (1 + tier * 0.8) * (1 + gs.wave * 0.1);
                const spd = CONFIG.ENEMY_SPEED * (isRanged ? 0.7 : 1 + tier * 0.2);
                const mats = [MAT.enemy0, MAT.enemy1, MAT.enemy2];
                const size = isRanged ? 0.85 : (0.8 + tier * 0.2);

                const geo = new THREE.BoxGeometry(size, size * 1.4, size);
                const mesh = new THREE.Mesh(geo, mats[tier]);
                mesh.position.set(ex, size * 0.7, ez);
                scene.add(mesh);

                gs.enemies.push({
                    mesh, hp, maxHp: hp, speed: spd, tier,
                    isRanged,
                    attackCd: 0,
                    shootCd: CONFIG.RANGED_SHOOT_CD * Math.random(), // stagger first shot
                    wanderAngle: Math.random() * Math.PI * 2,
                    wanderTimer: 0,
                });
            }

            // ── Player bullets ────────────────────────────────────────────────
            const bulletGeo = new THREE.SphereGeometry(0.08, 4, 4);

            function fireBullet() {
                if (gs.ammo <= 0 || gs.reloading) return; // TODO: play empty-click sound
                gs.ammo--;
                setAmmo(gs.ammo);
                playSound('fire');
                const dir = new THREE.Vector3(0, 0, -1);
                dir.applyEuler(new THREE.Euler(gs.pitch, gs.yaw, 0, 'YXZ'));
                const mesh = new THREE.Mesh(bulletGeo, MAT.bullet);
                mesh.position.copy(gs.playerPos).add(new THREE.Vector3(0, -0.1, 0));
                scene.add(mesh);
                gs.bullets.push({ mesh, dir: dir.clone(), life: 3, speed: CONFIG.BULLET_SPEED });
                gs.muzzleTimer = 0.08;
            }

            // ── Enemy bullets ─────────────────────────────────────────────────
            const eBulletGeo = new THREE.SphereGeometry(0.12, 4, 4);

            function fireEnemyBullet(e) {
                const dx = gs.playerPos.x - e.mesh.position.x;
                const dy = gs.playerPos.y - e.mesh.position.y;
                const dz = gs.playerPos.z - e.mesh.position.z;
                const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (len === 0) return;
                const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
                const mesh = new THREE.Mesh(eBulletGeo, MAT.eBullet);
                mesh.position.copy(e.mesh.position).add(new THREE.Vector3(0, 0.2, 0));
                scene.add(mesh);
                gs.enemyBullets.push({ mesh, dir, life: 4, speed: CONFIG.RANGED_BULLET_SPD });
                // TODO: play enemy-shoot sound
            }

            // ── Muzzle flash ──────────────────────────────────────────────────
            const muzzleMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 4, 4), MAT.muzzle
            );
            muzzleMesh.visible = false;
            scene.add(muzzleMesh);

            // ── Blade slash visual (RMB) ──────────────────────────────────────
            const bladeGeo = new THREE.BoxGeometry(0.1, 0.1, CONFIG.BLADE_RANGE);
            const bladeMesh = new THREE.Mesh(bladeGeo, MAT.blade);
            bladeMesh.visible = false;
            scene.add(bladeMesh);

            // ── Melee (LMB fallback when no ammo) ────────────────────────────
            function doMelee() {
                if (gs.meleeCd > 0) return;
                gs.meleeCd = CONFIG.MELEE_COOLDOWN;
                // TODO: play melee sound
                const px = gs.playerPos.x, pz = gs.playerPos.z;
                const fwdX = -Math.sin(gs.yaw), fwdZ = -Math.cos(gs.yaw);
                gs.enemies.forEach(e => {
                    const dx = e.mesh.position.x - px, dz = e.mesh.position.z - pz;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < CONFIG.MELEE_RANGE && (dx / dist) * fwdX + (dz / dist) * fwdZ > 0.3)
                        damageEnemy(e, CONFIG.MELEE_DAMAGE);
                });
            }

            // ── Blade (RMB) — ONE HIT KILL ────────────────────────────────────
            function doBlade() {
                if (gs.bladeCd > 0) return;
                gs.bladeCd = CONFIG.BLADE_COOLDOWN;
                setBladeReady(false);
                playSound('blade');
                const px = gs.playerPos.x, pz = gs.playerPos.z;
                const fwdX = -Math.sin(gs.yaw), fwdZ = -Math.cos(gs.yaw);
                // Kill ALL enemies in blade arc
                for (let i = gs.enemies.length - 1; i >= 0; i--) {
                    const e = gs.enemies[i];
                    const dx = e.mesh.position.x - px, dz = e.mesh.position.z - pz;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < CONFIG.BLADE_RANGE) {
                        const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
                        if (dot > 0.25) killEnemy(e); // wide arc (~104°)
                    }
                }
                // Blade visual
                gs.bladeSwing = 0.2;
            }

            function damageEnemy(e, dmg) {
                e.hp -= dmg;
                if (e.hp <= 0) killEnemy(e);
            }

            function killEnemy(e) {
                // TODO: play enemy death sound
                scene.remove(e.mesh);
                e.mesh.geometry.dispose();
                const idx = gs.enemies.indexOf(e);
                if (idx !== -1) gs.enemies.splice(idx, 1);
                gs.kills++;
                gs.score += 100 * (e.tier + 1) * gs.wave;
                setKills(gs.kills);
                setScore(gs.score);
            }

            function damagePlayer(dmg) {
                gs.hp -= dmg;
                setHp(Math.max(0, gs.hp));
                setDmgFlash(true);
                playSound('damage');
                setTimeout(() => setDmgFlash(false), 150);
                if (gs.hp <= 0) {
                    setScreen('gameover');
                    stateRef.current = null;
                    stopBGM();
                }
            }

            // ── Collision ─────────────────────────────────────────────────────
            function resolvePlayerCollision(newX, newZ) {
                const r = 0.4;
                let rx = newX, rz = newZ;
                for (const chunk of gs.chunks.values()) {
                    for (const o of chunk.obstacles) {
                        if (rx + r > o.minX && rx - r < o.maxX && rz + r > o.minZ && rz - r < o.maxZ) {
                            const overlapX = Math.min(rx + r - o.minX, o.maxX - (rx - r));
                            const overlapZ = Math.min(rz + r - o.minZ, o.maxZ - (rz - r));
                            if (overlapX < overlapZ) rx = (rx < (o.minX + o.maxX) / 2) ? o.minX - r : o.maxX + r;
                            else rz = (rz < (o.minZ + o.maxZ) / 2) ? o.minZ - r : o.maxZ + r;
                        }
                    }
                }
                return [rx, rz];
            }

            // ── Resize ────────────────────────────────────────────────────────
            const onResize = () => {
                if (!mountRef.current) return;
                const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
                renderer.setSize(w, h);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            };
            window.addEventListener('resize', onResize);

            // ── Input ─────────────────────────────────────────────────────────
            const onKeyDown = (e) => { gs.keys[e.code] = true; };
            const onKeyUp = (e) => { gs.keys[e.code] = false; };
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);

            const onMouseMove = (e) => {
                if (!gs.locked) return;
                gs.yaw -= e.movementX * 0.002;
                gs.pitch -= e.movementY * 0.002;
                gs.pitch = Math.max(-1.2, Math.min(1.2, gs.pitch));
            };
            window.addEventListener('mousemove', onMouseMove);

            canvas.addEventListener('click', () => canvas.requestPointerLock());
            document.addEventListener('pointerlockchange', () => {
                gs.locked = document.pointerLockElement === canvas;
            });

            const onMouseDown = (e) => {
                if (!gs.locked) return;
                if (e.button === 0) gs.keys['Fire'] = true;
                if (e.button === 2) gs.keys['Blade'] = true;   // RMB
            };
            const onMouseUp = (e) => {
                if (e.button === 0) gs.keys['Fire'] = false;
                if (e.button === 2) gs.keys['Blade'] = false;
            };
            window.addEventListener('mousedown', onMouseDown);
            window.addEventListener('mouseup', onMouseUp);
            canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // block right-click menu

            const onKeyDownExtra = (e) => {
                if (e.code === 'KeyR' && !gs.reloading && gs.ammo < CONFIG.MAX_AMMO) {
                    gs.reloading = true;
                    gs.reloadTimer = CONFIG.RELOAD_TIME;
                    setReloading(true);
                }
                if (e.code === 'Escape') try { document.exitPointerLock(); } catch (ex) { }
            };
            window.addEventListener('keydown', onKeyDownExtra);

            // ── GAME LOOP ─────────────────────────────────────────────────────
            let lastTime = performance.now();
            let fireDelay = 0;
            let bladeEdge = false; // edge trigger for blade (one press per hold)

            function loop(now) {
                if (!stateRef.current) return;
                rafRef.current = requestAnimationFrame(loop);
                const dt = Math.min((now - lastTime) / 1000, 0.05);
                lastTime = now;
                gs.elapsed += dt;

                const px = gs.playerPos.x, pz = gs.playerPos.z;

                // ── Chunk management ──────────────────────────────────────────
                const cpx = Math.round(px / CONFIG.CHUNK_SIZE);
                const cpz = Math.round(pz / CONFIG.CHUNK_SIZE);
                const genR = Math.ceil(CONFIG.GEN_RADIUS / CONFIG.CHUNK_SIZE);
                for (let dx = -genR; dx <= genR; dx++)
                    for (let dz = -genR; dz <= genR; dz++)
                        generateChunk(cpx + dx, cpz + dz);

                for (const [key, chunk] of gs.chunks) {
                    const wx = chunk.cx * CONFIG.CHUNK_SIZE, wz = chunk.cz * CONFIG.CHUNK_SIZE;
                    if (Math.hypot(wx - px, wz - pz) > CONFIG.CLEANUP_RADIUS) {
                        scene.remove(chunk.group);
                        gs.chunks.delete(key);
                    }
                }

                // ── Difficulty ────────────────────────────────────────────────
                gs.diffTimer += dt;
                if (gs.diffTimer >= CONFIG.DIFF_INTERVAL) {
                    gs.diffTimer = 0; gs.wave++;
                    setWave(gs.wave);
                    // TODO: play wave-up sound
                }

                // ── Player movement ───────────────────────────────────────────
                const run = gs.keys['ShiftLeft'] || gs.keys['ShiftRight'];
                const speed = run ? CONFIG.PLAYER_RUN : CONFIG.PLAYER_SPEED;
                const fwdX = -Math.sin(gs.yaw), fwdZ = -Math.cos(gs.yaw);
                const rightX = Math.cos(gs.yaw), rightZ = -Math.sin(gs.yaw);

                let moveX = 0, moveZ = 0;
                if (gs.keys['KeyW'] || gs.keys['ArrowUp']) { moveX += fwdX; moveZ += fwdZ; }
                if (gs.keys['KeyS'] || gs.keys['ArrowDown']) { moveX -= fwdX; moveZ -= fwdZ; }
                if (gs.keys['KeyA'] || gs.keys['ArrowLeft']) { moveX -= rightX; moveZ -= rightZ; }
                if (gs.keys['KeyD'] || gs.keys['ArrowRight']) { moveX += rightX; moveZ += rightZ; }
                const mLen = Math.hypot(moveX, moveZ);
                if (mLen > 0) { moveX /= mLen; moveZ /= mLen; }

                gs.playerVel.x = moveX * speed;
                gs.playerVel.z = moveZ * speed;

                if (gs.keys['Space'] && gs.onGround) {
                    gs.playerVel.y = CONFIG.PLAYER_JUMP;
                    gs.onGround = false;
                }
                gs.playerVel.y -= CONFIG.GRAVITY * dt;

                let newX = px + gs.playerVel.x * dt;
                let newZ = pz + gs.playerVel.z * dt;
                let newY = gs.playerPos.y + gs.playerVel.y * dt;
                if (newY <= 1.7) { newY = 1.7; gs.playerVel.y = 0; gs.onGround = true; }
                [newX, newZ] = resolvePlayerCollision(newX, newZ);
                gs.playerPos.set(newX, newY, newZ);

                camera.position.copy(gs.playerPos);
                camera.rotation.order = 'YXZ';
                camera.rotation.y = gs.yaw;
                camera.rotation.x = gs.pitch;

                // ── Weapon cooldowns ──────────────────────────────────────────
                gs.meleeCd = Math.max(0, gs.meleeCd - dt);
                const wasBladeOnCd = gs.bladeCd > 0;
                gs.bladeCd = Math.max(0, gs.bladeCd - dt);
                if (wasBladeOnCd && gs.bladeCd === 0) setBladeReady(true); // re-enable indicator

                // LMB — shoot or melee fallback
                if (gs.keys['Fire']) {
                    if (gs.ammo > 0 && !gs.reloading) {
                        fireDelay -= dt;
                        if (fireDelay <= 0) { fireBullet(); fireDelay = CONFIG.FIRE_RATE; }
                    } else if (!gs.reloading) {
                        doMelee();
                    }
                } else {
                    fireDelay = 0;
                }

                // RMB — blade one-hit kill (edge triggered)
                if (gs.keys['Blade']) {
                    if (!bladeEdge) { doBlade(); bladeEdge = true; }
                } else {
                    bladeEdge = false;
                }

                // Reload timer
                if (gs.reloading) {
                    gs.reloadTimer -= dt;
                    if (gs.reloadTimer <= 0) {
                        gs.ammo = CONFIG.MAX_AMMO;
                        gs.reloading = false;
                        setAmmo(gs.ammo);
                        setReloading(false);
                        playSound('reload');
                    }
                }

                // ── Player bullets ────────────────────────────────────────────
                for (let i = gs.bullets.length - 1; i >= 0; i--) {
                    const b = gs.bullets[i];
                    b.life -= dt;
                    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
                    let hit = false;
                    for (const e of gs.enemies) {
                        const dx = b.mesh.position.x - e.mesh.position.x;
                        const dy = b.mesh.position.y - e.mesh.position.y;
                        const dz = b.mesh.position.z - e.mesh.position.z;
                        if (dx * dx + dy * dy + dz * dz < 0.9) { damageEnemy(e, CONFIG.BULLET_DAMAGE); hit = true; break; }
                    }
                    if (b.life <= 0 || hit) { scene.remove(b.mesh); b.mesh.geometry.dispose(); gs.bullets.splice(i, 1); }
                }

                // ── Enemy bullets ─────────────────────────────────────────────
                for (let i = gs.enemyBullets.length - 1; i >= 0; i--) {
                    const b = gs.enemyBullets[i];
                    b.life -= dt;
                    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
                    const dx = b.mesh.position.x - gs.playerPos.x;
                    const dy = b.mesh.position.y - gs.playerPos.y;
                    const dz = b.mesh.position.z - gs.playerPos.z;
                    if (dx * dx + dy * dy + dz * dz < 0.6) {
                        if (stateRef.current) damagePlayer(CONFIG.RANGED_BULLET_DMG);
                        scene.remove(b.mesh); b.mesh.geometry.dispose(); gs.enemyBullets.splice(i, 1);
                        if (!stateRef.current) return;
                        continue;
                    }
                    if (b.life <= 0) { scene.remove(b.mesh); b.mesh.geometry.dispose(); gs.enemyBullets.splice(i, 1); }
                }

                // ── Muzzle flash ──────────────────────────────────────────────
                gs.muzzleTimer -= dt;
                if (gs.muzzleTimer > 0) {
                    muzzleMesh.visible = true;
                    const mDir = new THREE.Vector3(0, -0.15, -0.8);
                    mDir.applyEuler(new THREE.Euler(gs.pitch, gs.yaw, 0, 'YXZ'));
                    muzzleMesh.position.copy(gs.playerPos).addScaledVector(mDir, 1.0);
                } else {
                    muzzleMesh.visible = false;
                }

                // ── Blade swing visual ────────────────────────────────────────
                gs.bladeSwing = Math.max(0, gs.bladeSwing - dt);
                if (gs.bladeSwing > 0) {
                    bladeMesh.visible = true;
                    const bDir = new THREE.Vector3(0, 0, -1);
                    bDir.applyEuler(new THREE.Euler(gs.pitch, gs.yaw, 0, 'YXZ'));
                    bladeMesh.position.copy(gs.playerPos).addScaledVector(bDir, CONFIG.BLADE_RANGE / 2);
                    bladeMesh.rotation.order = 'YXZ';
                    bladeMesh.rotation.y = gs.yaw;
                    bladeMesh.rotation.x = gs.pitch;
                    bladeMesh.material.opacity = gs.bladeSwing / 0.2 * 0.75;
                } else {
                    bladeMesh.visible = false;
                }

                // ── Enemy spawning ────────────────────────────────────────────
                gs.spawnTimer -= dt;
                if (gs.spawnTimer <= 0) {
                    gs.spawnTimer = Math.max(0.8, CONFIG.SPAWN_INTERVAL - gs.wave * 0.15);
                    const count = Math.ceil(gs.wave / 3);
                    for (let i = 0; i < count; i++) spawnEnemy();
                }

                // ── Enemy AI ──────────────────────────────────────────────────
                for (let i = gs.enemies.length - 1; i >= 0; i--) {
                    const e = gs.enemies[i];
                    if (!e) continue;
                    const ex = e.mesh.position.x, ez = e.mesh.position.z;
                    const dist = Math.hypot(ex - gs.playerPos.x, ez - gs.playerPos.z);

                    e.attackCd = Math.max(0, e.attackCd - dt);

                    if (e.isRanged) {
                        // ── Ranged enemy AI ────────────────────────────────────
                        e.shootCd = Math.max(0, e.shootCd - dt);

                        if (dist > CONFIG.RANGED_SHOOT_RANGE * 0.6) {
                            // approach but keep distance
                            const dx = gs.playerPos.x - ex, dz = gs.playerPos.z - ez;
                            const len = Math.hypot(dx, dz);
                            e.mesh.position.x += (dx / len) * e.speed * dt;
                            e.mesh.position.z += (dz / len) * e.speed * dt;
                        } else if (dist < CONFIG.RANGED_SHOOT_RANGE * 0.3) {
                            // too close, back away
                            const dx = ex - gs.playerPos.x, dz = ez - gs.playerPos.z;
                            const len = Math.hypot(dx, dz);
                            e.mesh.position.x += (dx / len) * e.speed * dt;
                            e.mesh.position.z += (dz / len) * e.speed * dt;
                        }

                        if (dist < CONFIG.RANGED_SHOOT_RANGE && e.shootCd <= 0) {
                            e.shootCd = CONFIG.RANGED_SHOOT_CD;
                            fireEnemyBullet(e);
                        }
                    } else {
                        // ── Melee enemy AI ─────────────────────────────────────
                        if (dist > 10) {
                            e.wanderTimer -= dt;
                            if (e.wanderTimer <= 0) { e.wanderAngle += (Math.random() - 0.5) * 1.5; e.wanderTimer = 1 + Math.random(); }
                            const toX = (gs.playerPos.x - ex) / dist, toZ = (gs.playerPos.z - ez) / dist;
                            const wX = Math.cos(e.wanderAngle), wZ = Math.sin(e.wanderAngle);
                            const bX = wX * 0.3 + toX * 0.7, bZ = wZ * 0.3 + toZ * 0.7;
                            const bL = Math.hypot(bX, bZ);
                            e.mesh.position.x += (bX / bL) * e.speed * dt;
                            e.mesh.position.z += (bZ / bL) * e.speed * dt;
                        } else {
                            const dx = gs.playerPos.x - ex, dz = gs.playerPos.z - ez;
                            const len = Math.hypot(dx, dz);
                            e.mesh.position.x += (dx / len) * e.speed * 1.4 * dt;
                            e.mesh.position.z += (dz / len) * e.speed * 1.4 * dt;
                        }

                        if (dist < CONFIG.ENEMY_RANGE && e.attackCd <= 0) {
                            e.attackCd = CONFIG.ENEMY_ATTACK_CD;
                            // TODO: play enemy-attack sound
                            if (stateRef.current) damagePlayer(CONFIG.ENEMY_DAMAGE);
                            if (!stateRef.current) return;
                        }
                    }

                    // Cleanup far enemies
                    if (dist > CONFIG.CLEANUP_RADIUS) {
                        scene.remove(e.mesh); e.mesh.geometry.dispose(); gs.enemies.splice(i, 1); continue;
                    }

                    // Face player + bob
                    e.mesh.rotation.y = Math.atan2(gs.playerPos.x - ex, gs.playerPos.z - ez);
                    e.mesh.position.y = (e.mesh.geometry.parameters.height * 0.7) + Math.sin(gs.elapsed * 3 + ex) * 0.07;
                }

                // ── Loot ─────────────────────────────────────────────────────
                for (let i = gs.loot.length - 1; i >= 0; i--) {
                    const l = gs.loot[i];
                    if (Math.hypot(l.wx - gs.playerPos.x, l.wz - gs.playerPos.z) < 1.5) {
                        gs.ammo = Math.min(CONFIG.MAX_AMMO, gs.ammo + l.amount);
                        setAmmo(gs.ammo);
                        playSound('reload');
                        scene.remove(l.mesh); l.mesh.geometry.dispose(); gs.loot.splice(i, 1);
                    } else {
                        l.mesh.position.y = 0.28 + Math.sin(gs.elapsed * 2 + i) * 0.1;
                        l.mesh.rotation.y += dt * 1.5;
                    }
                }

                // ── Render ────────────────────────────────────────────────────
                renderer.render(scene, camera);
            }

            rafRef.current = requestAnimationFrame(loop);

            threeRef.current = {
                renderer,
                cleanup: () => {
                    window.removeEventListener('keydown', onKeyDown);
                    window.removeEventListener('keyup', onKeyUp);
                    window.removeEventListener('keydown', onKeyDownExtra);
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mousedown', onMouseDown);
                    window.removeEventListener('mouseup', onMouseUp);
                    window.removeEventListener('resize', onResize);
                    try { document.exitPointerLock(); } catch (e) { }
                    renderer.dispose();
                    if (mountRef.current && renderer.domElement.parentNode === mountRef.current)
                        mountRef.current.removeChild(renderer.domElement);
                }
            };
        }

        return () => {
            const t = threeRef.current;
            if (t?.cleanup) t.cleanup();
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCREENS
    // ─────────────────────────────────────────────────────────────────────────

    if (screen === 'landing') return (
        <div style={S.root}>
            <div style={S.card}>
                <div style={{ fontSize: 52, marginBottom: 4 }}>☠️</div>
                <div style={S.title}>Labyrinth of Confuse</div>
                <div style={S.sub}>Endless Survival Shooter</div>
                <div style={S.desc}>
                    Survive waves of monsters in a procedurally generated arena.
                    Collect ammo, fight back, and last as long as you can.
                </div>
                <button style={S.playBtn} onClick={handleStart}>▶ PLAY</button>
                <div style={S.controls}>
                    <div style={S.controlsTitle}>Controls</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>WASD</kbd> Move</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>Shift</kbd> Run</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>Space</kbd> Jump</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>LMB</kbd> Shoot (gun)</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>RMB</kbd> Blade — 1 hit kill</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>R</kbd> Reload</div>
                    <div style={S.controlRow}><kbd style={S.kbd}>ESC</kbd> Release Mouse</div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#445566' }}>
                    🔵 Cyan enemies shoot — stay behind cover!
                </div>
            </div>
        </div>
    );

    if (screen === 'gameover') return (
        <div style={S.root}>
            <div style={S.card}>
                <div style={{ fontSize: 52 }}>💀</div>
                <div style={S.title}>You Died</div>
                <div style={{ fontSize: 13, color: '#667788', margin: '4px 0 16px' }}>Wave {wave} reached</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#445566', letterSpacing: 1 }}>SCORE</div>
                        <div style={{ fontSize: 28, color: '#ffd700', fontWeight: 800 }}>{score.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#445566', letterSpacing: 1 }}>KILLS</div>
                        <div style={{ fontSize: 28, color: '#ff5555', fontWeight: 800 }}>{kills}</div>
                    </div>
                </div>
                <button style={S.playBtn} onClick={handleStart}>▶ PLAY AGAIN</button>
                {onExit && (
                    <button style={{ ...S.playBtn, background: '#1e2030', color: '#889aaa', marginTop: 8 }} onClick={onExit}>
                        ← Back to Launcher
                    </button>
                )}
            </div>
        </div>
    );

    // Playing
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#1a1a2e', overflow: 'hidden' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

            {/* Crosshair — changes shape based on blade-ready */}
            <div style={S.crosshair}>
                <div style={S.crossH} />
                <div style={S.crossV} />
                {bladeReady && <div style={S.crossBladeIndicator} />}
            </div>

            {/* Damage vignette */}
            {dmgFlash && <div style={S.dmgFlash} />}

            {/* HUD — top left: HP / Wave / Kills */}
            <div style={S.hud}>
                <div style={S.hudRow}>
                    <span style={{ color: hp > 40 ? '#66ee88' : '#ff5555' }}>❤ {hp}</span>
                    <span style={{ color: '#ffcc44' }}>🌊 W{wave}</span>
                    <span style={{ color: '#55aaff' }}>💀 {kills}</span>
                </div>
                <div style={{ fontSize: 11, color: '#556677', marginTop: 2 }}>Score: {score.toLocaleString()}</div>
            </div>

            {/* Ammo HUD — bottom LEFT (moved from right) */}
            <div style={S.ammoHud}>
                {reloading
                    ? <span style={{ color: '#ffaa33', animation: 'pulse 0.5s infinite' }}>RELOADING…</span>
                    : <>
                        <span style={{ color: ammo > 5 ? '#eef' : '#ff5555', fontSize: 20, fontWeight: 800 }}>{ammo}</span>
                        <span style={{ color: '#445566', fontSize: 11 }}>/ {CONFIG.MAX_AMMO}</span>
                    </>
                }
                <div style={{ fontSize: 10, color: bladeReady ? '#55ddff' : '#2a3a44', marginTop: 3, letterSpacing: 1 }}>
                    {bladeReady ? '⚔ BLADE READY' : '⚔ COOLDOWN'}
                </div>
            </div>

            <div style={S.hint}>LMB shoot · RMB 1-hit blade · R reload · ESC release mouse</div>

            <style>{`
                @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
            `}</style>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
    root: {
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d0d1e, #16203a, #0d1824)',
        fontFamily: "'Courier New', monospace",
    },
    card: {
        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(100,140,200,0.2)', borderRadius: 16,
        padding: '36px 44px', textAlign: 'center', maxWidth: 460,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)', color: '#ccd8ee',
    },
    title: { fontSize: 28, fontWeight: 800, letterSpacing: 3, marginBottom: 4, color: '#ddeeff' },
    sub: { fontSize: 11, letterSpacing: 4, color: '#3a5066', textTransform: 'uppercase', marginBottom: 16 },
    desc: { fontSize: 12, color: '#6688aa', lineHeight: 1.9, marginBottom: 24 },
    playBtn: {
        display: 'block', width: '100%', padding: '13px 0',
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
        background: 'linear-gradient(135deg, #bb2222, #ff5544)',
        border: 'none', borderRadius: 8, color: '#fff',
        boxShadow: '0 4px 24px rgba(200,50,50,0.4)', marginBottom: 0,
        fontFamily: 'monospace', letterSpacing: 2,
    },
    controls: { background: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: '14px 18px', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 7 },
    controlsTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#334455', marginBottom: 4 },
    controlRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: '#7899bb' },
    kbd: { background: '#1a2030', border: '1px solid #2a3550', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#99bbdd', fontFamily: 'monospace' },
    hud: {
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(0,0,0,0.55)', padding: '7px 14px',
        borderRadius: 8, fontFamily: 'monospace', fontSize: 13,
        pointerEvents: 'none', zIndex: 10,
        border: '1px solid rgba(80,120,180,0.15)',
    },
    hudRow: { display: 'flex', gap: 16, alignItems: 'center' },
    // ← AMMO HUD now bottom-LEFT, not right
    ammoHud: {
        position: 'absolute', bottom: 30, left: 16,
        background: 'rgba(0,0,0,0.55)', padding: '7px 14px',
        borderRadius: 8, fontFamily: 'monospace',
        pointerEvents: 'none', zIndex: 10, display: 'flex',
        flexDirection: 'column', alignItems: 'flex-start', gap: 2,
        border: '1px solid rgba(80,120,180,0.15)',
    },
    crosshair: {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        pointerEvents: 'none', zIndex: 20,
    },
    crossH: {
        position: 'absolute', top: '50%', left: -10,
        width: 20, height: 1.5, background: 'rgba(200,230,255,0.8)',
        transform: 'translateY(-50%)',
    },
    crossV: {
        position: 'absolute', top: -10, left: '50%',
        width: 1.5, height: 20, background: 'rgba(200,230,255,0.8)',
        transform: 'translateX(-50%)',
    },
    crossBladeIndicator: {
        position: 'absolute', top: '50%', left: '50%',
        width: 6, height: 6,
        background: '#55ddff',
        borderRadius: '50%',
        transform: 'translate(-50%,-50%)',
        boxShadow: '0 0 6px #55ddff',
    },
    dmgFlash: {
        position: 'absolute', inset: 0,
        background: 'rgba(180,0,0,0.25)',
        boxShadow: 'inset 0 0 100px rgba(255,0,0,0.5)',
        pointerEvents: 'none', zIndex: 30,
    },
    hint: {
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        color: '#2a3a4a', fontSize: 10, fontFamily: 'monospace',
        pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
    },
};