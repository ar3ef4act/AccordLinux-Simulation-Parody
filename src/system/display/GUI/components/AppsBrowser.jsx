import React, { useRef, useState } from 'react';
import Documentation from '../../../internet/documentation/documentation.jsx';
import './AppsBrowser.css';

function AppsBrowserComponent() {
    const docRef = useRef(null);
    const contentRef = useRef(null);
    const [address, setAddress] = useState('docs');
    const [key, setKey] = useState(0);
    const [findQuery, setFindQuery] = useState('');
    const [matches, setMatches] = useState([]);
    const [currentMatch, setCurrentMatch] = useState(0);
    // modifiedRef removed; highlights will be rendered by Documentation via prop

    const goHome = () => docRef.current?.goHome?.();
    const goBack = () => docRef.current?.goBack?.();
    const reload = () => setKey(k => k + 1);

    const clearHighlights = () => {
        setMatches([]);
        setCurrentMatch(0);
        setFindQuery('');
    };

    const gotoMatch = (idx) => {
        if (!matches || matches.length === 0) return;
        let next = idx;
        if (next < 0) next = matches.length - 1;
        if (next >= matches.length) next = 0;
        setCurrentMatch(next);
        const el = matches[next];
        if (!el) return;
        const container = contentRef.current?.querySelector('.doc-guide-scroll') || contentRef.current;
        if (container) {
            // remove previous active
            container.querySelectorAll('.doc-find-term-active').forEach((a) => a.classList.remove('doc-find-term-active'));
        }
        el.classList.add('doc-find-term-active');
        if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const doFind = () => {
        const q = (findQuery || '').trim();
        if (!q) {
            clearHighlights();
            return;
        }
        // setFindQuery already holds the text; Documentation will render highlights based on this prop
        // wait briefly for Documentation to update and then collect matches
        setTimeout(() => {
            const container = contentRef.current;
            if (!container) return setMatches([]);
            const found = Array.from(container.querySelectorAll('.doc-find-term'));
            setMatches(found);
            setCurrentMatch(0);
            if (found.length) gotoMatch(0);
        }, 120);
    };

    return (
        <>
        <div className="apps-browser-root">
                <div className="apps-browser-toolbar">
                <button className="btn" onClick={() => { goBack(); setTimeout(() => setAddress(docRef.current?.getCurrentLabel?.() || 'docs'), 0); }}>◀</button>
                <button className="btn" onClick={() => { goHome(); setTimeout(() => setAddress(docRef.current?.getCurrentLabel?.() || 'docs'), 0); }}>🏠</button>
                <button className="btn" onClick={() => { reload(); }}>⟳</button>
                <div className="apps-browser-address">{address}</div>
                <div className="apps-browser-search-container">
                    <input
                        className="apps-browser-search-input"
                        placeholder="Find in page..."
                        value={findQuery}
                        onChange={(e) => setFindQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') doFind(); }}
                    />
                    <button className="btn" onClick={() => doFind()}>Search</button>
                    <div className="apps-browser-matches">{matches.length ? `${currentMatch+1}/${matches.length}` : ''}</div>
                </div>
            </div>

            <div className="apps-browser-content" ref={contentRef}>
                <Documentation
                    key={key}
                    ref={docRef}
                    highlight={findQuery}
                    onNavigate={(current) => setAddress(current.type === 'root' ? 'docs' : current.label)}
                />
            </div>
        </div>
        </>
    );
}

export default React.memo(AppsBrowserComponent);
