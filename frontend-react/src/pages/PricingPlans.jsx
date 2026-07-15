import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    DollarSign, RefreshCw, CheckCircle, AlertCircle, Plus,
    Save, X, Edit, Trash2, Eye, Calendar, Tag, MapPin
} from 'lucide-react';
import Pagination from '../components/Pagination';

const PricingPlans = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewingPlan, setViewingPlan] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [form, setForm] = useState({
        name: '',
        level: 'CITY',
        port_id: '',
        city_id: '',
        country_id: '',
        currency: 'IDR',
        start_date: '',
        end_date: '',
        priority: 10,
        details: [{ sku_id: '', price: '' }]
    });
    const [skus, setSkus] = useState([]);
    const [ports, setPorts] = useState([]);
    const [cities, setCities] = useState([]);
    const [countries, setCountries] = useState([]);

    useEffect(() => {
        loadDropdownData();
        load(currentPage);
    }, []);

    const loadDropdownData = async () => {
        try {
            const [skusRes, portsRes, citiesRes, countriesRes] = await Promise.all([
                api.get('/api/v1/master/skus'),
                api.get('/api/v1/master/ports'),
                api.get('/api/v1/master/cities'),
                api.get('/api/v1/master/countries')
            ]);

            setSkus(skusRes.data?.data || skusRes.data || []);
            setPorts(portsRes.data?.data || portsRes.data || []);
            setCities(citiesRes.data?.data || citiesRes.data || []);
            setCountries(countriesRes.data?.data || countriesRes.data || []);
        } catch (err) {
            console.error('Failed to load dropdown data:', err);
        }
    };

    const load = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/api/v1/admin/price-plans?page=${page}&limit=10`);
            const data = res.data?.data || res.data;
            
            console.log('🔍 PricingPlans API Response:', {
                hasData: !!data,
                hasPagination: !!res.data?.pagination,
                totalItems: res.data?.pagination?.total || data?.length || 0,
                responseStructure: res.data
            });

            if (data) {
                // Handle jika data berupa array langsung atau nested
                let itemsArray = [];
                if (Array.isArray(data)) {
                    itemsArray = data;
                } else if (data.data && Array.isArray(data.data)) {
                    itemsArray = data.data;
                } else {
                    itemsArray = [data];
                }
                
                setItems(itemsArray);
                
                // Set pagination dari berbagai kemungkinan struktur
                const paginationMeta = res.data?.pagination || 
                                      res.data?.meta || 
                                      data?.pagination ||
                                      data?.meta;
                
                if (paginationMeta) {
                    setTotalPages(paginationMeta.last_page || 
                                 Math.ceil((paginationMeta.total || itemsArray.length) / 10));
                    setTotalItems(paginationMeta.total || itemsArray.length);
                    setCurrentPage(paginationMeta.current_page || page);
                } else {
                    // Fallback jika tidak ada pagination meta
                    const calculatedTotalPages = Math.ceil(itemsArray.length / 10);
                    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
                    setTotalItems(itemsArray.length);
                    setCurrentPage(page);
                }
            } else {
                setItems([]);
                setTotalPages(1);
                setTotalItems(0);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to load pricing plans';
            setError(`Error: ${msg}`);
            setItems([]);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentPage > 1) {
            load(currentPage);
        }
    }, [currentPage]);

    const addDetailRow = () => {
        setForm({
            ...form,
            details: [...form.details, { sku_id: '', price: '' }]
        });
    };

    const removeDetailRow = (index) => {
        if (form.details.length > 1) {
            const newDetails = form.details.filter((_, i) => i !== index);
            setForm({ ...form, details: newDetails });
        }
    };

    const updateDetailRow = (index, field, value) => {
        const newDetails = [...form.details];
        newDetails[index][field] = value;
        setForm({ ...form, details: newDetails });
    };

    const handleLevelChange = (level) => {
        setForm({
            ...form,
            level,
            port_id: '',
            city_id: '',
            country_id: ''
        });
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            setError('Plan name is required');
            return false;
        }

        if (form.level === 'PORT' && !form.port_id) {
            setError('Port is required for PORT level');
            return false;
        }
        if (form.level === 'CITY' && !form.city_id) {
            setError('City is required for CITY level');
            return false;
        }
        if (form.level === 'COUNTRY' && !form.country_id) {
            setError('Country is required for COUNTRY level');
            return false;
        }

        if (!form.start_date) {
            setError('Start date is required');
            return false;
        }

        const validDetails = form.details.filter(d => d.sku_id && d.price);
        if (validDetails.length === 0) {
            setError('At least one SKU with price is required');
            return false;
        }

        const skuIds = validDetails.map(d => d.sku_id);
        const uniqueSkuIds = new Set(skuIds);
        if (skuIds.length !== uniqueSkuIds.size) {
            setError('Duplicate SKUs are not allowed');
            return false;
        }

        return true;
    };

    const save = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name: form.name.trim(),
                level: form.level,
                currency: form.currency,
                start_date: form.start_date,
                priority: parseInt(form.priority) || 10,
                details: form.details
                    .filter(d => d.sku_id && d.price)
                    .map(d => ({
                        sku_id: parseInt(d.sku_id),
                        price: parseFloat(d.price)
                    }))
            };

            if (form.level === 'PORT') {
                payload.port_id = parseInt(form.port_id);
            } else if (form.level === 'CITY') {
                payload.city_id = parseInt(form.city_id);
            } else if (form.level === 'COUNTRY') {
                payload.country_id = parseInt(form.country_id);
            }

            if (form.end_date) {
                payload.end_date = form.end_date;
            }

            let response;
            if (editingId) {
                response = await api.put(`/api/v1/admin/price-plans/${editingId}`, payload);
                setSuccess(`✅ Pricing plan "${form.name}" updated successfully!`);
            } else {
                response = await api.post('/api/v1/admin/price-plans', payload);
                setSuccess(`✅ Pricing plan "${form.name}" created successfully!`);
            }

            resetForm();
            setTimeout(() => load(currentPage), 1000);
        } catch (err) {
            let errorMsg = 'Failed to save pricing plan';
            if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorList = Object.entries(errors)
                    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                    .join('\n');
                errorMsg = `Validation Error:\n${errorList}`;
            } else if (err.message) {
                errorMsg = err.message;
            }
            setError(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const edit = async (id) => {
        try {
            setLoading(true);
            const res = await api.get(`/api/v1/admin/price-plans/${id}`);
            const plan = res.data?.data || res.data;

            setEditingId(id);
            setForm({
                name: plan.name || '',
                level: plan.level || 'CITY',
                port_id: plan.port_id || '',
                city_id: plan.city_id || '',
                country_id: plan.country_id || '',
                currency: plan.currency || 'IDR',
                start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
                end_date: plan.end_date ? plan.end_date.split('T')[0] : '',
                priority: plan.priority || 10,
                details: plan.details && plan.details.length > 0
                    ? plan.details.map(d => ({
                        sku_id: d.sku_id.toString(),
                        price: d.price.toString()
                    }))
                    : [{ sku_id: '', price: '' }]
            });

            setError('');
            setSuccess('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError('Failed to load plan details');
        } finally {
            setLoading(false);
        }
    };

    const deletePlan = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete pricing plan "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/api/v1/admin/price-plans/${id}`);
            setSuccess(`✅ Pricing plan "${name}" deleted successfully!`);
            load(currentPage);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete';
            setError(`Delete failed: ${msg}`);
        }
    };

    const viewDetails = async (id) => {
        try {
            const res = await api.get(`/api/v1/admin/price-plans/${id}`);
            const plan = res.data?.data || res.data;
            setViewingPlan(plan);
        } catch (err) {
            setError('Failed to load plan details');
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            level: 'CITY',
            port_id: '',
            city_id: '',
            country_id: '',
            currency: 'IDR',
            start_date: '',
            end_date: '',
            priority: 10,
            details: [{ sku_id: '', price: '' }]
        });
        setEditingId(null);
        setError('');
    };

    const getLocationName = (plan) => {
        if (plan.port) return plan.port.name;
        if (plan.city) return plan.city.name;
        if (plan.country) return plan.country.name;
        return '-';
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Pricing Plans Management</h1>
                    <p className="text-gray-600">Manage pricing plans with SKU details</p>
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
                    <DollarSign className="w-5 h-5" />
                    {editingId ? `Edit Pricing Plan #${editingId}` : 'Create New Pricing Plan'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Plan Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Special Promo 2025"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Priority</label>
                            <input
                                type="number"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.level}
                                onChange={(e) => handleLevelChange(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            >
                                <option value="PORT">Port</option>
                                <option value="CITY">City</option>
                                <option value="COUNTRY">Country</option>
                            </select>
                        </div>

                        {form.level === 'PORT' && (
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    Port <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.port_id}
                                    onChange={(e) => setForm({ ...form, port_id: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">Select Port</option>
                                    {ports.map(port => (
                                        <option key={port.id} value={port.id}>{port.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {form.level === 'CITY' && (
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.city_id}
                                    onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">Select City</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {form.level === 'COUNTRY' && (
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    Country <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.country_id}
                                    onChange={(e) => setForm({ ...form, country_id: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">Select Country</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>{country.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Currency <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.currency}
                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            >
                                <option value="IDR">IDR</option>
                                <option value="USD">USD</option>
                                <option value="SGD">SGD</option>
                                <option value="MYR">MYR</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">End Date (Optional)</label>
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="p-4 border-2 border-gray-200 border-dashed rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800">SKU Pricing Details</h3>
                            <button
                                type="button"
                                onClick={addDetailRow}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 transition bg-green-50 rounded-lg hover:bg-green-100"
                                disabled={isSubmitting}
                            >
                                <Plus className="w-4 h-4" /> Add SKU
                            </button>
                        </div>

                        <div className="space-y-3">
                            {form.details.map((detail, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="flex-1">
                                        <select
                                            value={detail.sku_id}
                                            onChange={(e) => updateDetailRow(index, 'sku_id', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={isSubmitting}
                                            required
                                        >
                                            <option value="">Select SKU</option>
                                            {skus.map(sku => (
                                                <option key={sku.id} value={sku.id}>
                                                    {sku.sku_code} - {sku.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-48">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Price"
                                            value={detail.price}
                                            onChange={(e) => updateDetailRow(index, 'price', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={isSubmitting}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeDetailRow(index)}
                                        disabled={form.details.length === 1 || isSubmitting}
                                        className="px-3 py-2 text-red-700 transition bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Plan' : 'Create Plan')}
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
                    </div>
                </form>
            </div>

            {/* Data Table */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold">All Pricing Plans</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${totalItems} Plan${totalItems !== 1 ? 's' : ''} found (Page ${currentPage} of ${totalPages})`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading pricing plans...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No pricing plans found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto table-container max-h-[600px]">
                            <table className="w-full min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Level</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Currency</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {item.level}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{getLocationName(item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.currency}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.priority}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => viewDetails(item.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View
                                                    </button>
                                                    <button
                                                        onClick={() => edit(item.id)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deletePlan(item.id, item.name)}
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

                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => setCurrentPage(page)}
                                showPageInfo={true}
                                compactMobile={true}
                            />
                        )}
                    </>
                )}
            </div>

            {viewingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setViewingPlan(null)}>
                    <div className="w-full max-w-2xl p-6 mx-4 bg-white rounded-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Plan Details: {viewingPlan.name}</h3>
                            <button onClick={() => setViewingPlan(null)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Level:</span>
                                <span className="text-gray-900">{viewingPlan.level}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Location:</span>
                                <span className="text-gray-900">{getLocationName(viewingPlan)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Currency:</span>
                                <span className="text-gray-900">{viewingPlan.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Priority:</span>
                                <span className="text-gray-900">{viewingPlan.priority}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Start Date:</span>
                                <span className="text-gray-900">
                                    {viewingPlan.start_date ? new Date(viewingPlan.start_date).toLocaleDateString() : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">End Date:</span>
                                <span className="text-gray-900">
                                    {viewingPlan.end_date ? new Date(viewingPlan.end_date).toLocaleDateString() : 'No end date'}
                                </span>
                            </div>
                        </div>

                        <h4 className="mb-3 font-semibold text-gray-800">SKU Pricing Details</h4>
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <table className="w-full min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase whitespace-nowrap">SKU Code</th>
                                        <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase whitespace-nowrap">SKU Name</th>
                                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase whitespace-nowrap">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {viewingPlan.details && viewingPlan.details.length > 0 ? (
                                        viewingPlan.details.map((detail) => (
                                            <tr key={detail.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{detail.sku?.sku_code || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{detail.sku?.name || '-'}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-right text-gray-900 whitespace-nowrap">
                                                    {viewingPlan.currency} {parseFloat(detail.price).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-3 text-sm text-center text-gray-500">
                                                No SKU details available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setViewingPlan(null)}
                                className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingPlans;