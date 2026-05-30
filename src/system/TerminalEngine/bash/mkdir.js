import { resolvePath } from '../utils/PathUtils.js';

export async function mkdirCommand({ system, args }) {
    if (args.length === 0) {
        return { type: 'error', content: 'mkdir: missing operand' };
    }

    let parents = false;
    const targets = [];

    for (const arg of args) {
        if (arg === '-p') {
            parents = true;
        } else if (arg.startsWith('-')) {
        } else {
            targets.push(arg);
        }
    }

    if (targets.length === 0) {
        return { type: 'error', content: 'mkdir: missing operand' };
    }

    const state = system.getState();
    const { makeDir } = state;

    for (const target of targets) {
        const resolved = resolvePath(state.cwd, target);

        const currentVfs = system.getState().vfs;

        if (currentVfs[resolved]) {
            if (parents) continue;
            return { type: 'error', content: `mkdir: cannot create directory '${target}': File exists` };
        }

        if (parents) {
            const parts = resolved.split('/').filter(Boolean);
            let cur = '';
            for (const part of parts) {
                cur += '/' + part;
                if (!system.getState().vfs[cur]) {
                    makeDir(cur);
                }
            }
        } else {
            // Check if parent exists
            const parts = resolved.split('/').filter(Boolean);
            if (parts.length > 1) {
                const parentPath = '/' + parts.slice(0, -1).join('/');
                const parentNode = currentVfs[parentPath];
                if (!parentNode) {
                    return { type: 'error', content: `mkdir: cannot create directory '${target}': No such file or directory` };
                }
                if (parentNode.type !== 'dir') {
                    return { type: 'error', content: `mkdir: cannot create directory '${target}': Not a directory` };
                }
            }
            makeDir(resolved);
        }
    }

    return { type: 'output', content: '' };
}


