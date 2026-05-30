import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const Window = forwardRef(({
    id,
    title,
    icon,
    children,
    onClose,
    onFocus,
    onMinimize,
    onRestore,
    isActive,
    zIndex,
    canResize = true,
    lockMinSize = false,
    minWidth = 420,
    minHeight = 340,
}, ref) => {
    const initialW = Math.max(820, minWidth);
    const initialH = Math.max(620, minHeight);
    const startW = Math.min(initialW, window.innerWidth - 32);
    const startH = Math.min(initialH, window.innerHeight - 68);
    const [size, setSize] = useState({ width: startW, height: startH });
    
    const initialX = Math.max(16, Math.min(100 + (id.length * 20), window.innerWidth - startW - 16));
    const initialY = Math.max(36, Math.min(80 + (id.length * 20), window.innerHeight - startH - 16));
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [isMaximized, setIsMaximized] = useState(false);
    const [lockedMin, setLockedMin] = useState(!!lockMinSize);
    const dragging = useRef(false);
    const windowRef = useRef(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

    const handleHeaderMouseDown = (e) => {
        if (e.target.closest('button')) return;
        dragging.current = true;
        onFocus();
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        onFocus();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    };

    const hideContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0 });

    // Expose imperative methods to parent via ref
    useImperativeHandle(ref, () => ({
        minimize: () => onMinimize?.(id),
        restore: () => onRestore?.(id),
        center: () => {
            const targetW = Math.max(minWidth, Math.round(size.width * 0.7));
            const targetH = Math.max(minHeight, Math.round(size.height * 0.7));
            const left = Math.max(16, Math.round((window.innerWidth - targetW) / 2));
            const top = Math.max(36, Math.round((window.innerHeight - targetH) / 2));
            setSize({ width: targetW, height: targetH });
            setPos({ x: left, y: top });
            setIsMaximized(false);
        },
        toggleFullscreen: () => setIsMaximized(p => !p),
        close: () => onClose(),
        // allow parent to lock/unlock the minimum size at runtime
        setLockMinSize: (v) => setLockedMin(!!v),
    }));

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (dragging.current && !isMaximized) {
                setPos(prev => ({
                    x: prev.x + e.movementX,
                    y: prev.y + e.movementY,
                }));
            }
        };

        const handleMouseUp = () => {
            dragging.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isMaximized]);

    // Observe actual element size changes (e.g. user drag-resize) and sync state.
    useEffect(() => {
        if (!canResize || !windowRef.current) return undefined;
        const el = windowRef.current;
        // Set initial size from DOM
        const initRect = el.getBoundingClientRect();
        setSize({ width: Math.max(Math.round(initRect.width), minWidth), height: Math.max(Math.round(initRect.height), minHeight) });

        if (typeof ResizeObserver === 'undefined') return undefined;

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const r = entry.contentRect || entry.target.getBoundingClientRect();
                setSize({ width: Math.max(Math.round(r.width), minWidth), height: Math.max(Math.round(r.height), minHeight) });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [canResize]);

    // When lockedMin is true, set inline minWidth/minHeight so window cannot
    // be shrunk below the current size. When unlocked, clear inline values.
    useEffect(() => {
        const el = windowRef.current;
        if (!el) return;
        // always enforce configured minWidth/minHeight
        el.style.minWidth = `${Math.max(1, Math.round(minWidth))}px`;
        el.style.minHeight = `${Math.max(1, Math.round(minHeight))}px`;
        // if lockedMin is active, bump the minimum to current size
        if (lockedMin) {
            el.style.minWidth = `${Math.max(Math.round(size.width), Math.round(minWidth))}px`;
            el.style.minHeight = `${Math.max(Math.round(size.height), Math.round(minHeight))}px`;
        }
    }, [lockedMin, size, minWidth, minHeight]);

    const handleMaximize = (e) => {
        e.stopPropagation();
        setIsMaximized(prev => !prev);
    };

    const style = isMaximized
        ? {
            left: 0,
            top: 32,
            width: '100%',
            height: 'calc(100% - 32px)',
        }
        : {
            left: pos.x,
            top: pos.y,
            width: size.width,
            height: size.height,
        };

    const effectiveStyle = { ...style, zIndex };

    return (
        <div
            ref={windowRef}
            className={`xfce-window ${isActive ? 'active' : ''} ${canResize ? 'resizable' : 'no-resize'}`}
            style={effectiveStyle}
            onClick={onFocus}
            onContextMenu={handleContextMenu}
        >
            <div className="window-header" onMouseDown={handleHeaderMouseDown}>
                <div className="header-left">
                    <span className="window-icon">{icon}</span>
                    <span className="window-title">{title}</span>
                </div>
                <div className="header-right">
                    <button className="win-btn minimize" onClick={(e) => { e.stopPropagation(); onMinimize?.(id); }}>_</button>
                    <button className="win-btn maximize" onClick={handleMaximize}>
                        {isMaximized ? '🗗' : '□'}
                    </button>
                    <button className="win-btn close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
                </div>
            </div>
            <div className="window-content">
                {children}
            </div>
        </div>
    );
});

export default Window;
