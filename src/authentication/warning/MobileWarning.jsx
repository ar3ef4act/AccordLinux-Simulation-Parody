import React, { useState, useEffect } from 'react';

export default function MobileWarning() {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const isMobile = /Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent)
            || window.innerWidth < 1024;
        if (isMobile) setVisible(true);
    }, []);

    if (!visible || dismissed) return null;

    return (
        <>
            <div className="mw-banner">
                <span className="mw-icon">⚠</span>
                <div className="mw-body">
                    <strong>Non-desktop detected.</strong>
                    {' '}Accord Linux was built for desktop browsers.
                    You may experience graphical issues, layout breaks,
                    or interactions that simply refuse to work on this device.
                    Proceed at your own risk.
                </div>
                <button className="mw-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
                    ✕
                </button>
            </div>
            <style> {
                `.mw-banner {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                max-width: 520px;
                width: calc(100vw - 40px);
                padding: 13px 16px;
                background: #181c22;
                border: 1px solid rgba(232, 160, 32, 0.35);
                border-left: 3px solid #e8a020;
                border-radius: 8px;
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
                animation: mwSlideUp 0.28s ease-out;
                font-family: 'IBM Plex Mono', monospace;
            }

            @keyframes mwSlideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(12px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }

            .mw-icon {
                font-size: 1.1rem;
                flex-shrink: 0;
                margin-top: 1px;
                color: #e8a020;
            }

            .mw-body {
                flex: 1;
                font-size: 0.78rem;
                line-height: 1.6;
                color: #a89880;
            }

            .mw-body strong {
                color: #e8dfc8;
                font-weight: 600;
            }

            .mw-dismiss {
                background: none;
                border: none;
                color: #6a5e4e;
                font-size: 0.85rem;
                cursor: pointer;
                padding: 0 4px;
                flex-shrink: 0;
                margin-top: 1px;
                transition: color 180ms ease;
                font-family: 'IBM Plex Mono', monospace;
            }

            .mw-dismiss:hover { color: #e05555; }`
            } </style>
        </>
    );
}