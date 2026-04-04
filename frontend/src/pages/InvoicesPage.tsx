import { useEffect, useState, useCallback } from 'react';
import { billingApi } from '../services/api';
import { formatCurrencyFull, formatDateTime } from '../utils';
import type { Invoice } from '../types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [payment, setPayment] = useState('');
  const LIMIT = 20;

  useEffect(() => {
    document.title = 'Invoices — SmartFoot';
    const el = document.getElementById('page-title');
    if (el) el.textContent = 'Invoices';
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (from) params.from = from;
      if (to) params.to = to;
      if (payment) params.payment_mode = payment;
      const data = await billingApi.list(params);
      setInvoices(data.invoices); setTotal(data.total);
    } finally { setLoading(false); }
  }, [page, from, to, payment]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const viewInvoice = async (id: string) => {
    const data = await billingApi.get(id);
    setSelected(data);
  };

  const voidInvoice = async (id: string) => {
    if (!confirm('Void this invoice? Stock will be restored.')) return;
    await billingApi.void(id);
    fetchInvoices(); setSelected(null);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="date" className="form-input" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} style={{ width: 160 }} />
        <input type="date" className="form-input" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} style={{ width: 160 }} />
        <select className="form-select" value={payment} onChange={e => { setPayment(e.target.value); setPage(1); }} style={{ width: 130 }}>
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
        <button className="btn btn-secondary" onClick={() => { setFrom(''); setTo(''); setPayment(''); setPage(1); }}>Clear</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading-page"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th><th>Date</th><th>Customer</th><th>Items</th>
                  <th>Discount</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No invoices found</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><span style={{ fontWeight: 600, color: 'var(--blue)' }}>{inv.invoice_number}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDateTime(inv.date)}</td>
                    <td style={{ fontSize: 12 }}>{inv.customer_name || <span style={{ color: 'var(--gray-400)' }}>Walk-in</span>}</td>
                    <td>—</td>
                    <td style={{ color: 'var(--red)' }}>{inv.discount > 0 ? `−${formatCurrencyFull(inv.discount)}` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrencyFull(inv.final_amount)}</td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{inv.payment_mode}</span></td>
                    <td>
                      <span className={`badge ${inv.status === 'completed' ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'capitalize' }}>{inv.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => viewInvoice(inv.id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--gray-200)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ fontSize: 13 }}>Page {page} of {totalPages} · {total} invoices</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <span className="modal-title">Invoice — {selected.invoice_number}</span>
              <button className="modal-close" onClick={() => setSelected(null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.shop?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{selected.shop?.address}</div>
                {selected.shop?.gst_number && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>GST: {selected.shop.gst_number}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
                <div><strong>Invoice:</strong> {selected.invoice_number}</div>
                <div><strong>Date:</strong> {formatDateTime(selected.date)}</div>
              </div>
              {selected.customer_name && <div style={{ fontSize: 12, marginBottom: 12 }}>Customer: {selected.customer_name} {selected.customer_phone}</div>}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['Item','Size','Qty','MRP','Price','Total'].map(h => <th key={h} style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {selected.items?.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-100)' }}><strong>{item.brand_name}</strong> {item.article_number}<br /><span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{item.color}</span></td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-100)' }}>{item.size}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-100)' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-100)' }}>{formatCurrencyFull(item.mrp)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-100)' }}>{formatCurrencyFull(item.selling_price)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-100)', fontWeight: 600 }}>{formatCurrencyFull(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ maxWidth: 200, marginLeft: 'auto', marginTop: 12 }}>
                {[['Subtotal', formatCurrencyFull(selected.subtotal)], selected.discount > 0 ? ['Discount', `−${formatCurrencyFull(selected.discount)}`] : null, ['TOTAL', formatCurrencyFull(selected.final_amount)]].filter(Boolean).map((row, i) => row && (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: i === 2 ? 15 : 13, fontWeight: i === 2 ? 700 : 400, borderTop: i === 2 ? '1px solid var(--gray-300)' : 'none', marginTop: i === 2 ? 6 : 0 }}>
                    <span>{row[0]}</span><span>{row[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              {selected.status === 'completed' && (
                <button className="btn btn-danger" onClick={() => voidInvoice(selected.id)}>Void Invoice</button>
              )}
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
