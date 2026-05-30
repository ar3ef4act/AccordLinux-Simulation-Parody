import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

import accordSystemUrl      from './accord/accord-system/guide.md';
import accordABALUrl        from './accord/accord-ABAL/guide.md';
import standardGCCUrl       from './gcc/standard-gcc/guide.md';
import accordCompileGCCUrl  from './gcc/accord-compile-gcc/guide.md';
import bashUrl              from './linux/bash/guide.md';
import repositoryUrl        from './linux/repository/guide.md';
import howToDoUrl           from './howtodo.md'
import softwareUrl           from './software.md'

/**
 * Root cause: webpack (without raw-loader / ?raw) bundles .md files as
 * asset URLs like /static/media/guide.da2901481e0501d2a53c.md, not strings.
 * Fix: keep the URL imports as-is, then fetch() the URL at runtime when the
 * user opens a guide. No bundler config changes required.
 */

const documentationStructure = {
    goals: {
        label: 'How To Do ...',
        icon: '🚀',
        subcategories: {
            'goal' : {
                label: 'Make a goals',
                icon: '🎯',
                description: 'What I\'m gonna do in this simulation?', 
                url: howToDoUrl
            },
            'software' : {
                label: 'Get Information about Software',
                icon: '💭',
                description: 'I wanna do xland and desktop, but the requirement is no where to found',
                url: softwareUrl
            }
        }
    },
    accord: {
        label: 'Accord System',
        icon: '🔧',
        subcategories: {
            'accord-system': {
                label: 'Accord System Configuration',
                icon: '⚙️',
                description: 'Configure Accord system, ABAL, and driver deployment',
                url: accordSystemUrl,
            },
            'accord-ABAL': {
                label: 'ABAL (Bridge Abstraction Layer)',
                icon: '🌉',
                description: 'ABAL metadata, driver validation, and hash verification',
                url: accordABALUrl,
            },
        },
    },
    gcc: {
        label: 'Compiler & Development',
        icon: '💻',
        subcategories: {
            'standard-gcc': {
                label: 'Standard GCC Syntax',
                icon: '📝',
                description: 'C syntax, struct definitions, and driver templates',
                url: standardGCCUrl,
            },
            'accord-compile-gcc': {
                label: 'Accord GCC Compiler',
                icon: '⚡',
                description: 'Accord compiler features, metadata generation, hash validation',
                url: accordCompileGCCUrl,
            },
        },
    },
    linux: {
        label: 'Linux & Commands',
        icon: '🐧',
        subcategories: {
            bash: {
                label: 'Terminal Commands',
                icon: '💬',
                description: 'All 20+ terminal commands with examples and usage',
                url: bashUrl,
            },
            repository: {
                label: 'Driver Repository',
                icon: '📚',
                description: 'Driver structures, file organization, deployment workflow',
                url: repositoryUrl,
            },
        },
    },
};

// ─── Main component ─────────────────────────────────────────────────────────

const Documentation = forwardRef(function Documentation(props, ref) {
    const [nav, setNav] = useState([{ type: 'root' }]);
    const currentLevel = nav[nav.length - 1];

    const pushCategory = (key) => {
        const cat = documentationStructure[key];
        setNav([...nav, { type: 'category', key, label: cat.label }]);
    };

    const pushGuide = (catKey, subKey) => {
        const sub = documentationStructure[catKey].subcategories[subKey];
        setNav([...nav, { type: 'guide', key: subKey, label: sub.label, url: sub.url }]);
    };

    const jumpTo = (idx) => {
        setNav(nav.slice(0, idx + 1));
    };

    // expose imperative methods to parent (AppsBrowser)
    useImperativeHandle(ref, () => ({
        goHome: () => setNav([{ type: 'root' }]),
        goBack: () => setNav((n) => (n.length > 1 ? n.slice(0, n.length - 1) : n)),
        getCurrentLabel: () => {
            const cur = nav[nav.length - 1];
            return cur.type === 'root' ? 'docs' : cur.label;
        }
    }));

    const Breadcrumb = () => (
        <div className="doc-breadcrumb">
            {nav.map((crumb, idx) => {
                const isLast = idx === nav.length - 1;
                const label = crumb.type === 'root' ? 'docs' : crumb.label;
                return (
                    <span key={idx} className="doc-crumb-group">
                        {idx > 0 && <span className="doc-crumb-sep">›</span>}
                        <button
                            className={`doc-crumb-btn ${isLast ? 'active' : ''}`}
                            onClick={() => !isLast && jumpTo(idx)}
                            disabled={isLast}
                        >
                            {label}
                        </button>
                    </span>
                );
            })}
        </div>
    );

    const RootView = () => (
        <div className="doc-view">
            <div className="doc-view-label">Select a category</div>
            <div className="doc-list">
                {Object.entries(documentationStructure).map(([key, cat]) => (
                    <button key={key} className="doc-row-btn" onClick={() => pushCategory(key)}>
                        <span className="doc-row-icon">{cat.icon}</span>
                        <span className="doc-row-label">{cat.label}</span>
                        <span className="doc-row-arrow">›</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const CategoryView = ({ catKey }) => {
        const cat = documentationStructure[catKey];
        return (
            <div className="doc-view">
                <div className="doc-view-label">{cat.label}</div>
                <div className="doc-list">
                    {Object.entries(cat.subcategories).map(([key, sub]) => (
                        <button key={key} className="doc-row-btn" onClick={() => pushGuide(catKey, key)}>
                            <span className="doc-row-icon">{sub.icon}</span>
                            <div className="doc-row-body">
                                <span className="doc-row-label">{sub.label}</span>
                                <span className="doc-row-desc">{sub.description}</span>
                            </div>
                            <span className="doc-row-arrow">›</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // Global caches so remounted GuideView instances reuse content and scroll
    const guideContentCache = new Map();
    const guideScrollCache = new Map();

    // GuideView fetches the asset URL and renders the raw markdown text.
    const GuideView = ({ url }) => {
        const [content, setContent] = useState(null);
        const [error, setError]     = useState(null);
        const containerRef = React.useRef(null);

        useEffect(() => {
            const normalizedUrl = typeof url === 'object' && url !== null
                ? (url.default || url)
                : url;

            if (!normalizedUrl) {
                setError('Guide URL is not available.');
                return;
            }

            // If cached, reuse immediately
            if (guideContentCache.has(normalizedUrl)) {
                setContent(guideContentCache.get(normalizedUrl));
                setError(null);
                const saved = guideScrollCache.get(normalizedUrl);
                if (saved != null && containerRef.current) {
                    requestAnimationFrame(() => { containerRef.current.scrollTop = saved; });
                }
                return;
            }

            setError(null);
            fetch(normalizedUrl)
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.text();
                })
                .then((text) => {
                    guideContentCache.set(normalizedUrl, text);
                    setContent(text);
                    const saved = guideScrollCache.get(normalizedUrl);
                    if (saved != null && containerRef.current) {
                        requestAnimationFrame(() => { containerRef.current.scrollTop = saved; });
                    }
                })
                .catch((err) => setError(err.message));

            return () => {
                const saved = containerRef.current ? containerRef.current.scrollTop : null;
                if (saved != null) guideScrollCache.set(normalizedUrl, saved);
            };
        }, [url]);

        if (error) {
            return (
                <div className="doc-view doc-guide-view">
                    <p className="doc-fetch-error">Failed to load guide: {error}</p>
                </div>
            );
        }

        if (!content) {
            return (
                <div className="doc-view doc-guide-view">
                    <div className="doc-loading">
                        <span className="doc-loading-dot" />
                        <span className="doc-loading-dot" />
                        <span className="doc-loading-dot" />
                    </div>
                </div>
            );
        }

        return (
            <div className="doc-view doc-guide-view">
                <div
                    ref={containerRef}
                    className="doc-guide-scroll"
                    style={{ overflow: 'auto', height: '100%' }}
                    onScroll={(e) => {
                        try {
                            const normalizedUrl = typeof url === 'object' && url !== null
                                ? (url.default || url)
                                : url;
                            guideScrollCache.set(normalizedUrl, e.currentTarget.scrollTop);
                        } catch (e) {
                            // ignore
                        }
                    }}
                >
                    <MarkdownRenderer content={content} highlight={props.highlight} />
                </div>
            </div>
        );
    };

    const renderLevel = () => {
        if (currentLevel.type === 'root')     return <RootView />;
        if (currentLevel.type === 'category') return <CategoryView catKey={currentLevel.key} />;
        if (currentLevel.type === 'guide')    return <GuideView url={currentLevel.url} />;
        return null;
    };

    // notify parent about navigation change
    useEffect(() => {
        if (props.onNavigate) props.onNavigate(nav[nav.length - 1]);
    }, [nav]);

    return (
        <div className="doc-root">
            <Breadcrumb />
            {renderLevel()}
        </div>
    );
});

export default Documentation;

// ─── Markdown renderer ───────────────────────────────────────────────────────

function MarkdownRenderer({ content, highlight }) {
    const lines = String(content || '').split('\n');
    const elements = [];
    let i = 0;
    const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    const highlightRegex = highlight ? new RegExp(escapeRegex(highlight), 'ig') : null;

    const highlightInline = (text) => {
        if (!highlightRegex) return text;
        const parts = [];
        let lastIndex = 0;
        let m;
        highlightRegex.lastIndex = 0;
        while ((m = highlightRegex.exec(text)) !== null) {
            if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
            parts.push(<span key={`h-${lastIndex}`} className="doc-find-term">{m[0]}</span>);
            lastIndex = m.index + m[0].length;
        }
        if (lastIndex < text.length) parts.push(text.slice(lastIndex));
        return parts.length === 1 ? parts[0] : parts;
    };

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code block
        if (line.trim().startsWith('```')) {
            const fenceLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                fenceLines.push(lines[i]);
                i++;
            }
            i++;
            elements.push(
                <pre key={`pre-${i}`} className="doc-code-block">
                    <code>{highlightRegex ? highlightInline(fenceLines.join('\n')) : fenceLines.join('\n')}</code>
                </pre>
            );
            continue;
        }
        if (line.startsWith('# '))   { elements.push(<h1 key={i} className="doc-h1">{renderInline(line.substring(2), highlightRegex)}</h1>);  i++; continue; }
        if (line.startsWith('## '))  { elements.push(<h2 key={i} className="doc-h2">{renderInline(line.substring(3), highlightRegex)}</h2>);  i++; continue; }
        if (line.startsWith('### ')) { elements.push(<h3 key={i} className="doc-h3">{renderInline(line.substring(4), highlightRegex)}</h3>);  i++; continue; }
        if (line.trim() === '---')   { elements.push(<hr key={i} className="doc-hr" />); i++; continue; }

        // Unordered list
        if (/^[-*] /.test(line.trim())) {
            const items = [];
            while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
                items.push(lines[i].trim().substring(2));
                i++;
            }
            elements.push(
                <ul key={`ul-${i}`} className="doc-ul">
                    {items.map((item, j) => <li key={j} className="doc-li">{renderInline(item, highlightRegex)}</li>)}
                </ul>
            );
            continue;
        }

        // Ordered list
        if (/^\d+\. /.test(line.trim())) {
            const items = [];
            while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^\d+\. /, ''));
                i++;
            }
            elements.push(
                <ol key={`ol-${i}`} className="doc-ol">
                    {items.map((item, j) => <li key={j} className="doc-li">{renderInline(item)}</li>)}
                </ol>
            );
            continue;
        }

        // Table
        if (line.trim().startsWith('|')) {
            const rows = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                rows.push(lines[i]);
                i++;
            }
            const dataRows = rows.filter(r => !/^\|[-| :]+\|$/.test(r.trim()));
            if (dataRows.length > 0) {
                const parseRow = (r) =>
                    r.split('|').map(c => c.trim()).filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
                const [header, ...body] = dataRows;
                elements.push(
                    <table key={`table-${i}`} className="doc-table">
                            <thead><tr>{parseRow(header).map((cell, j) => <th key={j}>{highlightRegex ? highlightInline(cell) : cell}</th>)}</tr></thead>
                            <tbody>{body.map((row, ri) => <tr key={ri}>{parseRow(row).map((cell, j) => <td key={j}>{renderInline(cell, highlightRegex)}</td>)}</tr>)}</tbody>
                        </table>
                    );
            }
            continue;
        }

        if (!line.trim()) { i++; continue; }

        elements.push(<p key={i} className="doc-p">{renderInline(line, highlightRegex)}</p>);
        i++;
    }

    return <div className="doc-md-body">{elements}</div>;
}

function renderInline(text, highlightRegex) {
    const parts = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
    let last = 0;
    let match;

    const wrapHighlight = (s) => {
        if (!highlightRegex) return s;
        const out = [];
        let li = 0;
        let m;
        highlightRegex.lastIndex = 0;
        while ((m = highlightRegex.exec(s)) !== null) {
            if (m.index > li) out.push(s.slice(li, m.index));
            out.push(<span key={`h-${li}`} className="doc-find-term">{m[0]}</span>);
            li = m.index + m[0].length;
        }
        if (li < s.length) out.push(s.slice(li));
        return out.length === 1 ? out[0] : out;
    };

    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) parts.push(wrapHighlight(text.slice(last, match.index)));
        if (match[1].startsWith('**'))  parts.push(<strong key={match.index}>{wrapHighlight(match[2])}</strong>);
        else if (match[1].startsWith('*'))  parts.push(<em key={match.index}>{wrapHighlight(match[3])}</em>);
        else if (match[1].startsWith('`'))  parts.push(<code key={match.index} className="doc-inline-code">{wrapHighlight(match[4])}</code>);
        else if (match[1].startsWith('['))  parts.push(<a key={match.index} href={match[6]} className="doc-link" target="_blank" rel="noreferrer">{wrapHighlight(match[5])}</a>);
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(wrapHighlight(text.slice(last)));
    return parts.length > 0 ? parts : text;
}