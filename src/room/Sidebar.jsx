import React, { useState, useEffect, useRef } from 'react';
import { useSystemStore } from '../system/Accord';
import { useAuthStore } from '../authentication/data/authStore';
import { saveProgression } from '../authentication/data/progressionService';
import './Sidebar.css';
import Documentation from '../system/internet/documentation/documentation';

const Sidebar = () => {
    const setSidebarOpen = useSystemStore(state => state.setSidebarOpen);
    const [tab, setTab] = useState('docs');
    const [showPauseMenu, setShowPauseMenu] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notes, setNotes] = useState(() => localStorage.getItem('accord_notes') || '');
    const [size, setSize] = useState({ width: 380, height: 550 });

    useEffect(() => {
        localStorage.setItem('accord_notes', notes);
    }, [notes]);

    const sidebarRef = useRef(null);
    const dragActive = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const currentPos = useRef({ x: window.innerWidth - 420, y: 40 });
    const resizeActive = useRef(false);
    const resizeStart = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 380, height: 550 });
    const user = useAuthStore(state => state.user);
    const setAuthView = useAuthStore(state => state.setAuthView);

    // Track drag entirely via refs — no setState during mousemove,
    // so React never re-renders and scroll position is preserved.

    // Apply initial position once on mount
    useEffect(() => {
        if (sidebarRef.current) {
            sidebarRef.current.style.transform =
                `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
        }
    }, []);

    const handleMouseDown = (e) => {
        if (!e.target.closest('.window-handle')) return;
        e.preventDefault();
        dragActive.current = true;
        dragOffset.current = {
            x: e.clientX - currentPos.current.x,
            y: e.clientY - currentPos.current.y,
        };

        const handleMouseMove = (e) => {
            if (!dragActive.current) return;
            currentPos.current = {
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y,
            };
            // Mutate DOM directly — zero React involvement, scroll stays intact
            if (sidebarRef.current) {
                sidebarRef.current.style.transform =
                    `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
            }
        };

        const handleMouseUp = () => {
            dragActive.current = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        resizeActive.current = true;
        resizeStart.current = { x: e.clientX, y: e.clientY };
        startSize.current = { ...size };

        const handleMouseMove = (event) => {
            if (!resizeActive.current) return;
            const deltaX = event.clientX - resizeStart.current.x;
            const deltaY = event.clientY - resizeStart.current.y;
            setSize({
                width: Math.max(280, startSize.current.width + deltaX),
                height: Math.max(320, startSize.current.height + deltaY),
            });
        };

        const handleMouseUp = () => {
            resizeActive.current = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleSaveAndContinue = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await saveProgression(user.uid, useSystemStore.getState());
            // Show a temporary success message or just close
            setShowPauseMenu(false);
        } catch (e) {
            console.error("Save failed", e);
        }
        setIsSaving(false);
    };

    const handleSaveAndExit = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await saveProgression(user.uid, useSystemStore.getState());
            setAuthView('dashboard');
        } catch (e) {
            console.error("Save failed", e);
        }
        setIsSaving(false);
    };

    const handleExitWithoutSaving = () => {
        setAuthView('dashboard');
    };

    return (
        <>
            <div
                ref={sidebarRef}
                className="sidebar-container"
                onMouseDown={handleMouseDown}
                style={{
                    transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`,
                    width: size.width,
                    height: size.height,
                }}
            >
                <div className="window-handle">
                    <div className="window-controls">
                        <span className="dot red" onClick={() => setSidebarOpen(false)}></span>
                        <span className="dot yellow"></span>
                        <span className="dot green"></span>
                    </div>
                    <span className="window-title">System Companion</span>
                    <button className="pause-btn" onClick={() => setShowPauseMenu(true)}>
                        ⏸ Menu
                    </button>
                </div>

                <div className="sidebar-tabs">
                    <button
                        className={tab === 'docs' ? 'active' : ''}
                        onClick={() => setTab('docs')}
                    >
                        Documentation
                    </button>
                    <button
                        className={tab === 'notes' ? 'active' : ''}
                        onClick={() => setTab('notes')}
                    >
                        Notepad
                    </button>
                </div>

                <div className="sidebar-content">
                    {tab === 'docs' ? (
                        <div className="docs-view">
                            <Documentation />
                        </div>
                    ) : (
                        <div className="notes-view">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="...."
                            />
                        </div>
                    )}
                </div>

                <div className="sidebar-resizer" onMouseDown={handleResizeMouseDown} />
                {showPauseMenu && (
                    <div className="pause-modal-overlay">
                        <div className="pause-modal">
                            <h3>Game Menu</h3>
                            <p>Do you want to save your progress before leaving?</p>

                            <div className="pause-actions">
                                <button className="btn-primary" onClick={handleSaveAndContinue} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save & Continue'}
                                </button>
                                <button className="btn-secondary" onClick={handleSaveAndExit} disabled={isSaving}>
                                    Save & Exit
                                </button>
                                <button className="btn-danger" onClick={handleExitWithoutSaving} disabled={isSaving}>
                                    Exit Without Saving
                                </button>
                                <button className="btn-ghost" onClick={() => setShowPauseMenu(false)} disabled={isSaving}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </>
    );
};

export default React.memo(Sidebar);