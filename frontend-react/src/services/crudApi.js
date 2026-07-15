import api from './api';

// Configuration for each resource
const endpointConfig = {
  skus: {
    get: '/api/v1/master/skus',
    post: '/api/v1/admin/skus',
    put: '/api/v1/admin/skus',
    delete: '/api/v1/admin/skus'
  },
  ports: {
    get: '/api/v1/master/ports',
    post: '/api/v1/admin/ports',
    put: '/api/v1/admin/ports',
    delete: '/api/v1/admin/ports'
  },
  sku_packing_mappings: {
    get: '/api/v1/master/sku-packing-mappings',
    post: '/api/v1/admin/sku-packing-mappings',
    put: '/api/v1/admin/sku-packing-mappings',
    delete: '/api/v1/admin/sku-packing-mappings'
  },
  price_plans: {
    get: '/api/v1/admin/price-plans',
    post: '/api/v1/admin/price-plans',
    put: '/api/v1/admin/price-plans',
    delete: '/api/v1/admin/price-plans'
  },
  inventory: {
    get: '/api/v1/admin/inventory',
    post: '/api/v1/admin/inventory',
    put: (id) => `/api/v1/admin/inventory/${id}`,
    delete: (id) => `/api/v1/admin/inventory/${id}`
  },
  rates: {
    get: '/api/v1/admin/rates',
    post: '/api/v1/admin/rates',
    put: (id) => `/api/v1/admin/rates/${id}`,
    delete: (id) => `/api/v1/admin/rates/${id}`
  },
  rules: {
    get: '/api/v1/admin/rules',
    post: '/api/v1/admin/rules',
    put: (id) => `/api/v1/admin/rules/${id}`,
    delete: (id) => `/api/v1/admin/rules/${id}`
  },
  segments: {
    get: '/api/v1/admin/segments',
    post: '/api/v1/admin/segments',
    put: (id) => `/api/v1/admin/segments/${id}`,
    delete: (id) => `/api/v1/admin/segments/${id}`
  },
  packings: {
    get: '/api/v1/master/packings', // Gunakan master untuk GET
    post: '/api/v1/admin/packings',
    put: (id) => `/api/v1/admin/packings/${id}`,
    delete: (id) => `/api/v1/admin/packings/${id}`
  }
};

// Fallback jika resource tidak dikonfigurasi
const getEndpoint = (resource, method = 'GET') => {
  const config = endpointConfig[resource];
  if (!config) {
    // Default pattern
    const base = method === 'GET' ? '/api/v1/master/' : '/api/v1/admin/';
    return `${base}${resource}`;
  }

  const endpoint = config[method.toLowerCase()];
  
  // Handle fungsi yang mengembalikan string berdasarkan ID
  if (typeof endpoint === 'function') {
    return endpoint;
  }
  
  return endpoint || config.get;
};

export const list = async (resource) => {
  try {
    const endpoint = getEndpoint(resource, 'GET');
    const finalEndpoint = typeof endpoint === 'function' ? endpoint() : endpoint;
    
    console.log(`[CRUD] GET from: ${finalEndpoint}`);
    const res = await api.get(finalEndpoint);

    // Normalize response
    let data = res.data;
    if (data && data.data) data = data.data;

    return { ...res, data: Array.isArray(data) ? data : [] };
  } catch (err) {
    console.error(`[CRUD] List error:`, err.response?.data || err.message);
    throw err;
  }
};

export const create = async (resource, payload) => {
  try {
    const endpoint = getEndpoint(resource, 'POST');
    const finalEndpoint = typeof endpoint === 'function' ? endpoint() : endpoint;
    
    console.log(`[CRUD] POST to: ${finalEndpoint}`, payload);
    const res = await api.post(finalEndpoint, payload);
    console.log(`[CRUD] Create success:`, res.data);
    return res;
  } catch (err) {
    console.error(`[CRUD] Create error:`, err.response?.data || err.message);
    throw err;
  }
};

export const update = async (resource, id, payload) => {
  try {
    const endpoint = getEndpoint(resource, 'PUT');
    const finalEndpoint = typeof endpoint === 'function' ? endpoint(id) : `${endpoint}/${id}`;
    
    console.log(`[CRUD] PUT to: ${finalEndpoint}`, payload);
    const res = await api.put(finalEndpoint, payload);
    console.log(`[CRUD] Update success:`, res.data);
    return res;
  } catch (err) {
    console.error(`[CRUD] Update error:`, err.response?.data || err.message);
    throw err;
  }
};

export const remove = async (resource, id) => {
  try {
    const endpoint = getEndpoint(resource, 'DELETE');
    const finalEndpoint = typeof endpoint === 'function' ? endpoint(id) : `${endpoint}/${id}`;
    
    console.log(`[CRUD] DELETE to: ${finalEndpoint}`);
    const res = await api.delete(finalEndpoint);
    console.log(`[CRUD] Delete success:`, res.data);
    return res;
  } catch (err) {
    console.error(`[CRUD] Delete error:`, err.response?.data || err.message);
    throw err;
  }
};

export default { list, create, update, remove };