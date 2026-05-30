import React, { useState } from 'react';

const NOTICES = [
    {
        icon: '📦',
        title: 'Declarative system config',
        body: 'Accord OS is inspired by NixOS — a Linux distro that manages the entire system through a single declarative configuration file. No manual package juggling, no "it worked on my machine". Hardware here works the same way: you define it, the system applies it.',
    },
    {
        icon: '⚙️',
        title: 'GCC is a parody',
        body: 'The compiler in this simulation is not real GCC. It accepts a limited subset of standard C for flavour, but its primary purpose is compiling ABAL (Accord Binary Abstraction Layer) — a fictional format with strict rules. Refer to the Documentation for valid syntax and don\'t expect your real-world C projects to build here.',
    },
    {
        icon: '📖',
        title: 'When get hash error, consider check the cheatsheet',
        body: 'A cheatsheet is available in the Documentation tab of the sidebar. It covers ABAL Code and wroking ELF hash.',
    },
    {
        icon: '🐌',
        title: 'Some screens load slowly',
        body: 'Certain views may take a moment to appear. This is a known side effect of developing under real-world constraints: limited time, limited resources, and assets that are heavier than ideal. It\'s not a crash — just patience tax.',
    },
];

export default function NewGameNotice({ onClose }) {
    const [step, setStep] = useState(0);
    const current = NOTICES[step];
    const isLast = step === NOTICES.length - 1;

    return (
        <>
            <div className="ngn-backdrop">
                <div className="ngn-modal" role="dialog" aria-modal="true">

                    <div className="ngn-header">
                        <span className="ngn-prompt">
                            <span className="ngn-ps">$</span> accord-system --briefing
                        </span>
                        <span className="ngn-counter">{step + 1} / {NOTICES.length}</span>
                    </div>

                    <div className="ngn-body">
                        <div className="ngn-icon" aria-hidden="true">{current.icon}</div>
                        <h2 className="ngn-title">{current.title}</h2>
                        <p className="ngn-text">{current.body}</p>
                    </div>

                    <div className="ngn-dots" aria-hidden="true">
                        {NOTICES.map((_, i) => (
                            <span key={i} className={`ngn-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
                        ))}
                    </div>

                    <div className="ngn-footer">
                        {step > 0 && (
                            <button className="ngn-btn-ghost" onClick={() => setStep(s => s - 1)}>
                                ← Back
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        {isLast ? (
                            <button className="ngn-btn-primary" onClick={onClose}>
                                ▶ Start session
                            </button>
                        ) : (
                            <button className="ngn-btn-primary" onClick={() => setStep(s => s + 1)}>
                                Next →
                            </button>
                        )}
                    </div>

                </div>
            </div>
            <style>{`
            .ngn-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.72);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(4px);
                animation: ngnFadeIn 0.22s ease-out;
            }

            @keyframes ngnFadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }

            .ngn-modal {
                width: 90%;
                max-width: 480px;
                background: #111418;
                border: 1px solid rgba(232, 160, 32, 0.22);
                border-radius: 12px;
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: ngnSlideUp 0.24s ease-out;
                font-family: 'IBM Plex Mono', 'Courier New', monospace;
            }

            @keyframes ngnSlideUp {
                from { transform: translateY(16px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }

            /* ── Header ── */
            .ngn-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 18px;
                background: #181c22;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            .ngn-prompt {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                font-size: 0.7rem;
                color: #e8a020;
                letter-spacing: 0.04em;
            }

            .ngn-ps {
                color: #b87a18;
                font-weight: 600;
            }

            .ngn-counter {
                font-size: 0.68rem;
                color: #6a5e4e;
                letter-spacing: 0.08em;
            }

            /* ── Body ── */
            .ngn-body {
                padding: 28px 24px 20px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
                min-height: 180px;
            }

            .ngn-icon {
                font-size: 2rem;
                line-height: 1;
            }

            .ngn-title {
                margin: 0;
                font-size: 1.05rem;
                font-weight: 600;
                color: #e8dfc8;
                letter-spacing: -0.3px;
                line-height: 1.2;
            }

            .ngn-text {
                margin: 0;
                font-size: 0.82rem;
                color: #a89880;
                line-height: 1.75;
                font-family: 'IBM Plex Sans', sans-serif;
            }

            /* ── Dot progress ── */
            .ngn-dots {
                display: flex;
                justify-content: center;
                gap: 6px;
                padding: 4px 0 16px;
            }

            .ngn-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #2a3040;
                border: 1px solid rgba(255, 255, 255, 0.07);
                transition: background 220ms ease, transform 220ms ease;
            }

            .ngn-dot.done   { background: rgba(232, 160, 32, 0.3); }
            .ngn-dot.active { background: #e8a020; transform: scale(1.25); }

            /* ── Footer ── */
            .ngn-footer {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 18px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                background: #181c22;
            }

            .ngn-btn-primary {
                background: #e8a020;
                color: #0b0d0f;
                border: none;
                padding: 9px 20px;
                border-radius: 6px;
                font-size: 0.78rem;
                font-weight: 700;
                font-family: 'IBM Plex Mono', monospace;
                letter-spacing: 0.04em;
                cursor: pointer;
                transition: background 180ms ease, transform 180ms ease;
                text-transform: uppercase;
            }

            .ngn-btn-primary:hover {
                background: #f0aa28;
                transform: translateY(-1px);
            }

            .ngn-btn-ghost {
                background: transparent;
                color: #6a5e4e;
                border: none;
                padding: 9px 14px;
                border-radius: 6px;
                font-size: 0.78rem;
                font-family: 'IBM Plex Mono', monospace;
                cursor: pointer;
                transition: color 180ms ease;
            }

            .ngn-btn-ghost:hover { color: #a89880; }
        `}</style>
        </>
    );
}