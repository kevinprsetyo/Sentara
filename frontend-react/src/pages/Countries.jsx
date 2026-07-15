import { useEffect, useState } from 'react';
import api from '../services/api';
import { Globe, RefreshCw, CheckCircle, AlertCircle, Plus, Save, X, Trash2, Edit, Search } from 'lucide-react';
import Pagination from '../components/Pagination';

const Countries = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        code: '',
        name: '',
        currency_code: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1
    });

    const load = async (page = 1, search = '') => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            // Use admin endpoint with pagination and search
            const res = await api.get(`/api/v1/admin/countries?page=${page}&search=${encodeURIComponent(search)}`);
            const responseData = res.data;

            console.log('🔍 Countries API Response:', {
                hasData: !!responseData,
                structure: responseData
            });

            if (responseData && responseData.success && responseData.data) {
                const paginationData = responseData.data;

                // Extract items from Laravel pagination structure
                const countryItems = paginationData.data || [];

                setItems(countryItems);

                // Set pagination from Laravel response
                setPagination({
                    current_page: paginationData.current_page || page,
                    per_page: paginationData.per_page || 15,
                    total: paginationData.total || 0,
                    last_page: paginationData.last_page || 1
                });
                setCurrentPage(paginationData.current_page || page);
            } else {
                setItems([]);
                setPagination({
                    current_page: 1,
                    per_page: 15,
                    total: 0,
                    last_page: 1
                });
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to load countries';
            setError(`Error: ${msg}`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(currentPage, searchQuery);
    }, [currentPage]);

    // Debounced search - auto search when user stops typing
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchQuery !== undefined) {
                setCurrentPage(1);
                load(1, searchQuery);
            }
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    const handleClearSearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
        load(1, '');
    };

    const save = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.code.trim() || !form.name.trim()) {
            setError('Code and Name are required');
            return;
        }

        if (!editingId && !form.currency_code.trim()) {
            setError('Currency Code is required for new countries');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                code: form.code.trim().toUpperCase(),
                name: form.name.trim()
            };

            // Add currency_code only for POST (create)
            if (!editingId) {
                payload.currency_code = form.currency_code.trim().toUpperCase();
            }

            if (editingId) {
                await api.put(`/api/v1/admin/countries/${editingId}`, payload);
                setSuccess(`✅ Country "${form.name}" updated successfully!`);
            } else {
                await api.post('/api/v1/admin/countries', payload);
                setSuccess(`✅ Country "${form.name}" created successfully!`);
            }

            setForm({ code: '', name: '', currency_code: '' });
            setEditingId(null);
            setTimeout(() => load(currentPage, searchQuery), 1000);
        } catch (err) {
            console.error('Country save error:', err.response?.data);

            // Handle validation errors (422)
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorMessages = Object.entries(errors)
                    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                    .join(' | ');
                setError(`Validation Error: ${errorMessages}`);
            } else {
                const msg = err.response?.data?.message || err.message || `Failed to ${editingId ? 'update' : 'create'} country`;
                setError(`Error: ${msg}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({ code: '', name: '', currency_code: '' });
        setEditingId(null);
        setError('');
    };

    const editCountry = (item) => {
        setForm({
            code: item.code,
            name: item.name,
            currency_code: item.currency_code || ''
        });
        setEditingId(item.id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteCountry = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete country "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/countries/${id}`);
            setSuccess(`✅ Country "${name}" deleted successfully!`);

            // Reset form if we're deleting the item being edited
            if (editingId === id) {
                resetForm();
            }

            load(currentPage, searchQuery);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete country';
            setError(`Delete failed: ${msg}`);
        }
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Countries Management</h1>
                    <p className="text-gray-600">Manage countries in the database</p>
                </div>
                <button
                    onClick={() => load(currentPage, searchQuery)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 font-medium text-blue-700 transition rounded-lg bg-blue-50 hover:bg-blue-100"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by country code or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            type="button"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="mt-2 text-sm text-gray-500">
                        Searching for "{searchQuery}"...
                    </p>
                )}
            </div>

            <div className="mb-6 space-y-3">
                {error && (
                    <div className="flex items-start gap-3 p-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
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
                {success && (
                    <div className="flex items-start gap-3 p-4 text-green-700 border border-green-200 rounded-lg bg-green-50">
                        <CheckCircle className="w-5 h-5 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">Success!</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
                            ×
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingId ? `Edit Country #${editingId}` : 'Create New Country'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Country Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={2}
                                placeholder="e.g., VN, ID, MY"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">2 letter country code</p>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Country Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Vietnam"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Currency Code <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-gray-500">(Read-only)</span>}
                            </label>
                            <input
                                type="text"
                                maxLength={3}
                                placeholder="e.g., IDR, USD, SGD"
                                value={form.currency_code}
                                onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required={!editingId}
                            />
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">⚠️ Currency code cannot be changed when editing</p>
                            )}
                            {!editingId && (
                                <p className="mt-1 text-xs text-gray-500">3-letter currency code (e.g., IDR, USD, SGD)</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Country' : 'Create Country')}
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
                        <h2 className="text-lg font-semibold">All Countries</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} Countr${pagination.total !== 1 ? 'ies' : 'y'} found`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading countries...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No countries found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto table-container max-h-[600px]">
                            <table className="w-full min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Country Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Currency</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {item.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {item.currency_code || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => editCountry(item)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCountry(item.id, item.name)}
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

export default Countries;