import { useEffect, useState } from 'react';
import api from '../services/api';
import { Truck, RefreshCw, AlertCircle } from 'lucide-react';

const TransportModes = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/v1/master/modes');
            const responseData = res.data;

            console.log('🚚 Transport Modes API Response:', {
                hasData: !!responseData,
                structure: responseData
            });

            if (responseData && responseData.success && responseData.data) {
                setItems(responseData.data);
            } else {
                setItems([]);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to load transport modes';
            setError(`Error: ${msg}`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Transport Modes</h1>
                    <p className="text-gray-600">View available transportation methods</p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 font-medium text-blue-700 transition rounded-lg bg-blue-50 hover:bg-blue-100"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="flex items-start gap-3 p-4 mb-6 text-red-700 border border-red-200 rounded-lg bg-red-50">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                        ×
                    </button>
                </div>
            )}

            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold">All Transport Modes</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${items.length} Mode${items.length !== 1 ? 's' : ''} available`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading transport modes...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No transport modes found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mode Name</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {item.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransportModes;
