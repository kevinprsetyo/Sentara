import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, Package } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function Packings() {
    const [packings, setPackings] = useState([]);
    const [skus, setSkus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSku, setSelectedSku] = useState(''); // For SKU filter
    const [viewMode, setViewMode] = useState('all'); // 'all' or 'by-sku'
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1
    });
    const [formData, setFormData] = useState({
        sku_id: '',
        packing_type: '',
        cbm_per_unit: '',
        quantity_per_packing: ''
    });



    useEffect(() => {
        loadSkus();
    }, []);

    useEffect(() => {
        if (viewMode === 'all') {
            loadPackings(currentPage);
        } else if (viewMode === 'by-sku' && selectedSku) {
            loadBySku(selectedSku);
        }
    }, [currentPage, viewMode, selectedSku]);

    const handleSkuFilterChange = (skuId) => {
        if (skuId) {
            setSelectedSku(skuId);
            setViewMode('by-sku');
            setCurrentPage(1);
        } else {
            handleViewAll();
        }
    };

    const handleViewAll = () => {
        setSelectedSku('');
        setViewMode('all');
        setCurrentPage(1);
    };

    const loadPackings = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/api/v1/admin/packings?page=${page}`);
            const responseData = response.data;

            console.log('🔍 Packings API Response:', responseData);

            if (responseData && responseData.success && responseData.data) {
                const paginationData = responseData.data;

                // Extract items from Laravel pagination structure
                const packingItems = paginationData.data || [];

                // Transform to include SKU details from nested object
                const transformedItems = packingItems.map(item => ({
                    id: item.id,
                    sku_id: item.sku_id,
                    packing_type: item.packing_type,
                    cbm_per_unit: item.cbm_per_unit,
                    quantity_per_packing: item.quantity_per_packing,
                    sku_code: item.sku?.sku_code || '',
                    sku_name: item.sku?.name || '',
                    created_at: item.created_at,
                    updated_at: item.updated_at
                }));

                setPackings(transformedItems);

                // Set pagination from Laravel response
                setPagination({
                    current_page: paginationData.current_page || page,
                    per_page: paginationData.per_page || 10,
                    total: paginationData.total || 0,
                    last_page: paginationData.last_page || 1
                });
                setCurrentPage(paginationData.current_page || page);
            } else {
                setPackings([]);
                setPagination({
                    current_page: 1,
                    per_page: 10,
                    total: 0,
                    last_page: 1
                });
            }
        } catch (err) {
            console.error('Error loading packings:', err);
            setError('Failed to load packings: ' + (err.response?.data?.message || err.message));
            setPackings([]);
        } finally {
            setLoading(false);
        }
    };

    const loadBySku = async (skuId) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/api/v1/admin/packing/sku/${skuId}`);
            const responseData = response.data;

            console.log('🔍 Packings by SKU API Response:', responseData);

            if (responseData && responseData.success && responseData.data) {
                const packingItems = Array.isArray(responseData.data) ? responseData.data : [];

                // Transform items (no nested SKU in this response)
                const transformedItems = packingItems.map(item => ({
                    id: item.id,
                    sku_id: item.sku_id,
                    packing_type: item.packing_type,
                    cbm_per_unit: item.cbm_per_unit,
                    quantity_per_packing: item.quantity_per_packing,
                    sku_code: skus.find(s => s.id === item.sku_id)?.sku_code || '',
                    sku_name: skus.find(s => s.id === item.sku_id)?.name || '',
                    created_at: item.created_at,
                    updated_at: item.updated_at
                }));

                setPackings(transformedItems);
                // No pagination for by-SKU view
                setPagination({
                    current_page: 1,
                    per_page: transformedItems.length,
                    total: transformedItems.length,
                    last_page: 1
                });
            } else {
                setPackings([]);
            }
        } catch (err) {
            console.error('Error loading packings by SKU:', err);
            setError('Failed to load packings by SKU: ' + (err.response?.data?.message || err.message));
            setPackings([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSkus = async () => {
        try {
            const response = await api.get('/api/v1/master/skus');
            console.log('SKUs API Response:', response.data);
            setSkus(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err) {
            console.error('Failed to load SKUs:', err);
            setSkus([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!formData.sku_id) {
            setError('Please select a SKU');
            return;
        }

        if (!formData.cbm_per_unit || formData.cbm_per_unit <= 0) {
            setError('Please enter a valid CBM per unit (must be greater than 0)');
            return;
        }

        if (!formData.quantity_per_packing || formData.quantity_per_packing < 1) {
            setError('Qty per Packing must be at least 1');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingId) {
                // PUT method - send all fields
                const updatePayload = {
                    sku_id: parseInt(formData.sku_id),
                    packing_type: formData.packing_type,
                    quantity_per_packing: parseInt(formData.quantity_per_packing),
                    cbm_per_unit: parseFloat(formData.cbm_per_unit)
                };
                await api.put(`/api/v1/admin/packings/${editingId}`, updatePayload);
                setSuccess('✅ Packing configuration updated successfully');
            } else {
                // POST method - send all fields
                const createPayload = {
                    sku_id: parseInt(formData.sku_id),
                    packing_type: formData.packing_type,
                    quantity_per_packing: parseInt(formData.quantity_per_packing),
                    cbm_per_unit: parseFloat(formData.cbm_per_unit)
                };
                await api.post('/api/v1/admin/packings', createPayload);
                setSuccess('✅ Packing configuration created successfully');
            }

            resetForm();
            setTimeout(() => {
                setSuccess(null);
                // Reload based on current view mode
                if (viewMode === 'by-sku' && selectedSku) {
                    loadBySku(selectedSku);
                } else {
                    loadPackings(currentPage);
                }
            }, 2000);
        } catch (err) {
            console.error('Error saving packing:', err);
            setError('Failed to save packing: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (packing) => {
        setFormData({
            sku_id: packing.sku_id || '',
            packing_type: packing.packing_type || '',
            cbm_per_unit: packing.cbm_per_unit || '',
            quantity_per_packing: packing.quantity_per_packing || ''
        });
        setEditingId(packing.id);
        setError(null);
        setSuccess(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this packing configuration?')) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/packings/${id}`);
            setSuccess('✅ Packing configuration deleted successfully');
            setTimeout(() => {
                setSuccess(null);
                // Reload based on current view mode
                if (viewMode === 'by-sku' && selectedSku) {
                    loadBySku(selectedSku);
                } else {
                    loadPackings(currentPage);
                }
            }, 2000);
        } catch (err) {
            console.error('Error deleting packing:', err);
            setError('Failed to delete packing: ' + (err.response?.data?.message || err.message));
        }
    };

    const resetForm = () => {
        setFormData({
            sku_id: '',
            packing_type: '',
            cbm_per_unit: '',
            quantity_per_packing: ''
        });
        setEditingId(null);
        setError(null);
    };

    // Always render the UI, even during initial load
    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Packing Configurations</h1>
                    <p className="text-gray-600">Manage SKU packing specifications and container capacity</p>
                </div>
                <button
                    onClick={() => {
                        if (viewMode === 'by-sku' && selectedSku) {
                            loadBySku(selectedSku);
                        } else {
                            loadPackings(currentPage);
                        }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 font-medium text-blue-700 transition rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
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
                        <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">Success!</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xl leading-none">×</button>
                    </div>
                )}
            </div>

            {/* SKU Filter Section */}
            <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    <Package className="w-5 h-5" />
                    Filter by SKU
                </h2>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Select SKU to Filter
                        </label>
                        <select
                            value={selectedSku}
                            onChange={(e) => handleSkuFilterChange(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All SKUs</option>
                            {skus.map((sku) => (
                                <option key={sku.id} value={sku.id}>
                                    {sku.sku_code} - {sku.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {viewMode === 'by-sku' && (
                        <button
                            onClick={handleViewAll}
                            className="px-5 py-3 font-medium text-blue-700 transition rounded-lg bg-blue-50 hover:bg-blue-100"
                        >
                            View All
                        </button>
                    )}
                </div>
                {viewMode === 'by-sku' && selectedSku && (
                    <p className="mt-3 text-sm text-gray-600">
                        Showing packings for: <span className="font-medium">{skus.find(s => s.id === parseInt(selectedSku))?.sku_code}</span>
                    </p>
                )}
            </div>

            <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingId ? `Edit Packing #${editingId}` : 'Create New Packing Configuration'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                SKU <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.sku_id}
                                onChange={(e) => setFormData({ ...formData, sku_id: e.target.value })}
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
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">⚠️ SKU cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Packing Type <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.packing_type}
                                onChange={(e) => setFormData({ ...formData, packing_type: e.target.value.toUpperCase() })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="e.g., BOX, PALLET, KARUNG"
                                disabled={isSubmitting || editingId}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {editingId ? '⚠️ Packing type cannot be changed when editing' : 'Contoh: BOX, BIG_BOX, PALLET, UNIT, KARUNG, DUS'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                CBM per Unit <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.cbm_per_unit}
                                onChange={(e) => setFormData({ ...formData, cbm_per_unit: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 0.05"
                                min="0.01"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Cubic meters per unit (editable field)</p>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Qty per Packing (in PCS) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.quantity_per_packing}
                                onChange={(e) => setFormData({ ...formData, quantity_per_packing: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 24"
                                min="1"
                                disabled={isSubmitting}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Jumlah PCS per kemasan (e.g., 1 BOX = 24 PCS)</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <Package className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Packing' : 'Create Packing')}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                                <X className="w-4 h-4" /> Cancel Edit
                            </button>
                        )}
                        {!editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
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
                        <h2 className="text-lg font-semibold">All Packing Configurations</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} configuration${pagination.total !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>

                {loading && packings.length === 0 ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading packings...</p>
                    </div>
                ) : packings.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No packing configurations found. Create your first configuration to get started.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">SKU</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Packing Type</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">CBM per Unit</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Qty per Packing</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {packings.map((packing) => (
                                        <tr key={packing.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{packing.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {packing.sku_code || packing.sku_id} - {packing.sku_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {packing.packing_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {packing.cbm_per_unit ? parseFloat(packing.cbm_per_unit).toFixed(2) : '-'} m³
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {packing.quantity_per_packing || 1} PCS
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(packing)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(packing.id)}
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