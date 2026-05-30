import { resolvePath } from '../utils/PathUtils.js';

export async function rmCommand({ system, args }) {
    if (args.length === 0) {
        return { type: 'error', content: 'rm: missing operand' };
    }
    const targets = args.filter(arg => !arg.startsWith('-'));

    const state = system.getState();
    const { removeNode } = state;

    for (const target of targets) {
        const resolved = resolvePath(state.cwd, target);

        if (state.vfs[resolved] === undefined) {
            return { type: 'error', content: `rm: cannot remove '${target}': No such file or directory` };
        } else {
            removeNode(resolved);
        }
    }

    return { type: 'output', content: '' };
}
