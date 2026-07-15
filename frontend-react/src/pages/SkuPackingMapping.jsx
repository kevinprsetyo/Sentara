import React, { useEffect, useState } from 'react';
import crud from '../services/crudApi';

const SkuPackingMappings = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sku_id: '', packing_type: '', cbm_per_unit: '', unit_per_20ft: '' });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await crud.list('sku_packing_mappings');
      const data = res.data?.data ?? res.data ?? [];
      setItems(data);
    } catch (err) {
      const msg = err.message || 'Gagal memuat data';
      console.error('Failed to load sku_packing_mappings', err);
      setError(msg);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await crud.update('sku_packing_mappings', editingId, form);
      else await crud.create('sku_packing_mappings', form);
      setForm({ sku_id: '', packing_type: '', cbm_per_unit: '', unit_per_20ft: '' });
      setEditingId(null);
      await load();
    } catch (err) { console.error('Save failed', err); }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({ sku_id: item.sku_id ?? '', packing_type: item.packing_type ?? '', cbm_per_unit: item.cbm_per_unit ?? '', unit_per_20ft: item.unit_per_20ft ?? '' });
  };

  const del = async (id) => { if (!confirm('Hapus item ini?')) return; try { await crud.remove('sku_packing_mappings', id); await load(); } catch (err) { console.error(err); } };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">SKU Packing Mappings</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <form onSubmit={save} className="mb-4 space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <input placeholder="SKU ID" value={form.sku_id} onChange={(e)=>setForm({...form, sku_id:e.target.value})} className="p-2 border" />
          <input placeholder="Packing Type" value={form.packing_type} onChange={(e)=>setForm({...form, packing_type:e.target.value})} className="p-2 border" />
          <input placeholder="CBM per unit" value={form.cbm_per_unit} onChange={(e)=>setForm({...form, cbm_per_unit:e.target.value})} className="p-2 border" />
          <input placeholder="Unit per 20ft" value={form.unit_per_20ft} onChange={(e)=>setForm({...form, unit_per_20ft:e.target.value})} className="p-2 border" />
        </div>
        <div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{editingId ? 'Update' : 'Create'}</button>
          {editingId && <button type="button" onClick={()=>{setEditingId(null); setForm({sku_id:'',packing_type:'',cbm_per_unit:'',unit_per_20ft:''})}} className="ml-2 px-3 py-2 border rounded">Cancel</button>}
        </div>
      </form>

      {loading ? <div>Memuat...</div> : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">SKU ID</th>
              <th className="p-2">Packing Type</th>
              <th className="p-2">CBM / Unit</th>
              <th className="p-2">Unit / 20ft</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.sku_id}</td>
                <td className="p-2">{item.packing_type}</td>
                <td className="p-2">{item.cbm_per_unit}</td>
                <td className="p-2">{item.unit_per_20ft}</td>
                <td className="p-2">
                  <button onClick={()=>edit(item)} className="text-sm text-blue-600 mr-2">Edit</button>
                  <button onClick={()=>del(item.id)} className="text-sm text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SkuPackingMappings;
