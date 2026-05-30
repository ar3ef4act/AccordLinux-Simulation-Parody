import { useEffect, useMemo, useState } from 'react';
import { useSystemStore } from '../../Accord';
import SnakeCLI from './SnakeCLI/SnakeCLI';
import { GAME_LIBRARY, DEPENDENCY_LABELS } from './Games';
import './GamesCLI.css';

export default function GamesCLI({ inWindow }) {
    const {
        activeGame,
        setActiveGame,
        systemStatus,
        gameLaunchRequest,
        setGameLaunchRequest,
        setView,
        vfs
    } = useSystemStore();

    const [selection, setSelection] = useState('');
    const [selectedGame, setSelectedGame] = useState(null);
    const [launchState, setLaunchState] = useState('idle');
    const [message, setMessage] = useState('Enter the number of the game to launch it.');

    const GAMES_PACKAGE_MARKER = '/src/ABAL/accord-games.pkg';
    const GAMES_DOWNLOAD_HINT = 'curl https://repo.accord.org/lib/accord-games -o /src/ABAL';
    const gamesInstalled = Boolean(vfs[GAMES_PACKAGE_MARKER]);

    const resolvedSelected = useMemo(
        () => activeGame && GAME_LIBRARY.find((game) => game.id === activeGame),
        [activeGame]
    );

    useEffect(() => {
        if (!gamesInstalled) {
            setMessage(`Accord Games package is not installed. Download it first with:\n${GAMES_DOWNLOAD_HINT}`);
            return;
        }

        if (activeGame && gameLaunchRequest) {
            const game = GAME_LIBRARY.find((item) => item.id === activeGame);
            if (!game) return;
            setSelectedGame(game);
            if (game.type !== 'cli') {
                setLaunchState('blocked');
                setMessage('This game is not available in the CLI launcher.');
            } else if (!isAvailable(game)) {
                setLaunchState('blocked');
                const missing = missingDependencies(game)
                    .map((dep) => DEPENDENCY_LABELS[dep] || dep)
                    .join(', ');
                setMessage(`Cannot launch ${game.title}. Missing dependencies: ${missing}.`);
            } else {
                setLaunchState('running');
                setMessage(`Launching ${game.title}...`);
            }
            setGameLaunchRequest(false);
        }
    }, [activeGame, gameLaunchRequest, setGameLaunchRequest, gamesInstalled]);

    const isAvailable = (game) =>
        game.dependencies.every((dep) => systemStatus[dep] === true);

    const missingDependencies = (game) =>
        game.dependencies.filter((dep) => !systemStatus[dep]);

    const handleSelect = (game) => {
        if (!gamesInstalled) {
            setMessage(`Accord Games package is not installed. Download it first with:\n${GAMES_DOWNLOAD_HINT}`);
            return;
        }

        setSelectedGame(game);
        setActiveGame(game.id);
        setLaunchState('idle');
        if (game.type !== 'cli') {
            setMessage('This game is not available in the CLI launcher.');
            return;
        }
        if (!isAvailable(game)) {
            const missing = missingDependencies(game)
                .map((dep) => DEPENDENCY_LABELS[dep] || dep)
                .join(', ');
            setMessage(`Selected ${game.title}. Missing dependencies: ${missing}.`);
            return;
        }
        setMessage(`Selected ${game.title}. Press Enter to launch.`);
    };

    const handleLaunch = (game) => {
        const target = game || resolvedSelected;
        if (!target) {
            setMessage('Pick a numbered game first.');
            return;
        }

        if (target.type !== 'cli') {
            setLaunchState('blocked');
            setMessage('This game is not available in the CLI launcher.');
            return;
        }

        if (!isAvailable(target)) {
            setLaunchState('blocked');
            const missing = missingDependencies(target)
                .map((dep) => DEPENDENCY_LABELS[dep] || dep)
                .join(', ');
            setMessage(`Cannot launch ${target.title}. Missing dependencies: ${missing}.`);
            return;
        }

        setSelectedGame(target);
        setActiveGame(target.id);
        setLaunchState('running');
        setMessage(`Launching ${target.title}...`);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const value = selection.trim();
        if (!gamesInstalled) {
            setMessage(`Accord Games package is not installed. Download it first with:\n${GAMES_DOWNLOAD_HINT}`);
            return;
        }
        if (!value) {
            setMessage('Enter a number or name to select a game.');
            return;
        }

        if (value === 'exit') {
            setView('room');
            return;
        }

        let game = null;
        if (/^\d+$/.test(value)) {
            const index = parseInt(value, 10) - 1;
            if (index < 0 || index >= GAME_LIBRARY.length) {
                setMessage(`There is no game number ${value}.`);
                return;
            }
            game = GAME_LIBRARY[index];
        }

        if (!game) {
            const normalized = value.toLowerCase();
            game = GAME_LIBRARY.find((item) =>
                item.id === normalized ||
                item.title.toLowerCase() === normalized ||
                item.aliases?.some((alias) => alias === normalized)
            );
        }

        if (!game) {
            setMessage(`There is no game named '${value}'.`);
            return;
        }

        setSelection('');
        handleSelect(game);
        if (game.type === 'cli' && isAvailable(game)) {
            handleLaunch(game);
        }
    };

    const handleSnakeExit = () => {
        setLaunchState('idle');
        setSelectedGame(null);
        setActiveGame(null);
        setMessage('Exited snake. Enter the number of the game to launch it.');
        setSelection('');
    };

    if (!gamesInstalled) {
        return (
            <div
                className={`games-launcher ${inWindow ? 'embedded' : ''}`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setView('cli');
                    }
                }}
            >
                <div className="games-cli-screen">
                    <div className="games-cli-header">Accord Games Not Installed</div>
                    <div className="games-cli-status">
                        Download the Accord Games package into <code>/src/ABAL</code> first.
                    </div>
                    <div className="games-cli-message">
                        Press Enter to exit...
                    </div>
                </div>
            </div>
        );
    }

    if (launchState === 'running' && resolvedSelected?.type === 'cli') {
        return (
            <div className={`games-launcher ${inWindow ? 'embedded' : ''}`}>
                <div className="games-cli-screen">
                    <div className="games-cli-header">CLI Games Launcher</div>
                    <div className="games-cli-status">{message}</div>
                    <div className="games-cli-runner">
                        <SnakeCLI onExit={handleSnakeExit} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`games-launcher ${inWindow ? 'embedded' : ''}`}>
            <div className="games-cli-screen">
                <div className="games-cli-header">Accord Games Launcher</div>
                <div className="games-cli-status">
                    Type a number or game name and press Enter. Type <span className="games-cli-token">exit</span> to leave.
                </div>

                <div className="games-cli-list">
                    {GAME_LIBRARY.map((game, index) => (
                        <div key={game.id} className="games-cli-list-item">
                            {index + 1}. {game.title}
                        </div>
                    ))}
                </div>

                <form className="games-cli-input-row" onSubmit={handleSubmit}>
                    <span className="games-cli-prompt">&gt;</span>
                    <input
                        type="text"
                        value={selection}
                        onChange={(e) => setSelection(e.target.value)}
                        placeholder="enter number or name"
                        className="games-cli-input"
                        autoFocus
                    />
                </form>

                <div className="games-cli-message">{message}</div>
            </div>
        </div>
    );
}
