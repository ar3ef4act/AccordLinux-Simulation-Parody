import React, { useState, useEffect, useRef } from 'react';
import { useSystemStore } from '../../Accord';

function normalizePath(path) {
    const parts = path.split('/');
    const stack = [];

    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') {
            stack.pop();
        } else {
            stack.push(part);
        }
    }

    return '/' + stack.join('/');
}

function getDirectory(path) {
    const idx = path.lastIndexOf('/');
    return idx <= 0 ? '/' : path.slice(0, idx);
}

export default function Editor() {
    const { currentFile, vfs, writeFile, removeNode, setActiveApp } = useSystemStore();
    const [content, setContent] = useState('');
    const [filename, setFilename] = useState('');
    const [originalPath, setOriginalPath] = useState('');

    // Vim-like command state
    const [command, setCommand] = useState('');
    const [isCommandMode, setIsCommandMode] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const textareaRef = useRef(null);
    const cmdInputRef = useRef(null);

    useEffect(() => {
        if (currentFile) {
            setFilename(currentFile);
            setOriginalPath(currentFile);
            const file = vfs[currentFile];
            setContent(file ? (file.content || '') : '');
        }
    }, [currentFile, vfs]);

    const handleSave = () => {
        if (originalPath && filename !== originalPath && vfs[originalPath]) {
            removeNode(originalPath);
        }
        writeFile(filename, content);
        setOriginalPath(filename);
        setStatusMsg(`"${filename}" written`);
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const handleQuit = () => {
        setActiveApp('terminal');
    };

    const handleCommand = (e) => {
        if (e.key === 'Enter') {
            const cmd = command.trim().toLowerCase();

            if (cmd === ':w') {
                handleSave();
            } else if (cmd === ':q') {
                handleQuit();
            } else if (cmd === ':wq' || cmd === ':x') {
                handleSave();
                handleQuit();
            } else if (cmd.startsWith(':rn')) {
                const rawCommand = command.trim();
                const newName = rawCommand.slice(3).trim();
                if (newName) {
                    const newPath = newName.startsWith('/')
                        ? normalizePath(newName)
                        : normalizePath(`${getDirectory(originalPath)}/${newName}`);

                    setFilename(newPath);
                    setStatusMsg(`Renamed to ${newPath}`);
                } else {
                    setStatusMsg('Rename failed: missing file name');
                }
            } else {
                setStatusMsg(`Unknown command: ${cmd}`);
            }

            setCommand('');
            setIsCommandMode(false);
            textareaRef.current?.focus();
        } else if (e.key === 'Escape') {
            setIsCommandMode(false);
            setCommand('');
            textareaRef.current?.focus();
        }
    };

    const handleTextareaKey = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsCommandMode(true);
            setCommand('');
            setTimeout(() => cmdInputRef.current?.focus(), 10);
        }
    };

    return (
        <div className="simple-editor" onClick={() => !isCommandMode && textareaRef.current?.focus()}>
            <div className="editor-header">
                <p>{filename} {content !== (vfs[originalPath]?.content || '') ? '[modified]' : ''}</p>
            </div>

            <textarea
                ref={textareaRef}
                className="editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleTextareaKey}
                autoFocus
                spellCheck={false}
            />

            <div className="editor-footer">
                {isCommandMode ? (
                    <div className="command-line">
                        <input
                            ref={cmdInputRef}
                            type="text"
                            className="command-input"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleCommand}
                            placeholder='Press [ESC] for command mode (:w, :q, :wq)'
                        />
                    </div>
                ) : (
                    <div className="status-line">
                        <span className="status-msg">{statusMsg}</span>
                        <span className="editor-hint">Press [ESC] for command mode (:w, :q, :wq)</span>
                    </div>
                )}
            </div>

            <style>{`
                .editor-footer {
                    background: #1a1a1a;
                    padding: 4px 15px;
                    border-top: 1px solid #333;
                    min-height: 25px;
                    display: flex;
                    align-items: center;
                    font-family: 'JetBrains Mono', monospace;
                }
                .command-line {
                    width: 100%;
                }
                .command-input {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #fff;
                    font-family: inherit;
                    font-size: 0.85rem;
                    outline: none;
                }
                .status-line {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    color: #888;
                }
                .status-msg {
                    color: #50fa7b;
                }
                .editor-hint {
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}
