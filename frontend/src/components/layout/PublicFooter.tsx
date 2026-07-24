import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin } from 'lucide-react';
import { LogoMark } from './PublicNavbar';

export function PublicFooter() {
    return (
        <footer>
            <div className="footer-inner">
                <div className="footer-brand">
                    <Link to="/" className="footer-logo">
                        <div className="footer-logo-icon">
                            <LogoMark small />
                        </div>
                        G-ONE
                    </Link>
                    <p>The AI-powered planner that coordinates your entire Google Workspace.</p>
                    <div className="footer-social">
                        <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
                            <Twitter size={16} />
                        </a>
                        <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
                            <Github size={16} />
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                            <Linkedin size={16} />
                        </a>
                    </div>
                </div>
                <div className="footer-links">
                    <div className="footer-col">
                        <h4>Product</h4>
                        <Link to="/#features">Features</Link>
                        <Link to="/#pricing">Pricing</Link>
                        <Link to="/changelog">Changelog</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Resources</h4>
                        <Link to="/docs">Help Center</Link>
                        <Link to="/blog">Blog</Link>
                        <Link to="/docs">API Docs</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Legal</h4>
                        <Link to="/privacy">Privacy</Link>
                        <Link to="/terms">Terms</Link>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; {new Date().getFullYear()} G-ONE. All rights reserved.
            </div>
        </footer>
    );
}
