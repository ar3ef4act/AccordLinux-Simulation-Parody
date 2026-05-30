// ─── Progression Save/Load Service ───────────────────────────────────────────
// Reads and writes game state to Firestore: progressions/{userId}
// ─────────────────────────────────────────────────────────────────────────────

import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Save the current game state to Firestore.
 * @param {string} userId  — Firebase Auth UID
 * @param {object} state   — Zustand store snapshot (partial)
 */
export async function saveProgression(userId, state) {
    const payload = {
        // core OS files
        vfs: state.vfs,
        // physical hardware
        hardwareState: state.hardwareState,
        // software drivers
        softwareState: state.softwareState,
        systemSettings: state.systemSettings,

        interfaces: state.interfaces,

        systemStatus: state.systemStatus,
        generations: state.generations,
        currentUser: state.currentUser,

        displaySource: state.displaySource,

        activeGame: state.activeGame,
        gameLaunchRequest: state.gameLaunchRequest,

        desktopOpenWindows: state.desktopOpenWindows,
        desktopMinimizedWindows: state.desktopMinimizedWindows,
        desktopActiveWindow: state.desktopActiveWindow,
        desktopWindowCounters: state.desktopWindowCounters,
        terminalSessions: state.terminalSessions,
        allowMultipleInstances: state.allowMultipleInstances,
        savedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'progressions', userId), payload);
}

/**
 * Load saved game state from Firestore.
 * @param  {string} userId
 * @return {object|null}  — The saved state, or null if none exists
 */
export async function loadProgression(userId) {
    const snap = await getDoc(doc(db, 'progressions', userId));
    if (!snap.exists()) return null;
    return snap.data();
}

/**
 * Delete saved progression from Firestore.
 * @param {string} userId
 */
export async function deleteProgression(userId) {
    await deleteDoc(doc(db, 'progressions', userId));
}
