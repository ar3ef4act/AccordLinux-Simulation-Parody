import { resolvePath } from '../utils/PathUtils.js';

export async function touchCommand({ system, args }) {
    const targets = args.filter(arg => !arg.startsWith('-'));
    const state = system.getState();

    if (targets.length === 0) {
        return {
            type: 'error',
            content: 'touch: missing file operand'
        };
    }

    const { writeFile, vfs } = state;

    for (const target of targets) {
        const resolved = resolvePath(state.cwd, target);

        // Buat file hanya jika belum ada
        if (!(resolved in vfs)) {
            writeFile(resolved, '');
        } else {
            return {
                type: 'error',
                content: `touch: '${target}': File already exists`
            };
        }
    }

    return {
        type: 'output',
        content: ''
    };
}