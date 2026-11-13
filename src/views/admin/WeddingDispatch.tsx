import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Search, Clock, Camera, Palette, CheckCircle2, AlertTriangle, Users, RefreshCw, X, Bell, PackageCheck } from 'lucide-react';
import type { NhanVien, QuanLyRecord } from '../../types';
import { api } from '../../api';

const SERVICES = ['Chụp ảnh cưới', 'Chụp ảnh cổng', 'Ngày cưới', 'Giao album', 'Makeup ngày cưới', 'Chụp phóng sự cưới', 'Thử váy cưới'];
const STATUSES = ['Chờ xác nhận', 'Đã xác nhận', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const emptyForm = () => ({ DichVu: SERVICES[0], HopDongID: '', MaHopDong: '', KhachHang: '', SDT: '', Ngay: today(), Gio: '08:00', ThoiLuong: 180, ThoChupID: '', MakeupID: '', NguoiPhuTrachID: '', DiaDiem: '', TrangThai: 'Chờ xác nhận', GhiChu: '' });
const staffName = (staff: NhanVien[], id: string) => staff.find(x => x.NhanVienID === id)?.HoTen || 'Chưa phân công';
const dateLabel = (s: string) => s ? new Date(s + 'T00:00:00').toLocaleDateString('vi-VN') : 'Chưa có ngày';
const mins = (time: string) => { const [h,m] = String(time || '00:00').split(':').map(Number); return h*60+m; };

interface Props { staffList: NhanVien[]; currentUser: NhanVien; }
export const WeddingDispatch: React.FC<Props> = ({ staffList, currentUser }) => {
  const [records,setRecords] = useState<QuanLyRecord[]>([]);
  const [contracts,setContracts] = useState<QuanLyRecord[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [showForm,setShowForm] = useState(false);
  const [editing,setEditing] = useState<QuanLyRecord|null>(null);
  const [form,setForm] = useState<any>(emptyForm());
  const [month,setMonth] = useState(today().slice(0,7));
  const [search,setSearch] = useState('');
  const [statusFilter,setStatusFilter] = useState('Tất cả');
  const [serviceFilter,setServiceFilter] = useState('Tất cả');
  const [error,setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [events, contractRows] = await Promise.all([api.quanLy.getAll('LICH_CUOI'), api.quanLy.getAll('HOP_DONG')]);
      setRecords(events.sort((a,b) => String(a.DuLieu?.Ngay||'').localeCompare(String(b.DuLieu?.Ngay||'')) || String(a.DuLieu?.Gio||'').localeCompare(String(b.DuLieu?.Gio||''))));
      setContracts(contractRows.filter(x => !['Đã hủy','Hủy'].includes(String(x.DuLieu?.TrangThai||''))));
    } catch (e:any) { setError(e?.message || 'Không tải được lịch điều phối.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const d = r.DuLieu || {};
    const text = [d.KhachHang,d.MaHopDong,d.SDT,d.DiaDiem,staffName(staffList,d.ThoChupID),staffName(staffList,d.MakeupID)].join(' ').toLowerCase();
    return String(d.Ngay||'').startsWith(month) &&
      (statusFilter === 'Tất cả' || d.TrangThai === statusFilter) &&
      (serviceFilter === 'Tất cả' || d.DichVu === serviceFilter) &&
      (!search || text.includes(search.toLowerCase()));
  }),[records,month,statusFilter,serviceFilter,search,staffList]);

  const stats = useMemo(() => ({
    total: filtered.length,
    confirmed: filtered.filter(r => r.DuLieu?.TrangThai === 'Đã xác nhận').length,
    unassigned: filtered.filter(r => !r.DuLieu?.NguoiPhuTrachID || (['Chụp ảnh cưới','Chụp ảnh cổng','Ngày cưới','Chụp phóng sự cưới'].includes(r.DuLieu?.DichVu) && !r.DuLieu?.ThoChupID) || (['Makeup ngày cưới','Thử váy cưới'].includes(r.DuLieu?.DichVu) && !r.DuLieu?.MakeupID)).length,
    overdue: filtered.filter(r => r.DuLieu?.HanGiao && r.DuLieu.HanGiao < today() && r.DuLieu?.TrangThai !== 'Hoàn thành' && r.DuLieu?.TrangThai !== 'Đã hủy').length,
  }),[filtered]);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true); };
  const openEdit = (r: QuanLyRecord) => { setEditing(r); setForm({ ...emptyForm(), ...r.DuLieu }); setError(''); setShowForm(true); };
  const chooseContract = (id: string) => {
    const c = contracts.find(x => x.QuanLyID === id);
    setForm((old:any) => ({...old, HopDongID:id, MaHopDong:c?.DuLieu?.MaHopDong || '', KhachHang:c?.DuLieu?.KhachHang || '', SDT:c?.DuLieu?.SDT || '', NgayCuoi:c?.DuLieu?.NgayCuoi || ''}));
  };
  const validateConflict = () => {
    const selected = [form.ThoChupID, form.MakeupID].filter(Boolean);
    const start = mins(form.Gio);
    const end = start + Math.max(30,Number(form.ThoiLuong||180));
    const conflict = records.find(r => r.QuanLyID !== editing?.QuanLyID && r.DuLieu?.Ngay === form.Ngay && r.DuLieu?.TrangThai !== 'Đã hủy' && [r.DuLieu?.ThoChupID,r.DuLieu?.MakeupID].some((id:string) => selected.includes(id)) && start < mins(r.DuLieu?.Gio||'00:00') + Number(r.DuLieu?.ThoiLuong||180) && mins(r.DuLieu?.Gio||'00:00') < end);
    return conflict ? `Nhân viên đã có lịch “${conflict.DuLieu?.DichVu}” lúc ${conflict.DuLieu?.Gio} ngày ${dateLabel(form.Ngay)}.` : '';
  };
  const save = async () => {
    setError('');
    if (!form.Ngay || !form.Gio || !form.KhachHang.trim()) { setError('Vui lòng chọn ngày, giờ và nhập tên khách hàng.'); return; }
    if (form.ThoChupID && form.ThoChupID === form.MakeupID) { setError('Không thể phân công cùng một người vừa chụp vừa makeup cho cùng lịch.'); return; }
    const conflict = validateConflict();
    if (conflict) { setError(conflict); return; }
    setSaving(true);
    try {
      const payload = { ...form, ThoiLuong:Number(form.ThoiLuong||180), NguoiTaoID: currentUser.NhanVienID, NguoiTao:currentUser.HoTen, CapNhatBoi:currentUser.HoTen, CapNhatLuc:new Date().toISOString() };
      if (editing) await api.quanLy.update(editing.QuanLyID,payload);
      else await api.quanLy.create('LICH_CUOI',payload);
      setShowForm(false); setEditing(null); await load(); window.dispatchEvent(new Event('hp:notifications-refresh'));
    } catch(e:any) { setError(e?.message || 'Không lưu được lịch.'); }
    finally { setSaving(false); }
  };
  const updateStatus = async (r:QuanLyRecord, status:string) => {
    try { await api.quanLy.update(r.QuanLyID,{TrangThai:status,CapNhatBoi:currentUser.HoTen,CapNhatLuc:new Date().toISOString()}); await load(); window.dispatchEvent(new Event('hp:notifications-refresh')); }
    catch(e:any) { alert(e?.message || 'Không cập nhật được trạng thái.'); }
  };
  const dueSoon = filtered.filter(r => r.DuLieu?.TrangThai !== 'Hoàn thành' && r.DuLieu?.TrangThai !== 'Đã hủy' && r.DuLieu?.Ngay && r.DuLieu.Ngay >= today() && r.DuLieu.Ngay <= new Date(Date.now()+3*86400000).toISOString().slice(0,10));

  return <div className="space-y-5">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div><div className="text-xs uppercase tracking-[.2em] text-[#b18b50] font-bold">HẠNH PHẠM LUXURY BRIDAL</div><h1 className="text-2xl sm:text-3xl font-bold text-stone-100 mt-1">Lịch cưới & Điều phối</h1><p className="text-sm text-stone-400 mt-1">Một lịch thống nhất cho khách hàng, thợ chụp, makeup và bàn giao sản phẩm.</p></div>
      <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c5a059] text-stone-950 px-4 py-3 text-sm font-bold"><Plus size={17}/> Tạo lịch mới</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[['Lịch trong tháng',stats.total,'text-white'],['Đã xác nhận',stats.confirmed,'text-emerald-400'],['Thiếu phân công',stats.unassigned,'text-amber-400'],['Quá hạn',stats.overdue,'text-rose-400']].map(([label,value,color])=><div key={String(label)} className="rounded-2xl border border-stone-700 bg-stone-900 p-4"><div className="text-xs text-stone-400">{label}</div><div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div></div>)}
    </div>
    <div className="rounded-2xl border border-stone-700 bg-stone-900 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <label className="text-xs text-stone-400">Tháng<input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 text-white p-2.5"/></label>
      <label className="text-xs text-stone-400">Dịch vụ<select value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)} className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 text-white p-2.5"><option>Tất cả</option>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="text-xs text-stone-400">Trạng thái<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 text-white p-2.5"><option>Tất cả</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="text-xs text-stone-400 lg:col-span-2">Tìm khách / mã HĐ / nhân viên<div className="relative mt-1"><Search size={15} className="absolute left-3 top-3 text-stone-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nhập tên khách, mã hợp đồng..." className="w-full rounded-lg bg-stone-950 border border-stone-700 text-white p-2.5 pl-9"/></div></label>
    </div>
    {dueSoon.length>0 && <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 text-amber-200 text-sm flex gap-2"><Bell size={17} className="shrink-0 mt-0.5"/><div><b>{dueSoon.length} lịch trong 3 ngày tới.</b> Kiểm tra người phụ trách, giờ hẹn và địa điểm.</div></div>}
    {error && !showForm && <div className="rounded-xl bg-rose-950/40 border border-rose-800 p-3 text-rose-200 text-sm">{error}</div>}
    <div className="rounded-2xl border border-stone-700 overflow-hidden bg-stone-900">
      <div className="flex items-center justify-between p-4 border-b border-stone-700"><h2 className="font-bold text-stone-100 flex items-center gap-2"><CalendarDays size={18} className="text-[#c5a059]"/> Danh sách lịch điều phối</h2><button onClick={()=>void load()} className="text-stone-400 hover:text-white p-2" title="Tải lại"><RefreshCw size={16}/></button></div>
      {loading ? <div className="p-10 text-center text-stone-400">Đang tải lịch...</div> : filtered.length===0 ? <div className="p-10 text-center text-stone-400">Chưa có lịch trong bộ lọc này.</div> : <div className="divide-y divide-stone-800">{filtered.map(r=>{const d=r.DuLieu||{};return <div key={r.QuanLyID} className="p-4 grid grid-cols-1 lg:grid-cols-[1.1fr_1.2fr_1fr_1fr_auto] gap-3 items-center">
        <div><div className="text-xs text-[#c5a059] font-bold">{d.DichVu}</div><div className="font-bold text-white mt-1">{d.KhachHang}</div><div className="text-xs text-stone-500">{d.MaHopDong || 'Chưa liên kết hợp đồng'} · {d.SDT}</div></div>
        <div className="text-sm text-stone-300"><div className="font-semibold">{dateLabel(d.Ngay)} · {d.Gio}</div><div className="text-xs text-stone-500 mt-1">{d.DiaDiem || 'Chưa nhập địa điểm'} · {d.ThoiLuong||180} phút</div></div>
        <div className="text-xs text-stone-300 space-y-1"><div className="flex gap-1 items-center"><Camera size={13} className="text-stone-500"/> Chụp: {staffName(staffList,d.ThoChupID)}</div><div className="flex gap-1 items-center"><Palette size={13} className="text-stone-500"/> Makeup: {staffName(staffList,d.MakeupID)}</div></div>
        <div><div className="text-xs text-stone-400">Phụ trách: {staffName(staffList,d.NguoiPhuTrachID)}</div><span className={`inline-flex mt-1 rounded-full px-2 py-1 text-[10px] font-bold ${d.TrangThai==='Hoàn thành'?'bg-emerald-900 text-emerald-300':d.TrangThai==='Đã xác nhận'?'bg-sky-900 text-sky-300':d.TrangThai==='Đã hủy'?'bg-rose-900 text-rose-300':'bg-amber-900 text-amber-200'}`}>{d.TrangThai}</span></div>
        <div className="flex lg:flex-col gap-2"><button onClick={()=>openEdit(r)} className="rounded-lg border border-stone-600 px-3 py-2 text-xs text-white hover:border-[#c5a059]">Sửa</button><select value={d.TrangThai||'Chờ xác nhận'} onChange={e=>void updateStatus(r,e.target.value)} className="rounded-lg bg-stone-950 border border-stone-700 text-xs text-white px-2 py-2">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      </div>})}</div>}
    </div>
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 text-xs text-stone-400 flex gap-2"><PackageCheck size={16} className="text-[#c5a059] shrink-0"/><span>Lịch Giao album có thể nhập ngày hẹn trong trường Ngày và theo dõi trạng thái riêng. Hệ thống lưu chung với dữ liệu nghiệp vụ, không sửa hoặc thay thế hợp đồng/nhân viên hiện tại. Thông báo trong ứng dụng hoạt động; gửi Zalo cần cấu hình Zalo Official Account và quyền gửi tin phù hợp.</span></div>

    {showForm && <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"><div className="w-full max-w-3xl my-auto rounded-2xl border border-stone-700 bg-stone-950 shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-stone-800"><div><h2 className="text-lg font-bold text-white">{editing?'Cập nhật lịch dịch vụ':'Tạo lịch dịch vụ'}</h2><p className="text-xs text-stone-400">Liên kết hợp đồng có sẵn, tự điền thông tin khách hàng.</p></div><button onClick={()=>setShowForm(false)} className="p-2 text-stone-400"><X/></button></div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
        <label className="text-xs text-stone-300 sm:col-span-2">Hợp đồng<select value={form.HopDongID} onChange={e=>chooseContract(e.target.value)} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"><option value="">Không liên kết hợp đồng</option>{contracts.map(c=><option key={c.QuanLyID} value={c.QuanLyID}>{c.DuLieu?.MaHopDong} · {c.DuLieu?.KhachHang}</option>)}</select></label>
        <label className="text-xs text-stone-300">Dịch vụ<select value={form.DichVu} onChange={e=>setForm({...form,DichVu:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white">{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="text-xs text-stone-300">Tên khách hàng<input value={form.KhachHang} onChange={e=>setForm({...form,KhachHang:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white" required/></label>
        <label className="text-xs text-stone-300">Số điện thoại<input value={form.SDT} onChange={e=>setForm({...form,SDT:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
        <label className="text-xs text-stone-300">Mã hợp đồng<input value={form.MaHopDong} onChange={e=>setForm({...form,MaHopDong:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
        <label className="text-xs text-stone-300">Ngày thực hiện<input type="date" value={form.Ngay} onChange={e=>setForm({...form,Ngay:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
        <label className="text-xs text-stone-300">Giờ bắt đầu<input type="time" value={form.Gio} onChange={e=>setForm({...form,Gio:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
        <label className="text-xs text-stone-300">Thời lượng (phút)<input type="number" min="30" step="15" value={form.ThoiLuong} onChange={e=>setForm({...form,ThoiLuong:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
        <label className="text-xs text-stone-300">Thợ chụp<select value={form.ThoChupID} onChange={e=>setForm({...form,ThoChupID:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-300">Thợ makeup<select value={form.MakeupID} onChange={e=>setForm({...form,MakeupID:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-300">Người phụ trách<select value={form.NguoiPhuTrachID} onChange={e=>setForm({...form,NguoiPhuTrachID:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-300">Địa điểm<input value={form.DiaDiem} onChange={e=>setForm({...form,DiaDiem:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
        <label className="text-xs text-stone-300">Trạng thái<select value={form.TrangThai} onChange={e=>setForm({...form,TrangThai:e.target.value})} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="text-xs text-stone-300 sm:col-span-2">Ghi chú<textarea value={form.GhiChu} onChange={e=>setForm({...form,GhiChu:e.target.value})} rows={2} className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2.5 text-white"/></label>
      </div>
      {error && <div className="mx-4 rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-sm text-rose-200 flex gap-2"><AlertTriangle size={16}/>{error}</div>}
      <div className="p-4 border-t border-stone-800 flex justify-end gap-2"><button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg text-stone-300">Hủy</button><button disabled={saving} onClick={()=>void save()} className="px-5 py-2 rounded-lg bg-[#c5a059] text-stone-950 font-bold disabled:opacity-50">{saving?'Đang lưu...':'Lưu lịch'}</button></div>
    </div></div>}
  </div>;
};
