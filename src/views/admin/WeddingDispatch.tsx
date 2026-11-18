import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Search, Clock, Camera, Palette, AlertTriangle, Users, RefreshCw, X, Bell, PackageCheck, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import type { NhanVien, QuanLyRecord } from '../../types';
import { api } from '../../api';

const SERVICES = ['Trọn gói một ngày cưới', 'Trọn gói 2 ngày cưới', 'Trọn gói đính hôn - nhà thờ - rước dâu', 'Chụp cổng cưới', 'Chụp hình tiệc cưới', 'Quay phim cưới', 'Thử váy cưới', 'Chụp hình cổng cưới'];
const STATUSES = ['Chờ xác nhận', 'Đã xác nhận', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const emptyForm = () => ({ DichVu: SERVICES[0], HopDongID: '', MaHopDong: '', KhachHang: '', SDT: '', TenCoDau: '', TenChuRe: '', SDTCoDau: '', SDTChuRe: '', DiaChiNhaGai: '', DiaChiNhaTrai: '', NgayCuoiNhaGai: '', NgayCuoiNhaTrai: '', GoiDichVu: '', ChupCong: [], ChupTiecCuoi: [], QuayPhimCuoi: [], Ngay: today(), Gio: '08:00', ThoiLuong: 180, ThoChupID: '', MakeupID: '', ThoQuayID: '', NguoiPhuTrachID: '', DiaDiem: '', Concept: '', TrangThai: 'Chờ xác nhận', GhiChu: '' });
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
  const [customService,setCustomService] = useState('');
  const [showCustomService,setShowCustomService] = useState(false);
  const [extraServices,setExtraServices] = useState<string[]>([]);
  const [month,setMonth] = useState(today().slice(0,7));
  const [search,setSearch] = useState('');
  const [statusFilter,setStatusFilter] = useState('Tất cả');
  const [serviceFilter,setServiceFilter] = useState('Tất cả');
  const [selectedDay,setSelectedDay] = useState<string|null>(null);
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

  const visibleRecords = useMemo(() => filtered.filter(r => !selectedDay || r.DuLieu?.Ngay === selectedDay), [filtered, selectedDay]);
  const calendarCells = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    if (!year || !monthNumber) return [] as Array<{date:string; day:number}>;
    const first = new Date(year, monthNumber - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(year, monthNumber, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({length:count}, (_,i) => ({date:month+'-'+String(i+1).padStart(2,'0'), day:i+1}))];
  }, [month]);
  const stats = useMemo(() => ({
    total: filtered.length,
    confirmed: filtered.filter(r => r.DuLieu?.TrangThai === 'Đã xác nhận').length,
    unassigned: filtered.filter(r => !r.DuLieu?.NguoiPhuTrachID || (['Chụp ảnh cưới','Chụp ảnh cổng','Ngày cưới','Chụp phóng sự cưới'].includes(r.DuLieu?.DichVu) && !r.DuLieu?.ThoChupID) || (['Makeup ngày cưới','Thử váy cưới'].includes(r.DuLieu?.DichVu) && !r.DuLieu?.MakeupID)).length,
    overdue: filtered.filter(r => r.DuLieu?.HanGiao && r.DuLieu.HanGiao < today() && r.DuLieu?.TrangThai !== 'Hoàn thành' && r.DuLieu?.TrangThai !== 'Đã hủy').length,
  }),[filtered]);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setCustomService(''); setShowCustomService(false); setError(''); setShowForm(true); };
  const openEdit = (r: QuanLyRecord) => { setEditing(r); setForm({ ...emptyForm(), ...r.DuLieu }); setCustomService(''); setShowCustomService(false); setError(''); setShowForm(true); };
  const chooseContract = (id: string) => {
    const c = contracts.find(x => x.QuanLyID === id);
    const d = c?.DuLieu || {};
    const coupleName = [d.TenCoDau, d.TenChuRe].filter(Boolean).join(' & ') || d.KhachHang || '';
    setForm((old:any) => ({
      ...old, HopDongID:id, MaHopDong:d.MaHopDong || '', KhachHang:coupleName, SDT:d.SDTCoDau || d.SDT || '',
      TenCoDau:d.TenCoDau || '', TenChuRe:d.TenChuRe || '', SDTCoDau:d.SDTCoDau || '', SDTChuRe:d.SDTChuRe || '',
      DiaChiNhaGai:d.DiaChiNhaGai || '', DiaChiNhaTrai:d.DiaChiNhaTrai || '',
      NgayCuoiNhaGai:d.NgayCuoiNhaGai || '', NgayCuoiNhaTrai:d.NgayCuoiNhaTrai || '', GoiDichVu:d.GoiDichVu || '',
      ChupCong:Array.isArray(d.ChupCong) ? d.ChupCong : [], ChupTiecCuoi:Array.isArray(d.ChupTiecCuoi) ? d.ChupTiecCuoi : [],
      QuayPhimCuoi:Array.isArray(d.QuayPhimCuoi) ? d.QuayPhimCuoi : [],
      Ngay:d.NgayCuoiNhaGai || d.NgayCuoiNhaTrai || d.NgayCuoi || old.Ngay,
      DiaDiem:d.DiaChiNhaGai || d.DiaChi || old.DiaDiem, GhiChu:d.GhiChu || old.GhiChu,
    }));
  };
  const assignedStaffIds = (data:any) => Array.from(new Set([data?.ThoChupID, data?.MakeupID, data?.ThoQuayID, data?.NguoiPhuTrachID].filter((id): id is string => Boolean(id))));
  const validateConflict = () => {
    const roleStaff = [form.ThoChupID, form.MakeupID, form.ThoQuayID].filter(Boolean);
    const selected = assignedStaffIds(form);
    if (new Set(roleStaff).size !== roleStaff.length) return 'Một nhân viên không thể vừa chụp, makeup hoặc quay phim trong cùng một công việc.';
    const start = mins(form.Gio);
    const end = start + Math.max(30, Number(form.ThoiLuong || 180));
    const normalizePlace = (value:string) => String(value || '').trim().toLocaleLowerCase('vi');
    const conflict = records.find(r => {
      if (r.QuanLyID === editing?.QuanLyID || r.DuLieu?.Ngay !== form.Ngay || ['Đã hủy','Hủy'].includes(String(r.DuLieu?.TrangThai || ''))) return false;
      if (!assignedStaffIds(r.DuLieu).some(id => selected.includes(id))) return false;
      const otherStart = mins(r.DuLieu?.Gio || '00:00');
      const otherEnd = otherStart + Math.max(30, Number(r.DuLieu?.ThoiLuong || 180));
      const samePlace = normalizePlace(form.DiaDiem) && normalizePlace(form.DiaDiem) === normalizePlace(r.DuLieu?.DiaDiem);
      const travelBuffer = samePlace ? 0 : 60;
      return start < otherEnd + travelBuffer && otherStart < end + travelBuffer;
    });
    return conflict ? 'Nhân viên đã có lịch "' + conflict.DuLieu?.DichVu + '" lúc ' + conflict.DuLieu?.Gio + ' tại ' + (conflict.DuLieu?.DiaDiem || 'địa điểm chưa rõ') + ' ngày ' + dateLabel(form.Ngay) + '. Cần chừa tối thiểu 60 phút di chuyển khi khác địa điểm.' : '';
  };
  const save = async () => {
    setError('');
    if (!form.Ngay || !form.Gio || !form.KhachHang.trim()) { setError('Vui lòng chọn ngày, giờ và nhập tên khách hàng.'); return; }
    if (form.TrangThai === 'Đã xác nhận') {
      const service = String(form.DichVu || '').toLocaleLowerCase('vi');
      if (!form.NguoiPhuTrachID) { setError('Cần chọn người phụ trách trước khi xác nhận lịch.'); return; }
      if ((service.includes('chụp') || service.includes('album') || service.includes('ảnh')) && !form.ThoChupID) { setError('Dịch vụ chụp ảnh cần có thợ chụp trước khi xác nhận.'); return; }
      if (service.includes('makeup') && !form.MakeupID) { setError('Dịch vụ makeup cần có nhân viên makeup trước khi xác nhận.'); return; }
      if (service.includes('quay phim') && !form.ThoQuayID) { setError('Dịch vụ quay phim cần có thợ quay trước khi xác nhận.'); return; }
    }
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
  const nextStaffStatus = (status:string) => status === 'Chờ xác nhận' ? 'Đã xác nhận' : status === 'Đã xác nhận' ? 'Đang thực hiện' : status === 'Đang thực hiện' ? 'Hoàn thành' : '';
  const dueSoon = filtered.filter(r => r.DuLieu?.TrangThai !== 'Hoàn thành' && r.DuLieu?.TrangThai !== 'Đã hủy' && r.DuLieu?.Ngay && r.DuLieu.Ngay >= today() && r.DuLieu.Ngay <= new Date(Date.now()+3*86400000).toISOString().slice(0,10));

  return <div className="space-y-5">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div><div className="text-xs uppercase tracking-[.2em] text-[#b18b50] font-bold">HẠNH PHẠM LUXURY BRIDAL</div><h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">Lịch cưới & Điều phối</h1><p className="text-sm text-stone-500 mt-1">Một lịch thống nhất cho khách hàng, thợ chụp, makeup và bàn giao sản phẩm.</p></div>
      {currentUser.Quyen === 'Admin' && <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c5a059] text-stone-950 px-4 py-3 text-sm font-bold"><Plus size={17}/> Tạo lịch mới</button>}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[['Lịch trong tháng',stats.total,'text-stone-900'],['Đã xác nhận',stats.confirmed,'text-emerald-400'],['Thiếu phân công',stats.unassigned,'text-amber-400'],['Quá hạn',stats.overdue,'text-rose-400']].map(([label,value,color])=><div key={String(label)} className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><div className="text-xs text-stone-500">{label}</div><div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div></div>)}
    </div>
    <div className="rounded-2xl border border-[#E7DFD5] bg-white p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <label className="text-xs text-stone-500">Tháng<input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] text-stone-900 p-2.5"/></label>
      <label className="text-xs text-stone-500">Dịch vụ<select value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] text-stone-900 p-2.5"><option>Tất cả</option>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="text-xs text-stone-500">Trạng thái<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] text-stone-900 p-2.5"><option>Tất cả</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="text-xs text-stone-500 lg:col-span-2">Tìm khách / mã HĐ / nhân viên<div className="relative mt-1"><Search size={15} className="absolute left-3 top-3 text-stone-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nhập tên khách, mã hợp đồng..." className="w-full rounded-lg bg-white border border-[#E7DFD5] text-stone-900 p-2.5 pl-9"/></div></label>
    </div>
    <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div><h2 className="font-bold text-stone-900">Lịch trực quan theo tháng</h2><p className="text-xs text-stone-500 mt-1">Chọn ngày để lọc các lịch đã đặt.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={()=>{const p=month.split('-').map(Number);const d=new Date(p[0],p[1]-2,1);setMonth(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));setSelectedDay(null);}} className="p-2 rounded-lg border border-[#E7DFD5] text-stone-600" aria-label="Tháng trước"><ChevronLeft size={17}/></button>
          <button onClick={()=>setSelectedDay(null)} className="text-xs font-semibold text-[#a97d3e]">Tất cả ngày</button>
          <button onClick={()=>{const p=month.split('-').map(Number);const d=new Date(p[0],p[1],1);setMonth(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));setSelectedDay(null);}} className="p-2 rounded-lg border border-[#E7DFD5] text-stone-600" aria-label="Tháng sau"><ChevronRight size={17}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['T2','T3','T4','T5','T6','T7','CN'].map(day=><div key={day} className="text-center text-[11px] font-semibold text-stone-500 py-1">{day}</div>)}
        {calendarCells.map((cell,index)=>cell ? <button key={cell.date} onClick={()=>setSelectedDay(old=>old===cell.date?null:cell.date)} className={`min-h-[54px] sm:min-h-[68px] rounded-lg border p-1 text-left transition ${selectedDay===cell.date?'border-[#c5a059] bg-[#FBF5E9] ring-1 ring-[#c5a059]':'border-[#EEE7DE] bg-[#FFFEFC] hover:border-[#c5a059]'}`}>
          <span className="text-xs font-semibold text-stone-800">{cell.day}</span>
          {(()=>{const count=filtered.filter(r=>r.DuLieu?.Ngay===cell.date).length;return count>0?<span className="mt-1 block rounded-md bg-[#F3E8D4] text-[#805D2D] text-[10px] font-bold px-1 py-0.5">{count} lịch</span>:null;})()}
        </button>:<div key={'blank-'+index} className="min-h-[54px] sm:min-h-[68px]"/>)}
      </div>
      {selectedDay && <div className="text-xs text-[#8A642F] font-semibold">Đang lọc ngày {dateLabel(selectedDay)} · {visibleRecords.length} công việc</div>}
    </div>
    {dueSoon.length>0 && <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 text-amber-200 text-sm flex gap-2"><Bell size={17} className="shrink-0 mt-0.5"/><div><b>{dueSoon.length} lịch trong 3 ngày tới.</b> Kiểm tra người phụ trách, giờ hẹn và địa điểm.</div></div>}
    {error && !showForm && <div className="rounded-xl bg-rose-950/40 border border-rose-800 p-3 text-rose-200 text-sm">{error}</div>}
    <div className="rounded-2xl border border-[#E7DFD5] overflow-hidden bg-white">
      <div className="flex items-center justify-between p-4 border-b border-[#E7DFD5]"><h2 className="font-bold text-stone-900 flex items-center gap-2"><CalendarDays size={18} className="text-[#c5a059]"/> Danh sách lịch điều phối</h2><button onClick={()=>void load()} className="text-stone-500 hover:text-stone-900 p-2" title="Tải lại"><RefreshCw size={16}/></button></div>
      {loading ? <div className="p-10 text-center text-stone-500">Đang tải lịch...</div> : visibleRecords.length===0 ? <div className="p-10 text-center text-stone-500">Chưa có lịch trong bộ lọc này.</div> : <div className="divide-y divide-[#EEE7DE]">{visibleRecords.map(r=>{const d=r.DuLieu||{};return <div key={r.QuanLyID} className="p-4 grid grid-cols-1 lg:grid-cols-[1.1fr_1.2fr_1fr_1fr_auto] gap-3 items-center">
        <div><div className="text-xs text-[#c5a059] font-bold">{d.DichVu}</div><div className="font-bold text-stone-900 mt-1">{d.KhachHang}</div><div className="text-xs text-stone-500">{d.MaHopDong || 'Chưa liên kết hợp đồng'} · {d.SDT}</div></div>
        <div className="text-sm text-stone-700"><div className="font-semibold">{dateLabel(d.Ngay)} · {d.Gio}</div><div className="text-xs text-stone-500 mt-1">{d.DiaDiem || 'Chưa nhập địa điểm'} · {d.ThoiLuong||180} phút</div></div>
        <div className="text-xs text-stone-700 space-y-1"><div className="flex gap-1 items-center"><Camera size={13} className="text-stone-500"/> Chụp: {staffName(staffList,d.ThoChupID)}</div><div className="flex gap-1 items-center"><Palette size={13} className="text-stone-500"/> Makeup: {staffName(staffList,d.MakeupID)}</div><div className="flex gap-1 items-center"><Video size={13} className="text-stone-500"/> Quay: {staffName(staffList,d.ThoQuayID)}</div></div>
        <div><div className="text-xs text-stone-500">Phụ trách: {staffName(staffList,d.NguoiPhuTrachID)}</div><span className={`inline-flex mt-1 rounded-full px-2 py-1 text-[10px] font-bold ${d.TrangThai==='Hoàn thành'?'bg-emerald-900 text-emerald-300':d.TrangThai==='Đã xác nhận'?'bg-sky-900 text-sky-300':d.TrangThai==='Đã hủy'?'bg-rose-900 text-rose-300':'bg-amber-900 text-amber-200'}`}>{d.TrangThai}</span></div>
        <div className="flex lg:flex-col gap-2">{currentUser.Quyen === 'Admin' ? <><button onClick={()=>openEdit(r)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-800 hover:border-[#c5a059]">Sửa</button><select value={d.TrangThai||'Chờ xác nhận'} onChange={e=>void updateStatus(r,e.target.value)} className="rounded-lg bg-white border border-[#E7DFD5] text-xs text-stone-900 px-2 py-2">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></> : [d.ThoChupID,d.MakeupID,d.ThoQuayID,d.NguoiPhuTrachID].map(String).includes(currentUser.NhanVienID) && nextStaffStatus(String(d.TrangThai||'Chờ xác nhận')) ? <button onClick={()=>void updateStatus(r,nextStaffStatus(String(d.TrangThai||'Chờ xác nhận')))} className="rounded-lg bg-[#c5a059] px-3 py-2 text-xs font-bold text-stone-950">{d.TrangThai==='Chờ xác nhận'?'Xác nhận lịch':d.TrangThai==='Đã xác nhận'?'Bắt đầu thực hiện':'Báo hoàn thành'}</button> : <span className="text-[11px] text-stone-400">Chỉ xem</span>}</div>
      </div>})}</div>}
    </div>
    <div className="rounded-xl border border-[#E7DFD5] bg-white p-4 text-xs text-stone-500 flex gap-2"><PackageCheck size={16} className="text-[#c5a059] shrink-0"/><span>Lịch Giao album có thể nhập ngày hẹn trong trường Ngày và theo dõi trạng thái riêng. Hệ thống lưu chung với dữ liệu nghiệp vụ, không sửa hoặc thay thế hợp đồng/nhân viên hiện tại. Thông báo trong ứng dụng hoạt động; gửi Zalo cần cấu hình Zalo Official Account và quyền gửi tin phù hợp.</span></div>

    {showForm && <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"><div className="w-full max-w-3xl my-auto rounded-2xl border border-[#E7DFD5] bg-white shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-[#EEE7DE]"><div><h2 className="text-lg font-bold text-stone-900">{editing?'Cập nhật lịch dịch vụ':'Tạo lịch dịch vụ'}</h2><p className="text-xs text-stone-500">Liên kết hợp đồng có sẵn, tự điền thông tin khách hàng.</p></div><button onClick={()=>setShowForm(false)} className="p-2 text-stone-500"><X/></button></div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
        <label className="text-xs text-stone-700 sm:col-span-2">Hợp đồng<select value={form.HopDongID} onChange={e=>chooseContract(e.target.value)} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"><option value="">Không liên kết hợp đồng</option>{contracts.map(c=><option key={c.QuanLyID} value={c.QuanLyID}>{c.DuLieu?.MaHopDong} · {c.DuLieu?.TenCoDau || c.DuLieu?.KhachHang}{c.DuLieu?.TenChuRe ? ' & '+c.DuLieu.TenChuRe : ''}</option>)}</select></label>
        {form.HopDongID && <div className="sm:col-span-2 rounded-xl border border-[#E7DFD5] bg-[#FFFEFC] p-3 text-xs text-stone-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><b>Cô dâu:</b> {form.TenCoDau || 'Chưa nhập'} · {form.SDTCoDau || 'Chưa có SĐT'}</div>
          <div><b>Chú rể:</b> {form.TenChuRe || 'Chưa nhập'} · {form.SDTChuRe || 'Chưa có SĐT'}</div>
          <div><b>Nhà gái:</b> {form.DiaChiNhaGai || 'Chưa nhập'} · {form.NgayCuoiNhaGai || 'Chưa có ngày'}</div>
          <div><b>Nhà trai:</b> {form.DiaChiNhaTrai || 'Chưa nhập'} · {form.NgayCuoiNhaTrai || 'Chưa có ngày'}</div>
          <div className="sm:col-span-2"><b>Gói dịch vụ:</b> {form.GoiDichVu || 'Chưa nhập'}</div>
        </div>}
        <label className="text-xs text-stone-700">Dịch vụ<select value={form.DichVu} onChange={e=>setForm({...form,DichVu:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900">{[...SERVICES,...extraServices,...(form.DichVu && ![...SERVICES,...extraServices].includes(form.DichVu) ? [form.DichVu] : [])].map(s=><option key={s}>{s}</option>)}</select><button type="button" onClick={()=>setShowCustomService(v=>!v)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#c5a059]/60 px-3 py-2 text-xs font-semibold text-[#d8b875]"><Plus size={14}/> Thêm Mới</button>{showCustomService && <div className="mt-2 flex gap-2"><input value={customService} onChange={e=>setCustomService(e.target.value)} placeholder="Nhập tên dịch vụ riêng..." className="min-w-0 flex-1 rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/><button type="button" onClick={()=>{const name=customService.trim();if(!name)return;setExtraServices(old=>old.includes(name)?old:[...old,name]);setForm((old:any)=>({...old,DichVu:name}));setCustomService('');setShowCustomService(false);}} className="rounded-lg bg-[#c5a059] px-3 py-2 text-xs font-bold text-stone-950">Áp dụng</button></div>}</label>
        <label className="text-xs text-stone-700">Tên khách hàng<input value={form.KhachHang} onChange={e=>setForm({...form,KhachHang:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900" required/></label>
        <label className="text-xs text-stone-700">Số điện thoại<input value={form.SDT} onChange={e=>setForm({...form,SDT:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Mã hợp đồng<input value={form.MaHopDong} onChange={e=>setForm({...form,MaHopDong:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Ngày thực hiện<input type="date" value={form.Ngay} onChange={e=>setForm({...form,Ngay:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Giờ bắt đầu<input type="time" value={form.Gio} onChange={e=>setForm({...form,Gio:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Thời lượng (phút)<input type="number" min="30" step="15" value={form.ThoiLuong} onChange={e=>setForm({...form,ThoiLuong:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Thợ chụp<select value={form.ThoChupID} onChange={e=>setForm({...form,ThoChupID:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-700">Thợ makeup<select value={form.MakeupID} onChange={e=>setForm({...form,MakeupID:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-700">Thợ quay phim<select value={form.ThoQuayID} onChange={e=>setForm({...form,ThoQuayID:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-700">Concept chụp<input value={form.Concept} onChange={e=>setForm({...form,Concept:e.target.value})} placeholder="Ví dụ: Hàn Quốc, cổ điển, ngoài trời..." className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Người phụ trách<select value={form.NguoiPhuTrachID} onChange={e=>setForm({...form,NguoiPhuTrachID:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs text-stone-700">Địa điểm<input value={form.DiaDiem} onChange={e=>setForm({...form,DiaDiem:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
        <label className="text-xs text-stone-700">Trạng thái<select value={form.TrangThai} onChange={e=>setForm({...form,TrangThai:e.target.value})} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="text-xs text-stone-700 sm:col-span-2">Ghi chú<textarea value={form.GhiChu} onChange={e=>setForm({...form,GhiChu:e.target.value})} rows={2} className="mt-1 w-full rounded-lg bg-white border border-[#E7DFD5] p-2.5 text-stone-900"/></label>
      </div>
      {error && <div className="mx-4 rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-sm text-rose-200 flex gap-2"><AlertTriangle size={16}/>{error}</div>}
      <div className="p-4 border-t border-[#EEE7DE] flex justify-end gap-2"><button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg text-stone-700">Hủy</button><button disabled={saving} onClick={()=>void save()} className="px-5 py-2 rounded-lg bg-[#c5a059] text-stone-950 font-bold disabled:opacity-50">{saving?'Đang lưu...':'Lưu lịch'}</button></div>
    </div></div>}
  </div>;
};
