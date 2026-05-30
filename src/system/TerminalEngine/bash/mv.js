import { prepareMoveOrCopy } from '../utils/FileSystemUtils.js';

export async function mvCommand({ system, args }) {
    if (args.length < 2) {
        return { type: 'error', content: 'mv: missing operand' };
    }

    const state = system.getState();
    const result = prepareMoveOrCopy(state, args[0], args[1]);

    if (result.error) {
        return { type: 'error', content: `mv: ${result.error}` };
    }
    const destParts = result.destPath.split('/').filter(Boolean);
    destParts.pop();
    const parentPath = destParts.length > 0 ? '/' + destParts.join('/') : '/';

    const parentNode = state.vfs[parentPath];

    if (!parentNode) {
        return {
            type: 'error',
            content: `mv: cannot move to '${result.destPath}': No such directory`
        };
    }

    if (parentNode.type !== 'dir') {
        return {
            type: 'error',
            content: `mv: destination parent is not a directory`
        };
    }

    if (state.vfs[result.destPath]) {
        return {
            type: 'error',
            content: `mv: target already exists`
        };
    }
    state.renameNode(result.srcPath, result.destPath);
    return { type: 'output', content: '' };
}