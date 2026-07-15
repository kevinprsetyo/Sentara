import { useEffect, useState } from 'react';
import api from '../services/api';
import crud from '../services/crudApi';
import { Package, RefreshCw, CheckCircle, AlertCircle, Plus, Save, X, Edit, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';

const Inventory = () => {
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
        port_id: '',
        sku_id: '',
        available_qty: ''
    });
    const [ports, setPorts] = useState([]);
    const [skus, setSkus] = useState([]);

    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                const [portsRes, skusRes] = await Promise.all([
                    api.get('/api/v1/master/ports'),
                    api.get('/api/v1/master/skus')
                ]);

                const portsData = portsRes.data?.data || portsRes.data || [];
                const skusData = skusRes.data?.data || skusRes.data || [];

                setPorts(portsData);
                setSkus(skusData);
            } catch (err) {
                console.error('Failed to load dropdown data:', err);
            }
        };

        loadDropdowns();
    }, []);

    const load = async (page = 1) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await api.get(`/api/v1/admin/inventory?page=${page}&limit=10`);
            const responseData = res.data;

            console.log('🔍 Inventory API Response:', {
                hasData: !!responseData,
                hasPagination: !!responseData?.pagination,
                totalItems: responseData?.pagination?.total || responseData?.data?.length || 0,
                responseStructure: responseData
            });

            if (responseData && responseData.data) {
                setItems(responseData.data);

                // Pastikan pagination selalu ada minimal 1 halaman
                if (responseData.pagination) {
                    const pag = responseData.pagination;
                    setPagination({
                        current_page: pag.current_page || page,
                        per_page: pag.per_page || 10,
                        total: pag.total || pag.total_items || responseData.data.length,
                        last_page: pag.last_page ||
                            Math.ceil((pag.total || pag.total_items || responseData.data.length) / (pag.per_page || 10)) ||
                            1
                    });
                    setCurrentPage(pag.current_page || page);
                } else {
                    // Fallback jika tidak ada pagination
                    const total = responseData.data.length;
                    const last_page = Math.ceil(total / 10) || 1;
                    setPagination({
                        current_page: page,
                        per_page: 10,
                        total: total,
                        last_page: last_page
                    });
                    setCurrentPage(page);
                }
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
            const msg = err.response?.data?.message || err.message || 'Failed to load inventory';
            setError(`Error: ${msg}`);
            setItems([]);
            setPagination({
                current_page: 1,
                per_page: 10,
                total: 0,
                last_page: 1
            });
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

        if (!form.port_id || !form.sku_id || !form.available_qty) {
            setError('All fields are required');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingId) {
                // PUT: Only update available_qty
                const payload = {
                    available_qty: parseFloat(form.available_qty)
                };
                await crud.update('inventory', editingId, payload);
                setSuccess(`✅ Inventory updated successfully!`);
            } else {
                // POST: Create new inventory with all fields
                const payload = {
                    port_id: parseInt(form.port_id),
                    sku_id: parseInt(form.sku_id),
                    available_qty: parseFloat(form.available_qty)
                };
                await crud.create('inventory', payload);
                setSuccess(`✅ Inventory created successfully!`);
            }

            resetForm();
            setTimeout(() => load(currentPage), 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to save inventory';
            setError(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const edit = (item) => {
        setForm({
            port_id: item.port_id?.toString() || '',
            sku_id: item.sku_id?.toString() || '',
            available_qty: item.available_qty?.toString() || ''
        });
        setEditingId(item.id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this inventory record?')) {
            return;
        }

        try {
            await crud.remove('inventory', id);
            setSuccess(`✅ Inventory deleted successfully!`);
            load(currentPage);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete inventory';
            setError(`Delete failed: ${msg}`);
        }
    };

    const resetForm = () => {
        setForm({ port_id: '', sku_id: '', available_qty: '' });
        setEditingId(null);
        setError('');
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                    <p className="text-gray-600">Manage inventory levels for ports and SKUs</p>
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
                    {editingId ? `Edit Inventory #${editingId}` : 'Add New Inventory'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Port <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
                            </label>
                            <select
                                value={form.port_id}
                                onChange={(e) => setForm({ ...form, port_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                disabled={isSubmitting || editingId}
                                required
                            >
                                <option value="">Select Port</option>
                                {ports.map((port) => (
                                    <option key={port.id} value={port.id}>
                                        {port.name} ({port.country_code || port.country || ''})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                SKU <span className="text-red-500">*</span>
                                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
                            </label>
                            <select
                                value={form.sku_id}
                                onChange={(e) => setForm({ ...form, sku_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                disabled={isSubmitting || editingId}
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

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Available Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 75000"
                                value={form.available_qty}
                                onChange={(e) => setForm({ ...form, available_qty: e.target.value })}
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
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Inventory' : 'Create Inventory')}
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

            {/* Data Table */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold">All Inventory</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} record${pagination.total !== 1 ? 's' : ''} found (Page ${currentPage} of ${pagination.last_page})`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading inventory...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No inventory records found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto table-container max-h-[600px]">
                            <table className="w-full min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Port</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SKU</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Quantity</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.port_name || item.port_id}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.sku_name || item.sku_code || item.sku_id}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.available_qty ? parseFloat(item.available_qty).toLocaleString() : '-'}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
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

export default Inventory;