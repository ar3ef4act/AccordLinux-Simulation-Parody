import React, { useState } from 'react';
import { useSystemStore } from '../../../Accord';

// ── Section components ────────────────────────────────────────────────────────

function SettingRow({ label, description, children }) {
    return (
        <div className="setting-row">
            <div className="setting-info">
                <div className="setting-label">{label}</div>
                {description && <div className="setting-desc">{description}</div>}
            </div>
            <div className="setting-control">{children}</div>
        </div>
    );
}

function Toggle({ value, onChange }) {
    return (
        <button
            className={`settings-toggle ${value ? 'settings-toggle-on' : ''}`}
            onClick={() => onChange(!value)}
            aria-checked={value}
            role="switch"
        >
            <span className="settings-toggle-knob" />
        </button>
    );
}

function SectionHeader({ icon, title }) {
    return (
        <div className="settings-section-header">
            <span className="settings-section-icon">{icon}</span>
            <span className="settings-section-title">{title}</span>
        </div>
    );
}

// ── Main Settings component ───────────────────────────────────────────────────

export default function Settings() {
    const {
        systemSettings = {},
        setSystemSetting,
        hardwareState,
        systemStatus,
        currentUser,
    } = useSystemStore();

    // Local state for settings not yet in store — will be persisted via setSystemSetting
    const autoGui = systemSettings?.autoGui ?? false;
    const terminalFont = systemSettings?.terminalFont ?? 'JetBrains Mono';
    const terminalSize = systemSettings?.terminalSize ?? 13;
    const colorScheme = systemSettings?.colorScheme ?? 'catppuccin';

    const [activeSection, setActiveSection] = useState('display');

    const set = (key, val) => {
        if (typeof setSystemSetting === 'function') {
            setSystemSetting(key, val);
        }
    };

    const sections = [
        { id: 'display', icon: '🖥️', label: 'Display' },
        { id: 'session', icon: '🔐', label: 'Session' },
        { id: 'terminal', icon: '💻', label: 'Terminal' },
        { id: 'hardware', icon: '🔧', label: 'Hardware' },
        { id: 'about', icon: 'ℹ️', label: 'About' },
    ];

    return (
        <div className="settings-root">
            {/* ── Sidebar ── */}
            <div className="settings-sidebar">
                <div className="settings-sidebar-title">System Settings</div>
                {sections.map(s => (
                    <div
                        key={s.id}
                        className={`settings-nav-item ${activeSection === s.id ? 'settings-nav-active' : ''}`}
                        onClick={() => setActiveSection(s.id)}
                    >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="settings-content">

                {/* Display */}
                {activeSection === 'display' && (
                    <div className="settings-panel">
                        <SectionHeader icon="🖥️" title="Display Settings" />

                        <SettingRow
                            label="Auto-launch GUI on boot"
                            description="When enabled, the system will automatically start the desktop environment instead of dropping to the CLI. Requires a functional xland and desktopEnvironment driver."
                        >
                            <Toggle value={autoGui} onChange={v => set('autoGui', v)} />
                        </SettingRow>

                        <SettingRow
                            label="Display source"
                            description="Choose which display is used as the primary output."
                        >
                            <span
                                className="settings-select"
                                value={systemSettings?.displaySource ?? 'laptop'}
                                onChange={e => set('displaySource', e.target.value)}
                            >{systemSettings?.displaySource === 'laptop' ? 'Laptop' : 'Monitor'}</span>
                        </SettingRow>

                        <div className="settings-info-box">
                            <span className="settings-info-icon">ℹ️</span>
                            Auto-launch GUI requires:
                            <ul>
                                <li className={systemStatus?.xland ? 'ok' : 'nok'}>
                                    {systemStatus?.xland ? '✓' : '✗'} XLAND-Compositor driver active
                                </li>
                                <li className={systemStatus?.desktopEnvironment ? 'ok' : 'nok'}>
                                    {systemStatus?.desktopEnvironment ? '✓' : '✗'} Desktop Environment driver active
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Session */}
                {activeSection === 'session' && (
                    <div className="settings-panel">
                        <SectionHeader icon="🔐" title="Session" />
                        <SettingRow label="Current user" description="The active system user.">
                            <span className="settings-value-badge">{currentUser || 'player'}</span>
                        </SettingRow>
                    </div>
                )}

                {/* Terminal */}
                {activeSection === 'terminal' && (
                    <div className="settings-panel">
                        <SectionHeader icon="💻" title="Terminal" />
                        <SettingRow label="Terminal" description="Terminal that be used.">
                            <span
                                className="settings-select"
                                value={terminalFont}
                                onChange={e => set('terminalFont', e.target.value)}
                            >Accord Terminal
                            </span>
                        </SettingRow>
                    </div>
                )}

                {/* Hardware status */}
                {activeSection === 'hardware' && (
                    <div className="settings-panel">
                        <SectionHeader icon="🔧" title="Hardware Status" />
                        <div className="settings-hw-grid">
                            {[
                                { key: 'gpu', label: 'GPU / Compute', icon: '🎮' },
                                { key: 'audio', label: 'Audio / Speaker', icon: '🔊' },
                                { key: 'externalMonitor', label: 'External Monitor', icon: '🖥️' },
                                { key: 'router', label: 'Network / Router', icon: '🌐' },
                            ].map(({ key, label, icon }) => {
                                const phys = hardwareState?.[key]?.enable ?? false;
                                const soft = systemStatus?.[key] ?? false;
                                return (
                                    <div key={key} className="settings-hw-card">
                                        <div className="settings-hw-icon">{icon}</div>
                                        <div className="settings-hw-label">{label}</div>
                                        <div className={`settings-hw-badge ${phys ? 'badge-connected' : 'badge-disconnected'}`}>
                                            {phys ? 'Connected' : 'Disconnected'}
                                        </div>
                                        <div className={`settings-hw-badge ${soft ? 'badge-active' : 'badge-inactive'}`}>
                                            {soft ? 'Driver active' : 'Driver inactive'}
                                        </div>
                                    </div>
                                );
                            })}
                            {[
                                { key: 'xland', label: 'XLAND Compositor', icon: '🪟' },
                                { key: 'desktopEnvironment', label: 'Desktop Env', icon: '🖼️' },
                                { key: 'network', label: 'Network', icon: '📡' },
                            ].map(({ key, label, icon }) => {
                                const soft = systemStatus?.[key] ?? false;
                                return (
                                    <div key={key} className="settings-hw-card">
                                        <div className="settings-hw-icon">{icon}</div>
                                        <div className="settings-hw-label">{label}</div>
                                        <div className="settings-hw-badge badge-connected">Software</div>
                                        <div className={`settings-hw-badge ${soft ? 'badge-active' : 'badge-inactive'}`}>
                                            {soft ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* About */}
                {activeSection === 'about' && (
                    <div className="settings-panel">
                        <SectionHeader icon="ℹ️" title="About Accord OS" />
                        <div className="settings-about-box">
                            <div className="settings-about-logo">Accord</div>
                            <div className="settings-about-version">Version 1.0.0-sim</div>
                            <div className="settings-about-desc">
                                Accord is a simulated Linux-like operating system.<br />
                                Configure hardware drivers and build your environment<br />
                                to unlock applications and games.
                            </div>
                            <div className="settings-about-row">
                                <span>Kernel</span><span>accord-sim-1.0</span>
                            </div>
                            <div className="settings-about-row">
                                <span>User</span><span>{currentUser || 'player'}</span>
                            </div>
                            <div className="settings-about-row">
                                <span>Display Server</span>
                                <span>{systemStatus?.xland ? 'XLAND-Compositor' : 'None'}</span>
                            </div>
                            <div className="settings-about-row">
                                <span>Desktop Environment</span>
                                <span>{systemStatus?.desktopEnvironment ? 'Accord DE' : 'None'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .settings-root {
                    display: flex; height: 100%;
                    background: #1e1e2e; color: #cdd6f4;
                    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                    font-size: 13px;
                }

                /* Sidebar */
                .settings-sidebar {
                    width: 190px; background: #181825; flex-shrink: 0;
                    border-right: 1px solid #313244;
                    display: flex; flex-direction: column;
                    padding: 16px 8px; gap: 2px;
                }
                .settings-sidebar-title {
                    font-size: 11px; font-weight: 700; color: #6c7086;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    padding: 0 8px 12px; border-bottom: 1px solid #313244; margin-bottom: 8px;
                }
                .settings-nav-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 8px 12px; border-radius: 6px; cursor: pointer;
                    color: #a6adc8; transition: background 0.1s;
                }
                .settings-nav-item:hover { background: #262637; color: #cdd6f4; }
                .settings-nav-active { background: #313244; color: #cdd6f4; font-weight: 500; }

                /* Content */
                .settings-content { flex: 1; overflow-y: auto; padding: 24px; }
                .settings-panel { display: flex; flex-direction: column; gap: 0; max-width: 580px; }

                .settings-section-header {
                    display: flex; align-items: center; gap: 10px;
                    font-size: 15px; font-weight: 600; color: #cdd6f4;
                    margin-bottom: 20px; padding-bottom: 12px;
                    border-bottom: 1px solid #313244;
                }

                /* Setting row */
                .setting-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 0; border-bottom: 1px solid #1a1a2e; gap: 16px;
                }
                .setting-info { flex: 1; min-width: 0; }
                .setting-label { font-size: 13px; font-weight: 500; color: #cdd6f4; margin-bottom: 2px; }
                .setting-desc { font-size: 11px; color: #6c7086; line-height: 1.5; }
                .setting-control { flex-shrink: 0; }

                /* Toggle */
                .settings-toggle {
                    width: 42px; height: 22px; border-radius: 11px;
                    background: #313244; border: none; cursor: pointer;
                    position: relative; transition: background 0.2s; padding: 0;
                }
                .settings-toggle-on { background: #89b4fa; }
                .settings-toggle-knob {
                    position: absolute; top: 3px; left: 3px;
                    width: 16px; height: 16px; border-radius: 50%;
                    background: white; transition: transform 0.2s;
                }
                .settings-toggle-on .settings-toggle-knob { transform: translateX(20px); }

                /* Select */
                .settings-select {
                    background: #313244; border: 1px solid #45475a;
                    color: #cdd6f4; padding: 6px 10px; border-radius: 6px;
                    font-size: 12px; cursor: pointer;
                }
                .settings-select:focus { outline: none; border-color: #89b4fa; }

                /* Range */
                .settings-range { accent-color: #89b4fa; width: 120px; }

                /* Value badge */
                .settings-value-badge {
                    background: #313244; padding: 4px 10px;
                    border-radius: 6px; font-size: 12px; color: #a6adc8;
                    font-family: monospace;
                }

                /* Info box */
                .settings-info-box {
                    background: #181825; border: 1px solid #313244;
                    border-radius: 8px; padding: 12px 16px; margin-top: 16px;
                    font-size: 12px; color: #a6adc8; line-height: 1.8;
                }
                .settings-info-icon { margin-right: 6px; }
                .settings-info-box ul { margin: 8px 0 0 16px; padding: 0; }
                .settings-info-box li { list-style: none; }
                .settings-info-box li.ok { color: #a6e3a1; }
                .settings-info-box li.nok { color: #f38ba8; }

                /* Hardware grid */
                .settings-hw-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 12px; margin-top: 8px;
                }
                .settings-hw-card {
                    background: #181825; border: 1px solid #313244;
                    border-radius: 10px; padding: 14px;
                    display: flex; flex-direction: column; gap: 6px;
                }
                .settings-hw-icon { font-size: 22px; }
                .settings-hw-label { font-size: 12px; font-weight: 600; color: #cdd6f4; }
                .settings-hw-badge {
                    font-size: 10px; padding: 2px 8px; border-radius: 4px;
                    font-weight: 600; width: fit-content;
                }
                .badge-connected    { background: #1e3a2e; color: #a6e3a1; }
                .badge-disconnected { background: #2e1e1e; color: #f38ba8; }
                .badge-active       { background: #1e2e3a; color: #89b4fa; }
                .badge-inactive     { background: #2a2a3a; color: #6c7086; }

                /* About */
                .settings-about-box {
                    background: #181825; border: 1px solid #313244;
                    border-radius: 12px; padding: 28px; text-align: center;
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                }
                .settings-about-logo {
                    font-size: 28px; font-weight: 800; color: #89b4fa;
                    letter-spacing: 0.05em;
                }
                .settings-about-version { font-size: 12px; color: #6c7086; }
                .settings-about-desc {
                    font-size: 12px; color: #a6adc8; line-height: 1.7;
                    margin: 8px 0 16px;
                }
                .settings-about-row {
                    display: flex; justify-content: space-between;
                    width: 100%; max-width: 320px;
                    padding: 8px 0; border-bottom: 1px solid #313244;
                    font-size: 12px;
                }
                .settings-about-row span:first-child { color: #6c7086; }
                .settings-about-row span:last-child { color: #cdd6f4; font-family: monospace; }
            `}</style>
        </div>
    );
}