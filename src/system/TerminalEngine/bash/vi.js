import { resolvePath } from '../utils/PathUtils.js';

export async function viCommand({ system, args }) {
    if (!args[0]) {
        return { type: 'error', content: 'vi: missing operand' };
    }

    const state = system.getState();
    const resolved = resolvePath(state.cwd, args[0]);
    if (state.vfs[resolved] && state.vfs[resolved].type === 'dir') {
        return { type: 'error', content: `vi: ${args[0]}: Is a directory` };
    }
    state.openEditor(resolved);

    return { type: 'output', content: '' };
}
