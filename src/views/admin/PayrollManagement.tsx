import React, { useState } from 'react';
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../../utils/format';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Edit2,
  Lock,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  FileText,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { Luong, HoaHong, NhanVien, TamUng } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { api } from '../../api';
import { CommissionManagement } from './CommissionManagement';

interface PayrollManagementProps {
  payrollList: Luong[];
  commissionList: HoaHong[];
  staffList: NhanVien[];
  onRefresh: () => void;
  onGenerateMonthlyPayroll: () => void;
  initialFilterStatus?: string;
}

export const PayrollManagement: React.FC<PayrollManagementProps> = ({
  payrollList,
  commissionList,
  staffList,
  onRefresh,
  onGenerateMonthlyPayroll,
  initialFilterStatus = 'ALL',
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('10/2026');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus);

  // Modals
  const [editingLuong, setEditingLuong] = useState<Luong | null>(null);
  const [approvingLuong, setApprovingLuong] = useState<Luong | null>(null);
  const [payingLuong, setPayingLuong] = useState<Luong | null>(null);
  const [previewPayslip, setPreviewPayslip] = useState<Luong | null>(null);

  const [showTamUngModal, setShowTamUngModal] = useState(false);
  const [tamUngList, setTamUngList] = useState<TamUng[]>([]);
  const [tamUngLoading, setTamUngLoading] = useState(false);
  const [savingTamUng, setSavingTamUng] = useState(false);
  const [tamUngForm, setTamUngForm] = useState({
    NhanVienID: '',
    Ngay: new Date().toISOString().split('T')[0],
    SoTien: 0,
    LyDo: '',
    GhiChu: '',
  });

  const loadTamUng = async () => {
    setTamUngLoading(true);
    try {
      const data = await api.tamUng.getAll({ thang: selectedMonth || undefined });
      setTamUngList(data);
    } catch (err: any) {
      alert(err.message || 'Không thể tải danh sách tạm ứng');
    } finally {
      setTamUngLoading(false);
    }
  };

  const openTamUngModal = (staffId?: string) => {
    setTamUngForm({
      NhanVienID: staffId || (selectedStaffId !== 'ALL' ? selectedStaffId : staffList[0]?.NhanVienID || ''),
      Ngay: new Date().toISOString().split('T')[0],
      SoTien: 0,
      LyDo: '',
      GhiChu: '',
    });
    setShowTamUngModal(true);
    void loadTamUng();
  };

  const handleCreateTamUng = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tamUngForm.NhanVienID) return alert('Vui lòng chọn nhân viên.');
    if (!tamUngForm.Ngay) return alert('Vui lòng chọn ngày tạm ứng.');
    if (Number(tamUngForm.SoTien) <= 0) return alert('Số tiền tạm ứng phải lớn hơn 0.');
    setSavingTamUng(true);
    try {
      await api.tamUng.create({ ...tamUngForm, SoTien: Number(tamUngForm.SoTien) });
      setTamUngForm((prev) => ({ ...prev, SoTien: 0, LyDo: '', GhiChu: '' }));
      await loadTamUng();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Không thể tạo khoản tạm ứng');
    } finally {
      setSavingTamUng(false);
    }
  };

  const handleDeleteTamUng = async (item: TamUng) => {
    if (!window.confirm('Xóa khoản tạm ứng ' + item.SoTien.toLocaleString('vi-VN') + ' đ của ' + item.HoTen + ' ngày ' + item.Ngay + '?')) return;
    try {
      await api.tamUng.delete(item.TamUngID);
      await loadTamUng();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa khoản tạm ứng');
    }
  };
  // Edit form state
  const [editForm, setEditForm] = useState({
    LuongCoBan: 0,
    SoNgayCong: 0,
    SoGioLam: 0,
    PhuCap: 0,
    Thuong: 0,
    HoaHong: 0,
    Phat: 0,
    TamUng: 0,
    GhiChu: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Filtered payroll
  const filteredList = payrollList.filter((l) => {
    const matchMonth = !selectedMonth || l.Thang === selectedMonth;
    const matchStaff = selectedStaffId === 'ALL' || l.NhanVienID === selectedStaffId;
    const matchStatus = statusFilter === 'ALL' || l.TrangThai === statusFilter;
    return matchMonth && matchStaff && matchStatus;
  });

  const openEditModal = (luong: Luong) => {
    setEditingLuong(luong);
    setEditForm({
      LuongCoBan: luong.LuongCoBan,
      SoNgayCong: luong.SoNgayCong,
      SoGioLam: luong.SoGioLam,
      PhuCap: luong.PhuCap,
      Thuong: luong.Thuong,
      HoaHong: luong.HoaHong,
      Phat: luong.Phat,
      TamUng: luong.TamUng,
      GhiChu: luong.GhiChu || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLuong) return;
    setSavingEdit(true);
    try {
      await api.payroll.updateDetail(editingLuong.LuongID, editForm);
      setEditingLuong(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật lương');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingLuong) return;
    try {
      await api.payroll.approve(approvingLuong.LuongID);
      setApprovingLuong(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Không thể duyệt lương');
    }
  };

  const handlePay = async () => {
    if (!payingLuong) return;
    try {
      await api.payroll.pay(payingLuong.LuongID);
      setPayingLuong(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Không thể thanh toán lương');
    }
  };

  // Preview computed ThucLanh in edit form
  const computedNet =
    Number(editForm.LuongCoBan) +
    Number(editForm.PhuCap) +
    Number(editForm.Thuong) +
    Number(editForm.HoaHong) -
    Number(editForm.Phat) -
    Number(editForm.TamUng);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#bf954f]" />
            Bảng lương
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.system.getExportUrl('luong')}
            download
            className="flex items-center gap-2 px-4 py-2 border border-[#E7DFD5] text-stone-700 hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-[#bf954f]" />
            <span>Xuất CSV Bảng Lương</span>
          </a>

          <button
            type="button"
            onClick={() => openTamUngModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#a97d3e] hover:bg-[#8f682f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition"
          >
            <Wallet className="w-4 h-4" />
            <span>TẠM ỨNG LƯƠNG</span>
          </button>

          <button
            type="button"
            onClick={onGenerateMonthlyPayroll}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition border border-[#c5a059]/40"
          >
            <Calendar className="w-4 h-4 text-[#c5a059]" />
            <span>TẠO BẢNG LƯƠNG THÁNG</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#E7DFD5] shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-stone-500 font-semibold mb-1">Tháng tính lương:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
          >
            <option value="">Tất cả các tháng</option>
            <option value="10/2026">Tháng 10/2026 (Hiện tại)</option>
            <option value="09/2026">Tháng 09/2026</option>
            <option value="08/2026">Tháng 08/2026</option>
          </select>
        </div>

        <div>
          <label className="block text-stone-500 font-semibold mb-1">Nhân viên:</label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
          >
            <option value="ALL">Tất cả nhân viên</option>
            {staffList.map((s) => (
              <option key={s.NhanVienID} value={s.NhanVienID}>
                {s.HoTen} ({s.NhanVienID})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-stone-500 font-semibold mb-1">Trạng thái duyệt:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Chờ duyệt">Chờ duyệt (Cần xem xét)</option>
            <option value="Đã duyệt">Đã duyệt (Sẵn sàng chi trả)</option>
            <option value="Đã thanh toán">Đã thanh toán (Hoàn tất)</option>
          </select>
        </div>
      </div>

      {/* Formula Reminder Box */}
      <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#bf954f]" />
          <span className="font-semibold text-stone-800">Công thức chuẩn:</span>
          <span className="font-mono text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200">
            Thực Lãnh = Lương Cơ Bản + Phụ Cấp + Thưởng + Hoa Hồng - Phạt - Tạm Ứng
          </span>
        </div>
        <span className="text-[11px] text-stone-500 italic">
          * Hoa hồng được tự động cộng dồn từ các hợp đồng đã duyệt trong tháng
        </span>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Nhân viên</th>
                <th className="px-5 py-3.5 font-semibold">Tháng</th>
                <th className="px-5 py-3.5 font-semibold">Lương Cơ Bản</th>
                <th className="px-5 py-3.5 font-semibold">Công / Giờ</th>
                <th className="px-5 py-3.5 font-semibold">Phụ Cấp</th>
                <th className="px-5 py-3.5 font-semibold">Thưởng</th>
                <th className="px-5 py-3.5 font-semibold">Hoa Hồng</th>
                <th className="px-5 py-3.5 font-semibold">Phạt</th>
                <th className="px-5 py-3.5 font-semibold">Tạm Ứng</th>
                <th className="px-5 py-3.5 font-semibold">THỰC LÃNH</th>
                <th className="px-5 py-3.5 font-semibold">Trạng Thái</th>
                <th className="px-5 py-3.5 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-10 text-center text-stone-400">
                    Không tìm thấy bảng lương nào trong kỳ này.
                  </td>
                </tr>
              ) : (
                filteredList.map((l) => (
                  <tr key={l.LuongID} className="hover:bg-[#FAF8F5] transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-stone-900">{l.HoTen}</p>
                      <p className="text-[10px] text-stone-400">{l.NhanVienID}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-stone-700">{l.Thang}</td>
                    <td className="px-5 py-4 font-mono">{l.LuongCoBan.toLocaleString('vi-VN')} đ</td>
                    <td className="px-5 py-4 font-mono text-stone-600">
                      {l.SoNgayCong} công ({l.SoGioLam}h)
                    </td>
                    <td className="px-5 py-4 font-mono text-emerald-600">
                      +{l.PhuCap.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4 font-mono text-emerald-600">
                      +{l.Thuong.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#a97d3e]">
                      +{l.HoaHong.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4 font-mono text-rose-600">
                      -{l.Phat.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-orange-600">
                      -{l.TamUng.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-stone-900 text-sm">
                      {l.ThucLanh.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          l.TrangThai === 'Chờ duyệt'
                            ? 'bg-amber-100 text-amber-800'
                            : l.TrangThai === 'Đã duyệt'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {l.TrangThai}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Payslip */}
                        <button
                          type="button"
                          onClick={() => setPreviewPayslip(l)}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                          title="Xem & in phiếu lương"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* If Chờ duyệt: Can edit & approve */}
                        {l.TrangThai === 'Chờ duyệt' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(l)}
                              className="p-1.5 text-stone-500 hover:text-[#a97d3e] hover:bg-stone-100 rounded-lg transition"
                              title="Chỉnh sửa phụ cấp, thưởng, phạt..."
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setApprovingLuong(l)}
                              className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-[#dfc79f] rounded-lg font-bold text-[10px] uppercase tracking-wider transition border border-[#c5a059]/50"
                            >
                              DUYỆT
                            </button>
                          </>
                        )}

                        {/* If Đã duyệt: Can mark as paid */}
                        {l.TrangThai === 'Đã duyệt' && (
                          <button
                            type="button"
                            onClick={() => setPayingLuong(l)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition shadow-sm"
                          >
                            ĐÃ THANH TOÁN
                          </button>
                        )}

                        {/* If Đã thanh toán: Locked */}
                        {l.TrangThai === 'Đã thanh toán' && (
                          <span
                            className="p-1.5 text-emerald-600 rounded-lg"
                            title="Lương đã thanh toán hoàn tất, thao tác đã được khóa an toàn"
                          >
                            <Lock className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Luong details */}
      {editingLuong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
              <div>
                <h3 className="text-base font-bold font-bridal text-stone-900 uppercase">
                  ĐIỀU CHỈNH PHIẾU LƯƠNG: {editingLuong.HoTen}
                </h3>
                <p className="text-xs text-stone-500">
                  Tháng: {editingLuong.Thang} • Mã: {editingLuong.LuongID}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLuong(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Lương Cơ Bản</label>
                  <input
                    type="number"
                    value={editForm.LuongCoBan}
                    onChange={(e) => setEditForm({ ...editForm, LuongCoBan: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Hoa Hồng (Hợp đồng)</label>
                  <input
                    type="number"
                    value={editForm.HoaHong}
                    onChange={(e) => setEditForm({ ...editForm, HoaHong: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phụ Cấp (Xăng xe, ăn ca)</label>
                  <input
                    type="number"
                    value={editForm.PhuCap}
                    onChange={(e) => setEditForm({ ...editForm, PhuCap: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Thưởng Nóng / KPI</label>
                  <input
                    type="number"
                    value={editForm.Thuong}
                    onChange={(e) => setEditForm({ ...editForm, Thuong: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phạt (Đi trễ, vi phạm)</label>
                  <input
                    type="number"
                    value={editForm.Phat}
                    onChange={(e) => setEditForm({ ...editForm, Phat: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tạm Ứng Trong Kỳ</label>
                  <input
                    type="number"
                    value={editForm.TamUng}
                    onChange={(e) => setEditForm({ ...editForm, TamUng: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">Ghi Chú</label>
                  <input
                    type="text"
                    value={editForm.GhiChu}
                    onChange={(e) => setEditForm({ ...editForm, GhiChu: e.target.value })}
                    placeholder="VD: Đã bao gồm thưởng gói váy VIP..."
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>
              </div>

              {/* Dynamic Net Pay preview */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] flex items-center justify-between">
                <span className="font-semibold text-stone-700">Thực Lãnh Tự Động Tính:</span>
                <span className="text-base font-bold font-mono text-stone-900">
                  {computedNet.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7DFD5]">
                <button
                  type="button"
                  onClick={() => setEditingLuong(null)}
                  className="px-4 py-2 font-medium text-stone-600 hover:text-stone-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider"
                >
                  {savingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quản lý Tạm ứng lương */}
      {showTamUngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
              <div>
                <h3 className="text-base font-bold font-bridal text-stone-900 uppercase flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#a97d3e]" /> QUẢN LÝ TẠM ỨNG LƯƠNG
                </h3>
                <p className="text-xs text-stone-500 mt-1">Có thể nhập nhiều khoản tạm ứng cho cùng một nhân viên trong cùng một tháng.</p>
              </div>
              <button type="button" onClick={() => setShowTamUngModal(false)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <form onSubmit={handleCreateTamUng} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Nhân viên</label>
                  <select value={tamUngForm.NhanVienID} onChange={(e) => setTamUngForm({ ...tamUngForm, NhanVienID: e.target.value })} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white text-sm">
                    <option value="">-- Chọn nhân viên --</option>
                    {staffList.map((staff) => <option key={staff.NhanVienID} value={staff.NhanVienID}>{staff.HoTen} ({staff.NhanVienID})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Ngày tạm ứng</label>
                  <input type="date" value={tamUngForm.Ngay} onChange={(e) => setTamUngForm({ ...tamUngForm, Ngay: e.target.value })} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Số tiền tạm ứng</label>
                  <input inputMode="numeric" value={formatMoneyInput(tamUngForm.SoTien || '')} onChange={(e) => setTamUngForm({ ...tamUngForm, SoTien: parseMoneyInput(e.target.value) })} placeholder="VD: 2.000.000" className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Lý do</label>
                  <input type="text" value={tamUngForm.LyDo} onChange={(e) => setTamUngForm({ ...tamUngForm, LyDo: e.target.value })} placeholder="VD: Tạm ứng chi phí cá nhân" className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Ghi chú</label>
                  <input type="text" value={tamUngForm.GhiChu} onChange={(e) => setTamUngForm({ ...tamUngForm, GhiChu: e.target.value })} placeholder="Ghi chú thêm nếu cần" className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white text-sm" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" disabled={savingTamUng} className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider">
                    <Plus className="w-4 h-4" /> {savingTamUng ? 'ĐANG LƯU...' : 'THÊM KHOẢN TẠM ỨNG'}
                  </button>
                </div>
              </form>
              <div className="border border-[#E7DFD5] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#E7DFD5] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Lịch sử tạm ứng {selectedMonth ? 'tháng ' + selectedMonth : ''}</span>
                  <span className="text-xs font-mono font-bold text-orange-700">
                    Tổng: {tamUngList.reduce((sum, item) => sum + Number(item.SoTien || 0), 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {tamUngLoading ? (
                    <div className="p-8 text-center text-sm text-stone-400">Đang tải...</div>
                  ) : tamUngList.length === 0 ? (
                    <div className="p-8 text-center text-sm text-stone-400">Chưa có khoản tạm ứng nào trong tháng này.</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-white sticky top-0 border-b border-stone-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Ngày</th>
                          <th className="px-4 py-2 text-left">Nhân viên</th>
                          <th className="px-4 py-2 text-left">Lý do</th>
                          <th className="px-4 py-2 text-right">Số tiền</th>
                          <th className="px-4 py-2 text-right">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {tamUngList.map((item) => (
                          <tr key={item.TamUngID}>
                            <td className="px-4 py-2.5">{item.Ngay}</td>
                            <td className="px-4 py-2.5 font-semibold">{item.HoTen}</td>
                            <td className="px-4 py-2.5 text-stone-500">{item.LyDo || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-orange-700">-{Number(item.SoTien).toLocaleString('vi-VN')} đ</td>
                            <td className="px-4 py-2.5 text-right">
                              <button type="button" onClick={() => handleDeleteTamUng(item)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Xóa khoản tạm ứng">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Detailed Luxury Payslip View & Print */}
      {previewPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5] print:hidden">
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                PHIẾU LƯƠNG NHÂN SỰ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:bg-white rounded-lg text-xs font-medium text-stone-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Phiếu Lương</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPayslip(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 space-y-6 overflow-y-auto">
              {/* Studio Header */}
              <div className="text-center pb-4 border-b border-stone-200">
                <h2 className="text-2xl font-bold font-bridal tracking-wider text-stone-900 uppercase">
                  HANH PHAM BRIDAL
                </h2>
                <p className="text-xs text-stone-500 uppercase tracking-widest mt-0.5">
                  156 Nam Kỳ Khởi Nghĩa, Bến Nghé, Quận 1, TP. Hồ Chí Minh
                </p>
                <p className="text-xs text-stone-400">Hotline: 0988 123 456</p>
                <div className="inline-block mt-3 px-4 py-1 bg-[#FAF8F5] rounded-full border border-[#E7DFD5]">
                  <span className="text-xs font-bold font-bridal uppercase text-stone-800">
                    PHIẾU BÁO LƯƠNG THÁNG {previewPayslip.Thang}
                  </span>
                </div>
              </div>

              {/* Employee info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-xl">
                <div>
                  <span className="text-stone-400">Họ và tên:</span>
                  <p className="font-bold text-stone-900 text-sm mt-0.5">{previewPayslip.HoTen}</p>
                </div>
                <div>
                  <span className="text-stone-400">Mã nhân viên:</span>
                  <p className="font-mono font-bold text-stone-800 mt-0.5">{previewPayslip.NhanVienID}</p>
                </div>
                <div>
                  <span className="text-stone-400">Số ngày công thực tế:</span>
                  <p className="font-semibold text-stone-800 mt-0.5">
                    {previewPayslip.SoNgayCong} ngày ({previewPayslip.SoGioLam} giờ)
                  </p>
                </div>
                <div>
                  <span className="text-stone-400">Trạng thái phiếu:</span>
                  <p className="font-bold text-emerald-700 mt-0.5 uppercase tracking-wide">
                    {previewPayslip.TrangThai}
                  </p>
                </div>
              </div>

              {/* Income breakdown table */}
              <table className="w-full text-xs">
                <tbody className="divide-y divide-stone-100">
                  <tr className="py-2">
                    <td className="py-2 text-stone-600">1. Lương cơ bản theo hợp đồng</td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {previewPayslip.LuongCoBan.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="py-2">
                    <td className="py-2 text-stone-600">2. Phụ cấp công việc (Ăn trưa, xăng xe)</td>
                    <td className="py-2 text-right font-mono font-semibold text-emerald-700">
                      +{previewPayslip.PhuCap.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="py-2">
                    <td className="py-2 text-stone-600">3. Thưởng thành tích & KPI</td>
                    <td className="py-2 text-right font-mono font-semibold text-emerald-700">
                      +{previewPayslip.Thuong.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="py-2">
                    <td className="py-2 text-stone-600">4. Hoa hồng hợp đồng váy cưới / makeup đã duyệt</td>
                    <td className="py-2 text-right font-mono font-bold text-[#a97d3e]">
                      +{previewPayslip.HoaHong.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="py-2">
                    <td className="py-2 text-stone-600">5. Khấu trừ đi trễ / vi phạm nội quy</td>
                    <td className="py-2 text-right font-mono text-rose-600">
                      -{previewPayslip.Phat.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="py-2">
                    <td className="py-2 text-stone-600">6. Tạm ứng lương trong tháng</td>
                    <td className="py-2 text-right font-mono text-rose-600">
                      -{previewPayslip.TamUng.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="border-t-2 border-stone-800 bg-[#FAF8F5]">
                    <td className="py-3 px-2 font-bold text-stone-900 uppercase">
                      THỰC LÃNH CHUYỂN KHOẢN
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-base font-bold text-stone-900">
                      {previewPayslip.ThucLanh.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center text-xs pt-8 border-t border-dashed border-stone-200">
                <div>
                  <p className="font-semibold text-stone-700">NGƯỜI LẬP BIỂU</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-stone-800">{previewPayslip.NguoiDuyet || 'Hạnh Phạm'}</p>
                </div>
                <div>
                  <p className="font-semibold text-stone-700">NGƯỜI NHẬN LƯƠNG</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">(Xác nhận đã nhận đủ)</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-stone-800">{previewPayslip.HoTen}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Duyệt Lương */}
      <ConfirmationModal
        isOpen={Boolean(approvingLuong)}
        onClose={() => setApprovingLuong(null)}
        onConfirm={handleApprove}
        title="XÁC NHẬN DUYỆT LƯƠNG"
        message={`Bạn có chắc chắn muốn duyệt khoản lương này cho ${approvingLuong?.HoTen} (Thực lãnh: ${approvingLuong?.ThucLanh.toLocaleString('vi-VN')} VNĐ)?`}
        confirmText="XÁC NHẬN DUYỆT"
        type="info"
      />

      {/* Confirmation Modal for Đã Thanh Toán */}
      <ConfirmationModal
        isOpen={Boolean(payingLuong)}
        onClose={() => setPayingLuong(null)}
        onConfirm={handlePay}
        title="XÁC NHẬN ĐÃ THANH TOÁN"
        message={`Bạn có chắc chắn khoản lương này (${payingLuong?.ThucLanh.toLocaleString('vi-VN')} VNĐ) của ${payingLuong?.HoTen} đã được thanh toán? Sau khi xác nhận, phiếu lương sẽ được khóa an toàn.`}
        confirmText="XÁC NHẬN ĐÃ THANH TOÁN"
        type="success"
      />
      {/* GỘP HOA HỒNG & SHOW VÀO CÙNG TAB LƯƠNG */}
      {initialFilterStatus === 'ALL' && (
        <CommissionManagement
          commissionList={commissionList}
          staffList={staffList}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
