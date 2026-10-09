import React from 'react';
import {
  Clock,
  DollarSign,
  Award,
  User,
  CheckCircle,
  AlertCircle,
  Camera,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { NhanVien, ChamCong, Luong } from '../../types';

interface EmployeeDashboardProps {
  currentUser: NhanVien;
  todayRecord: ChamCong | null;
  latestPayroll: Luong | null;
  totalCommissions: number;
  totalWorkDays: number;
  onOpenCheckIn: () => void;
  onOpenCheckOut: () => void;
  onOpenDailyClaim: () => void;
  onNavigateTab: (tab: string) => void;
  isFreelancer?: boolean;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  todayRecord,
  latestPayroll,
  totalCommissions,
  totalWorkDays,
  onOpenCheckIn,
  onOpenCheckOut,
  onOpenDailyClaim,
  onNavigateTab,
  isFreelancer = false,
}) => {
  const isCheckedIn = Boolean(todayRecord?.CheckIn);
  const isCheckedOut = Boolean(todayRecord?.CheckOut);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-6 sm:p-8 rounded-3xl border border-[#c5a059]/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={currentUser.AnhNhanVien || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.HoTen}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#dfc79f] shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-widest text-[#dfc79f] flex items-center gap-1 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                  HẠNH PHẠM MANAGER
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-stone-300 font-medium">
                  {currentUser.NhanVienID}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-bridal text-white mt-1">
                Xin chào, {currentUser.HoTen} ✨
              </h1>
              <p className="text-xs text-stone-300 mt-0.5">
                {currentUser.ChucVu}
              </p>
            </div>
          </div>

          {/* Quick Attendance State Indicator */}
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isCheckedOut
                  ? 'bg-blue-400'
                  : isCheckedIn
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            ></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-stone-300 tracking-wider">
                Trạng thái hôm nay
              </p>
              <p className="text-xs font-bold text-white mt-0.5">
                {isCheckedOut
                  ? `Đã Check-out (${todayRecord?.CheckOut} - ${todayRecord?.SoGioLam}h)`
                  : isCheckedIn
                  ? `Đang làm việc (Vào lúc ${todayRecord?.CheckIn})`
                  : 'Chưa Check-in hôm nay'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isFreelancer && <>
      {/* BIG PRIMARY ACTIONS (CHECK-IN & CHECK-OUT) - REQUIREMENT XV */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* BIG CHECK-IN BUTTON */}
        <button
          type="button"
          onClick={onOpenCheckIn}
          disabled={isCheckedIn}
          className={`group p-6 rounded-2xl border transition-all text-left flex items-center justify-between ${
            isCheckedIn
              ? 'bg-stone-100 border-stone-200 opacity-70 cursor-not-allowed'
              : 'bg-white hover:bg-[#FAF8F5] border-[#E7DFD5] hover:border-[#c5a059] shadow-md hover:shadow-xl'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl transition ${
                isCheckedIn
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-stone-900 text-[#dfc79f] group-hover:scale-105'
              }`}
            >
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                Ca sáng / Bắt đầu làm việc
              </span>
              <h3 className="text-xl font-bold font-bridal text-stone-900 mt-0.5">
                {isCheckedIn ? 'ĐÃ CHECK-IN HÔM NAY' : 'BẤM ĐỂ CHECK-IN'}
              </h3>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                {isCheckedIn ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Lúc {todayRecord?.CheckIn} ({todayRecord?.TrangThai})</span>
                  </>
                ) : (
                  <span>Mở camera chụp ảnh selfie & gửi tọa độ GPS</span>
                )}
              </p>
            </div>
          </div>
          <ArrowRight className={`w-5 h-5 text-stone-400 group-hover:text-stone-900 transition ${isCheckedIn ? 'hidden' : ''}`} />
        </button>

        {/* BIG CHECK-OUT BUTTON */}
        <button
          type="button"
          onClick={onOpenCheckOut}
          disabled={!isCheckedIn || isCheckedOut}
          className={`group p-6 rounded-2xl border transition-all text-left flex items-center justify-between ${
            !isCheckedIn || isCheckedOut
              ? 'bg-stone-100 border-stone-200 opacity-70 cursor-not-allowed'
              : 'bg-white hover:bg-[#FAF8F5] border-[#E7DFD5] hover:border-[#c5a059] shadow-md hover:shadow-xl'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl transition ${
                isCheckedOut
                  ? 'bg-blue-100 text-blue-700'
                  : !isCheckedIn
                  ? 'bg-stone-200 text-stone-400'
                  : 'bg-stone-900 text-[#dfc79f] group-hover:scale-105'
              }`}
            >
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                Tan ca / Kết thúc làm việc
              </span>
              <h3 className="text-xl font-bold font-bridal text-stone-900 mt-0.5">
                {isCheckedOut ? 'ĐÃ CHECK-OUT HOÀN TẤT' : 'BẤM ĐỂ CHECK-OUT'}
              </h3>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                {isCheckedOut ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Check-out: {todayRecord?.CheckOut} • Đạt {todayRecord?.SoGioLam} giờ làm</span>
                  </>
                ) : isCheckedIn ? (
                  <span>Chụp ảnh kết ca và tính tổng số giờ làm việc</span>
                ) : (
                  <span>Cần Check-in trước khi có thể Check-out</span>
                )}
              </p>
            </div>
          </div>
          <ArrowRight className={`w-5 h-5 text-stone-400 group-hover:text-stone-900 transition ${!isCheckedIn || isCheckedOut ? 'hidden' : ''}`} />
        </button>
      </div>

      </>}

      {/* DAILY SHOW FEE & COMMISSION SUBMISSION BANNER - AVAILABLE TO FREELANCERS */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl border border-[#c5a059]/40 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#c5a059]/20 text-[#dfc79f] border border-[#c5a059]/40">
            <Award className="w-6 h-6 text-[#c5a059]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#dfc79f]">
                Kê Khai Thu Nhập Hằng Ngày
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                Gửi Admin Duyệt
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5">
              Kê khai tiền show & hoa hồng hôm nay
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDailyClaim}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#bf954f] hover:bg-[#a97d3e] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-md whitespace-nowrap flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>KÊ KHAI NGAY</span>
        </button>
      </div>

      {!isFreelancer && <>
      {/* TODAY'S ATTENDANCE SUMMARY DETAILS */}
      {todayRecord && todayRecord.CheckIn && (
        <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {todayRecord.AnhCheckIn && (
              <img
                src={todayRecord.AnhCheckIn}
                alt="Selfie Checkin"
                className="w-14 h-14 rounded-xl object-cover border border-[#c5a059]"
              />
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {todayRecord.TrangThai}
              </span>
              <p className="text-xs font-bold text-stone-900 mt-1">
                Check-in: {todayRecord.CheckIn} {todayRecord.CheckOut ? `• Check-out: ${todayRecord.CheckOut}` : ''}
              </p>
              <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                <MapPin className="w-3 h-3 text-[#bf954f]" />
                <span className="truncate">{todayRecord.GPSCheckIn}</span>
              </p>
            </div>
          </div>

          <div className="text-right w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold text-stone-400">Thời gian làm việc hôm nay</span>
            <p className="text-xl font-bold font-mono text-stone-900 mt-0.5">
              {todayRecord.SoGioLam ? `${todayRecord.SoGioLam} giờ` : 'Đang tính...'}
            </p>
          </div>
        </div>
      )}

      </>}

      {/* QUICK NAVIGATION */}
      <div>
        <h2 className="text-base font-bold font-bridal text-stone-900 mb-3 uppercase tracking-wider">
          TRUY CẬP NHANH CHỨC NĂNG
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isFreelancer && <>
          {/* CHẤM CÔNG CỦA TÔI */}
          <button
            type="button"
            onClick={() => onNavigateTab('chamcong_me')}
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm hover:shadow-md transition text-left group flex flex-col justify-between h-40"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-stone-900 text-[#dfc79f] group-hover:scale-105 transition">
                <Clock className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase font-bridal text-stone-900">
                CHẤM CÔNG CỦA TÔI
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {totalWorkDays} ngày công ghi nhận
              </p>
            </div>
          </button>

          </>}

          {/* LƯƠNG CỦA TÔI */}
          <button
            type="button"
            onClick={() => onNavigateTab('luong_me')}
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm hover:shadow-md transition text-left group flex flex-col justify-between h-40"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-105 transition border border-emerald-200">
                <DollarSign className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase font-bridal text-stone-900">
                LƯƠNG CỦA TÔI
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {latestPayroll ? `${latestPayroll.ThucLanh.toLocaleString('vi-VN')} đ (${latestPayroll.TrangThai})` : 'Xem phiếu lương'}
              </p>
            </div>
          </button>

          {!isFreelancer && <>
          {/* HOA HỒNG CỦA TÔI */}
          <button
            type="button"
            onClick={() => onNavigateTab('hoahong_me')}
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm hover:shadow-md transition text-left group flex flex-col justify-between h-40"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-[#FAF8F5] text-[#a97d3e] group-hover:scale-105 transition border border-[#E7DFD5]">
                <Award className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase font-bridal text-stone-900">
                HOA HỒNG CỦA TÔI
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                +{totalCommissions.toLocaleString('vi-VN')} đ đã duyệt
              </p>
            </div>
          </button>

          </>}

          {isFreelancer && <button type="button" onClick={() => onNavigateTab('danhba_me')} className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm transition text-left group flex flex-col justify-between h-40"><div className="flex items-center justify-between"><div className="p-3 rounded-xl bg-stone-900 text-[#dfc79f]"><User className="w-6 h-6"/></div><ArrowRight className="w-4 h-4 text-stone-400"/></div><div><h3 className="text-sm font-bold uppercase font-bridal text-stone-900">DANH BẠ NHÂN VIÊN</h3><p className="text-xs text-stone-500 mt-0.5">Xem liên hệ trong studio</p></div></button>}

          {isFreelancer && <button type="button" onClick={() => onNavigateTab('chamcong_me')} className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm transition text-left group flex flex-col justify-between h-40"><div className="flex items-center justify-between"><div className="p-3 rounded-xl bg-stone-900 text-[#dfc79f]"><Calendar className="w-6 h-6"/></div><ArrowRight className="w-4 h-4 text-stone-400"/></div><div><h3 className="text-sm font-bold uppercase font-bridal text-stone-900">LỊCH LÀM VIỆC</h3><p className="text-xs text-stone-500 mt-0.5">Xem lịch làm việc của tôi</p></div></button>}

          {!isFreelancer && <>
          {/* HỒ SƠ CỦA TÔI */}
          <button
            type="button"
            onClick={() => onNavigateTab('profile_me')}
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm hover:shadow-md transition text-left group flex flex-col justify-between h-40"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-stone-100 text-stone-700 group-hover:scale-105 transition">
                <User className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase font-bridal text-stone-900">
                HỒ SƠ CỦA TÔI
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Thông tin cá nhân & mật khẩu
              </p>
            </div>
          </button>
          </>}
        </div>
      </div>
    </div>
  );
};
