export function parseVariable(token) {
    const match = token.match(/^\$([a-zA-Z0-9_]+)(?:\[(\d+)\])?$/);
    if (!match) return null;
    return { key: match[1], index: match[2] ? parseInt(match[2]) : null, isArray: !!match[2] };
}