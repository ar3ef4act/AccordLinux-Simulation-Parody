import React from 'react';

const WhiskerMenu = ({ currentUser, apps, onAction, onClose }) => {
    return (
        <div className="whisker-menu" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
                <div className="user-avatar">{currentUser[0]?.toUpperCase()}</div>
                <div className="user-info">
                    <span className="username">{currentUser}</span>
                    <span className="hostname">accord-pc</span>
                </div>
            </div>
            <div className="menu-search">
                <input type="text" placeholder="Search applications..." autoFocus />
            </div>
            <div className="menu-content">
                <div className="menu-categories">
                    <div className="category active">All Applications</div>
                    <div className="category">Accessories</div>
                    <div className="category">Games</div>
                    <div className="category">System</div>
                </div>
                <div className="menu-items">
                    {apps.map(app => (
                        <div key={app.id} className="menu-item" onClick={() => onAction(app.id)}>
                            <span className="item-icon">{app.icon}</span>
                            <span className="item-name">{app.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WhiskerMenu;
