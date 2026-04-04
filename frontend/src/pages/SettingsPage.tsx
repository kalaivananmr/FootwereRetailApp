import { useEffect, useRef, useState } from 'react';
import { shopApi, logoApi, staffApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils';
import type { Shop, StaffMember } from '../types';

export default function SettingsPage() {
  const { user, shop: storeShop, updateShop } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [form, setForm] = useState({ name:'', address:'', gst_number:'', phone:'' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Staff modal state
  const [staffModal, setStaffModal] = useState<'add'|'edit'|'password'|null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember|null>(null);
  const [staffForm, setStaffForm] = useState({ name:'', phone:'', role:'staff', password:'' });
  const [newPassword, setNewPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);

  // Own password
  const [myPwForm, setMyPwForm] = useState({ current:'', next:'', confirm:'' });
  const [myPwMsg, setMyPwMsg] = useState('');
  const [myPwErr, setMyPwErr] = useState('');

  const reload = async () => {
    const [s, st] = await Promise.all([shopApi.get(), staffApi.list()]);
    setShop(s); setForm({ name:s.name, address:s.address, gst_number:s.gst_number, phone:s.phone }); setStaff(st);
  };

  useEffect(() => {
    document.title='Settings — SmartFoot';
    const el=document.getElementById('page-title'); if(el) el.textContent='Settings';
    reload();
  }, []);

  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}));

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaved(false);
    try {
      const updated = await shopApi.update(form);
      setShop(updated); updateShop(updated);
      setSaved(true); setTimeout(()=>setSaved(false),2500);
    } finally { setSaving(false); }
  };

  const handleLogoChange = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    if(file.size > 2*1024*1024) { setLogoMsg('File too large — max 2MB'); return; }
    setLogoUploading(true); setLogoMsg('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = reader.result as string;
        await logoApi.upload(data);
        const updated = await shopApi.get();
        setShop(updated); updateShop(updated);
        setLogoMsg('✅ Logo uploaded!');
      } catch { setLogoMsg('Upload failed'); }
      finally { setLogoUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = async () => {
    if(!confirm('Remove logo?')) return;
    await logoApi.delete();
    const updated = await shopApi.get();
    setShop(updated); updateShop(updated); setLogoMsg('Logo removed');
  };

  const openAddStaff = () => { setStaffForm({name:'',phone:'',role:'staff',password:''}); setStaffError(''); setStaffModal('add'); };
  const openEditStaff = (s:StaffMember) => { setSelectedStaff(s); setStaffForm({name:s.name,phone:s.phone,role:s.role,password:''}); setStaffError(''); setStaffModal('edit'); };
  const openChangePw = (s:StaffMember) => { setSelectedStaff(s); setNewPassword(''); setStaffError(''); setStaffModal('password'); };

  const handleStaffSave = async () => {
    setStaffError(''); setStaffSaving(true);
    try {
      if(staffModal==='add') {
        if(!staffForm.name||!staffForm.phone||!staffForm.password) { setStaffError('All fields required'); setStaffSaving(false); return; }
        await staffApi.add(staffForm);
      } else if(staffModal==='edit' && selectedStaff) {
        await staffApi.update(selectedStaff.id, { name:staffForm.name, phone:staffForm.phone, role:staffForm.role });
      } else if(staffModal==='password' && selectedStaff) {
        if(newPassword.length<6) { setStaffError('Min 6 characters'); setStaffSaving(false); return; }
        await staffApi.changePassword(selectedStaff.id, newPassword);
      }
      await reload(); setStaffModal(null);
    } catch(err:unknown) {
      const e=err as {response?:{data?:{error?:string}}};
      setStaffError(e?.response?.data?.error||'Failed');
    } finally { setStaffSaving(false); }
  };

  const handleDeactivate = async (s:StaffMember) => {
    if(!confirm(`Deactivate ${s.name}? They will no longer be able to log in.`)) return;
    await staffApi.deactivate(s.id); await reload();
  };

  const handleMyPassword = async (e:React.FormEvent) => {
    e.preventDefault(); setMyPwMsg(''); setMyPwErr('');
    if(myPwForm.next!==myPwForm.confirm) { setMyPwErr('Passwords do not match'); return; }
    if(myPwForm.next.length<6) { setMyPwErr('Min 6 characters'); return; }
    try {
      await staffApi.changeMyPassword(myPwForm.current, myPwForm.next);
      setMyPwMsg('✅ Password changed!'); setMyPwForm({current:'',next:'',confirm:''});
    } catch(err:unknown) {
      const e=err as {response?:{data?:{error?:string}}};
      setMyPwErr(e?.response?.data?.error||'Failed');
    }
  };

  return (
    <div style={{ maxWidth:700 }}>

      {/* Logo */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><span className="card-title">Shop Logo</span></div>
        <div className="card-body">
          <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <div style={{ width:90, height:90, borderRadius:12, border:'2px dashed var(--gray-300)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'var(--gray-50)', flexShrink:0 }}>
              {shop?.logo_data
                ? <img src={shop.logo_data} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                : <span style={{ fontSize:11, color:'var(--gray-400)', textAlign:'center', padding:8 }}>No logo</span>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:'var(--gray-600)', marginBottom:10 }}>
                Upload your shop logo. Shown in sidebar and on invoices.<br/>
                <span style={{ fontSize:11, color:'var(--gray-400)' }}>Supports JPG, PNG, SVG · Max 2MB</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display:'none' }}/>
                <button className="btn btn-primary btn-sm" onClick={()=>fileRef.current?.click()} disabled={logoUploading}>
                  {logoUploading?'Uploading...':'📁 Browse & Upload'}
                </button>
                {shop?.logo_data && (
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteLogo}>🗑️ Remove Logo</button>
                )}
              </div>
              {logoMsg && <div style={{ marginTop:8, fontSize:12, color:logoMsg.startsWith('✅')?'var(--green)':'var(--red)' }}>{logoMsg}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Shop Profile */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><span className="card-title">Shop Profile</span></div>
        <div className="card-body">
          {saved && <div className="alert alert-success">✅ Settings saved</div>}
          <form onSubmit={handleSave}>
            <div className="form-group"><label className="form-label">Shop Name</label><input className="form-input" value={form.name} onChange={set('name')} required/></div>
            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={set('address')}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">GST Number</label><input className="form-input" value={form.gst_number} onChange={set('gst_number')} placeholder="22AABCU9603R1ZV"/></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={set('phone')}/></div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
          </form>
        </div>
      </div>

      {/* Staff */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <span className="card-title">Staff Management</span>
          {user?.role==='owner' && <button className="btn btn-primary btn-sm" onClick={openAddStaff}>+ Add Staff</button>}
        </div>
        <div className="card-body">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th>{user?.role==='owner'&&<th>Actions</th>}</tr></thead>
            <tbody>
              {staff.map(s=>(
                <tr key={s.id}>
                  <td style={{ fontWeight:500 }}>{s.name}{s.id===user?.id&&<span className="badge badge-blue" style={{ marginLeft:6, fontSize:10 }}>You</span>}</td>
                  <td>{s.phone}</td>
                  <td><span className={`badge ${s.role==='owner'?'badge-green':'badge-blue'}`} style={{ textTransform:'capitalize' }}>{s.role}</span></td>
                  <td><span className={`badge ${s.is_active?'badge-green':'badge-red'}`}>{s.is_active?'Active':'Inactive'}</span></td>
                  <td style={{ fontSize:12, color:'var(--gray-500)' }}>{formatDate(s.created_at)}</td>
                  {user?.role==='owner' && (
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEditStaff(s)}>Edit</button>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openChangePw(s)}>🔑 Pwd</button>
                        {s.id!==user.id && s.is_active===1 && <button className="btn btn-danger btn-sm" onClick={()=>handleDeactivate(s)}>Disable</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change own password */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><span className="card-title">Change My Password</span></div>
        <div className="card-body">
          {myPwMsg && <div className="alert alert-success">{myPwMsg}</div>}
          {myPwErr && <div className="alert alert-error">{myPwErr}</div>}
          <form onSubmit={handleMyPassword}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" value={myPwForm.current} onChange={e=>setMyPwForm(f=>({...f,current:e.target.value}))} required/></div>
              <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" value={myPwForm.next} onChange={e=>setMyPwForm(f=>({...f,next:e.target.value}))} required minLength={6}/></div>
            </div>
            <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-input" type="password" value={myPwForm.confirm} onChange={e=>setMyPwForm(f=>({...f,confirm:e.target.value}))} required/></div>
            <button type="submit" className="btn btn-primary">Update Password</button>
          </form>
        </div>
      </div>

      {/* App info */}
      <div className="card">
        <div className="card-header"><span className="card-title">App Info</span></div>
        <div className="card-body" style={{ fontSize:13, color:'var(--gray-600)', lineHeight:2.2 }}>
          <div><strong>Shop ID:</strong> {shop?.id}</div>
          <div><strong>Version:</strong> SmartFoot Retail v2.0.0</div>
          <div><strong>Logged in as:</strong> {user?.name} ({user?.role})</div>
        </div>
      </div>

      {/* Staff add/edit modal */}
      {(staffModal==='add'||staffModal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setStaffModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{staffModal==='add'?'Add Staff':'Edit Staff'}</span>
              <button className="modal-close" onClick={()=>setStaffModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {staffError && <div className="alert alert-error">{staffError}</div>}
              <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={staffForm.name} onChange={e=>setStaffForm(f=>({...f,name:e.target.value}))} required/></div>
              <div className="form-group"><label className="form-label">Phone Number *</label><input className="form-input" value={staffForm.phone} onChange={e=>setStaffForm(f=>({...f,phone:e.target.value}))} required/></div>
              <div className="form-group"><label className="form-label">Role</label>
                <select className="form-select" value={staffForm.role} onChange={e=>setStaffForm(f=>({...f,role:e.target.value}))}>
                  <option value="staff">Staff</option><option value="accountant">Accountant</option><option value="owner">Owner</option>
                </select>
              </div>
              {staffModal==='add' && <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={staffForm.password} onChange={e=>setStaffForm(f=>({...f,password:e.target.value}))} minLength={6} required/></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setStaffModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStaffSave} disabled={staffSaving}>{staffSaving?'Saving...':staffModal==='add'?'Add Staff':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Change staff password modal */}
      {staffModal==='password' && selectedStaff && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setStaffModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Change Password — {selectedStaff.name}</span>
              <button className="modal-close" onClick={()=>setStaffModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {staffError && <div className="alert alert-error">{staffError}</div>}
              <div className="form-group"><label className="form-label">New Password *</label><input className="form-input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={6} autoFocus/></div>
              <div style={{ fontSize:12, color:'var(--gray-400)' }}>Min 6 characters</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setStaffModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStaffSave} disabled={staffSaving}>{staffSaving?'Saving...':'Set Password'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
