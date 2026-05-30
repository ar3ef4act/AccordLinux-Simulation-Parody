import { resolvePath } from './PathUtils.js';

export function prepareMoveOrCopy(state, srcRaw, destRaw) {
    const { vfs, cwd } = state;
    const srcPath = resolvePath(cwd, srcRaw);
    let destPath = resolvePath(cwd, destRaw);

    if (!vfs[srcPath]) {
        return { error: `cannot stat '${srcRaw}': No such file or directory` };
    }

    // If destination is a directory, move the source INTO it
    if (vfs[destPath] && vfs[destPath].type === 'dir') {
        const parts = srcPath.split('/').filter(Boolean);
        const basename = parts[parts.length - 1] || '';
        destPath = destPath === '/' ? `/${basename}` : `${destPath}/${basename}`;
    }

    // Prevent moving/copying a directory into itself
    if (destPath === srcPath || destPath.startsWith(srcPath + '/')) {
        return { error: `cannot move/copy '${srcPath}' to '${destPath}': Invalid destination` };
    }

    return { srcPath, destPath };
}
