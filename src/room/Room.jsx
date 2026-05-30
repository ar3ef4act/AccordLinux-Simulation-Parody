import React, { useState } from 'react';
import { useSystemStore } from '../system/Accord';
import HardwareInfoPopup from './components/HardwareInfoPopup';
import './Room.css';

import laptop from "./components/assets/laptop.png"
import monitor from "./components/assets/monitor.png"
import speaker from "./components/assets/speaker.png"
import compute from "./components/assets/compute.png"
import router from "./components/assets/router.png"

// Helper Component for Hardware Hotspots
const HardwareItem = ({ x, y, width, height, onClick, onInfo, src, alt, children, mirrored = false }) => (
    <foreignObject x={x} y={y} width={width} height={height}>
        <div
            className={`hw-box`}
            onClick={onClick}
            onContextMenu={(e) => {
                e.preventDefault();
                onInfo && onInfo(e);
            }}
            title="Left-click to interact, Right-click for info"
        >
            {src ? <img src={src} alt={alt} style={mirrored ? { transform: 'scaleX(-1)' } : {}} /> : children}
        </div>
    </foreignObject>
);

export default function Room() {
    const { setView, setDisplaySource, hardwareState, systemStatus, toggleHardware, updateHardwareConfig } = useSystemStore();
    const [selectedHardware, setSelectedHardware] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const handleHardwareClick = (device, showInfo = false) => {
        if (showInfo) {
            setSelectedHardware(device);
            setIsPopupOpen(true);
            return;
        }

        if (device === 'monitor') {
            if (hardwareState.externalMonitor?.enable && systemStatus.externalMonitor) {
                setDisplaySource('monitor');
                setView('display');
            }
        };

        const openHardwareInfo = (device, event) => {
            if (event) {
                event.stopPropagation();
            }
            handleHardwareClick(device, true);
        };

        // VIRTUAL COORDINATE SYSTEM (16:9)
        const VIEW_WIDTH = 1000;
        const VIEW_HEIGHT = 562.5;

        return (
            <div className="room-view">
                <HardwareInfoPopup
                    deviceKey={selectedHardware}
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    hardwareState={hardwareState}
                    systemStatus={systemStatus}
                    toggleHardware={toggleHardware}
                    updateConfigFile={updateHardwareConfig}
                />

                <div className="room-visual">
                    <div className="room-svg-container">
                        <svg
                            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                            preserveAspectRatio="xMidYMid meet"
                            className="room-interactive-svg"
                        >
                            <image
                                href={require('./components/background/background.jpg')}
                                width={VIEW_WIDTH}
                                height={VIEW_HEIGHT}
                                preserveAspectRatio="xMidYMid meet"
                            />

                            <HardwareItem
                                x="783" y="117" width="100" height="100"
                                onClick={() => { setDisplaySource('laptop'); setView('display'); }}
                                onInfo={(e) => openHardwareInfo('laptop', e)}
                                src={laptop} alt="Laptop"
                            />

                            <HardwareItem
                                x="332" y="38" width="335" height="145"
                                onInfo={(e) => openHardwareInfo('externalMonitor', e)}
                                onClick={() => handleHardwareClick('externalMonitor')}
                                src={monitor} alt="Monitor"
                                className={`component-hw ${hardwareState.externalMonitor?.enable ? 'active' : ''}`}
                            />

                            <HardwareItem //Left
                                x="260" y="92" width="130" height="130"
                                onInfo={(e) => openHardwareInfo('audio', e)}
                                onClick={() => handleHardwareClick('audio')}
                                src={speaker} alt="Speaker"
                                className={`component-hw ${hardwareState.audio?.enable ? 'active' : ''}`}
                            />
                            <HardwareItem //Right - Mirrored
                                x="610" y="92" width="130" height="130"
                                onInfo={(e) => openHardwareInfo('audio', e)}
                                onClick={() => handleHardwareClick('audio')}
                                src={speaker} alt="Speaker"
                                className={`component-hw ${hardwareState.audio?.enable ? 'active' : ''}`}
                                mirrored={true}
                            />

                            <HardwareItem
                                x="852" y="325" width="130" height="130"
                                onInfo={(e) => openHardwareInfo('router', e)}
                                onClick={() => handleHardwareClick('router')}
                                src={router} alt="router"
                                className={`component-hw ${hardwareState.router?.enable ? 'active' : ''}`}
                            />

                            <HardwareItem
                                x="8" y="14" width="290" height="270"
                                onInfo={(e) => openHardwareInfo('gpu', e)}
                                onClick={() => handleHardwareClick('gpu')}
                                src={compute} alt="compute"
                                className={`component-hw ${hardwareState.gpu?.enable ? 'active' : ''}`}
                            />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }
}