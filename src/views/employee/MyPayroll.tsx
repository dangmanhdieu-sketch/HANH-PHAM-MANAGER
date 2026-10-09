import React, { useState } from 'react';
import { DollarSign, Printer, CheckCircle, Clock, Sparkles, X, Shield } from 'lucide-react';
import type { Luong, NhanVien } from '../../types';

interface MyPayrollProps {
  currentUser: NhanVien;
  payrollList: Luong[];
  isFreelancer?: boolean;
  onOpenDailyClaim?: () => void;
}

export const MyPayroll: React.FC<MyPayrollProps> = ({ currentUser, payrollList, isFreelancer = false, onOpenDailyClaim }) => {
  const [selectedPayslip, setSelectedPayslip] = useState<Luong | null>(payrollList[0] || null);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {isFreelancer && (
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-5 rounded-2xl border border-[#c5a059]/50 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#dfc79f]"><Sparkles className="w-6 h-6"/></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#dfc79f]">Kê khai thu nhập hằng ngày</p>
              <p className="text-sm font-semibold mt-1">Gửi tiền show và hoa hồng để Admin duyệt</p>
            </div>
          </div>
          <button type="button" onClick={onOpenDailyClaim} className="px-5 py-3 bg-[#bf954f] hover:bg-[#a97d3e] rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/> Kê khai ngay</button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#bf954f]" />
            Lương của tôi
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-stone-600">Chọn kỳ lương:</span>
          <select
            value={selectedPayslip?.LuongID || ''}
            onChange={(e) => {
              const found = payrollList.find((l) => l.LuongID === e.target.value);
              if (found) setSelectedPayslip(found);
            }}
            className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white text-xs font-semibold"
          >
            {payrollList.map((l) => (
              <option key={l.LuongID} value={l.LuongID}>
                Tháng {l.Thang} ({l.TrangThai} - {l.ThucLanh.toLocaleString('vi-VN')} đ)
              </option>
            ))}
          </select>
        </div>
      </div>

      {payrollList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E7DFD5] text-center space-y-3">
          <DollarSign className="w-12 h-12 mx-auto text-stone-300" />
          <h3 className="text-lg font-bold font-bridal text-stone-700">Chưa Có Phiếu Lương</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Bảng lương của bạn đang được phòng quản trị tổng hợp hoặc sẽ được tạo tự động vào ngày 1 hàng tháng.
          </p>
        </div>
      ) : selectedPayslip ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payslip Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E7DFD5] shadow-lg overflow-hidden p-6 sm:p-8 space-y-6">
            {/* Bridal Banner Header */}
            <div className="flex items-center justify-between pb-6 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a97d3e]">
                  Hanh Pham Bridal • Studio Cao Cấp
                </span>
                <h2 className="text-2xl font-bold font-bridal text-stone-900 mt-0.5">
                  PHIẾU BÁO LƯƠNG THÁNG {selectedPayslip.Thang}
                </h2>
                <p className="text-xs text-stone-400 font-mono">Mã phiếu: {selectedPayslip.LuongID}</p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedPayslip.TrangThai === 'Đã thanh toán'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedPayslip.TrangThai === 'Đã duyệt'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedPayslip.TrangThai === 'Đã thanh toán' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {selectedPayslip.TrangThai}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900 mt-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In phiếu</span>
                </button>
              </div>
            </div>

            {/* Employee Quick Info Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] text-xs">
              <div>
                <span className="text-stone-400">Nhân viên:</span>
                <p className="font-bold text-stone-900 mt-0.5">{selectedPayslip.HoTen}</p>
              </div>
              <div>
                <span className="text-stone-400">Chức vụ:</span>
                <p className="font-medium text-stone-800 mt-0.5">{currentUser.ChucVu}</p>
              </div>
              <div>
                <span className="text-stone-400">Công & Giờ làm việc:</span>
                <p className="font-bold font-mono text-stone-800 mt-0.5">
                  {selectedPayslip.SoNgayCong} công ({selectedPayslip.SoGioLam} giờ)
                </p>
              </div>
            </div>

            {/* Income Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Chi tiết thu nhập & khấu trừ
              </h3>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-stone-600">1. Lương cơ bản theo hợp đồng</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {selectedPayslip.LuongCoBan.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-stone-600">2. Phụ cấp công việc (Ăn trưa, xăng xe)</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    +{selectedPayslip.PhuCap.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-stone-600">3. Thưởng thành tích & KPI</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    +{selectedPayslip.Thuong.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between py-2.5 bg-[#FAF8F5]/60 px-2 rounded-lg">
                  <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#bf954f]" />
                    4. Hoa hồng hợp đồng váy cưới / makeup đã duyệt
                  </span>
                  <span className="font-mono font-bold text-[#a97d3e]">
                    +{selectedPayslip.HoaHong.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-stone-600">5. Khấu trừ vi phạm / đi trễ</span>
                  <span className="font-mono text-rose-600">
                    -{selectedPayslip.Phat.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-stone-600">6. Tạm ứng lương trong kỳ</span>
                  <span className="font-mono text-rose-600">
                    -{selectedPayslip.TamUng.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Total Net Pay */}
            <div className="p-5 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#dfc79f]">
                  THỰC LÃNH VỀ TÀI KHOẢN (NET)
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-0.5">
                  {selectedPayslip.ThucLanh.toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <div className="text-right text-xs text-stone-300">
                <p>Trạng thái: <span className="font-bold text-[#dfc79f]">{selectedPayslip.TrangThai}</span></p>
                {selectedPayslip.NgayThanhToan && (
                  <p className="text-[10px] text-stone-400 mt-1">
                    Đã chuyển khoản: {new Date(selectedPayslip.NgayThanhToan).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>

            {selectedPayslip.GhiChu && (
              <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-xl border border-stone-200">
                Ghi chú từ quản trị viên: {selectedPayslip.GhiChu}
              </p>
            )}
          </div>

          {/* Side History List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-bridal text-stone-900 uppercase tracking-wider">
              LỊCH SỬ CÁC THÁNG
            </h3>

            <div className="space-y-2">
              {payrollList.map((l) => (
                <button
                  key={l.LuongID}
                  type="button"
                  onClick={() => setSelectedPayslip(l)}
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                    selectedPayslip?.LuongID === l.LuongID
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : 'bg-white hover:bg-stone-50 border-[#E7DFD5] text-stone-800'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Tháng {l.Thang}
                    </span>
                    <p
                      className={`text-sm font-bold font-mono mt-0.5 ${
                        selectedPayslip?.LuongID === l.LuongID ? 'text-[#dfc79f]' : 'text-stone-900'
                      }`}
                    >
                      {l.ThucLanh.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      l.TrangThai === 'Đã thanh toán'
                        ? 'bg-emerald-100 text-emerald-800'
                        : l.TrangThai === 'Đã duyệt'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {l.TrangThai}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
