const GAME_LIBRARY = [
    { id: 'pixeladventure', title: 'Pixel Adventure', type: 'gui', aliases: ['pixeladventure', 'pixel'] },
    { id: 'loc', title: 'Labyrinth of Confuse', type: 'gui', aliases: ['labyrinth', 'loc'] },
    { id: 'snake', title: 'Snake CLI', type: 'cli', aliases: ['snake', 'snake-cli', 'snake cli'] },
    { id: 'spacewars', title: 'Space Wars', type: 'pixel', aliases: ['space', 'spaceship'] },
];
const GAMES_PACKAGE_MARKER = "/src/ABAL/accord-games.pkg"
function isGamesInstalled(vfs) {
    return !!vfs[GAMES_PACKAGE_MARKER];
}

function findGame(name) {
    const normalized = name.trim().toLowerCase();
    if (/^\d+$/.test(normalized)) {
        const index = parseInt(normalized, 10) - 1;
        return GAME_LIBRARY[index] || null;
    }

    return GAME_LIBRARY.find((game) =>
        game.id === normalized ||
        game.title.toLowerCase() === normalized ||
        game.aliases.some((alias) => alias === normalized)
    );
}

function listGames() {
    return GAME_LIBRARY.map((game, index) => `${index + 1}. ${game.title}`).join('\n');
}

export async function runGamesCommand({ system, args, execOptions = {} }) {
    const state = system.getState();
    const name = args.join(' ').trim();
    const gamesInstalled = isGamesInstalled(state.vfs);
    if (!gamesInstalled) {
        return {
            type: 'error',
            content: `Accord Games package is not installed.\nSee Documentation of Repository for further Information.`
        };
    }

    if (!name) {
        if (execOptions.inWindow) {
            // don't switch global view when invoked from an embedded terminal
            return {
                type: 'output',
                content: `Opening CLI games list (in-window)...\nAvailable games:\n${listGames()}\nUse run-games <number|name> to select.`
            };
        }
        system.setState({ view: 'games-cli', gameLaunchRequest: false });
        return {
            type: 'output',
            content: `Opening CLI games list...\nAvailable games:\n${listGames()}\nUse run-games <number|name> to select.`
        };
    }

    const game = findGame(name);
    if (!game) {
        return {
            type: 'error',
            content: `Game not found: ${name}.`
        };
    }

    let messageViewLabel = '';
    if (execOptions.inWindow) {
        system.setState({ activeGame: game.id, gameLaunchRequest: true });
        messageViewLabel = game.type === 'cli' ? 'CLI (in-window)' : 'GUI (in-window)';
    } else {
        const view = game.type === 'cli' ? 'games-cli' : 'games';
        system.setState({ view, activeGame: game.id, gameLaunchRequest: true });
        messageViewLabel = view === 'games-cli' ? 'CLI games' : 'GUI games';
    }

    return {
        type: 'output',
        content: `Opening ${messageViewLabel} view and launching ${game.title}...`
    };
}
