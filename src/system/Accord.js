import { create } from 'zustand';
import gccConfig from './TerminalEngine/utils/gcc/gcc-c-js-order.json';
import driverHashes from './TerminalEngine/bash/driver-hashes.json';

const initialVFS = {
    '/': { type: 'dir', content: null },
    '/home': { type: 'dir', content: null },
    '/home/player': { type: 'dir', content: null },
    '/src': { type: 'dir', content: null },
    '/src/ABAL': { type: 'dir', content: null },
    '/etc': { type: 'dir', content: null },
    '/etc/accord': { type: 'dir', content: null },
    '/var': { type: 'dir', content: null },
    '/var/log': { type: 'dir', content: null },
    '/var/log/accord': { type: 'dir', content: null },
    '/etc/accord/configuration.accord': {
        type: 'file',
        extension: 'accord',
        content: `user = {
  name = "player";
};

hardware = {
  gpu = {
    src = "";
    enable = false;
  };
  audio = {
    src = "";
    enable = false;
  };
  xland = {
    src = "";
    enable = false;
  };
  desktopEnvironment = {
    src = "";
    enable = false;
  };
  externalMonitor = {
    src = "";
    enable = false;
  };
};
`,
    },
    '/etc/accord/active.accord': {
        type: 'file',
        extension: 'accord',
        content: `user = { name = "player" };
hardware = {
  gpu                = { src = ""; enable = false; };
  audio              = { src = ""; enable = false; };
  xland              = { src = ""; enable = false; };
  desktopEnvironment = { src = ""; enable = false; };
  externalMonitor    = { src = ""; enable = false; };
};
`,
    },
    '/usr': { type: 'dir', content: null },
    '/usr/gcc': { type: 'dir', content: null },
    '/usr/gcc/destFile': { type: 'dir', content: null },
    '/home/player/README.txt': {
        type: 'file',
        extension: 'txt',
        content: `Welcome to simLinux!
Goal: Configure your Linux system to play "Super Tux".

=== Quick Start ===
1. Connect all hardware cables (click each device in the room).
2. Write a driver for each hardware (see /home/player/driver-template.c).
3. Compile: gcc driver.c -o driver.elf
4. Move to drivers folder: mv driver.elf /src/drivers/
5. Edit /etc/accord/configuration.accord — set src path and enable = true.
6. Run: accord-system rebuild
7. Type: gui  (to launch desktop) or supertux (to play)

Type "help" for all commands.
`,
    },
};

// ── ELF parser ────────────────────────────────────────────────────────────────
function getMetadataKey(elf) {
    let typeVal = elf.HARDWARE || elf.SOFTWARE;
    if (!typeVal) return null;

    const normalized = String(typeVal)
        .trim()
        .toUpperCase()
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ');

    if (normalized === 'SPEAKER') return 'Speaker';
    if (normalized === 'MONITOR' || normalized === 'EXTERNAL MONITOR') return 'External_Monitor';
    if (normalized === 'COMPUTE MACHINE') return 'Compute_Machine';
    if (normalized === 'XLAND COMPOSITOR') return 'XLAND_COMPOSITOR';
    if (normalized === 'DESKTOP ENVIRONMENT') return 'DESKTOP_ENVIRONMENT';
    return null;
}

// Baca ELF hasil gcc. Return null kalau bukan ELF valid.
function parseELF(content) {
    if (!content) return null;
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines[0] !== 'ELF_EXECUTABLE_MAGIC_FLAG') return null;

    const elf = {};
    for (let i = 1; i < lines.length; i++) {
        const eq = lines[i].indexOf('=');
        if (eq === -1) continue;
        elf[lines[i].slice(0, eq).trim()] = lines[i].slice(eq + 1).trim();
    }

    const metadataKey = getMetadataKey(elf);
    if (!metadataKey) return null;

    // Get base fields (string types from base config)
    const isHardware = elf.HARDWARE !== undefined;
    const baseConfig = gccConfig.metadata[isHardware ? 'HARDWARE' : 'SOFTWARE'] || [];
    const baseFields = baseConfig.filter(f => typeof f === 'string');

    // Get specific fields for this metadata key
    const specificConfig = gccConfig.metadata[metadataKey] || {};
    const attrFields = specificConfig.attribute || [];
    const accordAddedFields = specificConfig.accord_added || [];

    // Combine all required fields
    const required = [...baseFields, ...attrFields, ...accordAddedFields];

    for (const f of required) {
        if (elf[f] === undefined) return null;
    }
    return elf;
}

// Map key configuration.accord → nilai DRIVER di ELF
const DRIVER_KEY_MAP = {
    gpu: 'Compute Machine',
    audio: 'Speaker',
    xland: 'xland-driver',
    desktopEnvironment: 'desktop-driver',
    externalMonitor: 'External Monitor',
};

// Dependency antar hardware (nilai harus sudah true di results)
const DEPENDENCIES = {
    desktopEnvironment: ['xland'],
};

// ── Initial state ─────────────────────────────────────────────────────────────

// hardwareState: physical connection + vendor hash
// enable  = apakah kabel/perangkat terhubung (di-toggle dari room UI)
// accord  = SHA-256 hash accordlib yang diharapkan vendor (hardcoded, diisi nanti)
// attribute = SHA-256 hash attribute yang diharapkan vendor (hardcoded, diisi nanti)
// hardwareState: PHYSICAL devices only — di-toggle dari room UI, punya vendor hash
// xland & desktopEnvironment tidak ada di sini karena mereka SOFTWARE
const initialHardwareState = {
    gpu: {
        enable: false,
    },
    audio: {
        enable: false,
    },
    externalMonitor: {
        enable: false,
    },
    router: {
        enable: false,
        gateway: '192.168.10.1',
    },
};

// softwareState: SOFTWARE drivers — tidak ada physical connection
// enable tidak relevan di sini
const initialSoftwareState = {
    xland: {},
    desktopEnvironment: {},
};

// systemStatus: hasil evaluasi rebuild terakhir, dipakai React untuk render
const initialSystemStatus = {
    gpu: false,
    audio: false,
    xland: false,
    desktopEnvironment: false,
    externalMonitor: false,
    lan: true,
    router: false,
};

export const useSystemStore = create((set, get) => ({
    vfs: initialVFS,
    hardwareState: initialHardwareState,
    softwareState: initialSoftwareState,
    systemStatus: initialSystemStatus,
    systemSettings: {
        autoGui: false,
        showFps: false,
        terminalFont: 'JetBrains Mono',
        terminalSize: 13,
        colorScheme: 'catppuccin',
    },
    selectedFile: null,
    selectedFiles: [],
    anoteFileToOpen: null,

    interfaces: {
        eth0: { up: false, addr: null, prefix: null, mac: '08:00:27:01:02:03' },
        lo: { up: true, addr: '127.0.0.1', prefix: 8, mac: '00:00:00:00:00:00' },
    },

    activeApp: 'terminal',
    currentFile: null,
    currentUser: 'player',
    generations: [],
    currentGeneration: 0,
    sidebarOpen: true,
    view: 'room',
    displaySource: 'laptop', // 'laptop' | 'monitor'
    activeGame: null,
    gameLaunchRequest: false,

    // Desktop UI persisted state (so windows survive view switches)
    desktopOpenWindows: [], // array of window descriptors { id, baseId, name, icon, type, canResize, contentBoxSize }
    desktopMinimizedWindows: [],
    desktopActiveWindow: null,
    // counters to generate unique instance ids when compute machine enabled
    desktopWindowCounters: {},
    // Terminal sessions persistence (keyed by session id)
    terminalSessions: {},
    // Control whether multiple instances of the same app are allowed.
    // Previously this behavior was tied to `hardwareState.gpu.enable`, which
    // could change unexpectedly; using an explicit flag avoids accidental
    // duplicate windows when GPU toggles.
    allowMultipleInstances: false,

    // ── UI actions ────────────────────────────────────────────────────────────
    setView: (view) => set({ view }),
    setSystemSetting: (key, val) => set((state) => ({
        systemSettings: {
            ...state.systemSettings,
            [key]: val,
        },
    })),
    setSelectedFile: (selectedFile) => set({ selectedFile }),
    setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
    setAnoteFileToOpen: (anoteFileToOpen) => set({ anoteFileToOpen }),
    setAllowMultipleInstances: (v) => set({ allowMultipleInstances: !!v }),
    setDisplaySource: (source) => set({ displaySource: source }),
    setGameLaunchRequest: (gameLaunchRequest) => set({ gameLaunchRequest }),
    setSidebarOpen: (v) => set({ sidebarOpen: v }),
    setActiveApp: (app) => set({ activeApp: app }),
    setActiveGame: (activeGame) => set({ activeGame }),
    openEditor: (path) => set({ activeApp: 'editor', currentFile: path }),
    closeEditor: () => set({ activeApp: 'terminal', currentFile: null }),

    // Desktop window management (persisted)
    // `app` is an object: { id, name, icon, type, canResize, contentBoxSize }
    openDesktopWindow: (app) => set((state) => {
        const computeOn = !!state.allowMultipleInstances;
        const baseId = app.id;

        // single-instance behavior when compute machine is disabled
        if (!computeOn) {
            // if already open, focus it
            const existingOpen = state.desktopOpenWindows.find(w => w.baseId === baseId);
            if (existingOpen) {
                return { desktopActiveWindow: existingOpen.id };
            }
            // if minimized, restore it
            const existingMin = state.desktopMinimizedWindows.find(w => w.baseId === baseId);
            if (existingMin) {
                const newMin = state.desktopMinimizedWindows.filter(w => w.id !== existingMin.id);
                const newOpen = [...state.desktopOpenWindows, existingMin];
                return { desktopMinimizedWindows: newMin, desktopOpenWindows: newOpen, desktopActiveWindow: existingMin.id };
            }
            // else create single instance with base id
            const instanceId = baseId;
            const wnd = { ...app, id: instanceId, baseId };
            return { desktopOpenWindows: [...state.desktopOpenWindows, wnd], desktopActiveWindow: instanceId };
        }

        // compute machine enabled: allow multiple instances
        const next = (state.desktopWindowCounters[baseId] || 0) + 1;
        const instanceId = `${baseId}#${next}`;
        const wnd = { ...app, id: instanceId, baseId };
        return {
            desktopOpenWindows: [...state.desktopOpenWindows, wnd],
            desktopWindowCounters: { ...state.desktopWindowCounters, [baseId]: next },
            desktopActiveWindow: instanceId,
        };
    }),

    closeDesktopWindow: (id) => set((state) => ({
        desktopOpenWindows: state.desktopOpenWindows.filter(w => w.id !== id),
        desktopMinimizedWindows: state.desktopMinimizedWindows.filter(w => w.id !== id),
        desktopActiveWindow: state.desktopActiveWindow === id ? null : state.desktopActiveWindow,
    })),

    minimizeDesktopWindow: (id) => set((state) => {
        const found = state.desktopOpenWindows.find(w => w.id === id);
        if (!found) return state;
        return {
            desktopOpenWindows: state.desktopOpenWindows.filter(w => w.id !== id),
            desktopMinimizedWindows: state.desktopMinimizedWindows.find(w => w.id === id) ? state.desktopMinimizedWindows : [...state.desktopMinimizedWindows, found],
            desktopActiveWindow: state.desktopActiveWindow === id ? null : state.desktopActiveWindow,
        };
    }),

    restoreDesktopWindow: (id) => set((state) => {
        const found = state.desktopMinimizedWindows.find(w => w.id === id);
        if (!found) return state;
        if (state.desktopOpenWindows.find(w => w.id === id)) {
            return { desktopMinimizedWindows: state.desktopMinimizedWindows.filter(w => w.id !== id), desktopActiveWindow: id };
        }
        return {
            desktopMinimizedWindows: state.desktopMinimizedWindows.filter(w => w.id !== id),
            desktopOpenWindows: [...state.desktopOpenWindows, found],
            desktopActiveWindow: id,
        };
    }),

    setDesktopActiveWindow: (id) => set({ desktopActiveWindow: id }),

    // Persist terminal session partial state. `sessionId` is a string, `partial` is an object
    // containing any of: history (array), inputHistory (array), cwd (string)
    setTerminalSession: (sessionId, partial) => set((state) => ({
        terminalSessions: {
            ...state.terminalSessions,
            [sessionId]: {
                ...(state.terminalSessions[sessionId] || {}),
                ...partial,
            },
        },
    })),

    // ── Progression: Load & Reset ─────────────────────────────────────────────
    // Restore saved game state from Firestore snapshot
    loadState: (saved) => set({
        vfs: saved.vfs ?? initialVFS,
        hardwareState: saved.hardwareState ?? initialHardwareState,
        softwareState: saved.softwareState ?? initialSoftwareState,
        systemStatus: saved.systemStatus ?? initialSystemStatus,
        systemSettings: saved.systemSettings ?? {
            autoGui: false,
            showFps: false,
            terminalFont: 'JetBrains Mono',
            terminalSize: 13,
            colorScheme: 'catppuccin',
        },
        selectedFile: saved.selectedFile ?? null,
        selectedFiles: saved.selectedFiles ?? [],
        anoteFileToOpen: saved.anoteFileToOpen ?? null,
        generations: saved.generations ?? [],
        currentUser: saved.currentUser ?? (saved.generations && saved.generations.length ? saved.generations[saved.generations.length - 1].user : 'player'),
        activeGame: saved.activeGame ?? null,
        gameLaunchRequest: saved.gameLaunchRequest ?? false,
        interfaces: saved.interfaces ?? {
            eth0: { up: false, addr: null, prefix: null, mac: '08:00:27:01:02:03' },
            lo: { up: true, addr: '127.0.0.1', prefix: 8, mac: '00:00:00:00:00:00' },
        },
        currentGeneration: saved.generations?.length ?? 0,
    }),

    // Reset to fresh initial state (New Game)
    resetState: () => set({
        vfs: initialVFS,
        hardwareState: initialHardwareState,
        softwareState: initialSoftwareState,
        systemStatus: initialSystemStatus,
        systemSettings: {
            autoGui: false,
            showFps: false,
            terminalFont: 'JetBrains Mono',
            terminalSize: 13,
            colorScheme: 'catppuccin',
        },
        selectedFile: null,
        selectedFiles: [],
        anoteFileToOpen: null,
        generations: [],
        currentGeneration: 0,
        interfaces: {
            eth0: { up: false, addr: null, prefix: null, mac: '08:00:27:01:02:03' },
            lo: { up: true, addr: '127.0.0.1', prefix: 8, mac: '00:00:00:00:00:00' },
        },
        activeApp: 'terminal',
        currentFile: null,
        currentUser: 'player',
        sidebarOpen: true,
        view: 'room',
        displaySource: 'laptop',
        activeGame: null,
        gameLaunchRequest: false,
        desktopOpenWindows: [],
        desktopMinimizedWindows: [],
        desktopActiveWindow: null,
        desktopWindowCounters: {},
        terminalSessions: {},
        allowMultipleInstances: false,
    }),

    // Toggle physical connection dari room UI
    // Hanya mengubah enable, tidak menyentuh hash vendor
    toggleHardware: (device) => set((state) => {
        const nextEnable = !state.hardwareState[device]?.enable;
        const newHardwareState = {
            ...state.hardwareState,
            [device]: {
                ...state.hardwareState[device],
                enable: nextEnable,
            },
        };
        const newSystemStatus = { ...state.systemStatus };
        if (device === 'router' || device === 'lan') {
            newSystemStatus.lan = nextEnable;
            newHardwareState.router = {
                ...newHardwareState.router,
                enable: nextEnable,
            };
            // reflect router functional flag for UI immediately
            newSystemStatus.router = nextEnable;
        }
        return {
            hardwareState: newHardwareState,
            systemStatus: newSystemStatus,
        };
    }),

    // Update hardware enable state in configuration.accord file
    updateHardwareConfig: (device, enableState) => set((state) => {
        const configPath = '/etc/accord/configuration.accord';
        const currentConfig = state.vfs[configPath]?.content || '';

        // Simple regex replacement to update the enable state for the device
        const updatedConfig = currentConfig.replace(
            new RegExp(`(${device}\\s*=\\s*{[^}]*enable\\s*=\\s*)\\w+`, 'g'),
            `$1${enableState}`
        );

        return {
            vfs: {
                ...state.vfs,
                [configPath]: {
                    type: 'file',
                    extension: 'accord',
                    content: updatedConfig,
                },
            },
        };
    }),

    // ── VFS actions ───────────────────────────────────────────────────────────
    writeFile: (path, content, extension = '') =>
        set((state) => ({ vfs: { ...state.vfs, [path]: { type: 'file', content, extension } } })),

    makeDir: (path) =>
        set((state) => ({ vfs: { ...state.vfs, [path]: { type: 'dir', content: null } } })),

    removeNode: (path) => set((state) => {
        const newVfs = { ...state.vfs };
        Object.keys(newVfs).forEach(k => {
            if (k === path || k.startsWith(path + '/')) delete newVfs[k];
        });
        return { vfs: newVfs };
    }),

    renameNode: (oldPath, newPath) => set((state) => {
        const newVfs = { ...state.vfs };
        Object.keys(newVfs).forEach(k => {
            if (k === oldPath) {
                newVfs[newPath] = newVfs[k]; delete newVfs[k];
            } else if (k.startsWith(oldPath + '/')) {
                newVfs[newPath + k.substring(oldPath.length)] = newVfs[k]; delete newVfs[k];
            }
        });
        return { vfs: newVfs };
    }),

    copyNode: (srcPath, destPath) => set((state) => {
        const newVfs = { ...state.vfs };
        Object.keys(state.vfs).forEach(k => {
            if (k === srcPath) {
                newVfs[destPath] = { ...state.vfs[k] };
            } else if (k.startsWith(srcPath + '/')) {
                newVfs[destPath + k.substring(srcPath.length)] = { ...state.vfs[k] };
            }
        });
        return { vfs: newVfs };
    }),

    // ── Network actions ───────────────────────────────────────────────────────
    setInterfaceState: (iface, up) => set((state) => ({
        interfaces: { ...state.interfaces, [iface]: { ...state.interfaces[iface], up } }
    })),
    setInterfaceAddr: (iface, addr) => set((state) => ({
        interfaces: { ...state.interfaces, [iface]: { ...state.interfaces[iface], addr } }
    })),
    setInterfacePrefix: (iface, prefix) => set((state) => ({
        interfaces: { ...state.interfaces, [iface]: { ...state.interfaces[iface], prefix } }
    })),
    // Set addr + prefix sekaligus (dipakai ip addr add)
    setInterfaceNetwork: (iface, addr, prefix) => set((state) => ({
        interfaces: { ...state.interfaces, [iface]: { ...state.interfaces[iface], addr, prefix } }
    })),
    // Bersihkan addr + prefix (dipakai ip addr del / ip link set down)
    clearInterfaceAddr: (iface) => set((state) => ({
        interfaces: { ...state.interfaces, [iface]: { ...state.interfaces[iface], addr: null, prefix: null } }
    })),

    // ── Generation switch ─────────────────────────────────────────────────────
    switchGeneration: (index) => set((state) => {
        const gen = state.generations[index];
        if (!gen) return state;
        return {
            systemStatus: gen.systemStatus,
            vfs: { ...state.vfs, ...gen.vfsSnapshot },
            currentGeneration: index + 1,
        };
    }),

    // ── System Rebuild ────────────────────────────────────────────────────────
    systemRebuild: (configObj) => {
        const {
            vfs, hardwareState, softwareState, generations,
            setInterfaceAddr, setInterfaceState,
        } = get();

        const user = configObj.user?.name || 'player';
        const hwConfig = configObj.hardware || {};

        const newSystemStatus = { ...initialSystemStatus };
        const rebuildLog = []; // untuk hardware.log dan accord-system output
        const vfsSnapshot = {};

        const PHYSICAL_HARDWARE_KEYS = new Set(['gpu', 'audio', 'externalMonitor', 'router', 'lan']);

        for (const [key, module] of Object.entries(hwConfig)) {
            if (key === 'network') continue;

            // Bedakan hardware (physical) vs software. XLAND and Desktop Environment are software.
            const isPhysical = PHYSICAL_HARDWARE_KEYS.has(key);
            const hw = isPhysical
                ? (hardwareState[key] ?? {})
                : (softwareState[key] ?? {});

            // 1. Tidak di-enable di config
            if (!module.enable) {
                rebuildLog.push({ key, status: false, hash: null, reason: 'disabled in configuration.accord', isPhysical });
                continue;
            }

            // 2. Physical only — cek kabel terhubung
            if (isPhysical && !hw.enable) {
                rebuildLog.push({ key, status: false, hash: null, reason: 'hardware not connected (physical)', isPhysical });
                continue;
            }

            // 3. ELF tidak ditemukan
            const driverFile = vfs[module.src];
            if (!driverFile?.content) {
                rebuildLog.push({ key, status: false, hash: null, reason: `ELF not found at '${module.src}'`, isPhysical });
                continue;
            }

            // 4. Validasi ELF magic
            const elf = parseELF(driverFile.content);
            if (!elf) {
                rebuildLog.push({ key, status: false, hash: null, reason: `'${module.src}' is not a valid ELF binary`, isPhysical });
                continue;
            }

            // 5. DRIVER field mismatch
            const expectedDriver = DRIVER_KEY_MAP[key];
            const elfDriverVal = elf.HARDWARE || elf.DRIVER || elf.SOFTWARE;
            if (expectedDriver) {
                const normalize = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').replace('external ', '').trim();
                if (normalize(elfDriverVal) !== normalize(expectedDriver)) {
                    rebuildLog.push({
                        key, status: false, hash: null,
                        reason: `DRIVER mismatch — got '${elfDriverVal}', expected '${expectedDriver}'`,
                        isPhysical,
                    });
                    continue;
                }
            }

            // 6. Hash comparison — mismatch bukan error fatal, hardware tetap di-load
            //    tapi isFunctional = false dan dicatat di debug log
            const hashWarnings = [];
            const elfAccord = elf.ACCORD_FLAG || elf.ACCORD;
            const expectedHashes = isPhysical
                ? driverHashes.hardware[key]
                : driverHashes.software[key];

            if (expectedHashes) {
                if (expectedHashes.accord && elfAccord !== expectedHashes.accord) {
                    hashWarnings.push(`ACCORD hash mismatch (ELF: ${(elfAccord || '').slice(0, 8)}... expected: ${expectedHashes.accord.slice(0, 8)}...)`);
                }
                if (expectedHashes.attribute && elf.ATTRIBUTE_FLAG !== expectedHashes.attribute) {
                    hashWarnings.push(`ATTRIBUTE_FLAG hash mismatch (ELF: ${(elf.ATTRIBUTE_FLAG || '').slice(0, 8)}... expected: ${expectedHashes.attribute.slice(0, 8)}...)`);
                }
            }
            const hashOk = hashWarnings.length === 0;

            // 7. Dependency check
            const deps = DEPENDENCIES[key] ?? [];
            const missingDep = deps.find(d => !newSystemStatus[d]);
            if (missingDep) {
                rebuildLog.push({
                    key, status: false,
                    hash: { ok: hashOk, warnings: hashWarnings },
                    reason: `dependency '${missingDep}' is not functional`,
                    isPhysical,
                });
                continue;
            }

            // 8. Semua lolos — functional (tapi hash mismatch = tetap false)
            const isFunctional = hashOk;
            newSystemStatus[key] = isFunctional;

            const driverName = elf.HARDWARE || elf.DRIVER || elf.SOFTWARE;
            rebuildLog.push({
                key,
                status: isFunctional,
                hash: { ok: hashOk, warnings: hashWarnings },
                reason: isFunctional
                    ? `OK — DRIVER=${driverName} VERSION=${elf.VERSION}`
                    : `loaded but unusable — ${hashWarnings.join('; ')}`,
                isPhysical,
                elf,
            });

            if (module.src) vfsSnapshot[module.src] = vfs[module.src];
        }

        // Network — hanya cek apakah LAN terhubung dan eth0 punya IP
        // IP diurus oleh `ip` command, bukan rebuild
        const currentEth0 = get().interfaces.eth0;
        const lanUp = hardwareState.router?.enable ?? false;
        const hasIp = !!(currentEth0.addr?.trim());
        const netActive = lanUp && currentEth0.up && hasIp;

        newSystemStatus.network = netActive;
        newSystemStatus.lan = lanUp;
        // router status: whether router device is present/connected and network is active
        newSystemStatus.router = !!(hardwareState.router?.enable && netActive);
        rebuildLog.push({
            key: 'network', status: netActive, hash: null,
            reason: !lanUp ? 'router not connected (physical)'
                : !currentEth0.up ? 'eth0 is down — run: ip link set eth0 up'
                    : !hasIp ? 'no IP assigned — run: ip addr add <ip>/24 dev eth0'
                        : `OK — ${currentEth0.addr}/${currentEth0.prefix ?? 24} via ${hardwareState.router.gateway}`,
        });

        // Tulis active.accord
        let activeHwContent = '';
        for (const [key, module] of Object.entries(hwConfig)) {
            activeHwContent += `  ${key} = { src = "${module.src ?? ''}"; enable = ${newSystemStatus[key] ?? false}; };\n`;
        }
        const activeContent = `user = { name = "${user}" };\nhardware = {\n${activeHwContent}};\n`;

        const newVfs = {
            ...vfs,
            '/etc/accord/active.accord': { type: 'file', content: activeContent, extension: 'accord' },
        };
        vfsSnapshot['/etc/accord/active.accord'] = newVfs['/etc/accord/active.accord'];

        // Tulis /var/log/accord/hardware.log
        const ts = new Date().toLocaleString();
        const genId = generations.length + 1;
        let logContent = `[${ts}] REBUILD #${genId}\n`;
        logContent += `${'─'.repeat(60)}\n`;
        for (const entry of rebuildLog) {
            const icon = entry.status ? 'OK  ' : entry.hash?.warnings?.length ? 'WARN' : 'FAIL';
            logContent += `[${icon}] ${entry.key.padEnd(22)} ${entry.reason}\n`;
            if (entry.hash?.warnings?.length) {
                for (const w of entry.hash.warnings) {
                    logContent += `       debug: ${w}\n`;
                }
            }
        }
        logContent += `${'─'.repeat(60)}\n`;

        newVfs['/var/log/accord/hardware.log'] = {
            type: 'file',
            extension: 'log',
            content: logContent,
        };
        vfsSnapshot['/var/log/accord/hardware.log'] = newVfs['/var/log/accord/hardware.log'];

        const newGen = {
            id: genId,
            timestamp: ts,
            systemStatus: { ...newSystemStatus },
            user,
            vfsSnapshot,
            rebuildLog,
        };

        set((s) => ({
            systemStatus: newSystemStatus,
            vfs: newVfs,
            currentUser: user,
            generations: [...s.generations, newGen],
            currentGeneration: genId,
        }));

        return newGen;
    },
}));