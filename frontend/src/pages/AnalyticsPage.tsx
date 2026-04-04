import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { analyticsApi } from '../services/api';
import { formatCurrency, formatCurrencyFull, CHART_COLORS } from '../utils';
import type { Period, TrendPoint, TopProduct, BrandData, SizeData, PaymentData, AnalyticsSummary } from '../types';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: '90days', label: '90 Days' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [sizes, setSizes] = useState<SizeData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Analytics — SmartFoot';
    const el = document.getElementById('page-title');
    if (el) el.textContent = 'Analytics';
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.summary(period),
      analyticsApi.trend(period),
      analyticsApi.topProducts(period, 10),
      analyticsApi.brands(period),
      analyticsApi.sizes(period),
      analyticsApi.payments(period),
    ]).then(([s, t, tp, b, sz, p]) => {
      setSummary(s); setTrend(t); setTopProducts(tp); setBrands(b); setSizes(sz); setPayments(p);
    }).finally(() => setLoading(false));
  }, [period]);

  const filteredProducts = topProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand_name.toLowerCase().includes(search.toLowerCase())
  );

  const maxSold = Math.max(...sizes.map(s => s.sold), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Analytics</h2>
        <div className="filter-bar">
          {PERIODS.map(p => (
            <button key={p.key} className={`filter-pill ${period === p.key ? 'active' : ''}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Sales', value: summary ? formatCurrency(summary.total_sales) : '—', badge: `${summary?.invoice_count || 0} invoices`, cls: 'neutral' },
          { label: 'Total Cost', value: summary ? formatCurrency(summary.total_cost) : '—', badge: `${summary?.total_items || 0} units`, cls: 'neutral' },
          { label: 'Gross Profit', value: summary ? formatCurrency(summary.profit) : '—', badge: `${summary?.margin_percent || 0}% margin`, cls: 'up' },
          { label: 'Total Discount', value: summary ? formatCurrency(summary.total_discount) : '—', badge: 'given away', cls: 'down' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <span className={`kpi-badge ${k.cls}`}>{k.badge}</span>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Revenue & Profit Trend</span></div>
        <div className="card-body">
          {loading ? <div className="loading-page"><div className="spinner" /></div> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} width={72} />
                <Tooltip formatter={(v: number) => formatCurrencyFull(v)} />
                <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2.5} dot={false} name="Sales" />
                <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 2" dot={false} name="Profit" />
                <Line type="monotone" dataKey="cost" stroke="#d97706" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Cost" />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: 'var(--gray-500)' }}>
            {[['Sales', '#16a34a'], ['Profit', '#2563eb'], ['Cost', '#d97706']].map(([l, c]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 16, height: 2.5, background: c, display: 'inline-block', borderRadius: 2 }} /> {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Top Products Bar */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Products by Units Sold</span>
          </div>
          <div className="card-body">
            {loading ? <div className="loading-page"><div className="spinner" /></div> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip formatter={(v: number) => [v, 'Units sold']} />
                  <Bar dataKey="sold" fill="#16a34a" radius={[0, 4, 4, 0]} name="Sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Brand pie */}
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue by Brand</span></div>
          <div className="card-body">
            {loading ? <div className="loading-page"><div className="spinner" /></div> : brands.length === 0 ? (
              <div className="empty-state"><p>No data</p></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={brands} dataKey="revenue" nameKey="brand_name" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={2}>
                      {brands.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrencyFull(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {brands.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />
                      <span style={{ color: 'var(--gray-600)' }}>{b.brand_name}</span>
                      <span style={{ fontWeight: 600 }}>{b.percent}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Size demand */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Size Demand</span></div>
        <div className="card-body">
          {loading ? <div className="loading-page"><div className="spinner" /></div> : sizes.length === 0 ? (
            <div className="empty-state"><p>No size data</p></div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sizes.map((s, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: 52, background: 'var(--gray-50)', borderRadius: 8, padding: '10px 8px', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>{s.size}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{s.sold}</div>
                  <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: 'var(--gray-200)' }}>
                    <div style={{ height: '100%', width: `${(s.sold / maxSold) * 100}%`, background: '#16a34a', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product drill-down with search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Product Performance</span>
          <div className="search-wrap">
            <div className="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <input className="form-input" placeholder="Filter products..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, width: 200 }} />
          </div>
        </div>
        <div className="card-body">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Brand</th><th>Sold</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th></tr></thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>No products found</td></tr>
                ) : filteredProducts.map((p, i) => (
                  <tr key={i}>
                    <td><div style={{ fontWeight: 500 }}>{p.article_number}</div><div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{p.color}</div></td>
                    <td>{p.brand_name}</td>
                    <td style={{ fontWeight: 600 }}>{p.sold}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrencyFull(p.revenue)}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{formatCurrencyFull(p.cost)}</td>
                    <td style={{ color: p.profit > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{formatCurrencyFull(p.profit)}</td>
                    <td>
                      <span className={`badge ${p.revenue > 0 && (p.profit / p.revenue) > 0.25 ? 'badge-green' : 'badge-amber'}`}>
                        {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="card">
        <div className="card-header"><span className="card-title">Payment Mode Breakdown</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {payments.map((p, i) => (
              <div key={i} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'capitalize', marginBottom: 6 }}>{p.payment_mode}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(p.total)}</div>
                <div style={{ marginTop: 8, height: 6, background: 'var(--gray-200)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${p.percent}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{p.percent}% · {p.count} transactions</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
