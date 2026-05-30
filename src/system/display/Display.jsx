import React, { useEffect, useState } from 'react';
import CLI from './CLI/CLI';
import GUI from './GUI/GUI';
import Games from './Application/Games';
import GamesCLI from './Application/GamesCLI';
import { useSystemStore } from '../Accord';
import './Display.css';

export default function Display({ initialMode }) {
    const { displaySource, systemStatus, systemSettings } = useSystemStore();
    const canAccessGUI = systemStatus.desktopEnvironment === true;

    const defaultMode = (systemSettings?.autoGui && canAccessGUI) ? 'gui' : 'cli';
    const [mode, setMode] = useState(initialMode || defaultMode);

    useEffect(() => {
        if (initialMode && initialMode !== mode) {
            setMode(initialMode);
        }
    }, [initialMode, mode]);

    // Automatically transition to GUI if auto-launch is enabled, drivers are active, and in CLI mode
    useEffect(() => {
        if (!initialMode && systemSettings?.autoGui && canAccessGUI && mode === 'cli') {
            setMode('gui');
        }
    }, [initialMode, systemSettings?.autoGui, canAccessGUI, mode]);

    const handleSetMode = (newMode) => {
        if (newMode === 'gui' && !canAccessGUI) {
            return;
        }
        setMode(newMode);
    };

    const renderContent = () => {
        switch (mode) {
            case 'cli':
                return <CLI setMode={handleSetMode} />;
            case 'gui':
                return canAccessGUI ? <GUI setMode={handleSetMode} /> : <CLI setMode={handleSetMode} />;
            case 'games':
                return canAccessGUI ? <Games setMode={handleSetMode} /> : <GamesCLI setMode={handleSetMode} />;
            case 'games-cli':
                return <GamesCLI setMode={handleSetMode} />;
            default:
                return <CLI setMode={handleSetMode} />;
        }
    };

    return (
        <div className={`display-wrapper ${displaySource === 'laptop' ? 'is-laptop' : 'is-monitor'}`}>
            <div className="display-content">
                {renderContent()}
            </div>
        </div>
    );
}
