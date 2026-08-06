import React, { useState, useEffect } from 'react';
import { useZTTeamAuthStore } from '../stores/authStore';
import { useZTTeamFacebookStore } from '../stores/facebookStore';
import { Outlet, Link, useLocation } from 'react-router-dom';
import UIProvider from './UIProvider';
import { useUIStore } from '../stores/uiStore';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

/** Helper to check if a nav item is active */
function ztteam_isActive(pathname: string, path: string): boolean {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
}

export default function Layout() {
    const { user, ztteam_logout } = useZTTeamAuthStore();
    const { pages, ztteam_fetchPagesFromDB } = useZTTeamFacebookStore();
    const { isDarkMode, ztteam_toggleDarkMode } = useUIStore();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFbSubmenuOpen, setIsFbSubmenuOpen] = useState(true);

    /** Fetch Facebook pages on mount for sidebar sub-menu */
    useEffect(() => {
        ztteam_fetchPagesFromDB();
    }, []);

    /** Auto-close mobile sidebar when route changes */
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        ztteam_logout();
    };

    /** Sidebar navigation items */
    let navItems = [
        { to: '/', icon: 'dashboard', label: 'Dashboard' },
        { to: '/facebook', icon: 'qr_code_2', label: 'Facebook Pages', hasSubmenu: true },
        { to: '/wordpress', icon: 'language', label: 'WordPress & Crawler' },
        { to: '/reel-factory', icon: 'movie_filter', label: 'AI Reel Factory' },
        { to: '/image-factory', icon: 'image', label: 'AI Image Factory' },
        { to: '/statistics', icon: 'analytics', label: 'Statistics' },
        { to: '/settings', icon: 'settings', label: 'System Settings' },
    ];
    
    if (user?.role === 'ADMIN') {
        navItems.splice(navItems.length - 1, 0, { to: '/users', icon: 'manage_accounts', label: 'User Management' });
    }

    return (
        <>
            <UIProvider />

            {/* Mobile Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed left-0 top-0 h-full w-[280px] bg-white flex flex-col shadow-xl lg:shadow-sm px-4 py-3 z-50 transition-transform duration-300 ease-in-out ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
                <div className="mb-6 mt-1 px-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/24000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </div>
                        <div>
                            <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">FB Auto Reels</h1>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Content Engine</p>
                        </div>
                    </div>
                    {/* Close button on mobile */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors p-0"
                        title="Đóng menu"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <nav className="flex-grow space-y-1 overflow-y-auto">
                    {navItems.map(item => {
                        const active = ztteam_isActive(location.pathname, item.to);
                        
                        if (item.hasSubmenu) {
                            return (
                                <div key={item.to} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Link
                                            to={item.to}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex-grow flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm ${active
                                                ? 'bg-blue-50 text-primary font-bold'
                                                : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setIsFbSubmenuOpen(!isFbSubmenuOpen)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100 transition-colors p-0"
                                            title="Thu/Mở danh sách Fanpage"
                                        >
                                            <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isFbSubmenuOpen ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>
                                    </div>

                                    {/* Sub-menu for Facebook Pages */}
                                    {isFbSubmenuOpen && (
                                        <div className="pl-6 space-y-1 border-l-2 border-slate-100 ml-4 py-1">
                                            {pages.map((page) => {
                                                const reportPath = `/facebook/pages/${page.id}/report`;
                                                const isReportActive = location.pathname === reportPath;
                                                return (
                                                    <Link
                                                        key={page.id}
                                                        to={reportPath}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 ${isReportActive
                                                            ? 'bg-blue-100 text-blue-700 font-bold'
                                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                            }`}
                                                        title={`Báo cáo chi tiết ${ztteam_decodeHtmlEntity(page.name)}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] text-blue-500 shrink-0">bar_chart</span>
                                                        <span className="truncate">{ztteam_decodeHtmlEntity(page.name)}</span>
                                                    </Link>
                                                );
                                            })}
                                            {pages.length === 0 && (
                                                <div className="px-3 py-1.5 text-xs text-slate-400 italic">
                                                    Chưa có Fanpage nào
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm ${active
                                    ? 'bg-blue-50 text-primary font-bold'
                                    : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto space-y-4 pt-6">
                    <div className="space-y-1">
                        <Link 
                            className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-primary transition-colors rounded-lg"
                            to="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="material-symbols-outlined" data-icon="help">help</span>
                            <span className="text-sm">Help Center</span>
                        </Link>
                        <button className="flex w-full items-center gap-3 px-4 py-2 text-gray-500 hover:text-primary transition-colors cursor-pointer rounded-lg text-left" onClick={ztteam_toggleDarkMode}>
                            <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                            <span className="text-sm">{isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
                        </button>
                        <a className="flex w-full items-center gap-3 px-4 py-2 text-red-500 hover:text-red-600 transition-colors cursor-pointer rounded-lg text-left" onClick={handleLogout}>
                            <span className="material-symbols-outlined" data-icon="logout">logout</span>
                            <span className="text-sm">Logout</span>
                        </a>
                    </div>
                </div>
            </aside>

            {/* Header */}
            <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-280px)] h-16 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Mobile Hamburger Toggle Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors shrink-0 p-0"
                        title="Mở menu"
                    >
                        <span className="material-symbols-outlined text-[24px]">menu</span>
                    </button>

                    {/* Mobile Brand Name */}
                    <div className="lg:hidden flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
                            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </div>
                        <span className="font-bold text-sm text-slate-800 hidden sm:inline">FB Auto Reels</span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-xs md:max-w-md w-full hidden md:block ml-2">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            data-icon="search">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-400"
                            placeholder="Tìm kiếm tài nguyên, bài viết..." type="text" />
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                        <Link to="/facebook" className="px-4 py-1.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-full hover:opacity-90 transition-opacity">
                            Connect FB
                        </Link>
                        <Link to="/wordpress" className="px-4 py-1.5 border border-primary text-primary text-xs sm:text-sm font-bold rounded-full hover:bg-primary/5 transition-colors">
                            Add Website
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center overflow-hidden shrink-0">
                                <div className="text-white font-bold text-sm">
                                    {user?.email?.[0].toUpperCase() || 'A'}
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 group-hover:text-primary transition-colors uppercase tracking-wide hidden sm:inline max-w-[100px] truncate">{user?.email || 'ADMIN'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full lg:pl-[280px] pt-16 min-h-screen bg-slate-50">
                <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
                    <Outlet />
                </div>
            </main>
        </>
    );
}