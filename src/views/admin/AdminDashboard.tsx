import React, { useState } from 'react';
import { formatMoney, formatNumber } from '../../utils/format';
import {
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Play,
  Sparkles,
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react';
import type { ChamCong, Luong, HoaHong, NhanVien, ThongKeKPI } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { BusinessStats } from './BusinessStats';
import { ContractsRevenueAnalytics } from './ContractsRevenueAnalytics';

interface AdminDashboardProps {
  kpis: ThongKeKPI[];
  todayAttendance: ChamCong[];
  pendingPayroll: Luong[];
  paidPayroll: Luong[];
  allPayroll: Luong[];
  allCommissions: HoaHong[];
  staffList: NhanVien[];
  automationStatus: any;
  onGeneratePayroll: () => void;
  onApprovePayroll: (luongId: string) => void;
  onTriggerAutomation: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  kpis,
  todayAttendance,
  pendingPayroll,
  paidPayroll,
  allPayroll,
  allCommissions,
  staffList,
  automationStatus,
  onGeneratePayroll,
  onApprovePayroll,
  onTriggerAutomation,
  onNavigateToTab,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Extract KPI values
  const getKpiVal = (id: string, def = 0) => {
    const item = kpis.find((k) => k.KPI_ID === id);
    return item ? item.GiaTri : def;
  };

  const tongNhanVien = getKpiVal('NV', 0);
  const chamCongHomNay = getKpiVal('CC', 0);
  const luongChoDuyet = Number(getKpiVal('CD', 0));
  const daThanhToan = Number(getKpiVal('TT', 0));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-bridal text-stone-900">
            Tổng quan
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGeneratePayroll}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-[#f3dfa2] rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition border border-[#c5a059]/40"
          >
            <Calendar className="w-4 h-4 text-[#c5a059]" />
            <span>TẠO BẢNG LƯƠNG THÁNG</span>
          </button>
        </div>
      </div>

      {/* BÁO CÁO TÀI CHÍNH - ƯU TIÊN HIỂN THỊ ĐẦU TRANG */}
      <ContractsRevenueAnalytics />

      {/* THỐNG KÊ VẬN HÀNH: NHÂN SỰ, CÔNG VIỆC, HỢP ĐỒNG */}
      <BusinessStats staffList={staffList} payrollList={allPayroll} commissionList={allCommissions} />

      {/* SECTION 1: CHẤM CÔNG HÔM NAY (Realtime Attendance Feed) */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7DFD5] bg-[#FAF8F5]">
          <h2 className="text-base font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#bf954f]" />
            Chấm công hôm nay
          </h2>
          <button
            onClick={() => onNavigateToTab('chamcong')}
            className="text-xs text-[#a97d3e] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Xem lịch sử</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3 font-semibold">Nhân viên</th>
                <th className="px-5 py-3 font-semibold">Ảnh Check-in</th>
                <th className="px-5 py-3 font-semibold">Giờ Check-in</th>
                <th className="px-5 py-3 font-semibold">Giờ Check-out</th>
                <th className="px-5 py-3 font-semibold">Số Giờ Làm</th>
                <th className="px-5 py-3 font-semibold">Vị trí GPS</th>
                <th className="px-5 py-3 font-semibold">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
                    Chưa có nhân viên nào chấm công hôm nay.
                  </td>
                </tr>
              ) : (
                todayAttendance.map((cc) => (
                  <tr key={cc.ChamCongID} className="hover:bg-[#FAF8F5] transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden border border-[#c5a059]/40 flex-shrink-0">
                          {cc.AnhCheckIn ? (
                            <img src={cc.AnhCheckIn} alt={cc.HoTen} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 m-2 text-stone-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{cc.HoTen}</p>
                          <p className="text-[10px] text-stone-400">{cc.NhanVienID}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {cc.AnhCheckIn ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(cc.AnhCheckIn || null)}
                          className="relative group w-9 h-9 rounded-lg overflow-hidden border border-stone-200 shadow-sm"
                          title="Bấm để xem ảnh phóng to"
                        >
                          <img src={cc.AnhCheckIn} alt="Selfie" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-stone-300 italic">Chưa có</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-stone-800 font-semibold">
                      {cc.CheckIn || '--:--:--'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-stone-800">
                      {cc.CheckOut || '--:--:--'}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                      {cc.SoGioLam ? `${cc.SoGioLam}h` : '--'}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      {cc.GPSCheckIn ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            cc.GPSCheckIn.split('(')[0].trim()
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-stone-600 hover:text-[#a97d3e] flex items-center gap-1 truncate"
                          title={cc.GPSCheckIn}
                        >
                          <MapPin className="w-3 h-3 text-[#bf954f] flex-shrink-0" />
                          <span className="truncate">{cc.GPSCheckIn}</span>
                        </a>
                      ) : (
                        <span className="text-stone-300">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cc.TrangThai === 'Có mặt'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cc.TrangThai === 'Đi trễ'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {cc.TrangThai}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: LƯƠNG CHỜ DUYỆT */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7DFD5] bg-[#FAF8F5]">
          <h2 className="text-base font-bold font-bridal text-stone-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            Lương chờ duyệt ({pendingPayroll.length})
          </h2>
          <button
            onClick={() => onNavigateToTab('luong')}
            className="text-xs text-[#a97d3e] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Xem bảng lương</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3 font-semibold">Nhân viên</th>
                <th className="px-5 py-3 font-semibold">Tháng</th>
                <th className="px-5 py-3 font-semibold">Lương Cơ Bản</th>
                <th className="px-5 py-3 font-semibold">Phụ Cấp</th>
                <th className="px-5 py-3 font-semibold">Thưởng</th>
                <th className="px-5 py-3 font-semibold">Hoa Hồng</th>
                <th className="px-5 py-3 font-semibold">Phạt/Tạm Ứng</th>
                <th className="px-5 py-3 font-semibold">Thực Lãnh</th>
                <th className="px-5 py-3 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {pendingPayroll.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-stone-400">
                    Không có phiếu lương nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                pendingPayroll.map((l) => (
                  <tr key={l.LuongID} className="hover:bg-[#FAF8F5] transition">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-stone-900">{l.HoTen}</p>
                      <p className="text-[10px] text-stone-400">{l.NhanVienID}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-stone-700">{l.Thang}</td>
                    <td className="px-5 py-3.5 font-mono">
                      {formatNumber(l.LuongCoBan)} đ
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-600">
                      +{formatNumber(l.PhuCap)} đ
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-600">
                      +{formatNumber(l.Thuong)} đ
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#a97d3e] font-semibold">
                      +{formatNumber(l.HoaHong)} đ
                    </td>
                    <td className="px-5 py-3.5 font-mono text-rose-600">
                      -{(l.Phat + formatNumber(l.TamUng))} đ
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900 text-sm">
                      {formatNumber(l.ThucLanh)} đ
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setApprovingId(l.LuongID)}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-[#dfc79f] rounded-lg font-bold text-[11px] uppercase tracking-wider transition border border-[#c5a059]/50 shadow-sm"
                      >
                        DUYỆT LƯƠNG
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: LƯƠNG ĐÃ THANH TOÁN (Recent paid history) */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7DFD5] bg-[#FAF8F5]">
          <h2 className="text-base font-bold font-bridal text-stone-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Lương đã thanh toán gần đây
          </h2>
          <button
            onClick={() => onNavigateToTab('luong')}
            className="text-xs text-[#a97d3e] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Xem lịch sử</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3 font-semibold">Mã Lương</th>
                <th className="px-5 py-3 font-semibold">Nhân viên</th>
                <th className="px-5 py-3 font-semibold">Tháng</th>
                <th className="px-5 py-3 font-semibold">Thực Lãnh</th>
                <th className="px-5 py-3 font-semibold">Ngày Thanh Toán</th>
                <th className="px-5 py-3 font-semibold">Người Xác Nhận</th>
                <th className="px-5 py-3 font-semibold">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {paidPayroll.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-stone-400">
                    Chưa có khoản lương nào được đánh dấu đã thanh toán.
                  </td>
                </tr>
              ) : (
                paidPayroll.slice(0, 5).map((l) => (
                  <tr key={l.LuongID} className="hover:bg-[#FAF8F5] transition">
                    <td className="px-5 py-3 font-mono text-stone-500">{l.LuongID}</td>
                    <td className="px-5 py-3 font-bold text-stone-900">{l.HoTen}</td>
                    <td className="px-5 py-3 text-stone-600">{l.Thang}</td>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-700">
                      {formatNumber(l.ThucLanh)} đ
                    </td>
                    <td className="px-5 py-3 text-stone-500">
                      {l.NgayThanhToan ? new Date(l.NgayThanhToan).toLocaleDateString('vi-VN') : '--'}
                    </td>
                    <td className="px-5 py-3 text-stone-600 font-medium">
                      {l.NguoiThanhToan || 'Admin'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        Đã thanh toán
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Full Selfie Photo */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-[#c5a059]">
            <img src={selectedPhoto} alt="Attendance Selfie" className="w-full h-auto rounded-xl object-cover" />
            <p className="text-center text-xs text-stone-500 mt-2 font-mono">
              Ảnh khuôn mặt ghi nhận khi chấm công
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approving Salary */}
      <ConfirmationModal
        isOpen={Boolean(approvingId)}
        onClose={() => setApprovingId(null)}
        onConfirm={() => {
          if (approvingId) {
            onApprovePayroll(approvingId);
            setApprovingId(null);
          }
        }}
        title="XÁC NHẬN DUYỆT LƯƠNG"
        message="Bạn có chắc chắn muốn duyệt khoản lương này? Sau khi duyệt, khoản lương sẽ chuyển sang trạng thái Đã duyệt và sẵn sàng để thanh toán."
        confirmText="DUYỆT LƯƠNG"
        type="info"
      />
    </div>
  );
};
