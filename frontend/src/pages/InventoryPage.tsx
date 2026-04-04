import { useEffect, useState, useCallback } from 'react';
import { inventoryApi } from '../services/api';
import { formatCurrencyFull } from '../utils';
import type { Product } from '../types';

function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    brand_name: product?.brand_name || '',
    article_number: product?.article_number || '',
    size: product?.size || '',
    color: product?.color || '',
    mrp: product?.mrp?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    quantity: product?.quantity?.toString() || '',
    low_stock_threshold: product?.low_stock_threshold?.toString() || '5',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isEdit) await inventoryApi.update(product!.id, { ...form, mrp: parseFloat(form.mrp), cost_price: parseFloat(form.cost_price || '0'), quantity: parseInt(form.quantity), low_stock_threshold: parseInt(form.low_stock_threshold) });
      else await inventoryApi.create({ ...form, mrp: parseFloat(form.mrp), cost_price: parseFloat(form.cost_price || '0'), quantity: parseInt(form.quantity), low_stock_threshold: parseInt(form.low_stock_threshold) });
      onSaved();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2?.response?.data?.error || 'Failed to save product');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Product' : 'Add Product'}</span>
          <button className="modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Brand Name *</label><input className="form-input" value={form.brand_name} onChange={set('brand_name')} required /></div>
              <div className="form-group"><label className="form-label">Article Number *</label><input className="form-input" value={form.article_number} onChange={set('article_number')} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Size *</label><input className="form-input" value={form.size} onChange={set('size')} placeholder="7, 8, 9..." required /></div>
              <div className="form-group"><label className="form-label">Color</label><input className="form-input" value={form.color} onChange={set('color')} placeholder="Black, White..." /></div>
            </div>
            <div className="form-row-3">
              <div className="form-group"><label className="form-label">MRP (₹) *</label><input className="form-input" type="number" value={form.mrp} onChange={set('mrp')} required min="0" step="0.01" /></div>
              <div className="form-group"><label className="form-label">Cost Price (₹)</label><input className="form-input" type="number" value={form.cost_price} onChange={set('cost_price')} min="0" step="0.01" /></div>
              <div className="form-group"><label className="form-label">Quantity *</label><input className="form-input" type="number" value={form.quantity} onChange={set('quantity')} required min="0" /></div>
            </div>
            <div className="form-group"><label className="form-label">Low Stock Alert Threshold</label><input className="form-input" type="number" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} min="0" /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Product | null | 'new'>(null);

  const LIMIT = 30;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (brand) params.brand = brand;
      if (lowStock) params.low_stock = true;
      const data = await inventoryApi.list(params);
      setProducts(data.products);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [page, search, brand, lowStock]);

  useEffect(() => {
    document.title = 'Inventory — SmartFoot';
    const el = document.getElementById('page-title');
    if (el) el.textContent = 'Inventory';
    inventoryApi.brands().then(setBrands);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await inventoryApi.delete(id);
    fetchProducts();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <div className="search-wrap" style={{ minWidth: 200 }}>
            <div className="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <input className="form-input" placeholder="Search brand, article, color..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 32 }} />
          </div>
          <select className="form-select" value={brand} onChange={e => { setBrand(e.target.value); setPage(1); }} style={{ width: 150 }}>
            <option value="">All Brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-600)', cursor: 'pointer' }}>
            <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} />
            Low stock only
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 13, color: 'var(--gray-600)' }}>
        <span>{total} products</span>
        {lowStock && <span className="badge badge-red">Low stock filter active</span>}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading-page"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr>
                  <th>Brand / Article</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>MRP</th>
                  <th>Cost</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>No products found</td></tr>
                ) : products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.brand_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{p.article_number}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.size}</td>
                    <td>{p.color || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrencyFull(p.mrp)}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{formatCurrencyFull(p.cost_price)}</td>
                    <td>
                      <span className={p.quantity <= p.low_stock_threshold ? 'stock-low' : 'stock-ok'}>{p.quantity}</span>
                    </td>
                    <td>
                      {p.quantity === 0
                        ? <span className="badge badge-red">Out of stock</span>
                        : p.quantity <= p.low_stock_threshold
                        ? <span className="badge badge-amber">Low stock</span>
                        : <span className="badge badge-green">In stock</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--gray-200)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>

      {(modal === 'new' || modal instanceof Object) && (
        <ProductModal
          product={modal === 'new' ? null : modal as Product}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchProducts(); }}
        />
      )}
    </div>
  );
}
