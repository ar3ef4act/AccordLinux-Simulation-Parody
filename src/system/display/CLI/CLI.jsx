import { useEffect, useRef, useState, useCallback } from 'react';
import { useSystemStore } from '../../Accord';
import { TerminalEngine } from '../../TerminalEngine/TerminalEngine';
import Editor from '../../TerminalEngine/utils/Editor';
import './CLI.css';

export default function CLI({ setMode, embedded = false, sessionId = 'terminal' }) {
    const { activeApp, currentUser, setView, systemStatus, terminalSessions, setTerminalSession } = useSystemStore();

    // Terminal State (load persisted session if available)
    const sess = terminalSessions[sessionId] || {};
    const [cwd, setCwd] = useState(sess.cwd || '/home/player');
    const cwdRef = useRef(sess.cwd || '/home/player');
    const [history, setHistory] = useState(sess.history || [
        { type: 'output', text: 'Accord — type "help" to start.' },
    ]);

    const [input, setInput] = useState('');
    const [inputHistory, setInputHistory] = useState(sess.inputHistory || []);
    const [, setHistIdx] = useState(-1);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const engineRef = useRef(null);

    useEffect(() => {
        const system = {
            getState: () => ({
                ...useSystemStore.getState(),
                cwd: cwdRef.current,
            }),
            setState: (partial) => {
                if ('cwd' in partial) {
                    cwdRef.current = partial.cwd;
                    setCwd(partial.cwd);
                }
                const { cwd: _cwd, ...rest } = partial;
                if (Object.keys(rest).length > 0) {
                    useSystemStore.setState(rest);
                }
            },
        };
        engineRef.current = new TerminalEngine(system);
    }, []);

    // Persist session when history/inputHistory/cwd changes
    useEffect(() => {
        setTerminalSession(sessionId, { history, inputHistory, cwd: cwdRef.current });
    }, [history, inputHistory, sessionId, setTerminalSession]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const formatPrompt = useCallback(() => {
        const display = cwd === '/home/player' ? '~' : cwd;
        return `${currentUser}@Accord:${display}$ `;
    }, [cwd, currentUser]);

    const push = useCallback((entries) => {
        setHistory(prev => [...prev, ...entries]);
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const raw = input.trim();
        const [cmd] = raw.toLowerCase().split(' ');

        const promptLine = { type: 'input', text: formatPrompt() + raw };

        setInput('');
        setHistIdx(-1);
        if (raw) setInputHistory(prev => [raw, ...prev]);

        // Intercept specific commands for mode switching
        if (cmd === 'gui') {                
            if (systemStatus.xland !== true || systemStatus.desktopEnvironment !== true) {
                push([promptLine, { type: 'output', text: 'GUI cannot started... Please configure XLAND-Compositor and Desktop Environment correctly...' }]);
                return;
            }
            setMode('gui');
            if (systemStatus.audio !== true) {
                push([promptLine, { type: 'output', text: 'Starting Accord GUI... Audio is not configured, sound may be unavailable.' }]);
            } else {
                push([promptLine, { type: 'output', text: 'Starting Accord GUI...' }]);
            }
            return;
        }
        if (cmd === 'exit') {
            setView('room');
            return;
        }
        if (cmd === 'games') {
            setView('games-cli');
            return;
        }

        if (!engineRef.current) return;

        // push prompt immediately so streamed output appears after it
        push([promptLine]);

        // onOutput streams incremental output from commands (e.g. curl progress)
        const onOutput = (chunk) => {
            if (!chunk) return;
            setHistory(prev => {
                const out = [...prev];
                // handle carriage-return style updates by overwriting last output line
                if (chunk.startsWith('\r') && !chunk.includes('\n')) {
                    const content = chunk.replace(/\r/g, '');
                    const lastIdx = out.length - 1;
                    if (lastIdx >= 0 && out[lastIdx].type === 'output') {
                        out[lastIdx] = { type: 'output', text: content };
                    } else {
                        out.push({ type: 'output', text: content });
                    }
                    return out;
                }

                // split on newlines and append each line
                const parts = chunk.split('\n');
                parts.forEach((p, idx) => {
                    // skip final empty line caused by trailing newline
                    if (idx === parts.length - 1 && p === '') return;
                    out.push({ type: 'output', text: p });
                });
                return out;
            });
        };

        const result = await engineRef.current.execute(raw, onOutput, { inWindow: embedded });

        if (!result) return;
        if (result.type === 'clear') {
            setHistory([]);
            return;
        }

        const outputLines = result.content
            ? result.content.split('\n').map(line => ({ type: result.type, text: line }))
            : [];

        push([...outputLines, { type: 'output', text: '' }]);
    }, [input, push, formatPrompt, setView, setMode, systemStatus]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHistIdx(prev => {
                const next = Math.min(prev + 1, inputHistory.length - 1);
                setInput(inputHistory[next] ?? '');
                return next;
            });
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHistIdx(prev => {
                const next = Math.max(prev - 1, -1);
                setInput(next === -1 ? '' : (inputHistory[next] ?? ''));
                return next;
            });
        }
    };

    const focusInput = () => inputRef.current?.focus();

    return (
        <div className="desktop-view cli-mode" onClick={focusInput}>
            <div className="terminal-window">
                <div className="terminal-body" style={activeApp === 'editor' ? { height: '100%', display: 'flex', flexDirection: 'column', padding: 0 } : {}}>
                    {activeApp === 'terminal' ? (
                        <>
                            {history.map((entry, i) => (
                                <div key={i} className={`terminal-line terminal-line--${entry.type}`}>
                                    {entry.text}
                                </div>
                            ))}

                            <div id="accord-input-line" className="terminal-line terminal-line--input">
                                <span id="accord-prompt" className="terminal-prompt">{formatPrompt()}</span>
                                <form id="accord-form" onSubmit={handleSubmit} className="terminal-form">
                                    <input
                                        id="accord-input"
                                        ref={inputRef}
                                        className="terminal-input"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        spellCheck={false}
                                        autoComplete="off"
                                    />
                                </form>
                            </div>
                            <div ref={bottomRef} />
                        </>
                    ) : (
                        <Editor />
                    )}
                </div>
            </div>
        </div>
    );
}
