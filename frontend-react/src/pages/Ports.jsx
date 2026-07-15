import { useEffect, useState } from 'react';
import api from '../services/api';
import crud from '../services/crudApi';
import { Plus, Edit, Trash2, Save, X, RefreshCw, CheckCircle, AlertCircle, MapPin, Navigation, Globe, Building2, Search } from 'lucide-react';
import Pagination from '../components/Pagination';

const Ports = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });

  // Form state
  const [form, setForm] = useState({
    name: '',
    country_id: '',
    city_id: '',
    lat: '',
    lng: '',
    is_origin: false
  });

  // Dropdown data
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [allCities, setAllCities] = useState([]);

  // Load dropdown data
  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [countriesRes, citiesRes] = await Promise.all([
        api.get('/api/v1/master/countries'),
        api.get('/api/v1/master/cities')
      ]);

      const countriesData = countriesRes.data?.data || countriesRes.data || [];
      const citiesData = citiesRes.data?.data || citiesRes.data || [];

      setCountries(countriesData);
      setAllCities(citiesData);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    }
  };

  // Filter cities based on selected country
  useEffect(() => {
    if (form.country_id) {
      const countryIdInt = parseInt(form.country_id);
      const filtered = allCities.filter(city => city.country_id === countryIdInt);
      setCities(filtered);
    } else {
      setCities([]);
    }
  }, [form.country_id, allCities]);

  // Load ports with pagination and search
  const load = async (page = 1, search = '') => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Use admin endpoint with pagination and search
      const res = await api.get(`/api/v1/admin/ports?page=${page}&search=${encodeURIComponent(search)}`);
      const responseData = res.data;

      console.log('🔍 Ports API Response:', {
        hasData: !!responseData,
        structure: responseData
      });

      if (responseData && responseData.success && responseData.data) {
        const paginationData = responseData.data;

        // Extract items from Laravel pagination structure
        const portItems = paginationData.data || [];

        // Transform to include country_name and city_name from nested objects
        const transformedItems = portItems.map(item => ({
          id: item.id,
          name: item.name || '',
          city: item.city?.name || '',
          country_code: item.info_country?.code || item.country || '',
          country_name: item.info_country?.name || '',
          is_origin: item.is_origin ?? false,
          lat: item.lat || null,
          lng: item.lng || null,
          country_id: item.country_id || null,
          city_id: item.city_id || null
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
      const msg = err.response?.data?.message || err.message || 'Failed to load ports';
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

  // Save (Create or Update)
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Port name is required');
      return;
    }

    if (!form.country_id) {
      setError('Country is required');
      return;
    }

    if (!form.city_id) {
      setError('City is required');
      return;
    }

    setIsSubmitting(true);

    try {
      let payload;
      let response;

      if (editingId) {
        // PUT: Only name can be updated per API docs
        // Sending all fields to avoid 422 validation error (like Cities page)
        payload = {
          name: form.name.trim(),
          country_id: parseInt(form.country_id),
          city_id: parseInt(form.city_id),
          lat: form.lat && form.lat.trim() !== '' ? parseFloat(form.lat) : null,
          lng: form.lng && form.lng.trim() !== '' ? parseFloat(form.lng) : null,
          is_origin: form.is_origin
        };
        response = await crud.update('ports', editingId, payload);
        setSuccess(`✅ Port "${form.name}" updated successfully!`);
      } else {
        // POST: Include all fields
        payload = {
          name: form.name.trim(),
          country_id: parseInt(form.country_id),
          city_id: parseInt(form.city_id),
          lat: form.lat && form.lat.trim() !== '' ? parseFloat(form.lat) : null,
          lng: form.lng && form.lng.trim() !== '' ? parseFloat(form.lng) : null,
          is_origin: form.is_origin
        };
        response = await crud.create('ports', payload);
        setSuccess(`✅ Port "${form.name}" created successfully!`);
      }

      // Reset form
      resetForm();

      // Reload data with search query
      setTimeout(() => load(currentPage, searchQuery), 1000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save port';
      setError(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit port
  const edit = async (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      country_id: item.country_id?.toString() || '',
      city_id: item.city_id?.toString() || '',
      lat: item.lat?.toString() || '',
      lng: item.lng?.toString() || '',
      is_origin: item.is_origin ?? false
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete port
  const deletePlan = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete port "${name}"?`)) {
      return;
    }

    try {
      await crud.remove('ports', id);
      setSuccess(`✅ Port "${name}" deleted successfully!`);
      load(currentPage, searchQuery);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete';
      setError(`Delete failed: ${msg}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({
      name: '',
      country_id: '',
      city_id: '',
      lat: '',
      lng: '',
      is_origin: false
    });
    setEditingId(null);
    setError('');
  };

  return (
    <div className="p-6 mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ports Management</h1>
          <p className="text-gray-600">Manage shipping ports database</p>
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

      {/* Status Messages */}
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search ports by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Searching for '<span className="font-medium">{searchQuery}</span>'
          </p>
        )}
      </div>

      {/* Form Section */}
      <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold">
          <MapPin className="w-5 h-5" />
          {editingId ? `Edit Port #${editingId}` : 'Create New Port'}
          {editingId && <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">Editing Mode</span>}
        </h2>

        <form onSubmit={save} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Port Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Port Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g., Cat Lai Port"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Country <span className="text-red-500">*</span>
                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Globe className="w-5 h-5 text-gray-400" />
                </div>
                <select
                  value={form.country_id}
                  onChange={(e) => setForm({ ...form, country_id: e.target.value, city_id: '' })}
                  className={`w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isSubmitting || editingId}
                  required
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                City <span className="text-red-500">*</span>
                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Building2 className="w-5 h-5 text-gray-400" />
                </div>
                <select
                  value={form.city_id}
                  onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                  className={`w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isSubmitting || !form.country_id || editingId}
                  required
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              {!form.country_id && !editingId && (
                <p className="mt-1 text-xs text-gray-500">Select a country first</p>
              )}
            </div>

            {/* Latitude */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Latitude
                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Navigation className="w-5 h-5 text-gray-400 transform -rotate-45" />
                </div>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="e.g., 10.762622"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className={`w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isSubmitting || editingId}
                />
              </div>
            </div>

            {/* Longitude */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Longitude
                {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Navigation className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="e.g., 106.660172"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className={`w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isSubmitting || editingId}
                />
              </div>
            </div>

            {/* Is Origin */}
            <div className="flex items-center" style={{ minHeight: '60px', paddingTop: '8px' }}>
              <label className={`flex items-center gap-3 ${editingId ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={form.is_origin}
                  onChange={(e) => setForm({ ...form, is_origin: e.target.checked })}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b82f6',
                    cursor: editingId ? 'not-allowed' : 'pointer',
                    appearance: 'auto',
                    WebkitAppearance: 'checkbox',
                    MozAppearance: 'checkbox',
                    margin: '0',
                    flexShrink: '0'
                  }}
                  disabled={isSubmitting || editingId}
                />
                <span className="text-sm font-medium text-gray-700">
                  Is Origin Port
                  {editingId && <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>}
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Port' : 'Create Port')}
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
            <h2 className="text-lg font-semibold">All Ports</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${pagination.total} Port${pagination.total !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Loading ports...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">No ports found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto table-container max-h-[600px]">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">City</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Country</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Is Origin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.city || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.country_name || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.is_origin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {item.is_origin ? 'Yes' : 'No'}
                        </span>
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

export default Ports;