import React, { useState } from 'react';
import { useAuthStore } from '../data/authStore';
import './Auth.css';

export default function Signup() {
    const { signup, isLoading, error, setAuthView } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!email || !password || !confirm) return;
        if (password !== confirm) {
            setLocalError('Passwords do not match. Unlike your GPU and its driver.');
            return;
        }
        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters. Even your root password was longer.');
            return;
        }

        await signup(email, password);
    };

    const displayError = localError || error;

    return (
        <div className="auth-container">
            <div className="page-container">
                {/* Left Panel - Info */}
                <div className="panel-left">
                    <div className="box">
                        <div className="terminal-command">
                            <span className="prompt-symbol">$</span> accord-system --info
                        </div>
                        <h1 className="title-large">Accord Linux</h1>
                        <p className="subtitle">Join the community. We have graphic-broken games to enjoy.</p>

                        <div className="feature-list">
                            <div className="feature">
                                <span className="feature-icon">🚀</span>
                                <div>
                                    <h4>Boots in Seconds</h4>
                                    <p>After the initial 45-minute setup, of course.</p>
                                </div>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">🎨</span>
                                <div>
                                    <h4>Modern UI</h4>
                                    <p>We even have rounded corners and 'I hope' eye-catching color. You're welcome.</p>
                                </div>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">🔧</span>
                                <div>
                                    <h4>Full Control</h4>
                                    <p>You have the power to make your system worse. (Don't actually do this.)</p>
                                </div>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">📖</span>
                                <div>
                                    <h4>Great Documentation</h4>
                                    <p>Manual is in the folder 'Docs'. But who reads it anyway?</p>
                                </div>
                            </div>
                        </div>

                        <div className="stats-row">
                            <div className="stat">
                                <span className="stat-number">Free</span>
                                <span className="stat-label">As in Freedom</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">100%</span>
                                <span className="stat-label">Your Problem</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">∞</span>
                                <span className="stat-label">Config Files</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Signup Form */}
                <div className="panel-right">
                    <div className="box">
                        <div className="terminal-command">
                            <span className="prompt-symbol">$</span> accord-system --register
                        </div>
                        <h2 className="title-medium">Create Account</h2>
                        <p className="subtitle">One more account to forget the password to.</p>

                        {displayError && <div className="error-message">{displayError}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="field">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="player@accord.linux"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="field">
                                <label>Password</label>
                                <input
                                    type="password"
                                    placeholder="min 6 chars, unlike your patience"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="same one again, yes really"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                />
                            </div>

                            <button className="btn-primary" type="submit" disabled={isLoading || !email || !password || !confirm}>
                                {isLoading ? '■ Initializing...' : '▶ Register Node'}
                            </button>
                        </form>

                        <div className="divider">or</div>

                        <button className="btn-google" onClick={useAuthStore.getState().loginWithGoogle} disabled={isLoading}>
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Skip all this with Google
                        </button>

                        <div className="switch">
                            Already have an account?{' '}
                            <button className="link" onClick={() => setAuthView('login')}>
                                Log back in
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}