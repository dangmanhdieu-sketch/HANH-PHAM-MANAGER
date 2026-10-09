import React, { useState } from 'react';
import { formatMoney } from '../../utils/format';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Download,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  X,
  Shield,
  CheckCircle,
  AlertTriangle,
  Key,
  Copy,
  Check,
  CreditCard,
  Building,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react';
import type { NhanVien, TrangThaiNhanVien, QuyenNguoiDung } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { AvatarUploadField } from '../../components/AvatarUploadField';
import { api } from '../../api';

interface StaffManagementProps {
  staffList: NhanVien[];
  onRefresh: () => void;
  onNavigateToDirectory?: () => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  onRefresh,
  onNavigateToDirectory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<NhanVien | null>(null);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<NhanVien | null>(null);
  const [lockConfirmStaff, setLockConfirmStaff] = useState<NhanVien | null>(null);

  // Dedicated "CẤP TÀI KHOẢN ĐĂNG NHẬP" Modal state
  const [credentialModalStaff, setCredentialModalStaff] = useState<NhanVien | null>(null);
  const [credentialPassword, setCredentialPassword] = useState<string>('123456');
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [showPasswordInModal, setShowPasswordInModal] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    HoTen: '',
    TenDangNhap: '',
    Email: '',
    SDT: '',
    ChucVu: '',
    LuongCoBan: 12000000,
    NgayVaoLam: new Date().toISOString().split('T')[0],
    TrangThai: 'Đang Làm' as TrangThaiNhanVien,
    Quyen: 'Nhân viên' as QuyenNguoiDung,
    AnhNhanVien: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    MatKhau: '123456',
    SoTaiKhoan: '',
    NganHang: 'Vietcombank',
    TenChuTaiKhoan: '',
    ChiNhanhNganHang: '',
    GhiChu: '',
  });

  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Quick Bank selection options in Vietnam
  const bankOptions = [
    'Vietcombank',
    'Techcombank',
    'MB Bank',
    'VietinBank',
    'BIDV',
    'ACB',
    'VPBank',
    'TPBank',
    'Sacombank',
    'HDBank',
    'VIB',
    'OCB',
  ];

  // Filtered staff
  const filteredStaff = staffList.filter((nv) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      nv.HoTen.toLowerCase().includes(term) ||
      nv.NhanVienID.toLowerCase().includes(term) ||
      (nv.TenDangNhap || '').toLowerCase().includes(term) ||
      nv.Email.toLowerCase().includes(term) ||
      nv.SDT.includes(term) ||
      (nv.SoTaiKhoan && nv.SoTaiKhoan.includes(term)) ||
      (nv.NganHang && nv.NganHang.toLowerCase().includes(term));

    const matchStatus = statusFilter === 'ALL' || nv.TrangThai === statusFilter;
    const matchRole = roleFilter === 'ALL' || nv.Quyen === roleFilter;

    return matchSearch && matchStatus && matchRole;
  });

  const generateRandomPassword = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `HPB@${rand}`;
  };

  const generateUsername = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `nv${rand}`;
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    const initialPass = generateRandomPassword();
    setFormData({
      HoTen: '',
      TenDangNhap: generateUsername(),
      Email: '',
      SDT: '',
      ChucVu: 'Chuyên Viên Tư Vấn & Stylist Váy Cưới',
      LuongCoBan: 12000000,
      NgayVaoLam: new Date().toISOString().split('T')[0],
      TrangThai: 'Đang Làm',
      Quyen: 'Nhân viên',
      AnhNhanVien: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      MatKhau: initialPass,
      SoTaiKhoan: '',
      NganHang: 'Vietcombank',
      TenChuTaiKhoan: '',
      ChiNhanhNganHang: 'Hồ Chí Minh',
      GhiChu: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (staff: NhanVien) => {
    setEditingStaff(staff);
    setFormData({
      HoTen: staff.HoTen,
      TenDangNhap: staff.TenDangNhap || staff.NhanVienID.toLowerCase(),
      Email: staff.Email,
      SDT: staff.SDT,
      ChucVu: staff.ChucVu,
      LuongCoBan: staff.LuongCoBan,
      NgayVaoLam: staff.NgayVaoLam,
      TrangThai: staff.TrangThai,
      Quyen: staff.Quyen,
      AnhNhanVien: staff.AnhNhanVien,
      MatKhau: '', // Leave blank unless resetting
      SoTaiKhoan: staff.SoTaiKhoan || '',
      NganHang: staff.NganHang || 'Vietcombank',
      TenChuTaiKhoan: staff.TenChuTaiKhoan || staff.HoTen.toUpperCase(),
      ChiNhanhNganHang: staff.ChiNhanhNganHang || '',
      GhiChu: staff.GhiChu || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenCredentialModal = (staff: NhanVien) => {
    setCredentialModalStaff(staff);
    setCredentialPassword(staff.MatKhauHienThi || '123456');
    setCopiedCredential(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      let savedStaff: NhanVien;
      if (editingStaff) {
        savedStaff = await api.staff.update(editingStaff.NhanVienID, formData);
      } else {
        savedStaff = await api.staff.create(formData);
      }
      setModalOpen(false);
      onRefresh();

      // Show credential modal immediately when new staff is created
      if (!editingStaff && savedStaff) {
        setCredentialModalStaff(savedStaff);
        setCredentialPassword(formData.MatKhau || '123456');
        setCopiedCredential(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu thông tin nhân viên');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmStaff) return;
    try {
      await api.staff.delete(deleteConfirmStaff.NhanVienID);
      setDeleteConfirmStaff(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa nhân viên');
    }
  };

  const handleToggleLock = async () => {
    if (!lockConfirmStaff) return;
    try {
      await api.staff.toggleLock(lockConfirmStaff.NhanVienID);
      setLockConfirmStaff(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thao tác khóa tài khoản');
    }
  };

  // Copy Login Credentials formatted for Zalo/SMS/Email
  const handleCopyCredentials = () => {
    if (!credentialModalStaff) return;
    const loginUrl = window.location.origin;
    const text = `✨ [HẠNH PHẠM MANAGER] - THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP ✨
-----------------------------------------
Kính gửi: ${credentialModalStaff.HoTen}
Chức vụ: ${credentialModalStaff.ChucVu}
Mã nhân viên: ${credentialModalStaff.NhanVienID}

THÔNG TIN ĐĂNG NHẬP:
- Tên đăng nhập: ${credentialModalStaff.TenDangNhap || credentialModalStaff.NhanVienID.toLowerCase()}
- Email liên hệ: ${credentialModalStaff.Email}
- Mật khẩu: ${credentialPassword}
- Quyền truy cập: ${credentialModalStaff.Quyen}

ĐƯỜNG DẪN TRUY CẬP HỆ THỐNG:
${loginUrl}

Vui lòng đăng nhập để thực hiện:
✓ Chấm công Check-in / Check-out GPS & chụp ảnh hàng ngày
✓ Nhập kê khai tiền Show & Hoa hồng tiệc cưới
✓ Theo dõi bảng lương và lịch sử thanh toán

Trân trọng!
HẠNH PHẠM MANAGER`;

    navigator.clipboard.writeText(text);
    setCopiedCredential(true);
    setTimeout(() => setCopiedCredential(false), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Mã NV',
      'Họ và Tên',
      'Tên Đăng Nhập',
      'Email',
      'Số Điện Thoại',
      'Chức Vụ',
      'Lương Cơ Bản',
      'Ngân Hàng',
      'Số Tài Khoản',
      'Chủ Tài Khoản',
      'Chi Nhánh',
      'Ngày Vào Làm',
      'Trạng Thái',
      'Quyền Hạn',
      'Bị Khóa',
    ];
    const rows = filteredStaff.map((nv) => [
      nv.NhanVienID,
      `"${nv.HoTen}"`,
      nv.TenDangNhap || nv.NhanVienID.toLowerCase(),
      nv.Email,
      `'${nv.SDT}`,
      `"${nv.ChucVu}"`,
      nv.LuongCoBan,
      `"${nv.NganHang || ''}"`,
      `'${nv.SoTaiKhoan || ''}`,
      `"${nv.TenChuTaiKhoan || nv.HoTen.toUpperCase()}"`,
      `"${nv.ChiNhanhNganHang || ''}"`,
      nv.NgayVaoLam,
      nv.TrangThai,
      nv.Quyen,
      nv.BiKhoa ? 'Có' : 'Không',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DS_NhanVien_HanhPhamBridal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#a97d3e]" />
            Nhân viên & Danh bạ
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onNavigateToDirectory && (
            <button
              onClick={onNavigateToDirectory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-semibold transition"
            >
              <CreditCard className="w-4 h-4 text-[#a97d3e]" />
              Xem Danh Bạ Ngân Hàng
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-stone-500" />
            Xuất CSV
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-[#f3dfa2] text-xs font-bold uppercase tracking-wider transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Thêm Nhân Viên
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-[#E7DFD5]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo Tên, Mã NV, Email, SĐT, Số tài khoản..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E7DFD5] rounded-lg text-xs focus:outline-none focus:border-stone-900 transition"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7DFD5] rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đang Làm">Đang Làm</option>
            <option value="Tạm nghỉ">Tạm nghỉ</option>
            <option value="Nghỉ">Nghỉ việc</option>
          </select>
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7DFD5] rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
          >
            <option value="ALL">Tất cả phân quyền</option>
            <option value="Admin">Admin</option>
            <option value="Nhân viên">Nhân viên</option>
            <option value="Freelancer">Freelancer</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E7DFD5] text-stone-700 uppercase font-bridal tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã NV</th>
                <th className="py-3 px-4">Nhân Viên</th>
                <th className="py-3 px-4">Chức Vụ</th>
                <th className="py-3 px-4">Tài Khoản Ngân Hàng</th>
                <th className="py-3 px-4">Lương Cơ Bản</th>
                <th className="py-3 px-4">Quyền Hạn</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE1]">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    Không tìm thấy nhân viên phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((nv) => (
                  <tr
                    key={nv.NhanVienID}
                    className={`hover:bg-[#FAF8F5]/80 transition ${
                      nv.BiKhoa ? 'bg-rose-50/40 text-stone-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {nv.NhanVienID}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={nv.AnhNhanVien}
                          alt={nv.HoTen}
                          className="w-10 h-10 rounded-full object-cover border border-[#c5a059] flex-shrink-0"
                        />
                        <div>
                          <div className="font-bold text-stone-900 text-sm font-bridal">
                            {nv.HoTen}
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                            <span>{nv.SDT}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{nv.Email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-stone-800">
                      {nv.ChucVu}
                    </td>

                    {/* Bank Info in Table */}
                    <td className="py-3 px-4">
                      {nv.SoTaiKhoan ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#c5a059]/20 text-[#8c642e]">
                              {nv.NganHang}
                            </span>
                            <span className="font-mono font-bold text-stone-900">
                              {nv.SoTaiKhoan}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(nv.SoTaiKhoan || '');
                                alert(`Đã sao chép số tài khoản: ${nv.SoTaiKhoan} (${nv.NganHang})`);
                              }}
                              className="p-1 text-stone-400 hover:text-stone-900 rounded transition"
                              title="Sao chép số tài khoản"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-stone-500 uppercase block mt-0.5">
                            {nv.TenChuTaiKhoan || nv.HoTen}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-300 italic">Chưa nhập</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {nv.LuongCoBan.toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          nv.Quyen === 'Admin'
                            ? 'bg-stone-900 text-[#dfc79f] border border-[#c5a059]'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {nv.Quyen}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {nv.BiKhoa ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1 w-max">
                          <Lock className="w-3 h-3" />
                          ĐÃ KHÓA
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            nv.TrangThai === 'Đang Làm'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {nv.TrangThai}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Grant/View Login Credentials Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenCredentialModal(nv)}
                          className="p-1.5 text-[#a97d3e] hover:text-[#8c642e] hover:bg-[#FAF8F5] rounded-lg transition"
                          title="Cấp tài khoản & gửi thông tin đăng nhập"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Edit Staff */}
                        <button
                          type="button"
                          onClick={() => openEditModal(nv)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Lock / Unlock */}
                        <button
                          type="button"
                          onClick={() => setLockConfirmStaff(nv)}
                          className={`p-1.5 rounded-lg transition ${
                            nv.BiKhoa
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                          title={nv.BiKhoa ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {nv.BiKhoa ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete Staff */}
                        {nv.Quyen !== 'Admin' && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmStaff(nv)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa nhân viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* =========================================
          MODAL: CREATE / EDIT STAFF (WITH BANK & PASS)
         ========================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
              <div>
                <h3 className="text-lg font-bold font-bridal text-stone-900 uppercase">
                  {editingStaff ? `SỬA HỒ SƠ: ${editingStaff.HoTen}` : 'THÊM NHÂN VIÊN MỚI'}
                </h3>
                <p className="text-stone-500 text-[11px] mt-0.5">
                  Admin tạo hồ sơ, thiết lập tên đăng nhập, mật khẩu và tài khoản ngân hàng cho nhân viên
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="border-b border-[#F0EBE1] pb-3">
                <span className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-3 text-[#a97d3e]">
                  1. THÔNG TIN CÁ NHÂN & CÔNG VIỆC
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Họ và Tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.HoTen}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          HoTen: val,
                          TenChuTaiKhoan: formData.TenChuTaiKhoan || val.toUpperCase(),
                        });
                      }}
                      placeholder="VD: Đỗ Mai Linh"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên Đăng Nhập <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={50}
                        value={formData.TenDangNhap}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            TenDangNhap: e.target.value.toLowerCase().replace(/\s+/g, ''),
                          })
                        }
                        placeholder="VD: domailinh hoặc nv002"
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, TenDangNhap: generateUsername() })}
                        className="shrink-0 px-2.5 py-2 border border-[#c5a059] text-[#8c642e] rounded-lg hover:bg-[#FAF8F5] text-[10px] font-bold"
                        title="Tạo tên đăng nhập ngẫu nhiên"
                      >
                        Tạo
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Dùng tên này để đăng nhập. Chỉ chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Email Liên Hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.Email}
                      onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                      placeholder="linh.mai@hanhphambridal.vn"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Số Điện Thoại <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.SDT}
                      onChange={(e) => setFormData({ ...formData, SDT: e.target.value })}
                      placeholder="0912 345 678"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Chức Vụ / Vị Trí <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ChucVu}
                      onChange={(e) => setFormData({ ...formData, ChucVu: e.target.value })}
                      placeholder="VD: Chuyên Viên Make-up Cô Dâu"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Lương Cơ Bản (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="500000"
                      value={formData.LuongCoBan}
                      onChange={(e) => setFormData({ ...formData, LuongCoBan: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Ngày Vào Làm</label>
                    <input
                      type="date"
                      value={formData.NgayVaoLam}
                      onChange={(e) => setFormData({ ...formData, NgayVaoLam: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Trạng Thái Làm Việc</label>
                    <select
                      value={formData.TrangThai}
                      onChange={(e) => setFormData({ ...formData, TrangThai: e.target.value as TrangThaiNhanVien })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
                    >
                      <option value="Đang Làm">Đang Làm (Tham gia chấm công & tạo lương)</option>
                      <option value="Tạm nghỉ">Tạm nghỉ (Nghỉ thai sản/ốm)</option>
                      <option value="Nghỉ">Nghỉ (Đã chấm dứt hợp đồng)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Phân Quyền Hệ Thống</label>
                    <select
                      value={formData.Quyen}
                      onChange={(e) => setFormData({ ...formData, Quyen: e.target.value as QuyenNguoiDung })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
                    >
                      <option value="Nhân viên">Nhân viên (Chỉ xem dữ liệu cá nhân & chấm công)</option>
                      <option value="Freelancer">Freelancer (Lương & thu nhập, danh bạ, lịch làm việc)</option>
                      <option value="Admin">Admin (Toàn quyền quản trị & duyệt lương)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Bank Account Information */}
              <div className="border-b border-[#F0EBE1] pb-3">
                <span className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-3 text-[#a97d3e] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  2. TÀI KHOẢN NGÂN HÀNG (CHI TRẢ LƯƠNG & SHOW)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Tên Ngân Hàng</label>
                    <select
                      value={formData.NganHang}
                      onChange={(e) => setFormData({ ...formData, NganHang: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white font-medium"
                    >
                      {bankOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Số Tài Khoản</label>
                    <input
                      type="text"
                      value={formData.SoTaiKhoan}
                      onChange={(e) => setFormData({ ...formData, SoTaiKhoan: e.target.value })}
                      placeholder="VD: 0071000888999"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên Chủ Tài Khoản (In hoa không dấu)
                    </label>
                    <input
                      type="text"
                      value={formData.TenChuTaiKhoan}
                      onChange={(e) => setFormData({ ...formData, TenChuTaiKhoan: e.target.value.toUpperCase() })}
                      placeholder="VD: DO MAI LINH"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Chi Nhánh Ngân Hàng</label>
                    <input
                      type="text"
                      value={formData.ChiNhanhNganHang}
                      onChange={(e) => setFormData({ ...formData, ChiNhanhNganHang: e.target.value })}
                      placeholder="VD: Chi nhánh TP. Hồ Chí Minh"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Credentials & Avatar */}
              <div>
                <span className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-3 text-[#a97d3e] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  3. MẬT KHẨU ĐĂNG NHẬP & HÌNH ẢNH NHÂN VIÊN
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-stone-700">
                        Mật Khẩu Cấp Cho Nhân Viên {editingStaff && '(Để trống nếu giữ nguyên)'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, MatKhau: generateRandomPassword() })}
                        className="text-[10px] text-[#a97d3e] hover:underline font-bold"
                      >
                        Tạo ngẫu nhiên
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        value={formData.MatKhau}
                        onChange={(e) => setFormData({ ...formData, MatKhau: e.target.value })}
                        placeholder={editingStaff ? 'Giữ nguyên mật khẩu cũ' : 'Nhập mật khẩu (VD: 123456)'}
                        className="w-full px-3 py-2 pr-10 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      >
                        {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Admin sẽ gửi Tên đăng nhập và mật khẩu này cho nhân viên để đăng nhập vào app.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <AvatarUploadField
                      label="Ảnh Chân Dung Nhân Viên (Tải từ điện thoại / máy tính)"
                      value={formData.AnhNhanVien || ''}
                      onChange={(base64) => setFormData({ ...formData, AnhNhanVien: base64 })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7DFD5]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-medium text-stone-600 hover:text-stone-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-stone-900 hover:bg-black text-[#f3dfa2] rounded-xl font-bold uppercase tracking-wider shadow-md transition"
                >
                  {saving ? 'Đang lưu...' : editingStaff ? 'Cập Nhật Hồ Sơ' : 'Tạo Nhân Viên & Cấp Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: CẤP TÀI KHOẢN ĐĂNG NHẬP (CREDENTIAL CARD)
         ========================================= */}
      {credentialModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#c5a059] shadow-2xl relative space-y-5">
            <button
              onClick={() => setCredentialModalStaff(null)}
              className="absolute right-4 top-4 p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#8c642e] text-xs font-bold">
                <Key className="w-3.5 h-3.5" />
                CẤP TÀI KHOẢN ĐĂNG NHẬP NHÂN VIÊN
              </div>
              <h3 className="font-bridal text-xl font-bold text-stone-900 uppercase">
                {credentialModalStaff.HoTen}
              </h3>
              <p className="text-xs text-stone-500 font-sans">
                {credentialModalStaff.ChucVu} • Mã: {credentialModalStaff.NhanVienID}
              </p>
            </div>

            {/* Credential Card (Luxury Bridal Pass) */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-stone-950 via-black to-stone-900 text-white border border-[#c5a059]/50 shadow-inner space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                <span className="text-[10px] tracking-widest uppercase text-[#dfc79f] font-bridal font-bold">
                  HANH PHAM BRIDAL ACCESS PASS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#f3dfa2] border border-[#c5a059]/30">
                  {credentialModalStaff.Quyen}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-stone-400 text-[10px] uppercase block">Tên đăng nhập</span>
                  <span className="font-mono font-bold text-white text-sm select-all">
                    {credentialModalStaff.TenDangNhap || credentialModalStaff.NhanVienID.toLowerCase()}
                  </span>
                  <span className="text-stone-500 text-[10px] block mt-1">
                    Email liên hệ: {credentialModalStaff.Email}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-[10px] uppercase block">Mật khẩu đăng nhập</span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                      className="text-[10px] text-[#dfc79f] hover:underline"
                    >
                      {showPasswordInModal ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-[#f3dfa2] text-base tracking-wider select-all">
                    {showPasswordInModal ? credentialPassword : '••••••••'}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 text-[10px] uppercase block">Link truy cập</span>
                  <span className="text-[11px] text-stone-300 truncate block">
                    {window.location.origin}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Copy Message */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] text-[11px] text-stone-600 space-y-1">
              <p className="font-bold text-stone-800 flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-[#a97d3e]" />
                Hướng dẫn cấp cho nhân viên:
              </p>
              <p>
                Bấm nút <strong>"Sao chép thông tin gửi nhân viên"</strong> bên dưới rồi dán vào Zalo hoặc tin nhắn cho nhân viên. Nhân viên dùng Tên đăng nhập và Mật khẩu trên để đăng nhập chấm công và theo dõi lương.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-3 bg-stone-900 hover:bg-black text-[#f3dfa2] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md"
              >
                {copiedCredential ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    ĐÃ SAO CHÉP THÔNG TIN!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Sao chép thông tin gửi nhân viên
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCredentialModalStaff(null)}
                className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={Boolean(deleteConfirmStaff)}
        onClose={() => setDeleteConfirmStaff(null)}
        onConfirm={handleDelete}
        title="XÁC NHẬN XÓA NHÂN VIÊN"
        message={`Bạn có chắc chắn muốn xóa nhân viên ${deleteConfirmStaff?.HoTen} (${deleteConfirmStaff?.NhanVienID}) khỏi hệ thống Hanh Pham Bridal không? Toàn bộ dữ liệu hồ sơ sẽ bị xóa vĩnh viễn.`}
        confirmText="XÓA VĨNH VIỄN"
        type="danger"
      />

      {/* Confirmation Modal for Lock/Unlock */}
      <ConfirmationModal
        isOpen={Boolean(lockConfirmStaff)}
        onClose={() => setLockConfirmStaff(null)}
        onConfirm={handleToggleLock}
        title={lockConfirmStaff?.BiKhoa ? 'MỞ KHÓA TÀI KHOẢN' : 'KHÓA TÀI KHOẢN'}
        message={`Bạn có chắc chắn muốn ${lockConfirmStaff?.BiKhoa ? 'mở khóa' : 'khóa tạm thời'} tài khoản của ${lockConfirmStaff?.HoTen}? Khi bị khóa, nhân viên sẽ không thể đăng nhập hoặc chấm công.`}
        confirmText={lockConfirmStaff?.BiKhoa ? 'MỞ KHÓA' : 'KHÓA TÀI KHOẢN'}
        type="warning"
      />
    </div>
  );
};
