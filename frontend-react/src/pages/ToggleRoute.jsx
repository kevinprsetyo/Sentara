import React, { useState } from 'react';
import api from '../services/api';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function ToggleRoute() {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        route_id: '',
        status: 'IN_TRANSIT'
    });

    // Status options based on common route statuses
    const statusOptions = [
        { value: 'PENDING', label: 'Pending' },
        { value: 'IN_TRANSIT', label: 'In Transit' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'CANCELLED', label: 'Cancelled' }
    ];

    const updateRouteStatus = async (routeId, newStatus) => {
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                route_id: parseInt(routeId),
                status: newStatus
            };

            await api.post('/api/v1/admin/routes/status', payload);
            setSuccess(`✅ Route #${routeId} status updated to ${newStatus} successfully!`);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
        } catch (err) {
            console.error('Error updating route status:', err);
            setError('Failed to update route status: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.route_id) {
            setError('Please enter Route ID');
            return;
        }

        await updateRouteStatus(form.route_id, form.status);

        // Reset form after successful update
        if (!error) {
            setForm({ route_id: '', status: 'IN_TRANSIT' });
        }
    };

    const resetForm = () => {
        setForm({ route_id: '', status: 'IN_TRANSIT' });
        setError(null);
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Toggle Route Status</h1>
                    <p className="text-gray-600">Update route status by entering Route ID</p>
                </div>
            </div>

            <div className="mb-6 space-y-3">
                {error && (
                    <div className="flex items-start gap-3 p-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xl leading-none">×</button>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 p-4 text-green-700 border border-green-200 rounded-lg bg-green-50">
                        <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">Success!</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xl leading-none">×</button>
                    </div>
                )}
            </div>

            {/* Manual Update Form */}
            <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    Update Route Status
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Route ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={form.route_id}
                                onChange={(e) => setForm({ ...form, route_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 1"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Enter the ID of the route to update</p>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                New Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Select the new status for the route</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <TrendingUp className="w-4 h-4" />
                            {isSubmitting ? 'Updating...' : 'Update Status'}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                            Clear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
