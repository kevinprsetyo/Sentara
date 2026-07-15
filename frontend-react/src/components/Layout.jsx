import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex safe-min-h-screen bg-slate-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header dengan Safari fix */}
                <header className="lg:hidden flex items-center h-16 px-4 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm safari-sticky">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 safari-tap-highlight"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-3 text-lg font-bold text-slate-800">Sentara</span>
                </header>

                {/* Main Content dengan Safari scrolling fix */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto safari-scroll">
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;