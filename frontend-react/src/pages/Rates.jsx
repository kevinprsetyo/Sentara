import { useEffect, useState } from 'react';
import api from '../services/api';
import crud from '../services/crudApi';
import { DollarSign, RefreshCw, CheckCircle, AlertCircle, Plus, Save, X, Edit, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';

const Rates = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1
    });
    const [form, setForm] = useState({
        origin_port_id: '',
        destination_port_id: '',
        rate_lcl: '',
        rate_fcl_20ft: '',
        currency: 'USD',
        lead_time_days: ''
    });
    const [ports, setPorts] = useState([]);

    useEffect(() => {
        const loadPorts = async () => {
            try {
                const res = await api.get('/api/v1/master/ports');
                const data = res.data?.data || res.data || [];
                setPorts(data);
            } catch (err) {
                console.error('Failed to load ports:', err);
            }
        };
        loadPorts();
    }, []);

    const load = async (page = 1) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await api.get(`/api/v1/admin/rates?limit=10&page=${page}`);
            const responseData = res.data;

            if (responseData && responseData.data) {
                setItems(responseData.data);
                if (responseData.pagination) {
                    setPagination(responseData.pagination);
                    setCurrentPage(responseData.pagination.current_page);
                }
            } else {
                setItems([]);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to load rates';
            setError(`Error: ${msg}`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(currentPage);
    }, [currentPage]);

    const save = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.origin_port_id || !form.destination_port_id || !form.rate_lcl || !form.rate_fcl_20ft || !form.currency || !form.lead_time_days) {
            setError('All fields are required');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingId) {
                const updatePayload = {
                    rate_lcl: parseFloat(form.rate_lcl),
                    rate_fcl_20ft: parseFloat(form.rate_fcl_20ft),
                    currency: form.currency,
                    lead_time_days: parseInt(form.lead_time_days)
                };
                await api.put(`/api/v1/admin/rates/${editingId}`, updatePayload);
                setSuccess(`✅ Rate updated successfully!`);
            } else {
                const createPayload = {
                    origin_port_id: parseInt(form.origin_port_id),
                    destination_port_id: parseInt(form.destination_port_id),
                    rate_lcl: parseFloat(form.rate_lcl),
                    rate_fcl_20ft: parseFloat(form.rate_fcl_20ft),
                    currency: form.currency,
                    lead_time_days: parseInt(form.lead_time_days)
                };
                await api.post('/api/v1/admin/rates', createPayload);
                setSuccess(`✅ Rate created successfully!`);
            }

            resetForm();
            setTimeout(() => load(currentPage), 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to save rate';
            setError(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const edit = (item) => {
        setForm({
            origin_port_id: item.origin_port_id?.toString() || '',
            destination_port_id: item.destination_port_id?.toString() || '',
            rate_lcl: item.rate_lcl?.toString() || '',
            rate_fcl_20ft: item.rate_fcl_20ft?.toString() || '',
            currency: item.currency || 'USD',
            lead_time_days: item.lead_time_days?.toString() || ''
        });
        setEditingId(item.id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this rate?')) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/rates/${id}`);
            setSuccess(`✅ Rate deleted successfully!`);
            load(currentPage);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete rate';
            setError(`Delete failed: ${msg}`);
        }
    };

    const resetForm = () => {
        setForm({ origin_port_id: '', destination_port_id: '', rate_lcl: '', rate_fcl_20ft: '', currency: 'USD', lead_time_days: '' });
        setEditingId(null);
        setError('');
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Rates Management</h1>
                    <p className="text-gray-600">Manage shipping rates between ports</p>
                </div>
                <button
                    onClick={() => load(currentPage)}
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
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 p-4 text-green-700 border border-green-200 rounded-lg bg-green-50">
                        <CheckCircle className="w-5 h-5 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">Success!</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">×</button>
                    </div>
                )}
            </div>

            <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingId ? `Edit Rate #${editingId}` : 'Create New Rate'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Origin Port <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.origin_port_id}
                                onChange={(e) => setForm({ ...form, origin_port_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                <option value="">Select Origin Port</option>
                                {ports.map((port) => (
                                    <option key={port.id} value={port.id}>
                                        {port.name} ({port.country_code || port.country || ''})
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Origin port cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Destination Port <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.destination_port_id}
                                onChange={(e) => setForm({ ...form, destination_port_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                <option value="">Select Destination Port</option>
                                {ports.map((port) => (
                                    <option key={port.id} value={port.id}>
                                        {port.name} ({port.country_code || port.country || ''})
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Destination port cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Rate LCL <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-green-600">✓ Editable</span>}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 150.00"
                                value={form.rate_lcl}
                                onChange={(e) => setForm({ ...form, rate_lcl: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Rate FCL 20ft <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-green-600">✓ Editable</span>}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 800.00"
                                value={form.rate_fcl_20ft}
                                onChange={(e) => setForm({ ...form, rate_fcl_20ft: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Currency <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-green-600">✓ Editable</span>}
                            </label>
                            <select
                                value={form.currency}
                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting}
                                required
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="IDR">IDR</option>
                                <option value="SGD">SGD</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Lead Time (Days) <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-green-600">✓ Editable</span>}
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 14"
                                value={form.lead_time_days}
                                onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Rate' : 'Create Rate')}
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
                        <h2 className="text-lg font-semibold">All Rates</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} rate${pagination.total !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading rates...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No rates found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Origin</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Destination</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">LCL Rate</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">FCL 20ft Rate</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Currency</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Lead Time</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.origin_port_name || item.origin_port_id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.destination_port_name || item.destination_port_id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.rate_lcl ? parseFloat(item.rate_lcl).toFixed(2) : '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.rate_fcl_20ft ? parseFloat(item.rate_fcl_20ft).toFixed(2) : '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.currency}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.lead_time_days} days</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => edit(item)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteItem(item.id)}
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
};

export default Rates;