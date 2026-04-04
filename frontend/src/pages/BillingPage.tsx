import { useEffect, useRef, useState } from 'react';
import { inventoryApi, billingApi } from '../services/api';
import { formatCurrencyFull } from '../utils';
import { useAuthStore } from '../store/authStore';
import type { CartRow, Invoice, PaymentDetail } from '../types';

const newRow = (): CartRow => ({ id: Math.random().toString(36).slice(2), product_id:'', brand_name:'', article_number:'', size:'', color:'', quantity:1, mrp:0, selling_price:0, cost_price:0 });

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { shop } = useAuthStore();
  const s = invoice.shop || shop;
  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="modal-header">
          <span className="modal-title">✅ Invoice — {invoice.invoice_number}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body invoice-preview">
          <div style={{ textAlign:'center', marginBottom:16 }}>
            {s?.logo_data && <img src={s.logo_data} alt="Logo" style={{ height:52, maxWidth:160, objectFit:'contain', display:'block', margin:'0 auto 8px', borderRadius:6 }}/>}
            <div className="shop-name">{s?.name}</div>
            <div style={{ color:'var(--gray-500)', fontSize:12 }}>{s?.address}</div>
            {s?.gst_number && <div style={{ fontSize:12, color:'var(--gray-500)' }}>GST: {s.gst_number}</div>}
          </div>
          <hr className="divider"/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:12 }}>
            <div><strong>Invoice:</strong> {invoice.invoice_number}</div>
            <div><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-IN')}</div>
          </div>
          {invoice.customer_name && <div style={{ fontSize:12, marginBottom:12 }}>Customer: {invoice.customer_name}{invoice.customer_phone&&` · ${invoice.customer_phone}`}</div>}
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'var(--gray-50)' }}>
              {['Sl','Item','Size','Color','Qty','MRP','Price','Total'].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:'left', borderBottom:'1px solid var(--gray-200)', fontSize:10, fontWeight:600, textTransform:'uppercase', color:'var(--gray-500)' }}>{h}</th>)}
            </tr></thead>
            <tbody>{invoice.items?.map((item,i)=>(
              <tr key={i}>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)', color:'var(--gray-400)' }}>{i+1}</td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)' }}><strong>{item.brand_name}</strong><br/><span style={{ fontSize:10, color:'var(--gray-400)' }}>{item.article_number}</span></td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)' }}>{item.size}</td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)' }}>{item.color||'—'}</td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)' }}>{item.quantity}</td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)' }}>{formatCurrencyFull(item.mrp)}</td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)' }}>{formatCurrencyFull(item.selling_price)}</td>
                <td style={{ padding:'8px', borderBottom:'1px solid var(--gray-100)', fontWeight:600 }}>{formatCurrencyFull(item.total)}</td>
              </tr>
            ))}</tbody>
          </table>
          <hr className="divider"/>
          <div style={{ maxWidth:260, marginLeft:'auto' }}>
            <div className="invoice-total-row"><span>Subtotal</span><span>{formatCurrencyFull(invoice.subtotal)}</span></div>
            {invoice.discount>0 && <div className="invoice-total-row" style={{ color:'var(--red)' }}><span>Discount</span><span>−{formatCurrencyFull(invoice.discount)}</span></div>}
            {invoice.gst_amount>0 && <div className="invoice-total-row"><span>GST ({invoice.gst_rate}%)</span><span>{formatCurrencyFull(invoice.gst_amount)}</span></div>}
            <div className="invoice-total-row final"><span>TOTAL</span><span>{formatCurrencyFull(invoice.final_amount)}</span></div>
          </div>
          {Array.isArray(invoice.payment_details) && invoice.payment_details.length>0 && (
            <div style={{ marginTop:12, padding:'10px 14px', background:'var(--gray-50)', borderRadius:8, fontSize:12 }}>
              <strong style={{ display:'block', marginBottom:6 }}>Payment breakdown:</strong>
              {invoice.payment_details.map((pd,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', textTransform:'capitalize' }}>
                  <span>{pd.mode}</span><span style={{ fontWeight:600 }}>{formatCurrencyFull(pd.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:12, fontSize:11, color:'var(--gray-400)', textAlign:'center' }}>Thank you for shopping! 👟</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={()=>window.print()}>🖨️ Print</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { shop } = useAuthStore();
  const [rows, setRows] = useState<CartRow[]>([newRow(), newRow()]);
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<'amount'|'percent'>('amount');
  const [gstRate, setGstRate] = useState('0');
  const [payMode, setPayMode] = useState<'cash'|'upi'|'card'|'mixed'>('cash');
  const [payDetails, setPayDetails] = useState<PaymentDetail[]>([{mode:'cash',amount:0},{mode:'upi',amount:0},{mode:'card',amount:0}]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doneInvoice, setDoneInvoice] = useState<Invoice|null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState<{id:string;label:string;p:CartRow}[]>([]);
  const [activeRow, setActiveRow] = useState<number|null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => { document.title='Billing — SmartFoot'; const el=document.getElementById('page-title'); if(el) el.textContent='Billing / POS'; }, []);

  useEffect(() => {
    if (!searchQ.trim() || searchQ.length<2) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const data = await inventoryApi.list({ search:searchQ.trim(), limit:10 });
      setSearchRes(data.products.filter((p:{quantity:number})=>p.quantity>0).map((p:{id:string;brand_name:string;article_number:string;size:string;color:string;mrp:number;cost_price:number})=>({
        id:p.id, label:`${p.brand_name} ${p.article_number} — Sz ${p.size} ${p.color}`,
        p:{ id:'', product_id:p.id, brand_name:p.brand_name, article_number:p.article_number, size:p.size, color:p.color, mrp:p.mrp, selling_price:p.mrp, cost_price:p.cost_price, quantity:1 }
      })));
    }, 220);
    return ()=>clearTimeout(t);
  }, [searchQ]);

  const applyGst = (mrp: number) => {
    const g = parseFloat(gstRate)||0;
    return g>0 ? parseFloat((mrp*100/(100+g)).toFixed(2)) : mrp;
  };

  useEffect(() => {
    setRows(prev=>prev.map(r=>r.mrp>0 ? { ...r, selling_price: applyGst(r.mrp) } : r));
  }, [gstRate]);

  const setRow = (idx:number, field:keyof CartRow, val:string|number) => {
    setRows(prev=>{
      const u=[...prev]; u[idx]={...u[idx],[field]:val};
      if(field==='mrp') u[idx].selling_price = applyGst(parseFloat(val as string)||0);
      return u;
    });
  };

  const pickProduct = (idx:number, r:{id:string;label:string;p:CartRow}) => {
    setRows(prev=>{ const u=[...prev]; u[idx]={ ...u[idx], ...r.p, selling_price: applyGst(r.p.mrp), quantity: u[idx].quantity||1 }; return u; });
    setSearchQ(''); setSearchRes([]); setActiveRow(null);
  };

  const addRow = () => setRows(prev=>[...prev, newRow()]);
  const removeRow = (idx:number) => setRows(prev=>prev.length>1?prev.filter((_,i)=>i!==idx):prev);

  const handleTab = (e:React.KeyboardEvent, idx:number, isLast:boolean) => {
    if(e.key==='Tab' && isLast && idx===rows.length-1) {
      e.preventDefault(); addRow();
      setTimeout(()=>{ const trs=tbodyRef.current?.querySelectorAll('tr'); if(trs&&trs[idx+1]){ const inp=trs[idx+1].querySelector('input') as HTMLInputElement|null; inp?.focus(); } }, 60);
    }
  };

  const validRows = rows.filter(r=>r.brand_name&&r.quantity>0&&r.selling_price>=0);
  const subtotal = validRows.reduce((s,r)=>s+r.selling_price*r.quantity,0);
  const discAmt = discountType==='percent'?(subtotal*parseFloat(discount||'0'))/100:parseFloat(discount||'0');
  const afterDisc = Math.max(0, subtotal-discAmt);
  const gst = parseFloat(gstRate)||0;
  const gstAmt = gst>0 ? parseFloat((afterDisc-(afterDisc*100)/(100+gst)).toFixed(2)) : 0;
  const finalAmt = afterDisc;

  const mixedPaid = payDetails.reduce((s,pd)=>s+(parseFloat(String(pd.amount))||0),0);
  const mixedRemaining = Math.round((finalAmt-mixedPaid)*100)/100;

  const handleCheckout = async () => {
    if(validRows.length===0){ setError('Add at least one item'); return; }
    if(payMode==='mixed'){ const tot=payDetails.reduce((s,pd)=>s+(parseFloat(String(pd.amount))||0),0); if(Math.abs(tot-finalAmt)>1){ setError(`Payment total ₹${tot.toFixed(2)} ≠ invoice total ₹${finalAmt.toFixed(2)}`); return; } }
    setError(''); setLoading(true);
    try {
      const result = await billingApi.create({
        items: validRows.map(r=>({ product_id:r.product_id||undefined, brand_name:r.brand_name, article_number:r.article_number, size:r.size, color:r.color, quantity:r.quantity, mrp:r.mrp||r.selling_price, selling_price:r.selling_price, cost_price:r.cost_price })),
        discount:parseFloat(discount||'0'), discount_type:discountType, gst_rate:parseFloat(gstRate||'0'),
        payment_mode:payMode, payment_details:payMode==='mixed'?payDetails.filter(pd=>pd.amount>0):[],
        customer_name:customerName, customer_phone:customerPhone,
      });
      setDoneInvoice(result);
      setRows([newRow(),newRow()]); setDiscount('0'); setCustomerName(''); setCustomerPhone('');
      setPayDetails([{mode:'cash',amount:0},{mode:'upi',amount:0},{mode:'card',amount:0}]);
    } catch(err:unknown){ const e=err as {response?:{data?:{error?:string}}}; setError(e?.response?.data?.error||'Billing failed'); }
    finally{ setLoading(false); }
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:14, height:'calc(100vh - 108px)', minHeight:0 }}>
      {/* LEFT */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
        <div className="card" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
          <div className="card-header" style={{ flexShrink:0 }}>
            <span className="card-title">Bill Items</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <label style={{ fontSize:12, color:'var(--gray-600)' }}>GST%</label>
              <select className="form-select" value={gstRate} onChange={e=>setGstRate(e.target.value)} style={{ width:72, padding:'4px 6px', fontSize:12 }}>
                {['0','5','12','18','28'].map(g=><option key={g} value={g}>{g}%</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={addRow}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Row
              </button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ position:'sticky', top:0, zIndex:2 }}>
                <tr style={{ background:'var(--gray-50)' }}>
                  {['Sl','Brand / Article','Size','Color','Qty','MRP (₹)','Price (₹)','Total',''].map((h,i)=>(
                    <th key={i} style={{ padding:'9px 6px', textAlign:'left', borderBottom:'2px solid var(--gray-200)', fontSize:10, fontWeight:700, color:'var(--gray-600)', whiteSpace:'nowrap', background:'var(--gray-50)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {rows.map((row,idx)=>(
                  <tr key={row.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                    <td style={{ padding:'3px 6px', color:'var(--gray-400)', fontSize:11, width:28, textAlign:'center' }}>{idx+1}</td>
                    <td style={{ padding:'3px 6px', minWidth:190, position:'relative' }}>
                      <input className="form-input" style={{ padding:'5px 7px', fontSize:12, width:'100%' }}
                        placeholder="Search or type brand..."
                        value={activeRow===idx ? searchQ : (row.brand_name?`${row.brand_name} ${row.article_number}`:'')}
                        onChange={e=>{ setActiveRow(idx); setSearchQ(e.target.value); if(!e.target.value){ setRows(prev=>{ const u=[...prev]; u[idx]={...newRow(),id:row.id,quantity:row.quantity}; return u; }); } }}
                        onFocus={()=>{ setActiveRow(idx); if(row.brand_name) setSearchQ(`${row.brand_name} ${row.article_number}`); }}
                        onBlur={()=>setTimeout(()=>{ setActiveRow(null); setSearchQ(''); setSearchRes([]); },180)}
                        onKeyDown={e=>handleTab(e,idx,false)}
                      />
                      {activeRow===idx && searchRes.length>0 && (
                        <div className="product-dropdown" style={{ zIndex:100 }}>
                          {searchRes.map(r=>(
                            <div key={r.id} className="product-option" onMouseDown={()=>pickProduct(idx,r)}>
                              <div className="product-option-name">{r.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'3px 5px', width:56 }}><input className="form-input" style={{ padding:'5px 5px', fontSize:12, width:52 }} value={row.size} onChange={e=>setRow(idx,'size',e.target.value)} placeholder="8" onKeyDown={e=>handleTab(e,idx,false)}/></td>
                    <td style={{ padding:'3px 5px', width:68 }}><input className="form-input" style={{ padding:'5px 5px', fontSize:12, width:64 }} value={row.color} onChange={e=>setRow(idx,'color',e.target.value)} placeholder="Black" onKeyDown={e=>handleTab(e,idx,false)}/></td>
                    <td style={{ padding:'3px 5px', width:58 }}><input className="form-input" type="number" style={{ padding:'5px 5px', fontSize:12, width:54 }} value={row.quantity} min={1} onChange={e=>setRow(idx,'quantity',parseInt(e.target.value)||1)} onKeyDown={e=>handleTab(e,idx,false)}/></td>
                    <td style={{ padding:'3px 5px', width:88 }}><input className="form-input" type="number" style={{ padding:'5px 5px', fontSize:12, width:84 }} value={row.mrp||''} placeholder="0.00" min={0} step={0.01} onChange={e=>setRow(idx,'mrp',parseFloat(e.target.value)||0)} onKeyDown={e=>handleTab(e,idx,false)}/></td>
                    <td style={{ padding:'3px 5px', width:88 }}>
                      <input className="form-input" type="number" style={{ padding:'5px 5px', fontSize:12, width:84, background:gst>0?'#f0fdf4':'' }} value={row.selling_price||''} placeholder="0.00" min={0} step={0.01} onChange={e=>setRow(idx,'selling_price',parseFloat(e.target.value)||0)} onKeyDown={e=>handleTab(e,idx,true)}/>
                    </td>
                    <td style={{ padding:'3px 6px', fontWeight:600, color:'var(--gray-800)', width:90, whiteSpace:'nowrap', fontSize:12 }}>
                      {row.selling_price>0&&row.quantity>0 ? formatCurrencyFull(row.selling_price*row.quantity) : <span style={{ color:'var(--gray-300)' }}>—</span>}
                    </td>
                    <td style={{ padding:'3px 4px', width:24 }}>
                      <button onClick={()=>removeRow(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-300)', fontSize:15, padding:2, lineHeight:1 }} title="Remove">✕</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={9} style={{ padding:'6px 6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ width:'100%', justifyContent:'center', fontSize:11 }}>+ Add Row &nbsp;(or Tab from last cell)</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {gst>0 && <div style={{ padding:'8px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, fontSize:12, color:'#15803d', flexShrink:0 }}>
          ℹ️ GST {gst}% — MRP is inclusive. Price = MRP × 100 ÷ {100+gst}. Green cells = base price after extracting GST.
        </div>}
      </div>

      {/* RIGHT */}
      <div className="card" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div className="card-header" style={{ flexShrink:0 }}><span className="card-title">Checkout</span></div>
        <div className="card-body" style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
          {error && <div className="alert alert-error" style={{ fontSize:12, marginBottom:10 }}>{error}</div>}
          <div className="form-group"><label className="form-label">Customer Name</label><input className="form-input" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Optional"/></div>
          <div className="form-group"><label className="form-label">Customer Phone</label><input className="form-input" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="Optional"/></div>
          <div className="form-group">
            <label className="form-label">Discount</label>
            <div style={{ display:'flex', gap:6 }}>
              <input className="form-input" type="number" value={discount} onChange={e=>setDiscount(e.target.value)} min={0} style={{ flex:1 }}/>
              <select className="form-select" value={discountType} onChange={e=>setDiscountType(e.target.value as 'amount'|'percent')} style={{ width:68 }}><option value="amount">₹</option><option value="percent">%</option></select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {(['cash','upi','card','mixed'] as const).map(m=>(
                <button key={m} className={`btn ${payMode===m?'btn-primary':'btn-secondary'} btn-sm`} style={{ justifyContent:'center', textTransform:'capitalize' }} onClick={()=>setPayMode(m)}>{m==='mixed'?'🔀 Mixed':m==='cash'?'💵 Cash':m==='upi'?'📱 UPI':'💳 Card'}</button>
              ))}
            </div>
          </div>
          {payMode==='mixed' && (
            <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Enter amount per mode:</div>
              {payDetails.map((pd,i)=>(
                <div key={pd.mode} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ width:38, fontSize:12, color:'var(--gray-600)', textTransform:'capitalize' }}>{pd.mode}</span>
                  <input className="form-input" type="number" placeholder={`₹`} value={pd.amount||''} min={0} step={0.01}
                    style={{ flex:1, padding:'5px 8px', fontSize:12 }}
                    onChange={e=>{ const u=[...payDetails]; u[i]={...pd,amount:parseFloat(e.target.value)||0}; setPayDetails(u); }}/>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, borderTop:'1px solid var(--gray-200)', paddingTop:6, marginTop:2 }}>
                <span>Paid</span>
                <span style={{ fontWeight:600, color:Math.abs(mixedRemaining)<0.5?'var(--green)':'var(--amber)' }}>
                  {formatCurrencyFull(mixedPaid)}
                  {mixedRemaining!==0 && <span style={{ color:'var(--amber)' }}> ({mixedRemaining>0?'rem':'extra'}: ₹{Math.abs(mixedRemaining).toFixed(2)})</span>}
                </span>
              </div>
            </div>
          )}
          <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'12px' }}>
            {[
              ['Subtotal', formatCurrencyFull(subtotal), ''],
              discAmt>0 ? ['Discount', `−${formatCurrencyFull(discAmt)}`, 'var(--red)'] : null,
              gstAmt>0 ? [`GST (${gstRate}%)`, formatCurrencyFull(gstAmt), ''] : null,
            ].filter(Boolean).map((r,i)=>r&&(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:r[2]||'var(--gray-600)', marginBottom:4 }}>
                <span>{r[0]}</span><span>{r[1]}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:700, borderTop:'1px solid var(--gray-300)', paddingTop:8, marginTop:4 }}>
              <span>Total</span><span>{formatCurrencyFull(finalAmt)}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>{validRows.length} item{validRows.length!==1?'s':''}{shop?.gst_number?` · GST: ${shop.gst_number}`:''}</div>
          </div>
        </div>
        <div style={{ padding:'12px 14px', borderTop:'1px solid var(--gray-200)', flexShrink:0 }}>
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }} onClick={handleCheckout} disabled={loading||validRows.length===0}>
            {loading?<><span className="spinner" style={{ width:15, height:15 }}/> Processing…</>:`✓ Confirm — ${formatCurrencyFull(finalAmt)}`}
          </button>
        </div>
      </div>
      {doneInvoice && <InvoiceModal invoice={doneInvoice} onClose={()=>setDoneInvoice(null)}/>}
    </div>
  );
}
