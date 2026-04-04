import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { analyticsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatCurrencyFull, CHART_COLORS } from '../utils';
import type { AnalyticsSummary, TrendPoint, TopProduct, BrandData, PaymentData, Period } from '../types';

const PERIODS: { key: Period; label: string }[] = [
  { key:'today', label:'Today' }, { key:'week', label:'7 Days' },
  { key:'month', label:'30 Days' }, { key:'90days', label:'90 Days' },
];

export default function DashboardPage() {
  const { shop } = useAuthStore();
  const [period, setPeriod] = useState<Period>('month');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard — SmartFoot';
    const el = document.getElementById('page-title'); if(el) el.textContent = 'Dashboard';
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([analyticsApi.summary(period), analyticsApi.trend(period), analyticsApi.topProducts(period), analyticsApi.brands(period), analyticsApi.payments(period)])
      .then(([s,t,tp,b,p]) => { setSummary(s); setTrend(t); setTopProducts(tp); setBrands(b); setPayments(p); })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      {/* Top bar with logo */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {shop?.logo_data && (
            <img src={shop.logo_data} alt="Logo" style={{ height:48, maxWidth:130, objectFit:'contain', borderRadius:8, border:'1px solid var(--gray-200)', padding:2 }} />
          )}
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--gray-900)' }}>{shop?.name || 'Dashboard'}</h2>
            {shop?.address && <div style={{ fontSize:12, color:'var(--gray-500)' }}>{shop.address}</div>}
          </div>
        </div>
        <div className="filter-bar">
          {PERIODS.map(p => <button key={p.key} className={`filter-pill ${period===p.key?'active':''}`} onClick={()=>setPeriod(p.key)}>{p.label}</button>)}
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        {[
          { label:'Total Sales', v:summary?formatCurrency(summary.total_sales):'—', sub:`${summary?.invoice_count||0} invoices`, cls:'neutral' },
          { label:'Total Cost', v:summary?formatCurrency(summary.total_cost):'—', sub:`${summary?.total_items||0} units`, cls:'neutral' },
          { label:'Gross Profit', v:summary?formatCurrency(summary.profit):'—', sub:`${summary?.margin_percent||0}% margin`, cls:summary&&summary.profit>0?'up':'down', hi:true },
          { label:'Avg Invoice', v:summary&&summary.invoice_count>0?formatCurrency(summary.total_sales/summary.invoice_count):'—', sub:'per bill', cls:'neutral' },
          { label:'Discounts Given', v:summary?formatCurrency(summary.total_discount):'—', sub:'total reductions', cls:'down' },
          { label:'Items Sold', v:String(summary?.total_items||0), sub:'units total', cls:'neutral' },
        ].map((k,i) => (
          <div key={i} className="kpi-card" style={k.hi?{borderLeft:'3px solid var(--green)'}:{}}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={k.hi&&summary&&summary.profit>0?{color:'var(--green)'}:{}}>{k.v}</div>
            <span className={`kpi-badge ${k.cls}`}>{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Profit Breakdown */}
      {summary && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header"><span className="card-title">Profit Breakdown — Sales Price minus Cost</span></div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16 }}>
              {[
                { label:'Total Revenue', val:formatCurrencyFull(summary.total_sales), color:'#16a34a' },
                { label:'Cost of Goods', val:formatCurrencyFull(summary.total_cost), color:'#d97706' },
                { label:'Gross Profit', val:formatCurrencyFull(summary.profit), color:summary.profit>=0?'#2563eb':'#dc2626' },
                { label:'Gross Margin', val:`${summary.margin_percent}%`, color:'#7c3aed' },
              ].map((item,i) => (
                <div key={i} style={{ padding:'12px 16px', background:'var(--gray-50)', borderRadius:8, borderLeft:`3px solid ${item.color}` }}>
                  <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:item.color }}>{item.val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:'var(--gray-500)', marginBottom:6 }}>Revenue composition</div>
            <div style={{ height:14, borderRadius:7, background:'var(--gray-200)', overflow:'hidden', display:'flex' }}>
              <div style={{ width:`${summary.total_sales>0?(summary.total_cost/summary.total_sales)*100:0}%`, background:'#d97706' }} title={`Cost ${formatCurrencyFull(summary.total_cost)}`}/>
              <div style={{ width:`${summary.total_sales>0?Math.max(0,summary.profit/summary.total_sales)*100:0}%`, background:'#16a34a' }} title={`Profit ${formatCurrencyFull(summary.profit)}`}/>
            </div>
            <div style={{ display:'flex', gap:20, marginTop:6, fontSize:11, color:'var(--gray-500)' }}>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'#d97706', borderRadius:2, marginRight:4 }}/>Cost ({summary.total_sales>0?((summary.total_cost/summary.total_sales)*100).toFixed(1):0}%)</span>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'#16a34a', borderRadius:2, marginRight:4 }}/>Profit ({summary.margin_percent}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Sales trend */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><span className="card-title">Sales & Profit Trend</span></div>
        <div className="card-body">
          {loading ? <div className="loading-page"><div className="spinner"/></div> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend} margin={{ top:4, right:8, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="label" tick={{ fontSize:11 }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v=>formatCurrency(v)} width={70}/>
                <Tooltip formatter={(v:number)=>formatCurrencyFull(v)}/>
                <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2.5} dot={false} name="Sales"/>
                <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Profit"/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Top Products</span></div>
          <div className="card-body">
            {loading?<div className="loading-page"><div className="spinner"/></div>:topProducts.length===0?<div className="empty-state"><p>No sales data</p></div>:(
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topProducts} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" tick={false} axisLine={false}/>
                    <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false}/>
                    <Tooltip formatter={(v:number)=>[v,'Sold']} labelFormatter={l=>l}/>
                    <Bar dataKey="sold" fill="#16a34a" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop:8 }}>
                  {topProducts.slice(0,5).map((p,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--gray-100)', fontSize:12 }}>
                      <span style={{ fontWeight:500 }}>{p.brand_name} {p.article_number}<span style={{ color:'var(--gray-400)', marginLeft:4, fontWeight:400 }}>{p.color}</span></span>
                      <div style={{ textAlign:'right' }}><div style={{ fontWeight:600 }}>{p.sold} sold</div><div style={{ color:'var(--green)', fontSize:11 }}>{formatCurrency(p.revenue)}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Brand Mix</span></div>
          <div className="card-body">
            {loading?<div className="loading-page"><div className="spinner"/></div>:brands.length===0?<div className="empty-state"><p>No data</p></div>:(
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart><Pie data={brands} dataKey="revenue" nameKey="brand_name" cx="50%" cy="50%" outerRadius={75} innerRadius={38}>
                    {brands.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                  </Pie><Tooltip formatter={(v:number)=>formatCurrencyFull(v)}/></PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {brands.map((b,i)=>(
                    <span key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:CHART_COLORS[i%CHART_COLORS.length], display:'inline-block' }}/>
                      <span style={{ color:'var(--gray-600)' }}>{b.brand_name}</span><span style={{ fontWeight:600 }}>{b.percent}%</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Payment Modes</span></div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
            {payments.map((p,i)=>(
              <div key={i} style={{ padding:'12px 16px', background:'var(--gray-50)', borderRadius:8, border:'1px solid var(--gray-200)' }}>
                <div style={{ fontSize:12, color:'var(--gray-500)', textTransform:'capitalize', marginBottom:4 }}>{p.payment_mode}</div>
                <div style={{ fontSize:20, fontWeight:700 }}>{formatCurrency(p.total)}</div>
                <div style={{ marginTop:8, height:6, background:'var(--gray-200)', borderRadius:3 }}>
                  <div style={{ height:'100%', width:`${p.percent}%`, background:CHART_COLORS[i], borderRadius:3 }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:4 }}>{p.percent}% · {p.count} bills</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
