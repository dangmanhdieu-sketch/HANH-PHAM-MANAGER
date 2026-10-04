import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  Camera,
  Calendar,
  DollarSign,
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  User,
} from 'lucide-react';
import type { LoaiKhoanThuNhap, NhanVien } from '../types';

interface DailyShowCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NhanVien;
  onSubmit: (data: {
    NhanVienID: string;
    Ngay: string;
    NoiDung: string;
    LoaiKhoan: LoaiKhoanThuNhap;
    DoanhThu: number;
    TyLeHoaHong: number;
    SoTienHoaHong: number;
    AnhChungTu?: string;
    GhiChu?: string;
  }) => Promise<void>;
}

export const DailyShowCommissionModal: React.FC<DailyShowCommissionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
}) => {
  const [loaiKhoan, setLoaiKhoan] = useState<LoaiKhoanThuNhap>('Tiền Show');
  const [ngay, setNgay] = useState(new Date().toISOString().split('T')[0]);
  const [tenDichVu, setTenDichVu] = useState('');
  const [tenKhachHang, setTenKhachHang] = useState('');

  // Show fee states
  const [tienShow, setTienShow] = useState<number>(800000);

  // Commission states
  const [doanhThu, setDoanhThu] = useState<number>(20000000);
  const [tyLe, setTyLe] = useState<number>(5);

  // Proof & notes
  const [anhChungTu, setAnhChungTu] = useState<string>('');
  const [ghiChu, setGhiChu] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset quick selections for wedding studio show fees
  const quickShowTypes = [
    { label: 'Makeup cô dâu tại tiệc sáng', fee: 800000 },
    { label: 'Makeup cô dâu tiệc tối & dặm phấn', fee: 1000000 },
    { label: 'Show quay phim / chụp phóng sự tiệc', fee: 1200000 },
    { label: 'Show chụp ngoại cảnh nguyên ngày', fee: 1500000 },
    { label: 'May đo & thử váy cô dâu tại gia', fee: 600000 },
    { label: 'Trợ lý stylist váy cưới sự kiện', fee: 500000 },
  ];

  // Preset quick selections for commission contracts
  const quickCommissionTypes = [
    { label: 'Tư vấn chốt thuê Váy Cưới Haute Couture', rate: 5 },
    { label: 'Chốt gói Full Combo Váy Cưới + Makeup + Album', rate: 8 },
    { label: 'Bán phụ kiện cưới / Vương miện VIP', rate: 10 },
    { label: 'Nâng cấp gói Diamond Luxury', rate: 6 },
  ];

  // Calculated commission
  const calculatedCommission = Math.round((doanhThu * tyLe) / 100);

  // Total final requested amount
  const finalAmount = loaiKhoan === 'Tiền Show' ? tienShow : calculatedCommission;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAnhChungTu(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDichVu.trim()) {
      setFormError('Vui lòng nhập tên dịch vụ hoặc nội dung công việc.');
      return;
    }

    if (finalAmount <= 0) {
      setFormError('Số tiền kê khai phải lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const fullDescription = tenKhachHang.trim()
      ? `[${loaiKhoan}] ${tenDichVu.trim()} - Khách: ${tenKhachHang.trim()}`
      : `[${loaiKhoan}] ${tenDichVu.trim()}`;

    try {
      await onSubmit({
        NhanVienID: currentUser.NhanVienID,
        Ngay: ngay,
        NoiDung: fullDescription,
        LoaiKhoan: loaiKhoan,
        DoanhThu: loaiKhoan === 'Tiền Show' ? tienShow : doanhThu,
        TyLeHoaHong: loaiKhoan === 'Tiền Show' ? 100 : tyLe,
        SoTienHoaHong: finalAmount,
        AnhChungTu: anhChungTu.trim() || undefined,
        GhiChu: ghiChu.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi gửi phiếu kê khai.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-stone-900 text-[#dfc79f] border border-[#c5a059]/40 shadow-sm">
              <Sparkles className="w-5 h-5 text-[#c5a059]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-bridal text-stone-900 uppercase">
                KÊ KHAI TIỀN SHOW & HOA HỒNG HẰNG NGÀY
              </h3>
              <p className="text-xs text-stone-500">
                Nhân viên: <strong className="text-stone-800">{currentUser.HoTen}</strong> ({currentUser.ChucVu})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Type Switcher: Tiền Show vs Hoa Hồng */}
          <div>
            <label className="block text-stone-600 font-semibold mb-1.5">
              Phân loại khoản thu nhập <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoaiKhoan('Tiền Show');
                  setFormError(null);
                }}
                className={`py-3 px-4 rounded-xl border text-left transition flex items-center gap-3 ${
                  loaiKhoan === 'Tiền Show'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                    : 'bg-[#FAF8F5] text-stone-700 border-[#E7DFD5] hover:bg-stone-100'
                }`}
              >
                <div className={`p-2 rounded-lg ${loaiKhoan === 'Tiền Show' ? 'bg-white/10 text-[#dfc79f]' : 'bg-white text-stone-600'}`}>
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs uppercase tracking-wide">1. Tiền Đi Show</p>
                  <p className={`text-[10px] ${loaiKhoan === 'Tiền Show' ? 'text-stone-300' : 'text-stone-400'}`}>
                    Show makeup, photo tiệc, may đo
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoaiKhoan('Hoa Hồng');
                  setFormError(null);
                }}
                className={`py-3 px-4 rounded-xl border text-left transition flex items-center gap-3 ${
                  loaiKhoan === 'Hoa Hồng'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                    : 'bg-[#FAF8F5] text-stone-700 border-[#E7DFD5] hover:bg-stone-100'
                }`}
              >
                <div className={`p-2 rounded-lg ${loaiKhoan === 'Hoa Hồng' ? 'bg-white/10 text-[#dfc79f]' : 'bg-white text-stone-600'}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs uppercase tracking-wide">2. Hoa Hồng Hợp Đồng</p>
                  <p className={`text-[10px] ${loaiKhoan === 'Hoa Hồng' ? 'text-stone-300' : 'text-stone-400'}`}>
                    Chốt hợp đồng váy cưới & dịch vụ
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Date & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">
                Ngày thực hiện <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={ngay}
                onChange={(e) => setNgay(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">
                Tên Khách Hàng / Cô dâu - Chú rể
              </label>
              <input
                type="text"
                value={tenKhachHang}
                onChange={(e) => setTenKhachHang(e.target.value)}
                placeholder="VD: Cô dâu Thu Trang - Minh Quân"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>
          </div>

          {/* Service Description & Quick Presets */}
          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              Chi tiết công việc / Tên show <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={tenDichVu}
              onChange={(e) => setTenDichVu(e.target.value)}
              placeholder={
                loaiKhoan === 'Tiền Show'
                  ? 'VD: Makeup cô dâu tiệc cưới tại White Palace'
                  : 'VD: Tư vấn chốt thuê váy cưới công chúa Royal Lace'
              }
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-stone-400 self-center">Gợi ý nhanh:</span>
              {(loaiKhoan === 'Tiền Show' ? quickShowTypes : quickCommissionTypes).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setTenDichVu(item.label);
                    if ('fee' in item) setTienShow(item.fee);
                    if ('rate' in item) setTyLe(item.rate);
                  }}
                  className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-[#FAF8F5] hover:border-[#c5a059] border border-transparent text-[10px] text-stone-700 transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* SPECIFIC INPUTS DEPENDING ON LOAIKHOAN */}
          {loaiKhoan === 'Tiền Show' ? (
            /* TIỀN SHOW INPUT */
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#bf954f]" />
                  Số tiền show yêu cầu thanh toán (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <span className="font-mono text-base font-bold text-[#a97d3e]">
                  {tienShow.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <input
                type="number"
                min="0"
                step="50000"
                required
                value={tienShow}
                onChange={(e) => setTienShow(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-sm font-semibold text-stone-900 focus:ring-1 focus:ring-[#bf954f]"
              />

              {/* Quick Fee Buttons */}
              <div className="flex flex-wrap gap-2">
                {[500000, 800000, 1000000, 1200000, 1500000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTienShow(amt)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                      tienShow === amt
                        ? 'bg-stone-900 text-white font-bold'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {(amt / 1000).toLocaleString('vi-VN')}k
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* HOA HỒNG INPUT */
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Doanh thu hợp đồng (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    required
                    value={doanhThu}
                    onChange={(e) => setDoanhThu(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-xs font-semibold focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Tỷ lệ hoa hồng (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={tyLe}
                    onChange={(e) => setTyLe(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-xs font-semibold focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>
              </div>

              {/* Real-time calculated commission */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                <span className="text-stone-600 font-medium">Hoa hồng tự động tính:</span>
                <span className="font-mono text-base font-bold text-emerald-700">
                  +{calculatedCommission.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          )}

          {/* Proof / Image attachment */}
          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              Ảnh bằng chứng / Phiếu nghiệm thu / Bill cọc (Tùy chọn)
            </label>
            <div className="flex items-center gap-3">
              {anhChungTu ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#c5a059] shadow-sm flex-shrink-0">
                  <img src={anhChungTu} alt="Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAnhChungTu('')}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-stone-300 hover:border-[#bf954f] rounded-xl cursor-pointer bg-stone-50 hover:bg-[#FAF8F5] transition text-stone-600">
                  <Upload className="w-4 h-4 text-[#bf954f]" />
                  <span>Chọn ảnh chứng từ / Chụp ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
              <input
                type="url"
                value={anhChungTu}
                onChange={(e) => setAnhChungTu(e.target.value)}
                placeholder="Hoặc dán đường link ảnh..."
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              Ghi chú thêm gửi Admin
            </label>
            <textarea
              rows={2}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Show tiệc cưới phát sinh thêm trang điểm mẹ cô dâu, khách đã chuyển cọc..."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
            />
          </div>

          {/* Final Summary Banner */}
          <div className="p-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#dfc79f] tracking-widest">
                TỔNG SỐ TIỀN ĐỀ NGHỊ DUYỆT
              </span>
              <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
                {finalAmount.toLocaleString('vi-VN')} VNĐ
              </p>
            </div>
            <span className="text-[11px] text-stone-300 text-right">
              Trạng thái: <strong className="text-amber-400">Chờ Admin duyệt</strong>
              <br />
              <span className="text-[10px] text-stone-400">Sẽ cộng vào lương khi duyệt</span>
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7DFD5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-stone-600 hover:text-stone-900 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || finalAmount <= 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 text-[#c5a059]" />
              <span>{submitting ? 'Đang gửi...' : 'GỬI ADMIN DUYỆT'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
