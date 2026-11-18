import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Plus, Search, CalendarDays, UserRound, Pencil, X } from 'lucide-react';
import type { NhanVien, QuanLyRecord } from '../../types';
import { api } from '../../api';

const STATUSES = ['Chờ phân công', 'Đã giao', 'Đã xác nhận', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const blankForm = () => ({ TieuDe:'', MoTa:'', Han:today(), NgayBatDau:today(), GioBatDau:'08:30', GioKetThuc:'17:30', MucDo:'Trung bình', NhanVienID:'', HopDongID:'', TrangThai:'Chờ phân công', GhiChu:'' });
const dateText = (value:string) => value ? new Date(value+'T00:00:00').toLocaleDateString('vi-VN') : 'Chưa đặt hạn';
const statusClass = (status:string) => status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700' : status === 'Đã hủy' ? 'bg-rose-50 text-rose-700' : status === 'Đang thực hiện' ? 'bg-sky-50 text-sky-700' : status === 'Đã xác nhận' ? 'bg-violet-50 text-violet-700' : status === 'Đã giao' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600';
const priorityClass = (priority:string) => priority === 'Khẩn cấp' ? 'text-rose-700 bg-rose-50' : priority === 'Cao' ? 'text-orange-700 bg-orange-50' : priority === 'Thấp' ? 'text-stone-600 bg-stone-100' : 'text-amber-700 bg-amber-50';

interface Props { staffList: NhanVien[]; currentUser: NhanVien; onRefresh?: () => void; }
export const TaskManagement: React.FC<Props> = ({ staffList, currentUser, onRefresh }) => {
  const isAdmin = currentUser.Quyen === 'Admin';
  const [tasks,setTasks] = useState<QuanLyRecord[]>([]);
  const [contracts,setContracts] = useState<QuanLyRecord[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [query,setQuery] = useState('');
  const [statusFilter,setStatusFilter] = useState('Tất cả');
  const [priorityFilter,setPriorityFilter] = useState('Tất cả');
  const [showForm,setShowForm] = useState(false);
  const [editing,setEditing] = useState<QuanLyRecord|null>(null);
  const [form,setForm] = useState<any>(blankForm());
  const [selected,setSelected] = useState<QuanLyRecord|null>(null);
  const [error,setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rows, contractRows] = await Promise.all([
        api.quanLy.getAll('CONG_VIEC'),
        api.quanLy.getAll('HOP_DONG').catch(() => [] as QuanLyRecord[]),
      ]);
      setTasks(rows.sort((a,b) => String(a.DuLieu?.Han||'').localeCompare(String(b.DuLieu?.Han||'')) || String(b.CapNhatLuc||'').localeCompare(String(a.CapNhatLuc||''))));
      setContracts(contractRows);
    } catch (e:any) { setError(e?.message || 'Không tải được danh sách công việc.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => tasks.filter(task => {
    const d=task.DuLieu||{};
    const assigned = staffList.find(s=>s.NhanVienID===d.NhanVienID)?.HoTen || d.NhanVien || '';
    const haystack=[d.TieuDe,d.MoTa,d.GhiChu,d.MaHopDong,d.HopDongID,assigned].join(' ').toLocaleLowerCase('vi');
    return (statusFilter==='Tất cả' || String(d.TrangThai||'Chờ phân công')===statusFilter) &&
      (priorityFilter==='Tất cả' || String(d.MucDo||'Trung bình')===priorityFilter) &&
      (!query || haystack.includes(query.toLocaleLowerCase('vi')));
  }),[tasks,staffList,statusFilter,priorityFilter,query]);

  const stats = useMemo(() => ({
    total:tasks.length,
    assigned:tasks.filter(t=>!!t.DuLieu?.NhanVienID && !['Hoàn thành','Đã hủy'].includes(String(t.DuLieu?.TrangThai))).length,
    doing:tasks.filter(t=>t.DuLieu?.TrangThai==='Đang thực hiện').length,
    done:tasks.filter(t=>t.DuLieu?.TrangThai==='Hoàn thành').length,
  }),[tasks]);

  const openNew = () => { setEditing(null); setForm(blankForm()); setError(''); setShowForm(true); };
  const openEdit = (task:QuanLyRecord) => { setEditing(task); setForm({...blankForm(),...task.DuLieu}); setError(''); setShowForm(true); };
  const save = async (event:React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!String(form.TieuDe||'').trim()) { setError('Vui lòng nhập tên công việc.'); return; }
    if (form.Han && form.NgayBatDau && form.Han < form.NgayBatDau) { setError('Hạn hoàn thành không được trước ngày bắt đầu.'); return; }
    setSaving(true);
    try {
      const employee=staffList.find(s=>s.NhanVienID===form.NhanVienID);
      const linked=contracts.find(c=>c.QuanLyID===form.HopDongID);
      const payload={
        ...form,
        TieuDe:String(form.TieuDe).trim(),
        MoTa:String(form.MoTa||'').trim(),
        NhanVien:employee?.HoTen||'',
        MaHopDong:String(linked?.DuLieu?.MaHopDong||''),
        ...(editing ? {} : { NguoiTaoID:currentUser.NhanVienID, NguoiTao:currentUser.HoTen }),
        CapNhatBoi:currentUser.HoTen,
        CapNhatLuc:new Date().toISOString(),
        TrangThai:form.NhanVienID ? (form.TrangThai==='Chờ phân công'?'Đã giao':form.TrangThai) : 'Chờ phân công',
      };
      if (editing) await api.quanLy.update(editing.QuanLyID,payload);
      else await api.quanLy.create('CONG_VIEC',payload);
      setShowForm(false); setEditing(null); await load(); onRefresh?.();
      window.dispatchEvent(new Event('hp:notifications-refresh'));
    } catch(e:any) { setError(e?.message||'Không lưu được công việc.'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (task:QuanLyRecord,next:string) => {
    try {
      await api.quanLy.update(task.QuanLyID,{TrangThai:next});
      await load(); onRefresh?.();
      window.dispatchEvent(new Event('hp:notifications-refresh'));
      if (selected?.QuanLyID===task.QuanLyID) setSelected({...task,DuLieu:{...task.DuLieu,TrangThai:next}});
    } catch(e:any) { alert(e?.message||'Không cập nhật được trạng thái công việc.'); }
  };
  const employeeAction = (task:QuanLyRecord) => {
    const status=String(task.DuLieu?.TrangThai||'Đã giao');
    if (task.DuLieu?.NhanVienID!==currentUser.NhanVienID) return null;
    if (status==='Đã giao') return <button onClick={()=>void updateStatus(task,'Đã xác nhận')} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white">Xác nhận nhận việc</button>;
    if (status==='Đã xác nhận') return <button onClick={()=>void updateStatus(task,'Đang thực hiện')} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white">Bắt đầu làm</button>;
    if (status==='Đang thực hiện') return <button onClick={()=>void updateStatus(task,'Hoàn thành')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Báo hoàn thành</button>;
    return null;
  };
  const employeeName=(id:string)=>staffList.find(s=>s.NhanVienID===id)?.HoTen||'Chưa phân công';

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="text-xs font-bold uppercase tracking-[.2em] text-[#b18b50]">HẠNH PHẠM LUXURY BRIDAL</div><h1 className="mt-1 text-2xl font-bold text-stone-900">Quản lý công việc</h1><p className="mt-1 text-sm text-stone-500">Theo dõi phân công, tiến độ và hạn hoàn thành của toàn studio.</p></div>
      {isAdmin && <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c5a059] px-4 py-3 text-sm font-bold text-stone-950"><Plus size={17}/> Giao công việc mới</button>}
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[['Tổng công việc',stats.total],['Đang được giao',stats.assigned],['Đang thực hiện',stats.doing],['Đã hoàn thành',stats.done]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><div className="text-xs text-stone-500">{label}</div><div className="mt-1 text-2xl font-bold text-stone-900">{value}</div></div>)}
    </div>
    <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[#E7DFD5] bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2"><Search size={15} className="absolute left-3 top-3 text-stone-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên công việc, nhân viên, mã hợp đồng..." className="w-full rounded-lg border border-[#E7DFD5] bg-white p-2.5 pl-9 text-sm text-stone-800"/></div>
      <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-lg border border-[#E7DFD5] bg-white p-2.5 text-sm text-stone-800"><option>Tất cả</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="rounded-lg border border-[#E7DFD5] bg-white p-2.5 text-sm text-stone-800"><option>Tất cả</option>{PRIORITIES.map(s=><option key={s}>{s}</option>)}</select>
    </div>
    {error && !showForm && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {loading ? <div className="rounded-2xl border border-[#E7DFD5] bg-white p-10 text-center text-sm text-stone-500">Đang tải công việc...</div> : filtered.length===0 ? <div className="rounded-2xl border border-dashed border-[#D8C7AD] bg-white p-10 text-center"><CheckSquare className="mx-auto mb-2 text-[#b18b50]" size={28}/><p className="font-semibold text-stone-700">Chưa có công việc phù hợp</p><p className="mt-1 text-xs text-stone-500">Công việc Admin giao sẽ hiển thị tại đây.</p></div> :
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {filtered.map(task=>{const d=task.DuLieu||{};const status=String(d.TrangThai||'Chờ phân công');const isMine=d.NhanVienID===currentUser.NhanVienID;const overdue=!!d.Han&&d.Han<today()&&!['Hoàn thành','Đã hủy'].includes(status);return <article key={task.QuanLyID} className="rounded-2xl border border-[#E7DFD5] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-stone-900">{d.TieuDe||'Công việc chưa đặt tên'}</h3><p className="mt-1 text-xs text-stone-500">{d.MaHopDong||d.HopDongID||'Không gắn hợp đồng'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(status)}`}>{status}</span></div>
          {d.MoTa&&<p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{d.MoTa}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2.5 py-1 font-semibold ${priorityClass(String(d.MucDo||'Trung bình'))}`}>Ưu tiên: {d.MucDo||'Trung bình'}</span><span className={`rounded-full px-2.5 py-1 ${overdue?'bg-rose-50 text-rose-700':'bg-stone-100 text-stone-600'}`}><CalendarDays className="mr-1 inline" size={12}/>Hạn: {dateText(String(d.Han||''))}{overdue?' • Quá hạn':''}</span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600"><UserRound className="mr-1 inline" size={12}/>{employeeName(String(d.NhanVienID||''))}</span></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3"><button onClick={()=>setSelected(task)} className="text-xs font-semibold text-[#9a7139] hover:underline">Xem chi tiết & lịch sử</button><div className="flex flex-wrap gap-2">{isAdmin&&<button onClick={()=>openEdit(task)} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700"><Pencil size={13}/> Sửa</button>}{!isAdmin&&isMine&&employeeAction(task)}</div></div>
        </article>})}
      </div>}
    {showForm&&<div className="fixed inset-0 z-[180] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center"><form onSubmit={save} className="my-4 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-stone-900">{editing?'Cập nhật công việc':'Giao công việc mới'}</h2><p className="text-xs text-stone-500">Chỉ Admin được tạo, sửa và phân công.</p></div><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Tên công việc *<input required value={form.TieuDe} onChange={e=>setForm({...form,TieuDe:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal" placeholder="VD: Chuẩn bị váy cưới cho khách"/></label>
        <label className="text-xs font-semibold text-stone-600">Ngày bắt đầu<input type="date" value={form.NgayBatDau||''} onChange={e=>setForm({...form,NgayBatDau:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"/></label>
        <label className="text-xs font-semibold text-stone-600">Hạn hoàn thành<input type="date" value={form.Han||''} onChange={e=>setForm({...form,Han:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"/></label>
        <label className="text-xs font-semibold text-stone-600">Giờ bắt đầu<input type="time" value={form.GioBatDau||''} onChange={e=>setForm({...form,GioBatDau:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"/></label>
        <label className="text-xs font-semibold text-stone-600">Giờ kết thúc<input type="time" value={form.GioKetThuc||''} onChange={e=>setForm({...form,GioKetThuc:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"/></label>
        <label className="text-xs font-semibold text-stone-600">Mức độ ưu tiên<select value={form.MucDo} onChange={e=>setForm({...form,MucDo:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal">{PRIORITIES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-600">Giao cho nhân viên<select value={form.NhanVienID} onChange={e=>setForm({...form,NhanVienID:e.target.value,TrangThai:e.target.value?'Đã giao':'Chờ phân công'})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"><option value="">Chưa phân công</option>{staffList.filter(s=>s.TrangThai==='Đang Làm').map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Hợp đồng liên quan<select value={form.HopDongID||''} onChange={e=>setForm({...form,HopDongID:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"><option value="">Không liên kết hợp đồng</option>{contracts.map(c=><option key={c.QuanLyID} value={c.QuanLyID}>{c.DuLieu?.MaHopDong||c.QuanLyID} • {c.DuLieu?.KhachHang||c.DuLieu?.TenCoDau||'Khách hàng'}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Mô tả công việc<textarea rows={3} value={form.MoTa||''} onChange={e=>setForm({...form,MoTa:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal" placeholder="Mô tả yêu cầu, nội dung cần thực hiện..."/></label>
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Ghi chú<textarea rows={2} value={form.GhiChu||''} onChange={e=>setForm({...form,GhiChu:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E7DFD5] p-2.5 text-sm font-normal"/></label>
      </div>
      {error&&<div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600">Hủy</button><button disabled={saving} className="rounded-xl bg-[#c5a059] px-5 py-2.5 text-sm font-bold text-stone-950 disabled:opacity-60">{saving?'Đang lưu...':'Lưu công việc'}</button></div>
    </form></div>}
    {selected&&<div className="fixed inset-0 z-[170] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center" onClick={()=>setSelected(null)}><div onClick={e=>e.stopPropagation()} className="my-4 w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-stone-900">{selected.DuLieu?.TieuDe}</h2><p className="mt-1 text-xs text-stone-500">Người phụ trách: {employeeName(String(selected.DuLieu?.NhanVienID||''))}</p></div><button onClick={()=>setSelected(null)} className="rounded-lg p-2 text-stone-500"><X size={18}/></button></div><div className="mt-4 space-y-2 text-sm text-stone-700"><p><b>Trạng thái:</b> {selected.DuLieu?.TrangThai||'Chờ phân công'}</p><p><b>Hạn hoàn thành:</b> {dateText(String(selected.DuLieu?.Han||''))}</p><p><b>Mức độ:</b> {selected.DuLieu?.MucDo||'Trung bình'}</p><p><b>Mô tả:</b> {selected.DuLieu?.MoTa||'—'}</p><p><b>Ghi chú:</b> {selected.DuLieu?.GhiChu||'—'}</p></div><div className="mt-5 border-t border-stone-100 pt-4"><h3 className="mb-2 text-sm font-bold text-stone-800">Lịch sử cập nhật</h3>{(Array.isArray(selected.DuLieu?.LichSu)?selected.DuLieu.LichSu:[]).slice().reverse().map((item:any,index:number)=><div key={index} className="border-l-2 border-[#c5a059] py-1 pl-3 text-xs text-stone-600"><b>{item.HanhDong||item.TrangThai}</b> • {item.NguoiThucHien||'Hệ thống'}<div>{item.ThoiGian?new Date(item.ThoiGian).toLocaleString('vi-VN'):''}</div></div>)}{!(selected.DuLieu?.LichSu||[]).length&&<p className="text-xs text-stone-400">Chưa có lịch sử.</p>}</div><div className="mt-4 flex justify-end">{!isAdmin&&employeeAction(selected)}</div></div></div>}
  </div>;
};
