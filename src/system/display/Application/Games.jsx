import { useEffect, useMemo, useState } from 'react';
import { useSystemStore } from '../../Accord';
import './Games.css';
import SnakeCLI from './SnakeCLI/SnakeCLI';
import SpaceWars from './SpaceWars/SpaceWars';
import PixelAdventure from './PixelAdventure/PixelAdventure';
import LabyrinthOfConfuse from './LabirynthOfConfuse/LabyrinthOfConfuse';

export const GAME_LIBRARY = [
    {
        id: 'pixeladventure',
        title: 'Pixel Adventure',
        aliases: ['pixeladventure', 'pixel adventure'],
        icon: '🎮',
        description: 'A retro pixel platformer that use sound effect.',
        dependencies: ['xland'],
        type: '2d',
        availableLabel: 'Requires Audio Ouput for better experience',
    },
    {
        id: 'labyrinthofconfuse',
        title: 'Labyrinth of Confuse',
        aliases: ['labyrinth', 'lab'],
        icon: '🔥',
        description: 'A retro pixel shooter that needs the compositor and GPU.',
        dependencies: ['xland', 'gpu'],
        type: '3d',
        availableLabel: 'Requires XLAND Compositor + GPU',
    },
    {
        id: 'snake',
        title: 'Snake CLI',
        aliases: ['snake', 'snake-cli', 'snake cli'],
        icon: '🐍',
        description: 'A classic terminal snake game that needs no special hardware.',
        dependencies: [],
        type: 'cli',
        availableLabel: 'No special dependencies',
    },
    {
        id: 'spacewars',
        title: 'Space Wars',
        aliases: ['spacewars', 'space wars'],
        icon: '🚀',
        description: 'A classic space shooter game that runs anywhere.',
        dependencies: [],
        type: 'pixel',
        availableLabel: 'No special dependencies',
    },
];

export const DEPENDENCY_LABELS = {
    xland: 'XLAND Compositor',
    desktopEnvironment: 'Desktop Environment',
    gpu: 'GPU',
    audio: 'Audio',
};

export default function Games({ inWindow }) {
    const { activeGame, displaySource, setActiveGame, systemStatus, gameLaunchRequest, setGameLaunchRequest, vfs } = useSystemStore();
    const [launchState, setLaunchState] = useState('idle');

    const [snakeRunKey, setSnakeRunKey] = useState(0);
    const [snakeStartSignal, setSnakeStartSignal] = useState(0);

    const [spacewarsRunKey, setSpacewarsRunKey] = useState(0);
    const [spacewarsStartSignal, setSpacewarsStartSignal] = useState(0);

    const [pixelAdventureRunKey, setPixelAdventureRunKey] = useState(0);
    const [pixelAdventureStartSignal, setPixelAdventureStartSignal] = useState(0);

    const [LOCRunKey, setLOCRunKey] = useState(0);
    const [LOCStartSignal, setLOCStartSignal] = useState(0);

    const GAMES_PACKAGE_MARKER = '/src/ABAL/accord-games.pkg';
    const GAMES_DOWNLOAD_HINT = 'curl http://repo.accord.org/api/accord-games -o /src/ABAL';
    const gamesInstalled = Boolean(vfs[GAMES_PACKAGE_MARKER]);

    useEffect(() => {
        if (activeGame && gameLaunchRequest) {
            const game = GAME_LIBRARY.find(g => g.id === activeGame);
            if (!game) return;
            const available = game.dependencies.every(dep => systemStatus[dep] === true);
            setLaunchState(available ? 'running' : 'blocked');
            setGameLaunchRequest(false);
        }
    }, [activeGame, gameLaunchRequest, setGameLaunchRequest, systemStatus]);

    const handlePlay = (game) => {
        setActiveGame(game.id);
        setGameLaunchRequest(true);
        // If launching a CLI game inside an existing window, bump a key
        // to force remounting the embedded game component so it initializes properly.
        if (inWindow && game.type === 'cli') {
            setSnakeRunKey(k => k + 1);
            setSnakeStartSignal(s => s + 1);
        } else if (inWindow && game.id === 'spacewars') {
            setSpacewarsRunKey(k => k + 1);
            setSpacewarsStartSignal(s => s + 1);
        } else if (inWindow && game.id === 'pixeladventure') {
            setPixelAdventureRunKey(k => k + 1);
            setPixelAdventureStartSignal(s => s + 1);
        } else if (inWindow && game.id === 'labyrinthofconfuse') {
            setPixelAdventureRunKey(k => k + 1);
            setPixelAdventureStartSignal(s => s + 1);
        }
    };

    const isAvailable = (game) => game.dependencies.every((dep) => systemStatus[dep] === true);

    if (!gamesInstalled) {
        return (
            <div className={`games-launcher ${inWindow ? 'embedded' : ''}`}>
                <div className="games-blocked minimal">
                    <div className="line">Accord Games is not installed.</div>
                    <div className="line">Download: <code>{GAMES_DOWNLOAD_HINT}</code></div>
                    <div className="line">Place the package under <code>/src/ABAL</code>.</div>
                </div>
            </div>
        );
    }

    // Minimalist in-window launcher
    if (inWindow) {
        const runningGame = GAME_LIBRARY.find(g => g.id === activeGame && launchState === 'running');
        if (runningGame && runningGame.type === 'cli') {
            return (
                <div className="games-launcher embedded">
                    <SnakeCLI key={`snake-${snakeRunKey}`} startSignal={snakeStartSignal} onExit={() => { setActiveGame(null); setLaunchState('idle'); }} />
                </div>
            );
        }
        if (runningGame && runningGame.id === 'spacewars') {
            return (
                <div className="games-launcher embedded">
                    <SpaceWars displaySource={displaySource} key={`spacewars-${spacewarsRunKey}`} startSignal={spacewarsStartSignal} onExit={() => { setActiveGame(null); setLaunchState('idle'); }} />
                </div>
            );
        }

        if (runningGame && runningGame.id === 'pixeladventure') {
            return (
                <div className="games-launcher embedded">
                    <PixelAdventure displaySource={displaySource} key={`pixeladventure-${pixelAdventureRunKey}`} startSignal={pixelAdventureStartSignal} onExit={() => { setActiveGame(null); setLaunchState('idle'); }} />
                </div>
            );
        }

        if (runningGame && runningGame.id === 'labyrinthofconfuse') {
            return (
                <div className="games-launcher embedded">
                    <LabyrinthOfConfuse displaySource={displaySource} key={`labyrinthofconfuse-${LOCRunKey}`} startSignal={LOCStartSignal} onExit={() => { setActiveGame(null); setLaunchState('idle'); }} />
                </div>
            );
        }

        return (
            <div className="games-launcher embedded minimal-list">
                <div className="games-embedded-header">🎮 Games</div>
                <div className="games-list">
                    {GAME_LIBRARY.map(game => (
                        <div key={game.id} className="games-list-item">
                            <div className="left">{game.icon} {game.title}</div>
                            <div className="right">
                                <span className="tag">{game.availableLabel}</span>
                                <button disabled={!isAvailable(game)} onClick={() => handlePlay(game)}>Play</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Full-page launcher (also minimalist)
    return (
        <div className={`games-launcher ${inWindow ? 'embedded' : ''} minimal-full`}>
            <div className="games-header">
                <h2>🎮 Games Library</h2>
                <p className="sub">Select and play — terminal games run inline.</p>
            </div>
            <div className="games-grid minimal">
                {GAME_LIBRARY.map(game => (
                    <div key={game.id} className="game-row">
                        <div className="meta">{game.icon} <strong>{game.title}</strong> — <span className="muted">{game.availableLabel}</span></div>
                        <div>
                            <button disabled={!isAvailable(game)} onClick={() => handlePlay(game)}>Play</button>
                        </div>
                    </div>
                ))}
            </div>
            {activeGame && launchState === 'blocked' && (
                <div className="launch-status blocked">Cannot launch: missing system components.</div>
            )}
        </div>
    );
}