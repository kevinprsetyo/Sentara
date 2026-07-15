import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Anchor,
    Package,
    TrendingUp,
    Activity,
    ArrowUpRight,
    Clock,
    Map,
    Plus
} from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State for Real Data
    const [portCount, setPortCount] = useState(0);
    const [skuCount, setSkuCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Real Data from API to make dashboard alive
                const [portsRes, skusRes] = await Promise.all([
                    api.get('/api/v1/master/ports'),
                    api.get('/api/v1/master/skus')
                ]);

                setPortCount(portsRes.data.data.length);
                setSkuCount(skusRes.data.data.length);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- MOCK DATA FOR VISUALIZATION ---
    const stats = [
        {
            title: 'Total Routes Planned',
            value: '1,284',
            trend: '+12.5%',
            positive: true,
            icon: Map,
            color: 'bg-blue-500'
        },
        {
            title: 'Est. Cost Savings',
            value: '$45,200',
            trend: '+8.2%',
            positive: true,
            icon: TrendingUp,
            color: 'bg-green-500'
        },
        {
            title: 'Active Ports',
            value: loading ? '...' : portCount.toString(),
            trend: 'Connected',
            positive: true,
            icon: Anchor,
            color: 'bg-purple-500'
        },
        {
            title: 'Registered SKUs',
            value: loading ? '...' : skuCount.toString(),
            trend: 'In Database',
            positive: true,
            icon: Package,
            color: 'bg-orange-500'
        }
    ];

    const recentActivities = [
        { id: 1, origin: 'Singapore (SG)', dest: 'Tanjung Priok (ID)', date: '2 mins ago', status: 'Completed', cost: '$950' },
        { id: 2, origin: 'Manila (PH)', dest: 'Laem Chabang (TH)', date: '15 mins ago', status: 'Pending', cost: '$3,200' },
        { id: 3, origin: 'Cat Lai (VN)', dest: 'Port Klang (MY)', date: '1 hour ago', status: 'Completed', cost: '$1,450' },
        { id: 4, origin: 'Tanjung Perak (ID)', dest: 'Singapore (SG)', date: '3 hours ago', status: 'Completed', cost: '$1,100' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-500">Welcome back, {user?.name || 'Admin'}! Here is your logistics overview.</p>
                </div>
                <button
                    onClick={() => navigate('/planner')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" /> New Route Plan
                </button>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" /> Recent Calculations
                        </h2>
                        <button className="text-sm text-blue-600 hover:underline">View All</button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Route</th>
                                    <th className="px-6 py-3 font-medium">Time</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentActivities.map((activity) => (
                                    <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{activity.origin}</div>
                                            <div className="text-xs text-gray-400">to {activity.dest}</div>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-2 text-gray-500">
                                            <Clock className="w-3 h-3" /> {activity.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${activity.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {activity.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-800">
                                            {activity.cost}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Quick Status */}
                <div className="space-y-6">

                    {/* System Status Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">System Status</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> API Backend</span>
                                <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">ONLINE</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Route Engine (Python)</span>
                                <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">ONLINE</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Database</span>
                                <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">CONNECTED</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl text-white shadow-lg">
                        <h3 className="font-bold text-lg mb-2">Did you know?</h3>
                        <p className="text-blue-100 text-sm mb-4">
                            Using multi-modal transport (Sea + Land) can sometimes reduce total delivery time by 15% compared to direct sea freight.
                        </p>
                        <button
                            onClick={() => navigate('/planner')}
                            className="bg-white text-blue-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-50 transition"
                        >
                            Try Route Planner
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
