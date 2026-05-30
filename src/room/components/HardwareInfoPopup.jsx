import React from 'react';
import hardwareInfo from './hardwareInfo.json';
import './HardwareInfoPopup.css';

export default function HardwareInfoPopup({ deviceKey, isOpen, onClose, hardwareState, systemStatus, toggleHardware, updateConfigFile }) {
    if (!isOpen || !deviceKey) return null;

    const info = hardwareInfo.hardware[deviceKey];
    if (!info) return null;

    const hwState = hardwareState[deviceKey];
    const status = systemStatus?.[deviceKey];

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleToggle = () => {
        toggleHardware(deviceKey);
        // Update configuration file to reflect the new state
        if (updateConfigFile) {
            updateConfigFile(deviceKey, !hwState?.enable);
        }
    };

    const allFields = [
        ...info.requiredFields.base,
        ...info.requiredFields.attributes,
        ...info.requiredFields.accord_added,
    ];

    return (
        <div className="hardware-popup-backdrop" onClick={handleBackdropClick}>
            <div className="hardware-popup-modal compact">
                {/* Header */}
                <div className="popup-header compact">
                    <div className="popup-title compact">
                        <span className="popup-icon">{info.icon}</span>
                        <div className="popup-title-text">
                            <h2>{info.label}</h2>
                        </div>
                    </div>
                    <button className="popup-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Content */}
                <div className="popup-content compact">
                    {/* Status & Toggle Section */}
                    <div className="popup-section compact">
                        <div className="status-row">
                            <div className="status-info">
                                <span className={`status-dot ${status ? 'functional' : 'non-functional'}`}></span>
                                <div>
                                    <div className="status-label">Power</div>
                                    <div className={`status-value ${status ? 'enabled' : 'disabled'}`}>
                                        {status ? '✓ Functional' : '✗ Not Functional'}
                                    </div>
                                </div>
                            </div>
                            {deviceKey !== 'laptop' && (
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={hwState?.enable || false}
                                        onChange={handleToggle}
                                    />
                                    <span className="slider"></span>
                                    <span className="toggle-label">{hwState?.enable ? 'On' : 'Off'}</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Fields Grid */}
                    {allFields.length > 0 && (
                        <div className="popup-section compact fields-section">
                            <h3 className="section-title compact">Required Fields</h3>
                            <div className="fields-compact-grid">
                                {allFields.map((field) => (
                                    <div key={field} className="field-compact">
                                        <div className="field-name-compact">{field}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="popup-footer compact">
                    <button className="popup-action-btn compact" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
