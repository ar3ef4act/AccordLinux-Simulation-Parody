import { useSystemStore } from '../Accord';

// BGM ref — single instance to allow stopping
let bgmInstance = null;
// SFX pool — single instance per url
const sfxPool = {};

export function playBGM(url, volume = 0.4) {
    const state = useSystemStore.getState();
    const isSpeakerEnabled = state.hardwareState?.audio?.enable;
    
    if (!isSpeakerEnabled || !url) return;

    stopBGM();
    try {
        bgmInstance = new Audio(url);
        bgmInstance.loop = true;
        bgmInstance.volume = volume;
        bgmInstance.play().catch(() => {});
    } catch {}
}

export function stopBGM() {
    if (bgmInstance) {
        bgmInstance.pause();
        bgmInstance.currentTime = 0;
        bgmInstance = null;
    }
}

export function playSound(url, volume = 0.6) {
    const state = useSystemStore.getState();
    const isSpeakerEnabled = state.hardwareState?.audio?.enable;
    
    if (!isSpeakerEnabled || !url) return;

    try {
        if (!sfxPool[url]) sfxPool[url] = new Audio(url);
        const a = sfxPool[url];
        a.volume = volume;
        a.currentTime = 0;
        a.play().catch(() => {});
    } catch {}
}
