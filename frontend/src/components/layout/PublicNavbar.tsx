import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function LogoMark({ small = false }: { small?: boolean }) {
    const size = small ? 14 : 16;
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity=".6" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity=".6" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
        </svg>
    );
}

export function PublicNavbar() {
    const location = useLocation();

    return (
        <nav>
            <Link to="/" className="nav-logo">
                <div className="nav-logo-icon">
                    <LogoMark />
                </div>
                G-ONE
            </Link>
            <ul className="nav-links">
                <li>
                    {location.pathname === '/' ? (
                        <a href="#features">Features</a>
                    ) : (
                        <Link to="/#features">Features</Link>
                    )}
                </li>
                <li>
                    {location.pathname === '/' ? (
                        <a href="#how">How it works</a>
                    ) : (
                        <Link to="/#how">How it works</Link>
                    )}
                </li>
                <li>
                    {location.pathname === '/' ? (
                        <a href="#pricing">Pricing</a>
                    ) : (
                        <Link to="/#pricing">Pricing</Link>
                    )}
                </li>
                <li>
                    <Link to="/docs" className={location.pathname === '/docs' ? 'active-link' : ''}>Docs</Link>
                </li>
                <li>
                    <Link to="/blog" className={location.pathname === '/blog' ? 'active-link' : ''}>Blog</Link>
                </li>
            </ul>
            <Link to="/login" className="nav-cta-ghost">Sign in</Link>
            <Link to="/register" className="nav-cta">Get started free</Link>
        </nav>
    );
}
