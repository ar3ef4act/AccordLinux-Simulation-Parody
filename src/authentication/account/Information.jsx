import { useState } from "react";

export function Information() {
    return (
            <div className="auth-info-panel col-span-2">
                <div className="auth-info-card">
                    <div className="auth-info-content">
                        <div className="auth-terminal-prompt">
                            <span className="prompt-symbol">$</span> accord-system --info
                        </div>
                        <h1 className="auth-info-title">Accord Linux</h1>
                        <h2 className="auth-info-subtitle">Next-Generation Gaming OS</h2>
                        
                        <div className="auth-features">
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🎮</div>
                                <div className="auth-feature-text">
                                    <h4>Seamless Gaming</h4>
                                    <p>Optimized performance for all your favorite titles</p>
                                </div>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">☁️</div>
                                <div className="auth-feature-text">
                                    <h4>Cloud Saves</h4>
                                    <p>Your progression, always synced across devices</p>
                                </div>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🛡️</div>
                                <div className="auth-feature-text">
                                    <h4>Secure & Private</h4>
                                    <p>Enterprise-grade encryption for your data</p>
                                </div>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">⚡</div>
                                <div className="auth-feature-text">
                                    <h4>Ultra-Fast Performance</h4>
                                    <p>Low latency and high FPS for competitive gaming</p>
                                </div>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🎨</div>
                                <div className="auth-feature-text">
                                    <h4>Customizable UI</h4>
                                    <p>Personalize your gaming environment</p>
                                </div>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🌐</div>
                                <div className="auth-feature-text">
                                    <h4>Global Community</h4>
                                    <p>Connect with gamers worldwide</p>
                                </div>
                            </div>
                        </div>

                        <div className="auth-stats">
                            <div className="auth-stat">
                                <span className="auth-stat-number">10k+</span>
                                <span className="auth-stat-label">Active Users</span>
                            </div>
                            <div className="auth-stat">
                                <span className="auth-stat-number">500+</span>
                                <span className="auth-stat-label">Games Supported</span>
                            </div>
                            <div className="auth-stat">
                                <span className="auth-stat-number">24/7</span>
                                <span className="auth-stat-label">Support</span>
                            </div>
                            <div className="auth-stat">
                                <span className="auth-stat-number">99.9%</span>
                                <span className="auth-stat-label">Uptime</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
}