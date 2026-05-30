import { resolvePath } from '../utils/PathUtils.js';

export async function lsCommand({ system, args }) {
    const state = system.getState();

    const targetPath = resolvePath(
        state.cwd,
        args[0] || state.cwd
    );

    const node = state.vfs[targetPath];

    if (!node) {
        return {
            type: 'error',
            content: `ls: cannot access '${args[0]}': No such file or directory`
        };
    }

    if (node.type === 'file') {
        return {
            type: 'output',
            content: targetPath
        };
    }

    const prefix =
        targetPath === '/'
            ? '/'
            : `${targetPath}/`;

    const children = Object.keys(state.vfs)
        .filter(k =>
            k.startsWith(prefix) &&
            k !== targetPath &&
            !k.substring(prefix.length).includes('/')
        )
        .map(k => {
            const name = k.substring(prefix.length);
            return state.vfs[k].type === 'dir'
                ? `[DIR] ${name}`
                : name;
        })
        .sort((a, b) => a.localeCompare(b));

    return {
        type: 'output',
        content: children.join('\n')
    };
}