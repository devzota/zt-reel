import { useZTTeamAuthStore } from '../stores/authStore';
import { Outlet, Link, useLocation } from 'react-router-dom';
import UIProvider from './UIProvider';
import { useUIStore } from '../stores/uiStore';

/** Helper to check if a nav item is active */
function ztteam_isActive(pathname: string, path: string): boolean {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
}

export default function Layout() {
    const { user, ztteam_logout } = useZTTeamAuthStore();
    const { isDarkMode, ztteam_toggleDarkMode } = useUIStore();
    const location = useLocation();

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        ztteam_logout();
    };

    /** Sidebar navigation items */
    const navItems = [
        { to: '/', icon: 'dashboard', label: 'Dashboard' },
        { to: '/facebook', icon: 'qr_code_2', label: 'Facebook Pages' },
        { to: '/wordpress', icon: 'language', label: 'WordPress & Crawler' },
        { to: '/reel-factory', icon: 'movie_filter', label: 'AI Reel Factory' },
        { to: '/image-factory', icon: 'image', label: 'AI Image Factory' },
        { to: '/statistics', icon: 'analytics', label: 'Statistics' },
        { to: '/settings', icon: 'settings', label: 'System Settings' },
    ];

    return (
        <>
            <UIProvider />
            {/*  Sidebar  */}
            <aside className="fixed left-0 top-0 h-full w-[280px] bg-white flex flex-col shadow-sm px-4 py-3 z-50">
                <div className="mb-8 mt-1 px-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/24000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </div>
                    <div>
                        <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">FB Auto Reels</h1>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Content Engine</p>
                    </div>
                </div>
                <nav className="flex-grow space-y-1 overflow-y-auto">
                    {navItems.map(item => {
                        const active = ztteam_isActive(location.pathname, item.to);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
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
                        <Link className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-primary transition-colors rounded-lg"
                            to="/">
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

            {/*  Header  */}
            <header className="fixed top-0 right-0 w-[calc(100%-280px)] h-16 bg-white/80 backdrop-blur-md shadow-sm z-40 flex justify-between items-center px-gutter">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-96 ml-8">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            data-icon="search">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-400"
                            placeholder="Tìm kiếm tài nguyên, bài viết..." type="text" />
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <button className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-full hover:opacity-90 transition-opacity">
                            Connect Facebook
                        </button>
                        <button className="px-5 py-2 border border-primary text-primary text-sm font-bold rounded-full hover:bg-primary/5 transition-colors">
                            Add Website
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative text-gray-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center overflow-hidden">
                                <div className="text-white font-bold text-sm">
                                    {user?.email?.[0].toUpperCase() || 'A'}
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 group-hover:text-primary transition-colors uppercase tracking-wide">{user?.email || 'ADMIN'}</span>
                            <span className="material-symbols-outlined text-gray-400"
                                data-icon="keyboard_arrow_down">keyboard_arrow_down</span>
                        </div>
                    </div>
                </div>
            </header>

            {/*  Main Content  */}
            <main className="pl-[280px] pt-16 min-h-screen bg-slate-50">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </>
    );
}