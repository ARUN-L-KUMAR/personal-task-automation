import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../utils/cn';
import { FloatingChatWidget } from '../../features/chatbot/FloatingChatWidget';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-surface-light dark:bg-surface-dark overflow-hidden transition-colors duration-300">
            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 transition-all duration-300 transform md:relative md:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
                isSidebarCollapsed ? "md:w-20" : "md:w-64"
            )}>
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header
                    onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    isSidebarCollapsed={isSidebarCollapsed}
                />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>

            {/* Floating AI Chat — visible on every page */}
            <FloatingChatWidget />
        </div>
    );
}
