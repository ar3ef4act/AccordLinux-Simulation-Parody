import { useEffect } from 'react';
import { useSystemStore } from './system/Accord';
import { useAuthStore } from './authentication/data/authStore';
import Login from './authentication/account/Login';
import Signup from './authentication/account/Signup';
import Dashboard from './authentication/account/Dashboard';
import Room from './room/Room';
import Display from './system/display/Display';
import Sidebar from './room/Sidebar';
import sidebarOn from './room/components/assets/sidebar-on.svg';
import sidebarOff from './room/components/assets/sidebar-off.svg';

// ── Game View (extracted from original App) ──────────────────────────────────
function GameView() {
    const view = useSystemStore(state => state.view);
    const sidebarOpen = useSystemStore(state => state.sidebarOpen);
    const setSidebarOpen = useSystemStore(state => state.setSidebarOpen);

    const renderView = () => {
        switch (view) {
            case 'room':
                return <Room />;
            case 'display':
                return <Display />;
            case 'games':
                return <Display initialMode="games" />;
            case 'games-cli':
                return <Display initialMode="games-cli" />;
            default:
                return <Room />;
        }
    };

    // UI COORDINATE SYSTEM (Consistent with Room.jsx)
    const UI_WIDTH = 1000;
    const UI_HEIGHT = 562.5;

    // MANUAL POSITIONING (Virtual Coordinates)
    const togglePos = {
        x: 962,
        y: 524,
        w: 55,
        h: 55
    };

    return (
        <div className="main-container">
            <div className="viewport-area">
                {renderView()}
                {sidebarOpen && <Sidebar />}

                {/* 1. Room View Toggle (SVG Coordinated) */}
                {view === 'room' && (
                    <svg
                        viewBox={`0 0 ${UI_WIDTH} ${UI_HEIGHT}`}
                        preserveAspectRatio="xMidYMid meet"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 10000,
                            overflow: 'visible'
                        }}
                    >
                        <foreignObject
                            x={togglePos.x}
                            y={togglePos.y}
                            width={togglePos.w}
                            height={togglePos.h}
                            style={{
                                pointerEvents: 'auto',
                                overflow: 'visible'
                            }}
                        >
                            <button
                                className="sidebar-toggle"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    position: 'relative'
                                }}
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                <img
                                    src={sidebarOpen ? sidebarOn : sidebarOff}
                                    alt="Toggle"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </button>
                        </foreignObject>
                    </svg>
                )}

                {(view === 'display' || view === 'games' || view === 'games-cli') && (
                    <button
                        className="sidebar-toggle"
                        style={{
                            position: 'absolute',
                            right: '30px',
                            bottom: '30px',
                            width: '50px',
                            height: '50px',
                            zIndex: 10000,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <img
                            src={sidebarOpen ? sidebarOn : sidebarOff}
                            alt="Toggle"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Main App (Auth Gate) ─────────────────────────────────────────────────────
export default function App() {
    const { isAuthenticated, isLoading, authView, initAuthListener } = useAuthStore();

    // Initialize Firebase auth listener once on mount
    useEffect(() => {
        const unsubscribe = initAuthListener();
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Loading — checking persisted session
    if (isLoading) {
        return (
            <div className="auth-loading">
                <div className="auth-spinner" />
            </div>
        );
    }

    // Not authenticated — show Login or Signup
    if (!isAuthenticated) {
        return authView === 'signup' ? <Signup /> : <Login />;
    }

    // Authenticated — show Dashboard or Game
    if (authView === 'game') {
        return <GameView />;
    }

    return <Dashboard />;
}
