/**
 * curl.js
 * Simulasi curl untuk Accord OS.
 *
 * Usage:
 *   curl <url> -o <dest>
 *   curl <url> --output <dest>
 *
 * Koneksi butuh: router terhubung + eth0 up + eth0 punya IP.
 * Konten internet didefinisikan di src/internet/pointer.js.
 */

import { internetPointer } from '../../internet/pointer.js';

// ── Connectivity check ────────────────────────────────────────────────────────

function checkConnectivity(hardwareState, interfaces) {
    if (!hardwareState.router?.enable)
        return 'curl: (7) Failed to connect (LAN cable not connected)';
    if (!interfaces.eth0?.up)
        return 'curl: (7) Failed to connect (eth0 is down)';
    if (!interfaces.eth0?.addr)
        return 'curl: (7) Failed to connect — (no IP on eth0)';
    return null;
}

// ── Arg parser ────────────────────────────────────────────────────────────────

function parseArgs(args) {
    let url  = null;
    let dest = null;
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === '-o' || args[i] === '--output') && args[i + 1]) {
            dest = args[++i];
        } else if (!args[i].startsWith('-')) {
            url = args[i];
        }
    }
    return { url, dest };
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function simulateProgress(downloadTime, size, onOutput) {
    return new Promise(resolve => {
        const steps    = 20;
        const interval = Math.max(50, downloadTime / steps);
        let   step     = 0;

        const id = setInterval(() => {
            step++;
            const pct  = Math.round((step / steps) * 100);
            const done = Math.round(pct / 5);
            const bar  = '█'.repeat(done) + '░'.repeat(20 - done);
            onOutput(`\r  [${bar}] ${String(pct).padStart(3)}%  ${size}`);
            if (step >= steps) {
                clearInterval(id);
                onOutput('\n');
                resolve();
            }
        }, interval);
    });
}

// ── Main command ──────────────────────────────────────────────────────────────

export async function curlCommand({ system, args, onOutput }) {
    if (!args.length) {
        return { type: 'error', content: 'Usage: curl <url> -o <destination>' };
    }

    const { url, dest } = parseArgs(args);
    if (!url)  return { type: 'error', content: 'curl: no URL specified' };
    if (!dest) return { type: 'error', content: 'curl: no output destination (-o) specified' };

    const state = system.getState();
    const { hardwareState, interfaces, writeFile, makeDir } = state;

    // Cek konektivitas
    const connErr = checkConnectivity(hardwareState, interfaces);
    if (connErr) return { type: 'error', content: connErr };

    // Resolve URL
    const entry = internetPointer[url];
    if (!entry) {
        return { type: 'error', content: `curl: (6) Could not resolve host: '${url}'` };
    }

    // Resolve dest path and normalize it to avoid odd '/./' or duplicate slashes
    const initialDest = dest.startsWith('/') ? dest : `${state.cwd}/${dest}`;
    const normalize = (p) => {
        let s = p.replace(/\/\/+/g, '/');
        s = s.replace(/\/\.\//g, '/');
        s = s.replace(/\/\.$/, '/');
        if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
        return s === '' ? '/' : s;
    };
    const resolvedDest = normalize(initialDest);

    const emit = typeof onOutput === 'function' ? onOutput : () => {};

    emit(`Connecting to ${new URL(url).hostname}... (via ${interfaces.eth0.addr})\n`);

    // Simulasi progress
    await simulateProgress(entry.downloadTime ?? 1000, entry.size ?? '?', emit);

    // Tulis ke VFS
    if (entry.type === 'dir') {
        makeDir(resolvedDest);
        // Tulis semua children
        for (const [filename, child] of Object.entries(entry.children ?? {})) {
            const childPath = `${resolvedDest}/${filename}`;
            writeFile(childPath, child.content ?? '', child.extension ?? '');
        }
        const count = Object.keys(entry.children ?? {}).length;
        return {
            type:    'output',
            content: `Saved to '${resolvedDest}/' (${count} files, ${entry.size})`,
        };
    }

    // Single file
    writeFile(resolvedDest, entry.content ?? '', entry.extension ?? '');
    return {
        type:    'output',
        content: `Saved to '${resolvedDest}' (${entry.size})`,
    };
}