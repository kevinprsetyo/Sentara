import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function Rules() {
    const [rules, setRules] = useState([]);
    const [countries, setCountries] = useState([]);
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
        origin_country_id: '',
        destination_country_id: '',
        is_allowed: true
    });

    useEffect(() => {
        loadCountries();
        loadRules(1);
    }, []);

    useEffect(() => {
        if (currentPage > 1) {
            loadRules(currentPage);
        }
    }, [currentPage]);

    const loadRules = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/api/v1/admin/rules?limit=10&page=${page}`);
            const responseData = response.data;

            console.log('Rules API Response:', responseData);

            if (responseData && responseData.data) {
                setRules(Array.isArray(responseData.data) ? responseData.data : []);
                if (responseData.pagination) {
                    setPagination(responseData.pagination);
                    setCurrentPage(responseData.pagination.current_page);
                }
            } else {
                setRules([]);
            }
        } catch (err) {
            console.error('Error loading rules:', err);
            setError('Failed to load rules: ' + (err.response?.data?.message || err.message));
            setRules([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCountries = async () => {
        try {
            const response = await api.get('/api/v1/master/countries');
            console.log('Countries API Response:', response.data);
            setCountries(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err) {
            console.error('Failed to load countries:', err);
            setCountries([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!editingId && (!formData.origin_country_id || !formData.destination_country_id)) {
            setError('Please select both origin and destination countries');
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingId) {
                // PUT method - only send is_allowed
                const updatePayload = {
                    is_allowed: formData.is_allowed
                };
                console.log('PUT /api/v1/admin/rules/' + editingId, updatePayload);
                await api.put(`/api/v1/admin/rules/${editingId}`, updatePayload);
                setSuccess('✅ Rule updated successfully');
            } else {
                // POST method - send origin_country_id, destination_country_id, is_allowed
                const createPayload = {
                    origin_country_id: parseInt(formData.origin_country_id),
                    destination_country_id: parseInt(formData.destination_country_id),
                    is_allowed: formData.is_allowed
                };
                console.log('POST /api/v1/admin/rules', createPayload);
                await api.post('/api/v1/admin/rules', createPayload);
                setSuccess('✅ Rule created successfully');
            }

            resetForm();
            setTimeout(() => {
                setSuccess(null);
                loadRules(currentPage);
            }, 2000);
        } catch (err) {
            console.error('Error saving rule:', err);
            setError('Failed to save rule: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (rule) => {
        setFormData({
            origin_country_id: rule.origin_country_id || '',
            destination_country_id: rule.destination_country_id || '',
            is_allowed: rule.is_allowed
        });
        setEditingId(rule.id);
        setError(null);
        setSuccess(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this rule?')) {
            return;
        }

        try {
            console.log('DELETE /api/v1/admin/rules/' + id);
            await api.delete(`/api/v1/admin/rules/${id}`);
            setSuccess('✅ Rule deleted successfully');
            setTimeout(() => {
                setSuccess(null);
                loadRules(currentPage);
            }, 2000);
        } catch (err) {
            console.error('Error deleting rule:', err);
            setError('Failed to delete rule: ' + (err.response?.data?.message || err.message));
        }
    };

    const resetForm = () => {
        setFormData({
            origin_country_id: '',
            destination_country_id: '',
            is_allowed: true
        });
        setEditingId(null);
        setError(null);
    };

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Shipping Rules Management</h1>
                    <p className="text-gray-600">Manage shipping rules between countries</p>
                </div>
                <button
                    onClick={() => loadRules(currentPage)}
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

            <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
                    {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingId ? `Edit Rule #${editingId}` : 'Create New Rule'}
                    {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Origin Country <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.origin_country_id}
                                onChange={(e) => setFormData({ ...formData, origin_country_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required={!editingId}
                            >
                                <option value="">Select origin country</option>
                                {countries.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name} ({country.code})
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Origin country cannot be changed when editing</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Destination Country <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.destination_country_id}
                                onChange={(e) => setFormData({ ...formData, destination_country_id: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting || editingId}
                                required={!editingId}
                            >
                                <option value="">Select destination country</option>
                                {countries.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name} ({country.code})
                                    </option>
                                ))}
                            </select>
                            {editingId && (
                                <p className="mt-1 text-xs text-gray-500">Destination country cannot be changed when editing</p>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div
                                onClick={() => {
                                    if (!isSubmitting) {
                                        const newValue = !formData.is_allowed;
                                        console.log('Checkbox changed:', newValue);
                                        setFormData({ ...formData, is_allowed: newValue });
                                    }
                                }}
                                className={`w-5 h-5 flex items-center justify-center border-2 rounded cursor-pointer transition-all ${formData.is_allowed
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-300'
                                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}`}
                            >
                                {formData.is_allowed && (
                                    <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                )}
                            </div>
                            <label className="text-sm font-medium text-gray-900 cursor-pointer" onClick={() => {
                                if (!isSubmitting) {
                                    const newValue = !formData.is_allowed;
                                    setFormData({ ...formData, is_allowed: newValue });
                                }
                            }}>
                                Shipping Allowed
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <Shield className="w-4 h-4" />
                            {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Rule' : 'Create Rule')}
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
                        <h2 className="text-lg font-semibold">All Rules</h2>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Loading...' : `${pagination.total} rule${pagination.total !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>

                {loading && rules.length === 0 ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-gray-600">Loading rules...</p>
                    </div>
                ) : rules.length === 0 ? (
                    <div className="p-12 text-center">
                        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">No rules found. Create your first rule to get started.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">ID</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Origin Country</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Destination Country</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Status</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Export Tax</th>
                                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rules.map((rule) => (
                                        <tr key={rule.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{rule.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {rule.origin_country_name} ({rule.origin_code})
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {rule.destination_country_name} ({rule.destination_code})
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${rule.is_allowed
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {rule.is_allowed ? 'Allowed' : 'Restricted'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {rule.export_tax_percent ? `${parseFloat(rule.export_tax_percent).toFixed(2)}%` : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(rule)}
                                                        disabled={isSubmitting}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rule.id)}
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