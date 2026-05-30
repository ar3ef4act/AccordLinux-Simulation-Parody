import React from 'react';

const DesktopIcon = ({ app, onDoubleClick }) => {
    return (
        <div className="desktop-icon" onDoubleClick={() => onDoubleClick(app.id)}>
            <div className="icon-wrapper">
                <span className="icon-main">{app.icon}</span>
            </div>
            <span className="icon-label">{app.name}</span>
        </div>
    );
};

export default DesktopIcon;
