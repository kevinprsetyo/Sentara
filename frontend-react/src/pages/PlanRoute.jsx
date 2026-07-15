import { useState, useEffect } from 'react';
import { Plus, Trash2, Send, AlertCircle, CheckCircle, MapPin, Package, Truck, RefreshCw, Calendar, Hash } from 'lucide-react';
import api from '../services/api';

export default function PlanRoute() {
    const [ports, setPorts] = useState([]);
    const [skus, setSkus] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [routePlan, setRoutePlan] = useState(null);
    const [routePlansHistory, setRoutePlansHistory] = useState([]);

    const [formData, setFormData] = useState({
        destination_port_id: '',
        transport_mode: '',
        items: [{ sku_id: '', quantity: '' }]
    });

    const transportModes = ['SEA', 'LAND'];

    useEffect(() => {
        loadDropdownData();
        loadRoutePlansHistory();
    }, []);

    const loadDropdownData = async () => {
        try {
            const [portsRes, skusRes] = await Promise.all([
                api.get('/api/v1/master/ports'),
                api.get('/api/v1/master/skus')
            ]);

            setPorts(portsRes.data.data || []);
            setSkus(skusRes.data.data || []);
        } catch (err) {
            console.error('Failed to load dropdown data:', err);
        }
    };

    const loadRoutePlansHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await api.get('/api/v1/route/plan');
            setRoutePlansHistory(response.data.data || response.data || []);
        } catch (err) {
            console.error('Failed to load route plans history:', err);
            // Don't show error to user if GET endpoint doesn't exist yet
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { sku_id: '', quantity: '' }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setRoutePlan(null);

        // Validation
        if (!formData.destination_port_id) {
            setError('Please select a destination port');
            return;
        }

        if (formData.items.length === 0) {
            setError('Please add at least one item');
            return;
        }

        for (let i = 0; i < formData.items.length; i++) {
            const item = formData.items[i];
            if (!item.sku_id || !item.quantity) {
                setError(`Item ${i + 1}: Please select SKU and enter quantity`);
                return;
            }
            if (item.quantity <= 0) {
                setError(`Item ${i + 1}: Quantity must be greater than 0`);
                return;
            }
        }

        setLoading(true);

        try {
            const payload = {
                destination_port_id: parseInt(formData.destination_port_id),
                transport_mode: formData.transport_mode || null,
                items: formData.items.map(item => ({
                    sku_id: parseInt(item.sku_id),
                    quantity: parseInt(item.quantity)
                }))
            };

            const response = await api.post('/api/v1/route/plan', payload);
            setRoutePlan(response.data);
            setSuccess('Route plan generated successfully!');

            // Reload history after successful creation
            loadRoutePlansHistory();
        } catch (err) {
            setError('Failed to generate route plan: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            destination_port_id: '',
            transport_mode: '',
            items: [{ sku_id: '', quantity: '' }]
        });
        setRoutePlan(null);
        setError(null);
        setSuccess(null);
    };

    const getPortName = (portId) => {
        const port = ports.find(p => p.id === portId);
        return port ? `${port.name} (${port.country})` : portId;
    };

    const getSkuName = (skuId) => {
        const sku = skus.find(s => s.id === skuId);
        return sku ? `${sku.sku_code} - ${sku.name}` : skuId;
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-7 h-7 text-blue-600" />
                    Plan Route (Smart Mode)
                </h1>
                <p className="text-gray-600 mt-1">Generate optimal shipping routes with AI-powered planning</p>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-red-800">{error}</span>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-green-800">{success}</span>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Route Planning Form
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Destination Port */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Destination Port *
                        </label>
                        <select
                            value={formData.destination_port_id}
                            onChange={(e) => setFormData({ ...formData, destination_port_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select destination port</option>
                            {ports.map((port) => (
                                <option key={port.id} value={port.id}>
                                    {port.name} ({port.country_code || port.country || ''})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transport Mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Transport Mode (Optional)
                        </label>
                        <select
                            value={formData.transport_mode}
                            onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Auto-select (Smart Mode)</option>
                            {transportModes.map((mode) => (
                                <option key={mode} value={mode}>
                                    {mode}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Leave empty for AI to select the best transport mode</p>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Items *
                            </label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            SKU
                                        </label>
                                        <select
                                            value={item.sku_id}
                                            onChange={(e) => handleItemChange(index, 'sku_id', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            required
                                        >
                                            <option value="">Select SKU</option>
                                            {skus.map((sku) => (
                                                <option key={sku.id} value={sku.id}>
                                                    {sku.sku_code} - {sku.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="w-32">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            placeholder="0"
                                            min="1"
                                            required
                                        />
                                    </div>

                                    {formData.items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? 'Generating...' : 'Generate Route Plan'}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={loading}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {/* Route Plan Results */}
            {routePlan && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-green-600" />
                        Route Plan Results
                    </h2>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                        {JSON.stringify(routePlan, null, 2)}
                    </pre>
                </div>
            )}

            {/* Route Plans History Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Route Plans History
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {loadingHistory ? 'Loading...' : `${routePlansHistory.length} plan${routePlansHistory.length !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                    <button
                        onClick={loadRoutePlansHistory}
                        disabled={loadingHistory}
                        className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Destination Port
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transport Mode
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loadingHistory ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <RefreshCw className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
                                        <p className="text-gray-600">Loading route plans...</p>
                                    </td>
                                </tr>
                            ) : routePlansHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No route plans found. Generate your first route plan to get started.
                                    </td>
                                </tr>
                            ) : (
                                routePlansHistory.map((plan) => (
                                    <tr key={plan.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center gap-1">
                                                <Hash className="w-3 h-3 text-gray-400" />
                                                {plan.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {plan.destination_port_name || getPortName(plan.destination_port_id)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.transport_mode === 'SEA'
                                                ? 'bg-blue-100 text-blue-800'
                                                : plan.transport_mode === 'LAND'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {plan.transport_mode || 'Smart Auto'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {plan.items?.length || 0} item(s)
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {plan.created_at ? new Date(plan.created_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
