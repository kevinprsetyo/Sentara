import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Building2, RefreshCw, CheckCircle, AlertCircle,
    MapPin, Plus, Save, X, Trash2, Edit, Search
} from 'lucide-react';
import Pagination from '../components/Pagination';

const Cities = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        country_id: '',
        code: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1
    });
    const [countries, setCountries] = useState([]);

    const loadCountries = async () => {
        try {
            const res = await api.get('/api/v1/master/countries');
            let data = res.data;
            if (data && data.data) {
                data = data.data;
            }
            if (!Array.isArray(data)) {
                data = [data];
            }
            setCountries(data);
        } catch (err) {
            console.error('Failed to load countries:', err);
        }
    };

    const load = async (page = 1, search = '') => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            // Use admin endpoint with pagination and search
            const res = await api.get(`/api/v1/admin/cities?page=${page}&search=${encodeURIComponent(search)}`);
            const responseData = res.data;

            console.log('🔍 Cities API Response:', {
                hasData: !!responseData,
                structure: responseData
            });

            if (responseData && responseData.success && responseData.data) {
                const paginationData = responseData.data;

                // Extract items from Laravel pagination structure
                const cityItems = paginationData.data || [];

                // Transform to include country_name from nested country object
                const transformedItems = cityItems.map(item => ({
                    ...item,
                    country_name: item.country?.name || 'Unknown'
                }));

                setItems(transformedItems);

                // Set pagination from Laravel response
                setPagination({
                    current_page: paginationData.current_page || page,
                    per_page: paginationData.per_page || 10,
                    total: paginationData.total || 0,
                    last_page: paginationData.last_page || 1
                });
                setCurrentPage(paginationData.current_page || page);
            } else {
                setItems([]);
                setPagination({
                    current_page: 1,
                    per_page: 10,
                    total: 0,
                    last_page: 1
                });
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to load cities';
            setError(`Error: ${msg}`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCountries();
    }, []);

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

        if (!form.name.trim()) {
            setError('City name is required');
            return;
        }

        if (!editingId && (!form.country_id || !form.code.trim())) {
            setError('All fields are required for new city');
            return;
        }

        setIsSubmitting(true);

        try {
            let payload;

            if (editingId) {
                // PUT: Send all fields to satisfy backend validation
                // Note: Backend should only update 'name', but requires all fields
                payload = {
                    name: form.name.trim(),
                    country_id: parseInt(form.country_id),
                    code: form.code.trim().toUpperCase()
                };
                await api.put(`/api/v1/admin/cities/${editingId}`, payload);
                setSuccess(`✅ City "${form.name}" updated successfully!`);
            } else {
                // POST: Include all fields
                payload = {
                    name: form.name.trim(),
                    country_id: parseInt(form.country_id),
                    code: form.code.trim().toUpperCase()
                };
                await api.post('/api/v1/admin/cities', payload);
                setSuccess(`✅ City "${form.name}" created successfully!`);
            }

            setForm({ name: '', country_id: '', code: '' });
            setEditingId(null);
            setTimeout(() => load(currentPage, searchQuery), 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || `Failed to ${editingId ? 'update' : 'create'} city`;
            setError(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({ name: '', country_id: '', code: '' });
        setEditingId(null);
        setError('');
    };

    const editCity = (item) => {
        setForm({
            name: item.name,
            country_id: item.country_id?.toString() || '',
            code: item.code
        });
        setEditingId(item.id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteCity = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete city "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/cities/${id}`);
            setSuccess(`✅ City "${name}" deleted successfully!`);
            load(currentPage, searchQuery);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete city';
            setError(`Delete failed: ${msg}`);
        }
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cities Management</h1>
                    <p className="text-gray-600">Manage cities in the database</p>
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
                        placeholder="Search by city name or code..."
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
                    {editingId ? `Edit City #${editingId}` : 'Create New City'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                City Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Ho Chi Minh City"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Country <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
                            </label>
                            <select
                                value={form.country_id}
                                onChange={(e) => setForm({ ...form, country_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                disabled={isSubmitting || editingId}
                                required={!editingId}
                            >
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                City Code <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
                            </label>
                            <input
                                type="text"
                                maxLength={3}
                                placeholder="e.g., HCM, JKT"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                disabled={isSubmitting || editingId}
                                required={!editingId}
                            />
                            <p className="mt-1 text-xs text-gray-500">3 letter city code</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update City' : 'Create City')}
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
                        <h2 className="text-lg font-semibold">All Cities</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} Cit${pagination.total !== 1 ? 'ies' : 'y'} found`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading cities...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No cities found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">City Name</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Code</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Country</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {item.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.country_name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => editCity(item)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCity(item.id, item.name)}
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

export default Cities;