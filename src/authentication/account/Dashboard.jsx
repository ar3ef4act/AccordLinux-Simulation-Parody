import React, { useState } from 'react';
import NewGameNotice from '../warning/NewGameNotice';
import { useAuthStore } from '../data/authStore';
import { useSystemStore } from '../../system/Accord';
import { loadProgression, saveProgression } from '../data/progressionService';
import './Auth.css';

// Hardware list — adjust keys to match your hardwareState in Accord.js
const HARDWARE_LIST = [
    { key: 'gpu', label: 'GPU', icon: '🎮' },
    { key: 'audio', label: 'Audio Driver', icon: '🔊' },
    { key: 'externalMonitor', label: 'External Monitor', icon: '🖥️' },
    { key: 'router', label: 'Network / Router', icon: '🌐' },
];

function HardwareProgressRow({ label, icon, enabled }) {
    return (
        <div className={`hw-progress-item ${enabled ? 'enabled' : 'disabled'}`}>
            <span className={`hw-status-dot ${enabled ? 'on' : 'off'}`} />
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
            <span className="hw-name">{label}</span>
            <span className={`hw-badge ${enabled ? 'active' : 'inactive'}`}>
                {enabled ? 'LOADED' : 'MISSING'}
            </span>
        </div>
    );
}

export default function Dashboard() {
    const { user, logout, setAuthView, savedProgressionMeta } = useAuthStore();
    const { loadState, resetState } = useSystemStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showNotice, setShowNotice] = useState(false);
    const [pendingNewGame, setPendingNewGame] = useState(false);

    // Prioritise hardware from savedProgressionMeta (set at login/initAuthListener).
    // This is the correct source right after login — the system store is still
    // empty until the user enters the game via handleContinue.
    const liveHardware =
        savedProgressionMeta?.hardwareState ||
        useSystemStore.getState().hardwareState ||
        {};

    const enabledCount = HARDWARE_LIST.filter(h => liveHardware[h.key]?.enable).length;
    const totalCount = HARDWARE_LIST.length;

    const handleContinue = async () => {
        setLoading(true);
        setError(null);
        try {
            const saved = await loadProgression(user.uid);
            if (!saved) {
                setError('No save file found. Did you rm -rf it?');
                setLoading(false);
                return;
            }
            loadState(saved);
            setAuthView('game');
        } catch (err) {
            setError('Failed to load progression. Classic.');
            setLoading(false);
        }
    };

    const handleNewGame = () => {
        resetState();
        setPendingNewGame(true);
        setShowNotice(true);
    };

    const handleNoticeClose = () => {
        setShowNotice(false);
        if (pendingNewGame) {
            setPendingNewGame(false);
            setAuthView('game');
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            const state = useSystemStore.getState();
            if (state.generations?.length > 0) {
                await saveProgression(user.uid, state);
            }
        } catch {
            // silent — already leaving anyway
        }
        await logout();
    };

    const formatDate = (iso) => {
        if (!iso) return 'unknown';
        try {
            return new Date(iso).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch {
            return iso;
        }
    };

    const userInitial = user?.email?.charAt(0)?.toUpperCase() || '?';

    return (
        <div className="auth-container">
            <div className="page-container">
                {/* Left Panel */}
                <div className="panel-left">
                    <div className="box">
                        <div className="terminal-command">
                            <span className="prompt-symbol">$</span> accord-system --dashboard
                        </div>
                        <h1 className="title-large">Dashboard</h1>
                        <p className="subtitle">Your ongoing battle with hardware compatibility.</p>

                        <div className="user-profile">
                            <div className="avatar">{userInitial}</div>
                            <div>
                                <div className="user-email">{user?.email}</div>
                                <div className="user-status">
                                    <span className="dot" /> session active
                                </div>
                            </div>
                        </div>

                        {/* Hardware Progress */}
                        <div className="hw-progress-section">
                            <div className="hw-progress-title">
                                Hardware Status — {enabledCount}/{totalCount} drivers loaded
                            </div>
                            <div className="hw-progress-grid">
                                {HARDWARE_LIST.map(hw => (
                                    <HardwareProgressRow
                                        key={hw.key}
                                        label={hw.label}
                                        icon={hw.icon}
                                        enabled={!!liveHardware[hw.key]?.enable}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Actions */}
                <div className="panel-right">
                    <div className="box">
                        <div className="terminal-command">
                            <span className="prompt-symbol">$</span> accord-system --actions
                        </div>
                        <h3 className="title-small">Game Controls</h3>

                        {savedProgressionMeta ? (
                            <div className="info-card">
                                <div className="info-title">★ Save file detected</div>
                                <div className="info-text">
                                    Last session: {formatDate(savedProgressionMeta.savedAt)}<br />
                                    Hardware: {enabledCount}/{totalCount} active
                                    {enabledCount < totalCount && (
                                        <span style={{ color: 'var(--amber)', display: 'block', marginTop: 6 }}>
                                            ⚠ {totalCount - enabledCount} driver(s) still broken. Good luck.
                                        </span>
                                    )}
                                    {enabledCount === totalCount && (
                                        <span style={{ color: 'var(--green)', display: 'block', marginTop: 6 }}>
                                            ✓ All hardware functional. Screenshot this moment.
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span className="empty-icon">📂</span>
                                <p>No save file found</p>
                                <small>Your journey into driver hell awaits.</small>
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        {showNotice && <NewGameNotice onClose={handleNoticeClose} />}

                        <div className="button-group">
                            {savedProgressionMeta && (
                                <button className="btn-primary" onClick={handleContinue} disabled={loading}>
                                    {loading ? '■ Mounting...' : '▶ Continue Session'}
                                </button>
                            )}
                            <button className="btn-secondary" onClick={handleNewGame} disabled={loading}>
                                + New Game  {!savedProgressionMeta ? '' : '(wipes save)'}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowNotice(true)} disabled={loading} style={{
                                width: '100%', background: 'transparent', color: 'var(--text-2)',
                                border: '1px dashed var(--border)', padding: '10px',
                                borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'var(--mono)',
                                cursor: 'pointer', transition: 'color 180ms ease, border-color 180ms ease',
                            }}
                                onMouseEnter={e => { e.target.style.color = 'var(--text-1)'; e.target.style.borderColor = 'var(--amber-border)'; }}
                                onMouseLeave={e => { e.target.style.color = 'var(--text-2)'; e.target.style.borderColor = 'var(--border)'; }}
                            >
                                📖 Read briefing again
                            </button>
                            <button className="btn-danger" onClick={handleLogout} disabled={loading}>
                                ✕ Logout
                            </button>
                        </div>

                        <p style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-2)',
                            fontFamily: 'var(--mono)',
                            marginTop: 20,
                            lineHeight: 1.6,
                            borderTop: '1px solid var(--border)',
                            paddingTop: 14,
                        }}>
                            * "3+ games supported" refers to games that launch.<br />
                            Actual playability may vary, seriously. Even the texture is so smooth, like prerendered cinematic polygon.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}