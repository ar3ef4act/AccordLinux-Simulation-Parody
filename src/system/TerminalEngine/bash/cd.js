import { resolvePath } from '../utils/PathUtils.js';

export async function cdCommand({ system, args }) {
    const state = system.getState();
    const target = args[0] || '/home/player';
    const resolved = resolvePath(state.cwd, target);

    if (!state.vfs[resolved]) {
        return { type: 'error', content: `cd: ${target}: No such file or directory` };
    }
    if (state.vfs[resolved].type !== 'dir') {
        return { type: 'error', content: `cd: ${target}: Not a directory` };
    }

    system.setState({ cwd: resolved });
    return { type: 'output', content: '' };
}
