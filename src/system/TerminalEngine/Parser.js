export function parseCommand(input) {
    const trimmed = input.trim();

    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);

    return {
        command: parts[0],
        args: parts.slice(1)
    };
}

