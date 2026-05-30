import React, { useState, useEffect } from 'react';
import { useSystemStore } from '../../Accord';
import CLI from '../CLI/CLI';
import Window from './components/Window';
import DesktopPanel from './components/DesktopPanel';
import WhiskerMenu from './components/WhiskerMenu';
import DesktopIcon from './components/DesktopIcon';
import Settings from './components/Settings';
import './GUI.css';
import AppsBrowser from './components/AppsBrowser';
import FileManager from './components/FileManager';
import Games from '../Application/Games';
import ANote from './components/ANote';

const appDefinitions = {
    terminal: {
        id: 'terminal',
        name: 'Terminal Emulator',
        icon: '💻',
        type: 'terminal',
        canResize: true,
    },
    games: {
        id: 'games',
        name: 'Accord Launcher',
        icon: '🐧',
        type: 'games',
        canResize: true,
    },
    docs: {
        id: 'docs',
        name: 'Documentation',
        icon: '📖',
        type: 'docs',
        canResize: true,
    },
    files: {
        id: 'files',
        name: 'File Manager',
        icon: '📁',
        type: 'placeholder',
        canResize: false,
    },
    settings: {
        id: 'settings',
        name: 'Settings',
        icon: '⚙️',
        type: 'placeholder',
        canResize: false
    },
    anote: {
        id: 'anote',
        name: 'ANote',
        icon: '📝',
        type: 'placeholder',
        canResize: false,
    },
};

export default function GUI({ setMode }) {
    const {
        currentUser,
        setView,
        desktopOpenWindows: openWindows,
        desktopMinimizedWindows: minimizedWindows,
        desktopActiveWindow: activeWindow,
        openDesktopWindow,
        closeDesktopWindow,
        minimizeDesktopWindow,
        restoreDesktopWindow,
        setDesktopActiveWindow,
    } = useSystemStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [time, setTime] = useState(new Date());
    const windowRefs = React.useRef({});

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const launchApp = (appId) => {
        const app = appDefinitions[appId];
        if (!app) return;
        openDesktopWindow(app);
        setMenuOpen(false);
    };

    const closeWindow = (id) => closeDesktopWindow(id);

    const minimizeWindow = (id) => minimizeDesktopWindow(id);

    const restoreWindow = (id) => restoreDesktopWindow(id);

    const centerWindow = (id) => {
        // restore if minimized
        const isMin = minimizedWindows.find(w => w.id === id);
        if (isMin) restoreDesktopWindow(id);
        const ref = windowRefs.current[id];
        ref?.current?.center?.();
    };

    const toggleFullscreenWindow = (id) => {
        const isMin = minimizedWindows.find(w => w.id === id);
        if (isMin) restoreDesktopWindow(id);
        const ref = windowRefs.current[id];
        ref?.current?.toggleFullscreen?.();
    };

    const handleSystemTrayAction = (action, id = null) => {
        const target = id ?? activeWindow ?? (openWindows.length ? openWindows[openWindows.length - 1].id : (minimizedWindows.length ? minimizedWindows[minimizedWindows.length - 1].id : null));
        if (!target) return;
        if (action === 'close') return closeWindow(target);
        if (action === 'minimize') return minimizeWindow(target);
        if (action === 'center') return centerWindow(target);
        if (action === 'fullscreen') return toggleFullscreenWindow(target);
    };

    const apps = Object.values(appDefinitions).map((app) => ({
        ...app,
        action: () => launchApp(app.id),
    }));

    const renderWindowContent = React.useCallback((win) => {
        let content;
        const baseId = win.baseId || win.id;
        if (win.type === 'terminal') {
            content = <CLI setMode={setMode} embedded={true} sessionId={win.id} />;
        } else if (win.type === 'games') {
            content = (
                <div className="game-window-wrapper">
                    <Games inWindow={true} />
                </div>
            );
        } else if (win.type === 'docs') {
            content = <AppsBrowser />;
        } else if (baseId === 'files') {
            content = <FileManager />;
        } else if (baseId === 'settings') {
            content = <Settings />;
        } else if (baseId === 'anote') {
            content = <ANote />;
        } else {
            content = (
                <div className="placeholder-app">
                    <span className="big-icon">{win.icon}</span>
                    <h3>{win.name}</h3>
                    <p>This application is currently under development.</p>
                </div>
            );
        }

        if (win.contentBoxSize) {
            return (
                <div className="window-fixed-shell">
                    <div
                        className="window-fixed-frame"
                        style={{ width: win.contentBoxSize.width, height: win.contentBoxSize.height }}
                    >
                        {content}
                    </div>
                </div>
            );
        }

        return content;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setMode]);

    return (
        <div className="xfce-desktop" onClick={() => setMenuOpen(false)}>
            <DesktopPanel
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                openWindows={openWindows}
                minimizedWindows={minimizedWindows}
                activeWindow={activeWindow}
                setActiveWindow={setDesktopActiveWindow}
                onTaskbarClick={(id) => {
                    const isMin = minimizedWindows.find(w => w.id === id);
                    if (isMin) return restoreWindow(id);
                    // bring to front / focus
                    setDesktopActiveWindow(id);
                }}
                onSystemTrayAction={handleSystemTrayAction}
                formatTime={formatTime}
                time={time}
                setView={setView}
            />

            {menuOpen && (
                <WhiskerMenu
                    currentUser={currentUser}
                    apps={apps}
                    onAction={(id) => {
                        const app = apps.find((a) => a.id === id);
                        app?.action();
                    }}
                    onClose={() => setMenuOpen(false)}
                />
            )}

            <div className="desktop-content">
                <div className="desktop-grid">
                    {apps.map((app) => (
                        <DesktopIcon key={app.id} app={app} onDoubleClick={launchApp} />
                    ))}
                </div>
            </div>

            {openWindows.map((win, index) => {
                if (!windowRefs.current[win.id]) windowRefs.current[win.id] = React.createRef();
                return (
                    <Window
                        key={win.id}
                        ref={windowRefs.current[win.id]}
                        id={win.id}
                        title={win.name}
                        icon={win.icon}
                        isActive={activeWindow === win.id}
                        zIndex={100 + (activeWindow === win.id ? 50 : index)}
                        onClose={() => closeWindow(win.id)}
                        onFocus={() => setDesktopActiveWindow(win.id)}
                        onMinimize={() => minimizeWindow(win.id)}
                        onRestore={() => restoreWindow(win.id)}
                        canResize={win.canResize}
                        minWidth={win.contentBoxSize?.width ?? 320}
                        minHeight={win.contentBoxSize?.height ?? 240}
                    >
                        {renderWindowContent(win)}
                    </Window>
                );
            })}
        </div>
    );
}