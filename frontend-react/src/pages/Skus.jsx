import React, { useEffect, useState } from 'react';
import api from '../services/api';
import crud from '../services/crudApi';
import { Plus, Edit, Trash2, Save, X, RefreshCw, CheckCircle, AlertCircle, DollarSign, Search } from 'lucide-react';
import Pagination from '../components/Pagination';

const Skus = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    base_cost: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    weight_kg: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });

  const load = async (page = 1, search = '') => {
    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess('');
    try {
      // Use admin endpoint with pagination and search
      const res = await api.get(`/api/v1/admin/skus?page=${page}&search=${encodeURIComponent(search)}`);
      const responseData = res.data;

      console.log('🔍 SKU API Response:', {
        hasData: !!responseData,
        structure: responseData
      });

      if (responseData && responseData.success && responseData.data) {
        const paginationData = responseData.data;

        // Extract items from Laravel pagination structure
        const skuItems = paginationData.data || [];

        // Transform data to ensure consistent field names and include all dimension fields
        const transformedData = skuItems.map(item => ({
          ...item,
          code: item.sku_code || item.code || '',
          name: item.name || '',
          base_cost: item.base_cost_usd || item.base_cost || 0,
          length_cm: item.length_cm || 0,
          width_cm: item.width_cm || 0,
          height_cm: item.height_cm || 0,
          weight_kg: item.weight_kg || 0
        }));

        setItems(transformedData);

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
      const msg = err.response?.data?.message || err.message || 'Failed to load data';
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
    setFieldErrors({});
    setSuccess('');
    setIsSubmitting(true);

    if (!editingId && !form.code.trim()) {
      setFieldErrors({ code: ['SKU Code is required'] });
      setIsSubmitting(false);
      return;
    }
    if (!form.name.trim()) {
      setFieldErrors({ name: ['Product Name is required'] });
      setIsSubmitting(false);
      return;
    }

    try {
      let payload;

      if (editingId) {
        // PUT: name, base_cost, and dimensions
        payload = {
          name: form.name.trim(),
          base_cost: form.base_cost && String(form.base_cost).trim() !== '' ? parseFloat(form.base_cost) : 0,
          length_cm: form.length_cm && String(form.length_cm).trim() !== '' ? parseFloat(form.length_cm) : 0,
          width_cm: form.width_cm && String(form.width_cm).trim() !== '' ? parseFloat(form.width_cm) : 0,
          height_cm: form.height_cm && String(form.height_cm).trim() !== '' ? parseFloat(form.height_cm) : 0,
          weight_kg: form.weight_kg && String(form.weight_kg).trim() !== '' ? parseFloat(form.weight_kg) : 0
        };
        await crud.update('skus', editingId, payload);
        setSuccess(`SKU "${form.name}" updated successfully!`);
      } else {
        // POST: Include code, name, base_cost, and dimensions
        payload = {
          code: form.code.trim(),
          name: form.name.trim(),
          base_cost: form.base_cost && String(form.base_cost).trim() !== '' ? parseFloat(form.base_cost) : 0,
          length_cm: form.length_cm && String(form.length_cm).trim() !== '' ? parseFloat(form.length_cm) : 0,
          width_cm: form.width_cm && String(form.width_cm).trim() !== '' ? parseFloat(form.width_cm) : 0,
          height_cm: form.height_cm && String(form.height_cm).trim() !== '' ? parseFloat(form.height_cm) : 0,
          weight_kg: form.weight_kg && String(form.weight_kg).trim() !== '' ? parseFloat(form.weight_kg) : 0
        };
        await crud.create('skus', payload);
        setSuccess(`SKU "${form.name}" created successfully!`);
      }

      setForm({ code: '', name: '', base_cost: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '' });
      setEditingId(null);
      setTimeout(() => load(currentPage, searchQuery), 500);

    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        if (validationErrors) {
          setFieldErrors(validationErrors);
          const errorMessages = [];
          Object.keys(validationErrors).forEach(field => {
            validationErrors[field].forEach(msg => {
              errorMessages.push(`${field}: ${msg}`);
            });
          });
          setError(`Validation Error: ${errorMessages.join(', ')}`);
        }
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to save';
        setError(`Error: ${errorMsg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({
      code: item.code || item.sku_code || '',
      name: item.name || '',
      base_cost: item.base_cost || item.base_cost_usd || '',
      length_cm: item.length_cm || '',
      width_cm: item.width_cm || '',
      height_cm: item.height_cm || '',
      weight_kg: item.weight_kg || ''
    });
    setError('');
    setFieldErrors({});
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => {
    if (!window.confirm('Are you sure you want to delete this SKU?')) return;

    try {
      const itemToDelete = items.find(item => item.id === id);
      await crud.remove('skus', id);
      setSuccess(`SKU "${itemToDelete?.name}" deleted successfully!`);
      setTimeout(() => {
        load(currentPage, searchQuery);
      }, 500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete';
      setError(`Delete failed: ${errorMsg}`);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ code: '', name: '', base_cost: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '' });
    setError('');
    setFieldErrors({});
    setSuccess('');
  };

  return (
    <div className="p-6 mx-auto max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">SKU Management</h1>
          <p className="text-gray-600">Manage product SKUs database</p>
        </div>
        <button
          onClick={() => load(currentPage, searchQuery)}
          className="flex items-center gap-2 px-4 py-2 font-medium text-blue-700 transition rounded-lg bg-blue-50 hover:bg-blue-100"
          disabled={loading}
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
            placeholder="Search by SKU code or product name..."
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
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => { setError(''); setFieldErrors({}); }} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 p-4 text-green-700 border border-green-200 rounded-lg bg-green-50">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
          <Plus className="w-5 h-5" />
          {editingId ? `Edit SKU #${editingId}` : 'Create New SKU'}
          {editingId && (
            <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>
          )}
        </h2>

        <form onSubmit={save} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                SKU Code <span className="text-red-500">*</span>
                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
              </label>
              <input
                type="text"
                placeholder="e.g., SKU-DIPTIA-SMJ"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full p-3 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={!editingId}
                disabled={isSubmitting || editingId}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Pupuk Organik Diptia"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Base Cost USD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 99.99"
                  value={form.base_cost}
                  onChange={(e) => setForm({ ...form, base_cost: e.target.value })}
                  className="w-full p-3 pl-10 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Physical Dimensions Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Physical Dimensions (for Volume Calculation)</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 50"
                  value={form.length_cm}
                  onChange={(e) => setForm({ ...form, length_cm: e.target.value })}
                  className="w-full p-3 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Width (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 30"
                  value={form.width_cm}
                  onChange={(e) => setForm({ ...form, width_cm: e.target.value })}
                  className="w-full p-3 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 20"
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                  className="w-full p-3 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 5.5"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className="w-full p-3 transition border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">These dimensions are used by the system to automatically calculate shipping volume (CBM)</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-3 font-medium text-white transition bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {editingId ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingId ? 'Update SKU' : 'Create SKU'
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-3 font-medium text-gray-700 transition bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <X className="w-4 h-4" /> Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">All SKUs</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${pagination.total} SKU${pagination.total !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-10 h-10 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
            <p className="mt-3 text-gray-500">Loading SKUs...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No SKUs found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto table-container max-h-[600px]">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SKU Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Product Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Base Cost USD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Dimensions (cm)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Weight (kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.id}
                        {editingId === item.id && (
                          <span className="px-2 py-1 ml-2 text-xs text-blue-700 bg-blue-100 rounded">Editing</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.code || item.sku_code || '-'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.name || '-'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-900">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{item.base_cost ? parseFloat(item.base_cost).toFixed(2) : '0.00'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.length_cm && item.width_cm && item.height_cm ? (
                            <span className="font-mono">
                              {parseFloat(item.length_cm).toFixed(0)} × {parseFloat(item.width_cm).toFixed(0)} × {parseFloat(item.height_cm).toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.weight_kg ? (
                            <span className="font-medium">{parseFloat(item.weight_kg).toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
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
                            onClick={() => del(item.id)}
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

export default Skus;