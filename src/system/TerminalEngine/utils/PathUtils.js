export function resolvePath(cwd, inputPath) {
    if (!inputPath) return cwd;

    if (inputPath.startsWith('/')) {
        return normalizePath(inputPath);
    }

    return normalizePath(
        cwd === '/'
            ? `/${inputPath}`
            : `${cwd}/${inputPath}`
    );
}

export function normalizePath(path) {
    const parts = path.split('/');
    const stack = [];

    for (const part of parts) {
        if (!part || part === '.') continue;

        if (part === '..') {
            stack.pop();
        } else {
            stack.push(part);
        }
    }

    return '/' + stack.join('/');
}