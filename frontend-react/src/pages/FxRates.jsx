import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, RefreshCw, CheckCircle, AlertCircle, Plus, Save, X, Edit, Trash2, TrendingUp } from 'lucide-react';
import Pagination from '../components/Pagination';

const FxRates = () => {
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
        currency_code: '',
        year_month: '',
        rate_to_usd: ''
    });

    const load = async (page = 1) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await api.get(`/api/v1/admin/fx-rates?limit=10&page=${page}`);
            const responseData = res.data;

            if (responseData && responseData.data) {
                setItems(responseData.data);
                if (responseData.pagination) {
                    setPagination(responseData.pagination);
                    setCurrentPage(responseData.pagination.current_page);
                } else {
                    // Fallback if pagination is not provided
                    setPagination({
                        current_page: page,
                        per_page: 10,
                        total: responseData.count || responseData.data.length,
                        last_page: 1
                    });
                }
            } else {
                setItems([]);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to load FX rates';
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

        if (!form.currency_code || !form.year_month || !form.rate_to_usd) {
            setError('All fields are required');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingId) {
                const updatePayload = {
                    rate_to_usd: parseFloat(form.rate_to_usd)
                };
                await api.put(`/api/v1/admin/fx-rates/${editingId}`, updatePayload);
                setSuccess(`✅ FX Rate updated successfully as MANUAL entry!`);
            } else {
                const createPayload = {
                    currency_code: form.currency_code,
                    year_month: `${form.year_month}-01`, // Convert YYYY-MM to YYYY-MM-DD
                    rate_to_usd: parseFloat(form.rate_to_usd)
                };
                await api.post('/api/v1/admin/fx-rates', createPayload);
                setSuccess(`✅ FX Rate created successfully as MANUAL entry!`);
            }

            resetForm();
            setTimeout(() => load(currentPage), 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to save FX rate';
            setError(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const edit = (item) => {
        // Extract year-month from the datetime string (format: YYYY-MM-DD)
        const yearMonth = item.year_month ? item.year_month.split('T')[0].substring(0, 7) : '';

        setForm({
            currency_code: item.currency_code || '',
            year_month: yearMonth,
            rate_to_usd: item.rate_to_usd?.toString() || ''
        });
        setEditingId(item.id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this FX rate?')) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/fx-rates/${id}`);
            setSuccess(`✅ FX Rate deleted successfully!`);
            load(currentPage);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete FX rate';
            setError(`Delete failed: ${msg}`);
        }
    };

    const resetForm = () => {
        setForm({ currency_code: '', year_month: '', rate_to_usd: '' });
        setEditingId(null);
        setError('');
    };

    const formatYearMonth = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    const formatLastSynced = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const SourceBadge = ({ source }) => {
        if (source === 'MANUAL') {
            return (
                <span
                    className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded cursor-help"
                    title="Ditetapkan oleh Admin (Prioritas Utama)"
                >
                    MANUAL
                </span>
            );
        } else if (source === 'API') {
            return (
                <span
                    className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded cursor-help"
                    title="Hasil Sinkronisasi Otomatis dari Pasar"
                >
                    API
                </span>
            );
        }
        return <span className="text-gray-400">-</span>;
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">FX Rates Management</h1>
                    <p className="text-gray-600">Manage foreign exchange rates to USD</p>
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
                    {editingId ? `Edit FX Rate #${editingId}` : 'Create New FX Rate'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Currency Code <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.currency_code}
                                onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                <option value="">Select Currency</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="IDR">IDR - Indonesian Rupiah</option>
                                <option value="SGD">SGD - Singapore Dollar</option>
                                <option value="MYR">MYR - Malaysian Ringgit</option>
                                <option value="VND">VND - Vietnamese Dong</option>
                                <option value="THB">THB - Thai Baht</option>
                                <option value="CNY">CNY - Chinese Yuan</option>
                                <option value="JPY">JPY - Japanese Yen</option>
                                <option value="GBP">GBP - British Pound</option>
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Currency code cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Year & Month <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="month"
                                value={form.year_month}
                                onChange={(e) => setForm({ ...form, year_month: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required
                            />
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Year & month cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Rate to USD <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-green-600">✓ Editable</span>}
                            </label>
                            <input
                                type="number"
                                step="0.000001"
                                placeholder="e.g., 0.745"
                                value={form.rate_to_usd}
                                onChange={(e) => setForm({ ...form, rate_to_usd: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                How much USD you get for 1 {form.currency_code || 'XXX'}
                                {form.rate_to_usd && form.currency_code && (
                                    <span className="ml-1 font-medium text-gray-700">
                                        (1 {form.currency_code} = {form.rate_to_usd} USD)
                                    </span>
                                )}
                            </p>
                            <p className="mt-1 text-xs text-green-600">
                                Entry will be saved as MANUAL and won't be overwritten by auto-sync
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update FX Rate' : 'Create FX Rate')}
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
                        <h2 className="text-lg font-semibold">All FX Rates</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} rate${pagination.total !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading FX rates...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No FX rates found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Currency</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Year & Month</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Rate to USD</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Source</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Last Synced</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded">
                                                    {item.currency_code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{formatYearMonth(item.year_month)}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-900">
                                                {item.rate_to_usd ? parseFloat(item.rate_to_usd).toFixed(6) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <SourceBadge source={item.source} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.source === 'MANUAL' ? '-' : formatLastSynced(item.last_synced_at)}
                                            </td>
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

export default FxRates;
