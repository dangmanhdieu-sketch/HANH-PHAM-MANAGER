import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Wallet, FileText, Shirt, CheckSquare } from 'lucide-react';
import type { QuanLyRecord, NhanVien, Luong, HoaHong, ChamCong } from '../../types';
import { api } from '../../api';

export const BusinessStats: React.FC<{staffList:NhanVien[]; payrollList:Luong[]; commissionList:HoaHong[]; attendanceList:ChamCong[]}> = ({staffList,payrollList,commissionList,attendanceList}) => {
 const [records,setRecords]=useState<QuanLyRecord[]>([]);
 useEffect(()=>{api.quanLy.getAll().then(setRecords).catch(()=>{});},[]);
 const count=(m:string)=>records.filter(r=>r.Module===m).length;
 const thu=records.filter(r=>r.Module==='THU_CHI'&&String(r.DuLieu.Loai||'').toUpperCase()==='THU').reduce((s,r)=>s+Number(r.DuLieu.SoTien||0),0);
 const chi=records.filter(r=>r.Module==='THU_CHI'&&String(r.DuLieu.Loai||'').toUpperCase()==='CHI').reduce((s,r)=>s+Number(r.DuLieu.SoTien||0),0);
 const approvedHH=commissionList.filter(x=>x.TrangThai==='Đã duyệt').reduce((s,x)=>s+x.SoTienHoaHong,0);
 const pending=payrollList.filter(x=>x.TrangThai==='Chờ duyệt').reduce((s,x)=>s+x.ThucLanh,0);
 const cards=[
  ['Nhân viên đang làm',staffList.filter(x=>x.TrangThai==='Đang Làm').length,TrendingUp],
  ['Công việc',count('CONG_VIEC'),CheckSquare],['Hợp đồng',count('HOP_DONG'),FileText],['Váy cưới',count('VAY_CUOI'),Shirt],
  ['Thu',thu,Wallet],['Chi',chi,Wallet],['Hoa hồng đã duyệt',approvedHH,TrendingUp],['Lương chờ duyệt',pending,BarChart3]
 ];
 return <div className="space-y-6">
  <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5]"><h1 className="text-xl font-bold flex gap-2 items-center"><BarChart3 className="w-5 h-5 text-[#bf954f]"/>Thống kê</h1><p className="text-xs text-stone-500 mt-1">Tổng hợp từ toàn bộ module, tự cập nhật khi dữ liệu liên quan thay đổi.</p></div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label,val,Icon]:any)=><div key={label} className="bg-white p-4 rounded-2xl border border-[#E7DFD5]"><Icon className="w-5 h-5 text-[#bf954f]"/><p className="text-[11px] text-stone-500 mt-3">{label}</p><p className="text-xl font-bold mt-1">{typeof val==='number'&&String(label).match(/Thu$|Chi$|hồng|lương/i)?Number(val).toLocaleString('vi-VN')+' đ':val}</p></div>)}</div>
  <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5]"><h2 className="font-bold mb-3">Dòng tiền</h2><div className="grid grid-cols-3 gap-3 text-sm"><div><span className="text-stone-500">Tổng thu</span><b className="block text-emerald-700">{thu.toLocaleString('vi-VN')} đ</b></div><div><span className="text-stone-500">Tổng chi</span><b className="block text-rose-700">{chi.toLocaleString('vi-VN')} đ</b></div><div><span className="text-stone-500">Chênh lệch</span><b className={thu-chi>=0?'block text-emerald-700':'block text-rose-700'}>{(thu-chi).toLocaleString('vi-VN')} đ</b></div></div></div>
 </div>;
};