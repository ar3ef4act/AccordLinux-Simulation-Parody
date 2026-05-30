import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSystemStore } from '../../../Accord';

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePath(path) {
    const parts = path.split('/');
    const stack = [];
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') stack.pop();
        else stack.push(part);
    }
    return '/' + stack.join('/');
}

function basename(path) {
    if (!path) return 'Untitled';
    return path.split('/').pop() || 'Untitled';
}

function getDirectory(path) {
    const idx = path.lastIndexOf('/');
    return idx <= 0 ? '/' : path.slice(0, idx);
}

function getExtension(path) {
    const base = basename(path);
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(dot + 1) : 'txt';
}

function countWords(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countLines(text) {
    return text.split('\n').length;
}

// ── Tab component ─────────────────────────────────────────────────────────────

function Tab({ tab, isActive, onActivate, onClose, isDirty }) {
    return (
        <div
            className={`anote-tab ${isActive ? 'anote-tab-active' : ''}`}
            onClick={onActivate}
            title={tab.path || 'Untitled'}
        >
            <span className="anote-tab-name">
                {isDirty && <span className="anote-tab-dirty">●</span>}
                {basename(tab.path || 'Untitled')}
            </span>
            <button
                className="anote-tab-close"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            >×</button>
        </div>
    );
}

// ── Main ANote component ──────────────────────────────────────────────────────

export default function ANote({ initialPath }) {
    const { vfs, writeFile, openEditor, anoteFileToOpen, setAnoteFileToOpen } = useSystemStore();

    // Tabs: [{ id, path, content, savedContent }]
    const [tabs, setTabs] = useState(() => {
        const path = initialPath || null;
        const content = path && vfs[path]?.content || '';
        return [{ id: Date.now(), path, content, savedContent: content }];
    });
    const [activeTab, setActiveTab] = useState(0);
    const [findQuery, setFindQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [showFind, setShowFind] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);
    const [fontSize, setFontSize] = useState(14);
    const [statusMsg, setStatusMsg] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [savePathInput, setSavePathInput] = useState('');
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [openPathInput, setOpenPathInput] = useState('');

    const textareaRef = useRef(null);
    const tab = tabs[activeTab];

    const doOpenFromVFS = useCallback((path) => {
        if (!path || !vfs[path]) return;
        // Check if already open
        const existing = tabs.findIndex(t => t.path === path);
        if (existing !== -1) { setActiveTab(existing); return; }
        const content = vfs[path].content || '';
        setTabs(prev => {
            const nextTabs = [...prev, { id: Date.now(), path, content, savedContent: content }];
            setActiveTab(nextTabs.length - 1);
            return nextTabs;
        });
    }, [vfs, tabs]);

    // Listen for file-to-open signal from other components
    useEffect(() => {
        if (anoteFileToOpen) {
            doOpenFromVFS(anoteFileToOpen);
            if (typeof setAnoteFileToOpen === 'function') {
                setAnoteFileToOpen(null);
            }
        }
    }, [anoteFileToOpen, doOpenFromVFS, setAnoteFileToOpen]);

    // Sync file from VFS when path changes externally
    useEffect(() => {
        if (initialPath && vfs[initialPath]) {
            setTabs(prev => {
                const updated = [...prev];
                if (updated[0].path === initialPath) {
                    updated[0] = { ...updated[0], content: vfs[initialPath].content || '', savedContent: vfs[initialPath].content || '' };
                }
                return updated;
            });
        }
    }, [initialPath]);

    const setTabContent = useCallback((content) => {
        setTabs(prev => {
            const updated = [...prev];
            updated[activeTab] = { ...updated[activeTab], content };
            return updated;
        });
    }, [activeTab]);

    const isDirty = (t) => t.content !== t.savedContent;

    // ── File actions ──────────────────────────────────────────────────────────

    const doSave = useCallback(() => {
        const t = tabs[activeTab];
        if (!t.path) { setShowSaveDialog(true); setSavePathInput('/home/player/untitled.txt'); return; }
        writeFile(t.path, t.content, getExtension(t.path));
        setTabs(prev => {
            const updated = [...prev];
            updated[activeTab] = { ...updated[activeTab], savedContent: t.content };
            return updated;
        });
        flash(`"${basename(t.path)}" saved`);
    }, [tabs, activeTab, writeFile]);

    const doSaveAs = useCallback(() => {
        const t = tabs[activeTab];
        setSavePathInput(t.path || '/home/player/untitled.txt');
        setShowSaveDialog(true);
    }, [tabs, activeTab]);

    const confirmSaveAs = () => {
        const path = normalizePath(savePathInput);
        writeFile(path, tabs[activeTab].content, getExtension(path));
        setTabs(prev => {
            const updated = [...prev];
            updated[activeTab] = { ...updated[activeTab], path, savedContent: updated[activeTab].content };
            return updated;
        });
        setShowSaveDialog(false);
        flash(`Saved as "${basename(path)}"`);
    };

    const doOpenPrompt = useCallback(() => {
        setOpenPathInput('/home/player/untitled.txt');
        setShowOpenDialog(true);
    }, []);

    const confirmOpen = useCallback(() => {
        const path = normalizePath(openPathInput);
        if (!vfs[path]) {
            flash('File does not exist');
            setShowOpenDialog(false);
            return;
        }
        doOpenFromVFS(path);
        setShowOpenDialog(false);
    }, [openPathInput, vfs, doOpenFromVFS]);

    const doNewTab = () => {
        setTabs(prev => [...prev, { id: Date.now(), path: null, content: '', savedContent: '' }]);
        setActiveTab(tabs.length);
    };

    const doCloseTab = (idx) => {
        if (tabs.length === 1) { setTabs([{ id: Date.now(), path: null, content: '', savedContent: '' }]); return; }
        setTabs(prev => prev.filter((_, i) => i !== idx));
        setActiveTab(prev => Math.max(0, prev > idx ? prev - 1 : Math.min(prev, tabs.length - 2)));
    };

    // ── Find & Replace ────────────────────────────────────────────────────────

    const doFind = useCallback(() => {
        if (!findQuery || !textareaRef.current) return;
        const text = tabs[activeTab].content;
        const idx = text.toLowerCase().indexOf(findQuery.toLowerCase(), textareaRef.current.selectionEnd);
        if (idx === -1) { flash('Not found'); return; }
        textareaRef.current.setSelectionRange(idx, idx + findQuery.length);
        textareaRef.current.focus();
    }, [findQuery, tabs, activeTab]);

    const doReplace = useCallback(() => {
        if (!findQuery) return;
        const content = tabs[activeTab].content;
        const newContent = content.replace(new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceQuery);
        setTabContent(newContent);
        flash(`Replaced all occurrences`);
    }, [findQuery, replaceQuery, tabs, activeTab, setTabContent]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') { e.preventDefault(); doSave(); }
            if (e.key === 'o') { e.preventDefault(); doOpenPrompt(); }
            if (e.key === 'f') { e.preventDefault(); setShowFind(p => !p); }
            if (e.key === 'n') { e.preventDefault(); doNewTab(); }
            if (e.key === '+') { e.preventDefault(); setFontSize(p => Math.min(24, p + 1)); }
            if (e.key === '-') { e.preventDefault(); setFontSize(p => Math.max(10, p - 1)); }
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = textareaRef.current;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newContent = tab.content.substring(0, start) + '    ' + tab.content.substring(end);
            setTabContent(newContent);
            setTimeout(() => ta.setSelectionRange(start + 4, start + 4), 0);
        }
    };

    const flash = (msg) => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(''), 2500);
    };

    // ── Cursor position ───────────────────────────────────────────────────────

    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const updateCursor = (e) => {
        const ta = e.target;
        const before = ta.value.substring(0, ta.selectionStart);
        const lines = before.split('\n');
        setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
    };

    return (
        <div className="anote-root">
            {/* ── Menu bar ── */}
            <div className="anote-menubar">
                <div className="anote-menu-group">
                    <span className="anote-menu-item" onClick={doNewTab}>File</span>
                    <div className="anote-dropdown">
                        <div className="anote-dropdown-item" onClick={doNewTab}>New Tab <span>Ctrl+N</span></div>
                        <div className="anote-dropdown-item" onClick={doOpenPrompt}>Open File… <span>Ctrl+O</span></div>
                        <div className="anote-dropdown-item" onClick={doSave}>Save <span>Ctrl+S</span></div>
                        <div className="anote-dropdown-item" onClick={doSaveAs}>Save As…</div>
                        <div className="anote-dropdown-sep" />
                        <div className="anote-dropdown-item" onClick={() => doCloseTab(activeTab)}>Close Tab</div>
                    </div>
                </div>
                <div className="anote-menu-group">
                    <span className="anote-menu-item">Edit</span>
                    <div className="anote-dropdown">
                        <div className="anote-dropdown-item" onClick={() => setShowFind(p => !p)}>Find / Replace <span>Ctrl+F</span></div>
                        <div className="anote-dropdown-sep" />
                        <div className="anote-dropdown-item" onClick={() => setWordWrap(p => !p)}>
                            Word Wrap {wordWrap ? '✓' : ''}
                        </div>
                        <div className="anote-dropdown-item" onClick={() => setFontSize(p => Math.min(24, p + 1))}>Increase Font <span>Ctrl++</span></div>
                        <div className="anote-dropdown-item" onClick={() => setFontSize(p => Math.max(10, p - 1))}>Decrease Font <span>Ctrl+−</span></div>
                    </div>
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="anote-tabbar">
                {tabs.map((t, i) => (
                    <Tab
                        key={t.id}
                        tab={t}
                        isActive={i === activeTab}
                        isDirty={isDirty(t)}
                        onActivate={() => setActiveTab(i)}
                        onClose={() => doCloseTab(i)}
                    />
                ))}
                <button className="anote-tab-new" onClick={doNewTab} title="New tab">+</button>
            </div>

            {/* ── Find bar ── */}
            {showFind && (
                <div className="anote-findbar">
                    <input
                        className="anote-find-input"
                        placeholder="Find…"
                        value={findQuery}
                        onChange={e => setFindQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doFind()}
                        autoFocus
                    />
                    <input
                        className="anote-find-input"
                        placeholder="Replace with…"
                        value={replaceQuery}
                        onChange={e => setReplaceQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doReplace()}
                    />
                    <button className="anote-find-btn" onClick={doFind}>Find</button>
                    <button className="anote-find-btn" onClick={doReplace}>Replace All</button>
                    <button className="anote-find-btn anote-find-close" onClick={() => setShowFind(false)}>✕</button>
                </div>
            )}

            {/* ── Editor area ── */}
            <div className="anote-editor-wrap">
                <textarea
                    ref={textareaRef}
                    className="anote-textarea"
                    style={{ fontSize, whiteSpace: wordWrap ? 'pre-wrap' : 'pre' }}
                    value={tab?.content ?? ''}
                    onChange={e => setTabContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={updateCursor}
                    onKeyUp={updateCursor}
                    spellCheck={false}
                    autoFocus
                />
            </div>

            {/* ── Status bar ── */}
            <div className="anote-statusbar">
                <span className="anote-status-path">{tab?.path || 'Untitled'}{isDirty(tab) ? ' •' : ''}</span>
                <span className="anote-status-msg">{statusMsg}</span>
                <span className="anote-status-info">
                    Ln {cursorPos.line}, Col {cursorPos.col}
                    &nbsp;·&nbsp;{countWords(tab?.content || '')} words
                    &nbsp;·&nbsp;{countLines(tab?.content || '')} lines
                </span>
            </div>

            {/* ── Save As dialog ── */}
            {showSaveDialog && (
                <div className="anote-dialog-overlay">
                    <div className="anote-dialog">
                        <div className="anote-dialog-title">Save As</div>
                        <input
                            className="anote-dialog-input"
                            value={savePathInput}
                            onChange={e => setSavePathInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmSaveAs()}
                            autoFocus
                        />
                        <div className="anote-dialog-actions">
                            <button className="anote-dialog-btn" onClick={() => setShowSaveDialog(false)}>Cancel</button>
                            <button className="anote-dialog-btn anote-dialog-primary" onClick={confirmSaveAs}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Open File dialog ── */}
            {showOpenDialog && (
                <div className="anote-dialog-overlay">
                    <div className="anote-dialog">
                        <div className="anote-dialog-title">Open File</div>
                        <input
                            className="anote-dialog-input"
                            value={openPathInput}
                            onChange={e => setOpenPathInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmOpen()}
                            autoFocus
                        />
                        <div className="anote-dialog-actions">
                            <button className="anote-dialog-btn" onClick={() => setShowOpenDialog(false)}>Cancel</button>
                            <button className="anote-dialog-btn anote-dialog-primary" onClick={confirmOpen}>Open</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .anote-root {
                    display: flex; flex-direction: column; height: 100%;
                    background: #1e1e2e; color: #cdd6f4;
                    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
                }

                /* Menu bar */
                .anote-menubar {
                    display: flex; align-items: center; gap: 2px;
                    background: #181825; border-bottom: 1px solid #313244;
                    padding: 0 8px; height: 30px; flex-shrink: 0;
                }
                .anote-menu-group { position: relative; }
                .anote-menu-group:hover .anote-dropdown { display: flex; }
                .anote-menu-item {
                    padding: 4px 10px; border-radius: 4px; cursor: pointer;
                    font-size: 12px; color: #cdd6f4; user-select: none;
                }
                .anote-menu-item:hover { background: #313244; }
                .anote-dropdown {
                    display: none; flex-direction: column;
                    position: absolute; top: 100%; left: 0; min-width: 200px;
                    background: #1e1e2e; border: 1px solid #45475a;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    z-index: 1000; border-radius: 6px; overflow: hidden;
                }
                .anote-dropdown-item {
                    padding: 8px 14px; font-size: 12px; cursor: pointer;
                    display: flex; justify-content: space-between;
                    color: #cdd6f4;
                }
                .anote-dropdown-item:hover { background: #313244; }
                .anote-dropdown-item span { color: #6c7086; font-size: 11px; }
                .anote-dropdown-sep { border-top: 1px solid #313244; margin: 4px 0; }

                /* Tab bar */
                .anote-tabbar {
                    display: flex; align-items: center; overflow-x: auto;
                    background: #181825; border-bottom: 1px solid #313244;
                    flex-shrink: 0; scrollbar-width: none;
                }
                .anote-tabbar::-webkit-scrollbar { display: none; }
                .anote-tab {
                    display: flex; align-items: center; gap: 6px;
                    padding: 6px 14px; cursor: pointer; white-space: nowrap;
                    font-size: 12px; color: #6c7086; border-right: 1px solid #313244;
                    min-width: 0; flex-shrink: 0;
                    border-bottom: 2px solid transparent;
                    transition: background 0.1s;
                }
                .anote-tab:hover { background: #262637; color: #cdd6f4; }
                .anote-tab-active {
                    background: #1e1e2e; color: #cdd6f4;
                    border-bottom-color: #89b4fa;
                }
                .anote-tab-name { overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
                .anote-tab-dirty { color: #f38ba8; margin-right: 3px; font-size: 10px; }
                .anote-tab-close {
                    background: none; border: none; color: #6c7086;
                    cursor: pointer; padding: 0 2px; font-size: 14px; line-height: 1;
                    border-radius: 3px;
                }
                .anote-tab-close:hover { background: #45475a; color: #f38ba8; }
                .anote-tab-new {
                    background: none; border: none; color: #6c7086;
                    cursor: pointer; padding: 6px 12px; font-size: 16px;
                    flex-shrink: 0;
                }
                .anote-tab-new:hover { color: #cdd6f4; background: #262637; }

                /* Find bar */
                .anote-findbar {
                    display: flex; align-items: center; gap: 8px;
                    padding: 6px 12px; background: #181825;
                    border-bottom: 1px solid #313244; flex-shrink: 0;
                }
                .anote-find-input {
                    background: #313244; border: 1px solid #45475a;
                    color: #cdd6f4; padding: 4px 8px; border-radius: 4px;
                    font-family: inherit; font-size: 12px; width: 160px;
                }
                .anote-find-input:focus { outline: none; border-color: #89b4fa; }
                .anote-find-btn {
                    background: #313244; border: 1px solid #45475a;
                    color: #cdd6f4; padding: 4px 10px; border-radius: 4px;
                    cursor: pointer; font-size: 12px;
                }
                .anote-find-btn:hover { background: #45475a; }
                .anote-find-close { color: #f38ba8; }

                /* Editor */
                .anote-editor-wrap { flex: 1; overflow: hidden; position: relative; }
                .anote-textarea {
                    width: 100%; height: 100%; box-sizing: border-box;
                    background: #1e1e2e; color: #cdd6f4;
                    border: none; outline: none; resize: none;
                    padding: 16px 20px; line-height: 1.7;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    tab-size: 4; overflow: auto;
                    caret-color: #89b4fa;
                }
                .anote-textarea::selection { background: #313244; }

                /* Status bar */
                .anote-statusbar {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 3px 12px; background: #89b4fa; color: #1e1e2e;
                    font-size: 11px; flex-shrink: 0; font-weight: 500;
                }
                .anote-status-path { opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40%; }
                .anote-status-msg { color: #1e1e2e; font-weight: 600; }
                .anote-status-info { opacity: 0.8; white-space: nowrap; }

                /* Save dialog */
                .anote-dialog-overlay {
                    position: absolute; inset: 0;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 500;
                }
                .anote-dialog {
                    background: #1e1e2e; border: 1px solid #45475a;
                    border-radius: 10px; padding: 24px; min-width: 380px;
                    box-shadow: 0 24px 64px rgba(0,0,0,0.7);
                }
                .anote-dialog-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #cdd6f4; }
                .anote-dialog-input {
                    width: 100%; box-sizing: border-box;
                    background: #313244; border: 1px solid #45475a;
                    color: #cdd6f4; padding: 8px 10px; border-radius: 6px;
                    font-family: inherit; font-size: 13px; margin-bottom: 16px;
                }
                .anote-dialog-input:focus { outline: none; border-color: #89b4fa; }
                .anote-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
                .anote-dialog-btn {
                    padding: 7px 16px; border-radius: 6px; cursor: pointer;
                    font-size: 12px; border: 1px solid #45475a;
                    background: #313244; color: #cdd6f4;
                }
                .anote-dialog-btn:hover { background: #45475a; }
                .anote-dialog-primary { background: #89b4fa; color: #1e1e2e; border-color: #89b4fa; font-weight: 600; }
                .anote-dialog-primary:hover { filter: brightness(1.1); }
            `}</style>
        </div>
    );
}