import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, Route } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Segments() {
    const [segments, setSegments] = useState([]);
    const [ports, setPorts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1
    });
    const [formData, setFormData] = useState({
        from_port_id: '',
        to_port_id: '',
        transport_mode: 'SEA',
        distance_km: '',
        base_lead_time_days: '',
        is_active: true
    });

    const modes = ['SEA', 'LAND', 'AIR'];

    useEffect(() => {
        loadPorts();
    }, []);

    useEffect(() => {
        loadSegments(currentPage);
    }, [currentPage]);

    const loadSegments = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/v1/admin/segments?limit=10&page=${page}`);
            const responseData = response.data;

            if (responseData && responseData.data) {
                setSegments(responseData.data);
                if (responseData.pagination) {
                    setPagination(responseData.pagination);
                    setCurrentPage(responseData.pagination.current_page);
                }
            } else {
                setSegments([]);
            }
            setError(null);
        } catch (err) {
            setError('Failed to load segments: ' + (err.response?.data?.message || err.message));
            setSegments([]);
        } finally {
            setLoading(false);
        }
    };

    const loadPorts = async () => {
        try {
            const response = await api.get('/api/v1/master/ports');
            setPorts(response.data.data || []);
        } catch (err) {
            console.error('Failed to load ports:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!formData.from_port_id || !formData.to_port_id) {
            setError('Please select both from and to ports');
            return;
        }

        if (formData.from_port_id === formData.to_port_id) {
            setError('From and To ports must be different');
            return;
        }

        if (!formData.distance_km || formData.distance_km < 0) {
            setError('Please enter a valid distance');
            return;
        }

        if (!formData.base_lead_time_days || formData.base_lead_time_days < 1) {
            setError('Please enter a valid lead time (minimum 1 day)');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingId) {
                const updatePayload = {
                    distance_km: parseFloat(formData.distance_km),
                    base_lead_time_days: parseInt(formData.base_lead_time_days)
                };
                await api.put(`/api/v1/admin/segments/${editingId}`, updatePayload);
                setSuccess('✅ Segment updated successfully');
            } else {
                const createPayload = {
                    from_port_id: parseInt(formData.from_port_id),
                    to_port_id: parseInt(formData.to_port_id),
                    transport_mode: formData.transport_mode,
                    distance_km: parseFloat(formData.distance_km),
                    base_lead_time_days: parseInt(formData.base_lead_time_days),
                    is_active: formData.is_active
                };
                await api.post('/api/v1/admin/segments', createPayload);
                setSuccess('✅ Segment created successfully');
            }

            resetForm();
            setTimeout(() => loadSegments(currentPage), 1000);
        } catch (err) {
            setError('Failed to save segment: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (segment) => {
        setFormData({
            from_port_id: segment.from_port_id || '',
            to_port_id: segment.to_port_id || '',
            transport_mode: segment.mode || 'SEA',
            distance_km: segment.distance_km || '',
            base_lead_time_days: segment.base_lead_time_days || '',
            is_active: segment.is_active
        });
        setEditingId(segment.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this segment?')) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/segments/${id}`);
            setSuccess('✅ Segment deleted successfully');
            loadSegments(currentPage);
        } catch (err) {
            setError('Failed to delete segment: ' + (err.response?.data?.message || err.message));
        }
    };

    const resetForm = () => {
        setFormData({
            from_port_id: '',
            to_port_id: '',
            transport_mode: 'SEA',
            distance_km: '',
            base_lead_time_days: '',
            is_active: true
        });
        setEditingId(null);
    };

    if (loading && segments.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                    <div className="text-lg text-gray-600">Loading segments...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Route Segments Management</h1>
                    <p className="text-gray-600">Manage shipping route segments between ports</p>
                </div>
                <button
                    onClick={() => loadSegments(currentPage)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 font-medium text-blue-700 transition rounded-lg bg-blue-50 hover:bg-blue-100"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            <div className="mb-6 space-y-3">
                {error && (
                    <div className="flex items-start gap-3 p-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 p-4 text-green-700 border border-green-200 rounded-lg bg-green-50">
                        <Check className="w-5 h-5 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">Success!</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">×</button>
                    </div>
                )}
            </div>

            <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingId ? `Edit Segment #${editingId}` : 'Create New Segment'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                From Port <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.from_port_id}
                                onChange={(e) => setFormData({ ...formData, from_port_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                <option value="">Select from port</option>
                                {ports.map((port) => (
                                    <option key={port.id} value={port.id}>
                                        {port.name} ({port.country_code || port.country || ''})
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">From port cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                To Port <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.to_port_id}
                                onChange={(e) => setFormData({ ...formData, to_port_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                <option value="">Select to port</option>
                                {ports.map((port) => (
                                    <option key={port.id} value={port.id}>
                                        {port.name} ({port.country_code || port.country || ''})
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">To port cannot be changed when editing</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Transport Mode <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.transport_mode}
                                onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                {modes.map((mode) => (
                                    <option key={mode} value={mode}>
                                        {mode}
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Transport mode cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Distance (km) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.distance_km}
                                onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 850"
                                min="0"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Base Lead Time (days) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.base_lead_time_days}
                                onChange={(e) => setFormData({ ...formData, base_lead_time_days: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 3"
                                min="1"
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    </div>

                    {!editingId && (
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    disabled={isSubmitting}
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700">
                                    Active
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Route className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Segment' : 'Create Segment')}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                <X className="w-4 h-4" /> Cancel Edit
                            </button>
                        )}
                        {!editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                <X className="w-4 h-4" /> Clear
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold">All Segments</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} segment${pagination.total !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading segments...</p>
                    </div>
                ) : segments.length === 0 ? (
                    <div className="p-12 text-center">
                        <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No segments found. Create your first segment to get started.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Route</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Mode</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Distance</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Lead Time</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Status</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {segments.map((segment) => (
                                        <tr key={segment.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{segment.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {segment.from_port_name} → {segment.to_port_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {segment.mode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {segment.distance_km ? parseFloat(segment.distance_km).toFixed(1) : '0'} km
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {segment.base_lead_time_days} day{segment.base_lead_time_days !== 1 ? 's' : ''}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${segment.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {segment.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(segment)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(segment.id)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.last_page > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={pagination.last_page}
                                onPageChange={(page) => setCurrentPage(page)}
                                showPageInfo={true}
                                compactMobile={true}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}