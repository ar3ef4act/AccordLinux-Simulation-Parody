import { resolvePath } from '../utils/PathUtils.js';

export async function catCommand({ system, args }) {
    const state = system.getState();
    if (!args[0]) return { type: 'error', content: 'cat: missing file operand' };
    const target = args[0];
    const resolved = resolvePath(state.cwd, target);
    if (!state.vfs[resolved]) {
        return { type: 'error', content: `cat: ${target}: No such file or directory` };
    }
    if (state.vfs[resolved].type === 'dir') {
        return { type: 'error', content: `cat: ${target}: Is a directory` };
    }
    return { type: 'output', content: state.vfs[resolved].content };
}