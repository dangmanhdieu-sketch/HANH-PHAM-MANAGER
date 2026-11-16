import React from 'react';
import { Users, Clock, Wallet, CheckCircle2, CalendarDays, ArrowUpRight, Banknote, ClipboardCheck } from 'lucide-react';
import type { ChamCong, HoaHong, Luong, NhanVien, ThongKeKPI } from '../../types';
import { formatNumber } from '../../utils/format';
import { BusinessStats } from './BusinessStats';
import { ContractsRevenueAnalytics } from './ContractsRevenueAnalytics';

interface AdminDashboardProps {
  kpis: ThongKeKPI[];
  todayAttendance: ChamCong[];
  pendingPayroll: Luong[];
  paidPayroll: Luong[];
  approvedCommissionTotal: number;
  pendingPayrollTotal: number;
  staffList: NhanVien[];
  automationStatus: any;
  onGeneratePayroll: () => void;
  onApprovePayroll: (luongId: string) => void;
  onTriggerAutomation: () => void;
  onNavigateToTab: (tab: string) => void;
  pendingApprovals: import('../../types').QuanLyRecord[];
  pendingCommissionApprovals: HoaHong[];
}

const money = (value: number) => `${formatNumber(Number(value) || 0)} đ`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  kpis,
  todayAttendance,
  pendingPayroll,
  paidPayroll,
  approvedCommissionTotal,
  pendingPayrollTotal,
  staffList,
  onGeneratePayroll,
  onNavigateToTab,
  pendingApprovals,
  pendingCommissionApprovals,
}) => {
  const getKpiVal = (id: string, def = 0) => {
    const item = kpis.find((k) => k.KPI_ID === id);
    return item ? Number(item.GiaTri) : def;
  };

  const totalStaff = getKpiVal('NV', staffList.length) || staffList.length;
  const presentCount = todayAttendance.filter((item) => item.TrangThai === 'Có mặt').length;
  const lateCount = todayAttendance.filter((item) => item.TrangThai === 'Đi trễ').length;
  const checkedCount = todayAttendance.length;
  const pendingCount = pendingPayroll.length;
  const paidCount = paidPayroll.length;
  const today = new Date();
  const dateLabel = today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const cards = [
    { label: 'Tổng nhân viên', value: formatNumber(totalStaff), note: 'Nhân sự đang quản lý', icon: Users, action: 'nhanvien' },
    { label: 'Chấm công hôm nay', value: `${formatNumber(checkedCount)} / ${formatNumber(totalStaff)}`, note: `${presentCount} có mặt · ${lateCount} đi trễ`, icon: Clock, action: 'chamcong' },
    { label: 'Lương chờ duyệt', value: formatNumber(pendingCount), note: money(pendingPayrollTotal), icon: ClipboardCheck, action: 'luong' },
    { label: 'Đã thanh toán', value: formatNumber(paidCount), note: 'Phiếu lương đã thanh toán', icon: CheckCircle2, action: 'luong' },
  ];

  return (
    <div className="hp-admin-dashboard mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden px-0 pb-6 animate-fade-in sm:space-y-5" style={{ background: "transparent", color: "#302419", colorScheme: "light" }}>
      <header className="hp-dashboard-hero flex flex-col gap-3 rounded-2xl border border-[#e9e1d5] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88752]">HẠNH PHẠM LUXURY BRIDAL</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Tổng quan</h1>
          <p className="mt-1 text-sm text-stone-500 capitalize">{dateLabel}</p>
        </div>
        <button
          type="button"
          onClick={onGeneratePayroll}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-[#f3dfa2] shadow-sm transition hover:bg-stone-800 sm:w-auto"
        >
          <CalendarDays className="h-4 w-4" />
          Tạo bảng lương tháng
        </button>
      </header>

      <section className="hp-pending-approvals rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-base font-bold text-amber-950">Cần bạn duyệt</h2><p className="mt-1 text-xs text-amber-800">Các yêu cầu đang chờ xử lý, bấm để mở đúng mục.</p></div><span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-950">{pendingPayroll.length + pendingApprovals.length + pendingCommissionApprovals.length}</span></div>
        {pendingPayroll.length === 0 && pendingApprovals.length === 0 && pendingCommissionApprovals.length === 0 ? <p className="rounded-xl bg-white/70 p-3 text-sm text-stone-600">Hiện không có yêu cầu nào chờ duyệt.</p> : <div className="space-y-2">{pendingPayroll.slice(0,10).map((item) => (
          <button key={item.LuongID} type="button" onClick={() => onNavigateToTab('luongchoduyet')} className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-3 text-left hover:border-amber-300 hover:bg-amber-50">
            <span className="min-w-0"><span className="block text-sm font-bold text-stone-900">Bảng lương chờ duyệt</span><span className="mt-1 block truncate text-xs text-stone-600">{item.HoTen || item.NhanVienID} · Tháng {item.Thang} · {money(item.ThucLanh || item.TongLuong)}</span></span><span className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white">Mở duyệt</span>
          </button>
        ))}{pendingApprovals.slice(0,10).map((record) => {
          const data = record.DuLieu || {};
          const target = record.Module === 'THU_CHI' ? 'thuchi' : record.Module === 'HOP_DONG' ? 'hopdong' : record.Module === 'NGHI_PHEP' ? 'chamcong' : 'dashboard';
          const title = record.Module === 'THU_CHI' ? (String(data.Loai || '').toUpperCase() === 'CHI' ? 'Phiếu chi chờ duyệt' : 'Phiếu thu chờ duyệt') : record.Module === 'HOP_DONG' ? 'Hợp đồng chờ duyệt' : 'Đơn nghỉ phép chờ duyệt';
          const detail = [data.NguoiTao || data.NguoiLap || data.NhanVien || data.KhachHang, data.NoiDung || data.LyDo || data.DichVu, Number(data.SoTien || 0) > 0 ? `${Number(data.SoTien).toLocaleString('vi-VN')} đ` : ''].filter(Boolean).join(' · ');
          return <button key={record.QuanLyID} type="button" onClick={() => onNavigateToTab(target)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-3 text-left hover:border-amber-300 hover:bg-amber-50"><span className="min-w-0"><span className="block text-sm font-bold text-stone-900">{title}</span><span className="mt-1 block truncate text-xs text-stone-600">{detail || `Mã: ${record.QuanLyID}`}</span></span><span className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white">Mở duyệt</span></button>;
        })}
          {pendingCommissionApprovals.slice(0,10).map((item) => (
            <button key={item.HoaHongID} type="button" onClick={() => onNavigateToTab('luong')} className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-3 text-left hover:border-amber-300 hover:bg-amber-50">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-stone-900">Hoa hồng chờ duyệt</span>
                <span className="mt-1 block truncate text-xs text-stone-600">{item.HoTen || item.NhanVienID} · {item.NoiDung} · {Number(item.SoTienHoaHong || 0).toLocaleString('vi-VN')} đ</span>
              </span>
              <span className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white">Mở duyệt</span>
            </button>
          ))}
        </div>}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-800">Chỉ số vận hành</h2>
          <span className="text-xs text-stone-400">Cập nhật theo dữ liệu hiện có</span>
        </div>
        <div className="hp-dashboard-kpis grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {cards.map(({ label, value, note, icon: Icon, action }) => (
            <button
              type="button"
              key={label}
              onClick={() => onNavigateToTab(action)}
              className="group min-w-0 rounded-2xl border border-[#e9e1d5] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5a059] hover:shadow-md sm:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-[11px] font-semibold leading-snug text-stone-500 sm:text-xs">{label}</span>
                <span className="rounded-xl bg-[#f8f4ed] p-2 text-[#a88752]"><Icon className="h-4 w-4" /></span>
              </div>
              <div className="mt-2 break-words text-xl font-bold tracking-tight text-stone-900 sm:mt-3 sm:text-2xl">{value}</div>
              <div className="mt-1 min-h-8 text-[10px] leading-snug text-stone-500 sm:min-h-5 sm:text-xs">{note}</div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#a88752] sm:mt-3 sm:text-[11px]">Xem chi tiết <ArrowUpRight className="h-3 w-3" /></div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-stone-800">Doanh số & hợp đồng</h2>
          <p className="mt-1 text-xs text-stone-500">Tổng hợp hợp đồng ký mới, doanh số, tiền đã thu và công nợ theo kỳ.</p>
        </div>
        <ContractsRevenueAnalytics />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-stone-800">Tổng hợp hoạt động kinh doanh</h2>
        <BusinessStats staffList={staffList} approvedCommissionTotal={approvedCommissionTotal} pendingPayrollTotal={pendingPayrollTotal} />
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-[#e9e1d5] bg-white p-3 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-[#f8f4ed] p-2 text-[#a88752]"><Banknote className="h-4 w-4" /></span>
            <h2 className="text-sm font-bold text-stone-800">Tổng hợp thu nhập</h2>
          </div>
          <div className="mt-4">
            <p className="text-xs text-stone-500">Hoa hồng đã duyệt</p>
            <p className="mt-1 break-words text-base font-bold leading-tight text-stone-900 sm:text-xl">{money(approvedCommissionTotal)}</p>
          </div>
          <button type="button" onClick={() => onNavigateToTab('luong')} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#a88752] hover:underline">
            Xem lương & thu nhập <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="rounded-2xl border border-[#e9e1d5] bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-[#f8f4ed] p-2 text-[#a88752]"><Clock className="h-4 w-4" /></span>
            <h2 className="text-sm font-bold text-stone-800">Tình hình chấm công hôm nay</h2>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2">
            <div><p className="text-xs text-stone-500">Đã chấm công</p><p className="mt-1 text-lg font-bold text-stone-900 sm:text-xl">{checkedCount}</p></div>
            <div><p className="text-xs text-stone-500">Có mặt</p><p className="mt-1 text-lg font-bold text-emerald-700 sm:text-xl">{presentCount}</p></div>
            <div><p className="text-xs text-stone-500">Đi trễ</p><p className="mt-1 text-lg font-bold text-amber-700 sm:text-xl">{lateCount}</p></div>
          </div>
          <button type="button" onClick={() => onNavigateToTab('chamcong')} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#a88752] hover:underline">
            Xem chấm công <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8f5ef] px-4 py-3 text-xs text-stone-600">
        <span>Trang tổng quan chỉ giữ các số liệu tổng hợp; chi tiết nằm trong từng phân hệ.</span>
        <button type="button" onClick={() => onNavigateToTab('thongke')} className="font-semibold text-[#9b7744] hover:underline">Mở thống kê chi tiết</button>
      </div>
    </div>
  );
};
