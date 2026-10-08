import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit3, Save, X, FileText, CheckSquare, Shirt, Wallet } from 'lucide-react';
import type { NhanVien, QuanLyModule, QuanLyRecord } from '../../types';
import { api } from '../../api';

interface Props { module: QuanLyModule; staffList: NhanVien[]; onRefresh: () => void; }

const CONFIG: Record<QuanLyModule, {title:string; icon:any; fields:{key:string;label:string;type?:string;placeholder?:string}[]}> = {
  CONG_VIEC: { title:'Công việc', icon:CheckSquare, fields:[
    {key:'TieuDe',label:'Tên công việc',placeholder:'VD: Chuẩn bị váy cưới'},
    {key:'Han',label:'Hạn hoàn thành',type:'date'},
    {key:'TrangThai',label:'Trạng thái',placeholder:'Chưa làm / Đang làm / Hoàn thành'},
    {key:'MucDo',label:'Mức độ',placeholder:'Thấp / Trung bình / Cao'},
    {key:'NhanVienID',label:'Nhân viên phụ trách'},
    {key:'HopDongID',label:'Mã hợp đồng liên quan',placeholder:'Có thể bỏ trống'},
    {key:'GhiChu',label:'Ghi chú',placeholder:'Nội dung chi tiết'},
  ]},
  VAY_CUOI: { title:'Váy cưới', icon:Shirt, fields:[
    {key:'MaVay',label:'Mã váy'}, {key:'TenVay',label:'Tên váy'}, {key:'BoSuuTap',label:'Bộ sưu tập'},
    {key:'Size',label:'Size'}, {key:'Mau',label:'Màu'}, {key:'GiaThue',label:'Giá thuê',type:'number'},
    {key:'TrangThai',label:'Trạng thái',placeholder:'Sẵn sàng / Đang giữ / Đã thuê / Bảo trì'},
    {key:'HopDongID',label:'Mã hợp đồng đang sử dụng',placeholder:'Có thể bỏ trống'},
    {key:'GhiChu',label:'Ghi chú'},
  ]},
  HOP_DONG: { title:'Hợp đồng', icon:FileText, fields:[
    {key:'MaHopDong',label:'Mã hợp đồng'}, {key:'KhachHang',label:'Tên khách hàng'}, {key:'SDT',label:'Số điện thoại'},
    {key:'NgayKy',label:'Ngày ký',type:'date'}, {key:'NgayCuoi',label:'Ngày cưới',type:'date'},
    {key:'GoiDichVu',label:'Gói dịch vụ'}, {key:'TongGiaTri',label:'Tổng giá trị',type:'number'},
    {key:'DaThu',label:'Đã thu',type:'number'}, {key:'NhanVienID',label:'Nhân viên phụ trách'},
    {key:'TrangThai',label:'Trạng thái',placeholder:'Tư vấn / Đã ký / Đang thực hiện / Hoàn thành / Hủy'},
    {key:'GhiChu',label:'Ghi chú'},
  ]},
  THU_CHI: { title:'Thu chi', icon:Wallet, fields:[
    {key:'Ngay',label:'Ngày',type:'date'}, {key:'Loai',label:'Loại',placeholder:'THU hoặc CHI'},
    {key:'DanhMuc',label:'Danh mục',placeholder:'Váy / Marketing / Lương / Khách hàng...'},
    {key:'SoTien',label:'Số tiền',type:'number'}, {key:'HopDongID',label:'Mã hợp đồng liên quan',placeholder:'Có thể bỏ trống'},
    {key:'DoiTuong',label:'Đối tượng'}, {key:'GhiChu',label:'Ghi chú'},
  ]},
};

export const BusinessModule: React.FC<Props> = ({module, staffList, onRefresh}) => {
  const cfg=CONFIG[module]; const Icon=cfg.icon;
  const [records,setRecords]=useState<QuanLyRecord[]>([]); const [q,setQ]=useState('');
  const [editing,setEditing]=useState<QuanLyRecord|null>(null); const [open,setOpen]=useState(false);
  const [data,setData]=useState<Record<string,any>>({}); const [saving,setSaving]=useState(false);

  const load=async()=>setRecords(await api.quanLy.getAll(module));
  useEffect(()=>{load();},[module]);

  const filtered=useMemo(()=>records.filter(r=>JSON.stringify(r.DuLieu).toLowerCase().includes(q.toLowerCase())),[records,q]);
  const openNew=()=>{setEditing(null); setData({}); setOpen(true);};
  const openEdit=(r:QuanLyRecord)=>{setEditing(r);setData({...r.DuLieu});setOpen(true);};
  const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);try{if(editing)await api.quanLy.update(editing.QuanLyID,data);else await api.quanLy.create(module,data);setOpen(false);await load();onRefresh();}catch(err:any){alert(err.message||'Không thể lưu');}finally{setSaving(false);}};
  const remove=async(r:QuanLyRecord)=>{if(!confirm('Xóa bản ghi này?'))return;try{await api.quanLy.delete(r.QuanLyID);await load();onRefresh();}catch(err:any){alert(err.message||'Không thể xóa');}};
  const display=(r:QuanLyRecord)=>{const d=r.DuLieu; return module==='HOP_DONG'?d.MaHopDong+' • '+d.KhachHang:module==='CONG_VIEC'?d.TieuDe:module==='VAY_CUOI'?d.MaVay+' • '+d.TenVay:(d.DanhMuc||'')+' • '+Number(d.SoTien||0).toLocaleString('vi-VN')+' đ';};

  return <div className="space-y-5">
    <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5] flex flex-col sm:flex-row gap-3 justify-between">
      <div><h1 className="text-xl font-bold flex items-center gap-2"><Icon className="w-5 h-5 text-[#bf954f]"/>{cfg.title}</h1><p className="text-xs text-stone-500 mt-1">Dữ liệu liên kết trực tiếp với nhân viên, hợp đồng, váy và tài chính.</p></div>
      <button onClick={openNew} className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>THÊM {cfg.title.toUpperCase()}</button>
    </div>
    <div className="bg-white p-3 rounded-xl border border-[#E7DFD5] flex items-center gap-2"><Search className="w-4 h-4 text-stone-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={'Tìm trong '+cfg.title.toLowerCase()+'...'} className="flex-1 outline-none text-sm"/></div>
    <div className="bg-white rounded-2xl border border-[#E7DFD5] overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#FAF8F5]"><tr><th className="p-3 text-left">Nội dung chính</th><th className="p-3 text-left">Liên kết</th><th className="p-3 text-left">Cập nhật</th><th className="p-3 text-right">Thao tác</th></tr></thead>
      <tbody className="divide-y divide-[#E7DFD5]">{filtered.map(r=><tr key={r.QuanLyID} className="hover:bg-[#FAF8F5]"><td className="p-3 font-semibold">{display(r)}</td><td className="p-3 text-stone-500">{r.DuLieu.NhanVienID||r.DuLieu.HopDongID||r.DuLieu.MaHopDong||'—'}</td><td className="p-3 text-stone-400">{new Date(r.CapNhatLuc).toLocaleString('vi-VN')}</td><td className="p-3 text-right"><button onClick={()=>openEdit(r)} className="p-2 text-stone-500 hover:text-stone-900"><Edit3 className="w-4 h-4"/></button><button onClick={()=>remove(r)} className="p-2 text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button></td></tr>)}
      {filtered.length===0&&<tr><td colSpan={4} className="p-10 text-center text-stone-400">Chưa có dữ liệu.</td></tr>}</tbody></table></div>
    </div>
    {open&&<div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"><form onSubmit={save} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-bold text-lg">{editing?'CẬP NHẬT':'THÊM'} {cfg.title.toUpperCase()}</h2><button type="button" onClick={()=>setOpen(false)}><X/></button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{cfg.fields.map(f=><div key={f.key} className={f.key==='GhiChu'?'sm:col-span-2':''}><label className="block text-xs font-semibold mb-1">{f.label}</label>
        {f.key==='NhanVienID'?<select value={data[f.key]||''} onChange={e=>setData({...data,[f.key]:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">-- Chọn nhân viên --</option>{staffList.map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen} ({s.NhanVienID})</option>)}</select>
        :<input type={f.type||'text'} value={data[f.key]??''} onChange={e=>setData({...data,[f.key]:f.type==='number'?Number(e.target.value):e.target.value})} placeholder={f.placeholder} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>)}</div>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 rounded-lg bg-stone-100">Hủy</button><button disabled={saving} className="px-5 py-2 rounded-lg bg-stone-900 text-white font-bold flex gap-2 items-center"><Save className="w-4 h-4"/>{saving?'Đang lưu...':'Lưu dữ liệu'}</button></div>
    </form></div>}
  </div>;
};
