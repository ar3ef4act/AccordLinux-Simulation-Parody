import React, { useState } from 'react';
import { useSystemStore } from '../../../Accord';

const DesktopPanel = ({ menuOpen, setMenuOpen, openWindows, minimizedWindows = [], activeWindow, setActiveWindow, onTaskbarClick, onSystemTrayAction, formatTime, time, setView }) => {
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, targetId: null });
    return (
        <div className="xfce-panel">
            <div className="panel-left">
                <button
                    className={`menu-button ${menuOpen ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                >
                    <span className="icon">🐭</span>
                    <span>Applications</span>
                </button>
                <div className="panel-separator" />
                <div className="taskbar-items">
                    {[...openWindows, ...minimizedWindows].map(win => (
                        <div
                            key={win.id}
                            className={`taskbar-item ${activeWindow === win.id ? 'active' : ''} ${minimizedWindows.find(m => m.id === win.id) ? 'minimized' : ''}`}
                            onClick={() => onTaskbarClick ? onTaskbarClick(win.id) : setActiveWindow(win.id)}
                            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetId: win.id }); }}
                        >
                            <span className="item-icon-small">{win.icon}</span>
                            {win.name}
                        </div>
                    ))}
                </div>
            </div>

                <div className="panel-right">
                <div className="system-tray" onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetId: null });
                }} onClick={() => setContextMenu({ visible: false, x:0, y:0, targetId: null })}>
                    <SystemTrayIcons />
                </div>
                <div className="panel-separator" />
                <div className="panel-clock">
                    {formatTime(time)}
                </div>
                <div className="panel-separator" />
                <button className="panel-exit" onClick={() => setView('room')}>
                    Log Out
                </button>
            </div>
            {contextMenu.visible && (
                <div className="window-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { onSystemTrayAction?.('close', contextMenu.targetId); setContextMenu({ visible:false,x:0,y:0,targetId:null }); }}>Close</button>
                    <button onClick={() => { onSystemTrayAction?.('center', contextMenu.targetId); setContextMenu({ visible:false,x:0,y:0,targetId:null }); }}>Center</button>
                    <button onClick={() => { onSystemTrayAction?.('minimize', contextMenu.targetId); setContextMenu({ visible:false,x:0,y:0,targetId:null }); }}>Minimize</button>
                    <button onClick={() => { onSystemTrayAction?.('fullscreen', contextMenu.targetId); setContextMenu({ visible:false,x:0,y:0,targetId:null }); }}>Fullscreen</button>
                </div>
            )}
        </div>
    );
};



const SystemTrayIcons = () => {
    const { hardwareState } = useSystemStore();
    const speakerOn = hardwareState.audio?.enable ?? false;
    const computeOn = hardwareState.gpu?.enable ?? false;
    const lanOn = hardwareState.lan?.enable ?? hardwareState.router?.enable ?? false;

    return (
        <>
            <span className="tray-icon" title={`Speaker ${speakerOn ? 'ON' : 'OFF'}`}>
                {speakerOn ? '🔊' : '🔇'}
            </span>
            <span className="tray-icon" title={`LAN ${lanOn ? 'ON' : 'OFF'}`}>
                {lanOn ? '📶' : '❌'}
            </span>
            <span className="tray-icon" title={`Compute Machine ${computeOn ? 'ON' : 'OFF'}`}>
                {computeOn ? '🖥️' : '⚫'}
            </span>
        </>
    );
};

export default DesktopPanel;

// Render context menu separately so it appears above panel
export const DesktopPanelContextMenu = ({ visible, x, y, onAction, onClose }) => {
    if (!visible) return null;
    return (
        <div className="window-context-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onAction('close'); onClose(); }}>Close</button>
            <button onClick={() => { onAction('center'); onClose(); }}>Center</button>
            <button onClick={() => { onAction('minimize'); onClose(); }}>Minimize</button>
            <button onClick={() => { onAction('fullscreen'); onClose(); }}>Fullscreen</button>
        </div>
    );
};
