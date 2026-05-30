// ─── Auth Store (Zustand) ────────────────────────────────────────────────────
// Manages authentication state and view routing for the auth flow.
// Views: 'login' | 'signup' | 'dashboard' | 'game'
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { loadProgression } from './progressionService';

export const useAuthStore = create((set, get) => ({
    // ── State ─────────────────────────────────────────────────────────────────
    user: null,              // Firebase User object (uid, email, etc.)
    isAuthenticated: false,
    isLoading: true,         // true while checking persisted session
    authView: 'login',       // 'login' | 'signup' | 'dashboard' | 'game'
    error: null,             // last auth error message
    savedProgressionMeta: null, // { savedAt } or null — for Dashboard display

    // ── View Navigation ───────────────────────────────────────────────────────
    setAuthView: (view) => set({ authView: view, error: null }),

    // ── Login ─────────────────────────────────────────────────────────────────
    login: async (email, password) => {
        set({ error: null, isLoading: true });
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            // Check if a saved progression exists
            const saved = await loadProgression(cred.user.uid);
            set({
                user: cred.user,
                isAuthenticated: true,
                isLoading: false,
                authView: 'dashboard',
                savedProgressionMeta: saved ? { savedAt: saved.savedAt, hardwareState: saved.hardwareState, softwareState: saved.softwareState, systemStatus: saved.systemStatus } : null,
            });
        } catch (err) {
            set({ error: friendlyError(err.code), isLoading: false });
        }
    },

    // ── Google Login ──────────────────────────────────────────────────────────
    loginWithGoogle: async () => {
        set({ error: null, isLoading: true });
        try {
            const cred = await signInWithPopup(auth, googleProvider);
            const saved = await loadProgression(cred.user.uid);
            set({
                user: cred.user,
                isAuthenticated: true,
                isLoading: false,
                authView: 'dashboard',
                savedProgressionMeta: saved ? { savedAt: saved.savedAt, hardwareState: saved.hardwareState, softwareState: saved.softwareState, systemStatus: saved.systemStatus } : null,
            });
        } catch (err) {
            // User closed the popup before finishing, or other error
            if (err.code !== 'auth/popup-closed-by-user') {
                set({ error: friendlyError(err.code), isLoading: false });
            } else {
                set({ isLoading: false });
            }
        }
    },

    // ── Signup ────────────────────────────────────────────────────────────────
    signup: async (email, password) => {
        set({ error: null, isLoading: true });
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            set({
                user: cred.user,
                isAuthenticated: true,
                isLoading: false,
                authView: 'dashboard',
                savedProgressionMeta: null,
            });
        } catch (err) {
            set({ error: friendlyError(err.code), isLoading: false });
        }
    },

    // ── Logout ────────────────────────────────────────────────────────────────
    logout: async () => {
        await signOut(auth);
        set({
            user: null,
            isAuthenticated: false,
            authView: 'login',
            error: null,
            savedProgressionMeta: null,
        });
    },

    // ── Session Listener (called once on app mount) ───────────────────────────
    initAuthListener: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const saved = await loadProgression(firebaseUser.uid);
                set({
                    user: firebaseUser,
                    isAuthenticated: true,
                    isLoading: false,
                    authView: 'dashboard',
                    savedProgressionMeta: saved ? { savedAt: saved.savedAt, hardwareState: saved.hardwareState, softwareState: saved.softwareState, systemStatus: saved.systemStatus } : null,
                });
            } else {
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    authView: 'login',
                });
            }
        });
        return unsubscribe;
    },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function friendlyError(code) {
    switch (code) {
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Try again.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        default:
            return 'Something went wrong. Please try again.';
    }
}
