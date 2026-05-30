import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useSystemStore } from '../../../Accord';

function basename(path) {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1] || '/';
}

function parentOf(path) {
    if (!path || path === '/') return null;
    const i = path.lastIndexOf('/');
    if (i === 0) return '/';
    return path.substring(0, i);
}

export default function FileManager() {
    const {
        vfs, writeFile, makeDir, removeNode, renameNode, copyNode, openEditor,
        setSelectedFile, setSelectedFiles, setAnoteFileToOpen, openDesktopWindow
    } = useSystemStore();
    const [leftRoot, setLeftRoot] = useState('/src');
    const [currentPath, setCurrentPath] = useState('/src');
    const [selected, setSelected] = useState(null);
    const [clipboard, setClipboard] = useState(null); // { paths: [], cut }
    const [contextMenu, setContextMenu] = useState(null); // {x,y,item}
    const containerRef = useRef(null);

    // Multi-select and status states
    const [checkedItems, setCheckedItems] = useState([]);
    const [statusMsg, setStatusMsg] = useState('');

    // Custom rename dialog states
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [renamePath, setRenamePath] = useState('');
    const [renameInput, setRenameInput] = useState('');

    // Custom delete dialog states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePaths, setDeletePaths] = useState([]);

    const flashMessage = (msg) => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(''), 2500);
    };

    const selectItem = (p) => {
        setSelected(p);
        if (typeof setSelectedFile === 'function') {
            setSelectedFile(p);
        }
    };

    const toggleCheckItem = (p) => {
        setCheckedItems(prev => {
            const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
            if (typeof setSelectedFiles === 'function') {
                setSelectedFiles(next);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (checkedItems.length === children.length) {
            setCheckedItems([]);
            if (typeof setSelectedFiles === 'function') {
                setSelectedFiles([]);
            }
        } else {
            const allPaths = children.map(ch => ch.path);
            setCheckedItems(allPaths);
            if (typeof setSelectedFiles === 'function') {
                setSelectedFiles(allPaths);
            }
        }
    };

    // Reset checklists and selection on folder navigation
    useEffect(() => {
        setCheckedItems([]);
        if (typeof setSelectedFiles === 'function') {
            setSelectedFiles([]);
        }
        selectItem(null);
    }, [currentPath]);

    // compute roots (first-level children of /)
    const roots = useMemo(() => {
        return Object.keys(vfs)
            .filter(p => p !== '/' && p.lastIndexOf('/') === 0)
            .sort();
    }, [vfs]);

    useEffect(() => {
        if (roots.length && !roots.includes(leftRoot)) setLeftRoot(roots[0]);
    }, [roots]);

    useEffect(() => {
        setCurrentPath(leftRoot);
    }, [leftRoot]);

    const listChildren = (path) => {
        const prefix = path === '/' ? '/' : path + '/';
        const kids = Object.keys(vfs)
            .filter(k => k !== path && k.startsWith(prefix))
            .map(k => k.substring(prefix.length))
            .map(rel => {
                const seg = rel.split('/')[0];
                return seg;
            })
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(name => ({ name, path: (path === '/' ? '' : path) + '/' + name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        return kids;
    };

    const children = useMemo(() => listChildren(currentPath), [vfs, currentPath]);

    const isDir = (p) => vfs[p] && vfs[p].type === 'dir';

    const doOpen = (p) => {
        if (isDir(p)) {
            setCurrentPath(p);
            selectItem(null);
        } else {
            // open with ANote editor
            if (typeof setAnoteFileToOpen === 'function') {
                setAnoteFileToOpen(p);
            }
            if (typeof openDesktopWindow === 'function') {
                openDesktopWindow({
                    id: 'anote',
                    name: 'ANote',
                    icon: '📝',
                    type: 'placeholder',
                    canResize: false
                });
            } else {
                openEditor(p);
            }
        }
        setContextMenu(null);
    };

    const doDelete = (p) => {
        if (!p) return;
        setDeletePaths([p]);
        setShowDeleteDialog(true);
    };

    const doDeleteMultiple = () => {
        if (!checkedItems.length) return;
        setDeletePaths(checkedItems);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!deletePaths.length) return;
        deletePaths.forEach(p => removeNode(p));
        const deletedSet = new Set(deletePaths);
        const remainingChecked = checkedItems.filter(x => !deletedSet.has(x));
        setCheckedItems(remainingChecked);
        if (typeof setSelectedFiles === 'function') {
            setSelectedFiles(remainingChecked);
        }
        if (selected && deletedSet.has(selected)) {
            selectItem(null);
        }
        flashMessage(`Deleted ${deletePaths.length} ${deletePaths.length === 1 ? 'item' : 'items'}`);
        setDeletePaths([]);
        setShowDeleteDialog(false);
    };

    const doCopy = (p) => {
        setClipboard({ paths: [p], cut: false });
        flashMessage(`Copied "${basename(p)}"`);
    };
    const doCut = (p) => {
        setClipboard({ paths: [p], cut: true });
        flashMessage(`Cut "${basename(p)}"`);
    };

    const doCopyMultiple = () => {
        setClipboard({ paths: checkedItems, cut: false });
        flashMessage(`Copied ${checkedItems.length} items`);
    };
    const doCutMultiple = () => {
        setClipboard({ paths: checkedItems, cut: true });
        flashMessage(`Cut ${checkedItems.length} items`);
    };

    const doPaste = (destFolder) => {
        if (!clipboard || !clipboard.paths || !clipboard.paths.length) return;
        clipboard.paths.forEach(src => {
            const name = basename(src);
            let dest = destFolder === '/' ? '/' + name : destFolder + '/' + name;
            // avoid overwrite: find unique name
            let i = 1;
            while (vfs[dest]) {
                const base = name;
                const dot = base.lastIndexOf('.');
                const candidate = dot > 0 ? base.slice(0, dot) + `-copy${i}` + base.slice(dot) : base + `-copy${i}`;
                dest = destFolder === '/' ? '/' + candidate : destFolder + '/' + candidate;
                i += 1;
            }
            if (clipboard.cut) {
                renameNode(src, dest);
            } else {
                copyNode(src, dest);
            }
        });
        setClipboard(null);
        flashMessage(`Pasted successfully`);
    };

    const doRename = (p) => {
        setRenamePath(p);
        setRenameInput(basename(p));
        setShowRenameDialog(true);
    };

    const confirmRename = () => {
        if (!renameInput || renameInput === basename(renamePath)) {
            setShowRenameDialog(false);
            return;
        }
        const newPath = parentOf(renamePath) === '/' ? '/' + renameInput : parentOf(renamePath) + '/' + renameInput;
        if (vfs[newPath]) {
            window.alert('Target name already exists');
            return;
        }
        renameNode(renamePath, newPath);
        selectItem(newPath);
        setCheckedItems(prev => prev.map(x => x === renamePath ? newPath : x));
        setShowRenameDialog(false);
        flashMessage(`Renamed successfully`);
    };

    const doNewFolder = (dest) => {
        const name = window.prompt('New folder name', 'new-folder');
        if (!name) return;
        const path = dest === '/' ? '/' + name : dest + '/' + name;
        if (vfs[path]) { window.alert('Already exists'); return; }
        makeDir(path);
    };

    const doNewFile = (dest) => {
        const name = window.prompt('New file name', 'untitled.txt');
        if (!name) return;
        const path = dest === '/' ? '/' + name : dest + '/' + name;
        if (vfs[path]) { window.alert('Already exists'); return; }
        writeFile(path, '', name.split('.').pop());
    };

    const onRightClick = (e, item) => {
        e.preventDefault();
        selectItem(item?.path ?? null);
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    const onGlobalClick = (e) => {
        if (contextMenu) setContextMenu(null);
    };

    useEffect(() => {
        window.addEventListener('click', onGlobalClick);
        return () => window.removeEventListener('click', onGlobalClick);
    }, [contextMenu]);

    return (
        <div className="filemgr-root" ref={containerRef} style={{ display: 'flex', height: '100%', gap: 12, color: '#cfd8dc', position: 'relative', overflow: 'hidden' }}>
            <div className="filemgr-left" style={{ width: 220, background: '#ffffff11', borderRight: '1px solid #33415522', padding: 12, boxSizing: 'border-box', color: '#cfd8dc' }}>
                <div style={{ fontWeight: 700, marginBottom: 12, color: '#e0e6ea', opacity: 0.9 }}>Locations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {roots.map(r => (
                        <div key={r} onClick={() => { setLeftRoot(r); setCurrentPath(r); }} style={{ padding: '8px 10px', cursor: 'pointer', background: r === leftRoot ? '#2b6ea4' : 'transparent', color: r === leftRoot ? '#ffffff' : '#b0bec5', borderRadius: 6 }}>
                            {r}
                        </div>
                    ))}
                </div>
            </div>

            <div className="filemgr-right" style={{ flex: 1, padding: 12, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#263238' }}>
                <div className="fm-toolbar" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="fm-btn" onClick={() => setCurrentPath(parentOf(currentPath) || currentPath)}>⬆</button>
                    <div style={{ fontFamily: 'monospace', flex: 1, color: '#90a4ae' }}>{currentPath}</div>
                    <button className="fm-btn fm-primary" onClick={() => { doNewFolder(currentPath); }}>New Folder</button>
                    <button className="fm-btn fm-primary" onClick={() => { doNewFile(currentPath); }}>New File</button>
                    <button className="fm-btn" onClick={() => { if (clipboard) doPaste(currentPath); }} disabled={!clipboard}>Paste</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto' }} onContextMenu={(e) => onRightClick(e, { path: currentPath, isDir: true })}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* ── Checklist Header ── */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #37474f', background: '#1e272c', borderRadius: '6px 6px 0 0', marginBottom: 2 }}>
                            <div
                                onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                style={{
                                    width: 18, height: 18, borderRadius: 4, border: '2px solid #546e7a',
                                    background: checkedItems.length === children.length && children.length > 0 ? '#89b4fa' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', marginRight: 12, flexShrink: 0
                                }}
                            >
                                {checkedItems.length === children.length && children.length > 0 && <span style={{ color: '#263238', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#90a4ae', flex: 1 }}>Name</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#90a4ae', width: 80, textAlign: 'right' }}>Type</div>
                        </div>

                        {children.map(ch => {
                            const p = ch.path;
                            const node = vfs[p];
                            const fileOrDir = node?.type === 'dir' ? 'dir' : (node?.type === 'file' ? 'file' : (vfs[p + '/'] ? 'dir' : 'unknown'));
                            const isChecked = checkedItems.includes(p);
                            const isHighlighted = selected === p || isChecked;
                            return (
                                <div
                                    key={p}
                                    onDoubleClick={() => doOpen(p)}
                                    onClick={() => selectItem(p)}
                                    onContextMenu={(e) => onRightClick(e, { path: p, isDir: fileOrDir === 'dir' })}
                                    className={`fm-item ${isHighlighted ? 'fm-item-selected' : ''}`}
                                    style={{ padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', cursor: 'default' }}
                                >
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleCheckItem(p); }}
                                        style={{
                                            width: 18, height: 18, borderRadius: 4, border: '2px solid #546e7a',
                                            background: isChecked ? '#89b4fa' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', marginRight: 12, flexShrink: 0
                                        }}
                                    >
                                        {isChecked && <span style={{ color: '#263238', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                                        <div style={{ fontSize: 20 }}>{fileOrDir === 'dir' ? '📁' : '📄'}</div>
                                        <div style={{ fontSize: 15, color: '#e6eef2' }}>{ch.name}</div>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#90a4ae', width: 80, textAlign: 'right' }}>{fileOrDir}</div>
                                </div>
                            );
                        })}
                        {children.length === 0 && <div style={{ color: '#90a4ae', padding: '20px 14px' }}>Empty</div>}
                    </div>
                </div>

                {/* ── Selection / Status Bar ── */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #37474f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 }}>
                    {checkedItems.length > 0 ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#89b4fa' }}>
                                <span style={{ color: '#90a4ae' }}>Selected ({checkedItems.length}):</span>
                                <span style={{ fontFamily: 'monospace', background: '#1e2a30', padding: '4px 8px', borderRadius: 4, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {checkedItems.map(p => basename(p)).join(', ')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="fm-btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={doCopyMultiple}>Copy</button>
                                <button className="fm-btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={doCutMultiple}>Cut</button>
                                <button className="fm-btn" style={{ padding: '4px 8px', fontSize: 12, borderColor: '#f38ba8', color: '#f38ba8' }} onClick={doDeleteMultiple}>Delete</button>
                            </div>
                        </>
                    ) : selected ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#89b4fa' }}>
                                <span style={{ color: '#90a4ae' }}>Selected:</span>
                                <span style={{ fontFamily: 'monospace', background: '#1e2a30', padding: '4px 8px', borderRadius: 4 }}>{selected}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="fm-btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => doOpen(selected)}>Open</button>
                                <button className="fm-btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => doRename(selected)}>Rename</button>
                                <button className="fm-btn" style={{ padding: '4px 8px', fontSize: 12, borderColor: '#f38ba8', color: '#f38ba8' }} onClick={() => doDelete(selected)}>Delete</button>
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: '#90a4ae', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span>{children.length} {children.length === 1 ? 'item' : 'items'} in directory</span>
                            {statusMsg && <span style={{ color: '#a6e3a1', fontWeight: 600 }}>{statusMsg}</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Custom Rename dialog ── */}
            {showRenameDialog && (
                <div className="fm-dialog-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div className="fm-dialog" style={{ background: '#263238', border: '1px solid #37474f', borderRadius: 10, padding: 24, minWidth: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', color: '#e6eef2' }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rename Item</div>
                        <input
                            className="fm-dialog-input"
                            style={{ width: '100%', boxSizing: 'border-box', background: '#37474f', border: '1px solid #455a64', color: '#e6eef2', padding: '8px 10px', borderRadius: 6, fontSize: 13, marginBottom: 16, outline: 'none' }}
                            value={renameInput}
                            onChange={e => setRenameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmRename()}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="fm-btn" style={{ padding: '6px 14px' }} onClick={() => setShowRenameDialog(false)}>Cancel</button>
                            <button className="fm-btn fm-primary" style={{ padding: '6px 14px' }} onClick={confirmRename}>Rename</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Custom Delete confirmation dialog ── */}
            {showDeleteDialog && (
                <div className="fm-dialog-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div className="fm-dialog" style={{ background: '#263238', border: '1px solid #37474f', borderRadius: 10, padding: 24, minWidth: 400, maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', color: '#e6eef2' }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#f38ba8' }}>
                            <span>⚠️</span> Delete Confirmation
                        </div>
                        <div style={{ fontSize: 14, color: '#cfd8dc', lineHeight: 1.5, marginBottom: 20 }}>
                            Are you sure you want to delete the following {deletePaths.length === 1 ? 'item' : `${deletePaths.length} items`}? This action is permanent and will remove nested entries too.
                            <div style={{ marginTop: 10, background: '#1e2a30', padding: 10, borderRadius: 6, maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, color: '#a6adc8' }}>
                                {deletePaths.map(p => basename(p)).join(', ')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="fm-btn" style={{ padding: '6px 14px' }} onClick={() => { setShowDeleteDialog(false); setDeletePaths([]); }}>Cancel</button>
                            <button className="fm-btn fm-primary" style={{ padding: '6px 14px', background: 'linear-gradient(180deg,#f38ba8,#e05f85)', borderColor: '#f38ba8', color: '#1e1e2e', fontWeight: 600 }} onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {contextMenu && (
                <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: '#263238', border: '1px solid #37474f', boxShadow: '0 2px 12px rgba(0,0,0,0.4)', zIndex: 9999, color: '#e6eef2' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180 }}>
                        <button className="fm-menu" onClick={() => { doOpen(contextMenu.item.path); setContextMenu(null); }}>Open</button>
                        <button className="fm-menu" onClick={() => { doCopy(contextMenu.item.path); setContextMenu(null); }}>Copy</button>
                        <button className="fm-menu" onClick={() => { doCut(contextMenu.item.path); setContextMenu(null); }}>Cut</button>
                        <button className="fm-menu" onClick={() => { doPaste(contextMenu.item.path); setContextMenu(null); }} disabled={!clipboard}>Paste into</button>
                        <button className="fm-menu" onClick={() => { doRename(contextMenu.item.path); setContextMenu(null); }}>Rename</button>
                        <button className="fm-menu" onClick={() => { doDelete(contextMenu.item.path); setContextMenu(null); }}>Delete</button>
                    </div>
                </div>
            )}

            <style>{`
                .filemgr-root { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
                .filemgr-left { background: #263238; }
                .fm-btn { background: transparent; border: 1px solid #37474f; color: #e6eef2; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
                .fm-btn:hover { background: #37474f; }
                .fm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .fm-primary { background: linear-gradient(180deg,#2b6ea4,#1f6aa8); border: 1px solid #174c6b; }
                .fm-primary:hover { filter: brightness(1.05); }
                .fm-item { transition: background 0.12s ease; }
                .fm-item-selected { background: #1e2a30; }
                .fm-menu { background: transparent; border: none; color: #e6eef2; padding: 10px 12px; text-align: left; cursor: pointer; }
                .fm-menu:hover { background: #31444a; }
            `}</style>
        </div>
    );
}
