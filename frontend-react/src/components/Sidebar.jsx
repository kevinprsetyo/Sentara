import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Map,
    Package,
    Settings,
    LogOut,
    Menu,
    X,
    Anchor,
    Leaf,
    Bot,
    Globe,
    Building2,
    DollarSign,
    Shield,
    Route,
    Box,
    Truck,
    TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';
import api from '../services/api';

const Sidebar = ({ isOpen, onClose }) => {
    const { logout, user } = useAuth();
    const [menuItems, setMenuItems] = useState([
        // Default fallback menu
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        { name: 'Route Planner', path: '/planner', icon: 'Map' },
        { name: 'SKUs', path: '/skus', icon: 'Package' },
        { name: 'Ports', path: '/ports', icon: 'Anchor' },
        { name: 'Countries', path: '/countries', icon: 'Globe' },
        { name: 'Cities', path: '/cities', icon: 'Building2' },
        { name: 'Pricing Plans', path: '/pricing-plans', icon: 'DollarSign' },
        { name: 'Inventory', path: '/inventory', icon: 'Package' },
        { name: 'Packings', path: '/packings', icon: 'Box' },
        { name: 'Rates', path: '/rates', icon: 'DollarSign' },
        { name: 'FX Rates', path: '/fx-rates', icon: 'TrendingUp' },
        { name: 'Rules', path: '/rules', icon: 'Shield' },
        { name: 'Segments', path: '/segments', icon: 'Route' },
        { name: 'Transport Modes', path: '/transport-modes', icon: 'Truck' },
        { name: 'AI Chat Agent', path: '/chat', icon: 'Bot' },
    ]);

    // Map icon strings to components
    const iconMap = {
        LayoutDashboard,
        Map,
        Bot,
        Package,
        Settings,
        Anchor,
        Globe,
        Building2,
        DollarSign,
        Shield,
        Route,
        Box,
        Truck,
        TrendingUp
    };

    /* 
    // TEMPORARILY DISABLED: Backend endpoint /api/v1/menus is currently returning 404.
    // Re-enable this when the endpoint is ready to support dynamic menus.
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                // Attempt to fetch dynamic menu, fall back if fails or returns empty
                const { data } = await api.get('/api/v1/menus');
                if (data && data.length > 0) {
                    setMenuItems(data);
                } else if (data && data.data && data.data.length > 0) {
                    // Handle nested data structure
                    setMenuItems(data.data);
                }
            } catch (error) {
                // If API fails (404 etc), keep the default menu items
                // Do not log warning to console to keep it clean
            }
        };
        fetchMenu();
    }, []);
    */

    const handleLogout = () => {
        logout();
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={clsx(
                    "fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                <Leaf className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-xl font-bold text-slate-800 tracking-tight">Sentara</span>
                        </div>
                        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const Icon = iconMap[item.icon] || LayoutDashboard;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        clsx(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )
                                    }
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* User & Logout */}
                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xs">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.role || 'Admin'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
