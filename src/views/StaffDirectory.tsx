import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  CreditCard,
  Copy,
  Check,
  QrCode,
  Download,
  Printer,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building,
  Calendar,
  X,
  UserCheck,
  Filter,
  Grid,
  List,
} from 'lucide-react';
import type { NhanVien } from '../types';
import { HanhPhamLogo } from '../components/HanhPhamLogo';
import { api } from '../api';

interface StaffDirectoryProps {
  staffList: NhanVien[];
  currentUser: NhanVien;
  onNavigateToStaffManagement?: () => void;
}

export const StaffDirectory: React.FC<StaffDirectoryProps> = ({
  staffList,
  currentUser,
  onNavigateToStaffManagement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [directoryStaff, setDirectoryStaff] = useState<NhanVien[]>(staffList);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    setDirectoryStaff(staffList);
  }, [staffList]);

  useEffect(() => {
    if (staffList.length > 0) return;
    void api.staff.getAll().then(setDirectoryStaff).catch((error) => {
      console.error('Không thể tải danh bạ ngân hàng:', error);
    });
  }, [staffList.length]);

  // Copied account number feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected staff for VietQR code modal
  const [qrModalStaff, setQrModalStaff] = useState<NhanVien | null>(null);

  // Selected avatar preview modal
  const [avatarPreview, setAvatarPreview] = useState<{ url: string; name: string } | null>(null);

  // Bank code mapping for VietQR
  const getBankCode = (bankName?: string): string => {
    if (!bankName) return 'vcb';
    const lower = bankName.toLowerCase();
    if (lower.includes('vietcom')) return 'vcb';
    if (lower.includes('techcom')) return 'tcb';
    if (lower.includes('mb') || lower.includes('quân đội')) return 'mbb';
    if (lower.includes('vietin')) return 'icb';
    if (lower.includes('bidv')) return 'bidv';
    if (lower.includes('acb')) return 'acb';
    if (lower.includes('vp')) return 'vpb';
    if (lower.includes('tp')) return 'tpb';
    if (lower.includes('sacom')) return 'stb';
    if (lower.includes('hdbank')) return 'hdb';
    if (lower.includes('vib')) return 'vib';
    return 'vcb';
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Filter staff
  const filteredStaff = directoryStaff.filter((nv) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      nv.HoTen.toLowerCase().includes(term) ||
      nv.NhanVienID.toLowerCase().includes(term) ||
      nv.SDT.includes(term) ||
      (nv.SoTaiKhoan && nv.SoTaiKhoan.includes(term)) ||
      (nv.NganHang && nv.NganHang.toLowerCase().includes(term)) ||
      nv.ChucVu.toLowerCase().includes(term);

    const matchDept =
      departmentFilter === 'ALL' ||
      (departmentFilter === 'Tư Vấn' && (nv.ChucVu.includes('Tư Vấn') || nv.ChucVu.includes('Stylist'))) ||
      (departmentFilter === 'Makeup' && nv.ChucVu.includes('Trang Điểm')) ||
      (departmentFilter === 'Photo' && nv.ChucVu.includes('Nhiếp Ảnh')) ||
      (departmentFilter === 'Media' && nv.ChucVu.includes('Phim')) ||
      (departmentFilter === 'CSKH' && nv.ChucVu.includes('Lễ Tân')) ||
      (departmentFilter === 'May Đo' && nv.ChucVu.includes('May'));

    const matchStatus = statusFilter === 'ALL' || nv.TrangThai === statusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Mã NV',
      'Họ và Tên',
      'Chức Vụ',
      'Số Điện Thoại',
      'Email',
      'Tên Ngân Hàng',
      'Số Tài Khoản',
      'Chủ Tài Khoản',
      'Chi Nhánh',
      'Ngày Vào Làm',
      'Trạng Thái',
    ];

    const rows = filteredStaff.map((nv) => [
      nv.NhanVienID,
      `"${nv.HoTen}"`,
      `"${nv.ChucVu}"`,
      `'${nv.SDT}`,
      nv.Email,
      `"${nv.NganHang || ''}"`,
      `'${nv.SoTaiKhoan || ''}`,
      `"${nv.TenChuTaiKhoan || nv.HoTen.toUpperCase()}"`,
      `"${nv.ChiNhanhNganHang || ''}"`,
      nv.NgayVaoLam,
      nv.TrangThai,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_ba_nhan_vien_HanhPhamBridal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-black to-stone-900 text-white rounded-2xl p-6 sm:p-8 border border-[#c5a059]/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#c5a059]/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <HanhPhamLogo size="lg" variant="gold" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bridal font-bold tracking-wide uppercase text-white">
                Danh bạ studio
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-800/80 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition"
            >
              <Download className="w-4 h-4 text-[#dfc79f]" />
              Xuất File CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c5a059] hover:bg-[#b08b46] text-black text-xs font-bold rounded-xl transition shadow-md"
            >
              <Printer className="w-4 h-4" />
              In Danh Bạ
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-800">
          <div>
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">Tổng nhân sự</span>
            <span className="text-xl sm:text-2xl font-bold font-bridal text-[#f3dfa2]">
              {staffList.length} <span className="text-xs font-normal text-stone-400">người</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">Đang làm việc</span>
            <span className="text-xl sm:text-2xl font-bold font-bridal text-emerald-400">
              {directoryStaff.filter((nv) => nv.TrangThai === 'Đang Làm').length} <span className="text-xs font-normal text-stone-400">nhân sự</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">Đã có số tài khoản</span>
            <span className="text-xl sm:text-2xl font-bold font-bridal text-sky-400">
              {directoryStaff.filter((nv) => nv.SoTaiKhoan).length} <span className="text-xs font-normal text-stone-400">tài khoản</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">Vai trò của bạn</span>
            <span className="text-sm sm:text-base font-bold font-bridal text-white flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
              {currentUser.Quyen === 'Admin' ? 'Quản Trị Viên' : 'Nhân Viên'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo tên nhân viên, số điện thoại, số tài khoản, chức vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E7DFD5] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-stone-900 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-stone-500 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Bộ phận:</span>
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAF8F5] border border-[#E7DFD5] rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
            >
              <option value="ALL">Tất cả bộ phận</option>
              <option value="Tư Vấn">Tư Vấn & Stylist</option>
              <option value="Makeup">Makeup Cô Dâu</option>
              <option value="Photo">Nhiếp Ảnh Gia</option>
              <option value="Media">Media Quay Phim</option>
              <option value="CSKH">Lễ Tân & CSKH</option>
              <option value="May Đo">May Đo & Custom</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAF8F5] border border-[#E7DFD5] rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đang Làm">Đang Làm</option>
              <option value="Tạm nghỉ">Tạm nghỉ</option>
              <option value="Nghỉ">Đã nghỉ việc</option>
            </select>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-stone-900 shadow-sm font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Dạng thẻ lưới"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'table'
                    ? 'bg-white text-stone-900 shadow-sm font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Dạng bảng danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
          <span>
            Hiển thị <strong>{filteredStaff.length}</strong> / {directoryStaff.length} nhân sự
          </span>
          {currentUser.Quyen === 'Admin' && onNavigateToStaffManagement && (
            <button
              onClick={onNavigateToStaffManagement}
              className="text-[#a97d3e] hover:text-[#8c642e] font-semibold inline-flex items-center gap-1 hover:underline"
            >
              Quản lý tài khoản & phân quyền
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          VIEW MODE: GRID CARDS (LUXURY BRIDAL STYLE)
         ========================================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((nv) => (
            <div
              key={nv.NhanVienID}
              className="bg-white rounded-2xl border border-[#E7DFD5] hover:border-[#c5a059] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group"
            >
              {/* Card Top Banner with Avatar */}
              <div className="p-5 pb-4 bg-gradient-to-b from-[#FAF8F5] to-white border-b border-[#F0EBE1] relative">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    onClick={() => setAvatarPreview({ url: nv.AnhNhanVien, name: nv.HoTen })}
                    className="w-16 h-16 rounded-2xl border-2 border-[#c5a059] p-0.5 bg-white shadow-sm flex-shrink-0 cursor-pointer overflow-hidden relative group/avatar"
                    title="Bấm để xem ảnh phóng to"
                  >
                    <img
                      src={nv.AnhNhanVien}
                      alt={nv.HoTen}
                      className="w-full h-full object-cover rounded-xl group-hover/avatar:scale-110 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/avatar:opacity-100 transition flex items-center justify-center rounded-xl text-white text-[10px] font-bold">
                      Xem
                    </div>
                  </div>

                  {/* Name and Designation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-stone-900 text-[#f3dfa2]">
                        {nv.NhanVienID}
                      </span>
                      {nv.Quyen === 'Admin' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c5a059]/20 text-[#8c642e] border border-[#c5a059]/40 uppercase tracking-wider">
                          Quản Trị
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                          Nhân Viên
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ml-auto ${
                          nv.TrangThai === 'Đang Làm'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {nv.TrangThai}
                      </span>
                    </div>

                    <h3 className="font-bridal text-lg font-bold text-stone-900 mt-1 truncate group-hover:text-[#a97d3e] transition">
                      {nv.HoTen}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                      {nv.ChucVu}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5 text-xs">
                  {/* Phone number */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#F0EBE1]">
                    <div className="flex items-center gap-2 text-stone-700">
                      <Phone className="w-3.5 h-3.5 text-[#a97d3e]" />
                      <span className="font-semibold">{nv.SDT}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${nv.SDT}`}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-black text-white text-[11px] font-semibold rounded-lg transition"
                      >
                        Gọi điện
                      </a>
                      <a
                        href={`https://zalo.me/${nv.SDT.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-semibold rounded-lg transition"
                      >
                        Zalo
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 px-1 text-stone-600">
                    <Mail className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <span className="truncate">{nv.Email}</span>
                  </div>

                  {/* Join date */}
                  <div className="flex items-center gap-2 px-1 text-stone-500 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <span>Gia nhập: {nv.NgayVaoLam}</span>
                  </div>
                </div>

                {/* =========================================
                    TÀI KHOẢN NGÂN HÀNG (BANK ACCOUNT CARD)
                   ========================================= */}
                <div className="pt-3 border-t border-[#F0EBE1]">
                  <div className="rounded-xl p-3.5 bg-gradient-to-br from-[#FAF8F5] via-stone-50 to-[#F6F2EB] border border-[#E7DFD5] space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        <CreditCard className="w-4 h-4 text-[#a97d3e]" />
                        <span>TÀI KHOẢN NGÂN HÀNG</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#8c642e] border border-[#c5a059]/30">
                        {nv.NganHang || 'Chưa cập nhật'}
                      </span>
                    </div>

                    {nv.SoTaiKhoan ? (
                      <>
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#E7DFD5]">
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                              Số tài khoản
                            </span>
                            <span className="font-mono text-sm font-bold text-stone-900 tracking-wider">
                              {nv.SoTaiKhoan}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(nv.SoTaiKhoan || '', nv.NhanVienID)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition"
                            title="Sao chép số tài khoản"
                          >
                            {copiedId === nv.NhanVienID ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-stone-600 px-0.5">
                          <span className="text-stone-400">Chủ tài khoản:</span>
                          <span className="font-bold text-stone-900 uppercase">
                            {nv.TenChuTaiKhoan || nv.HoTen.toUpperCase()}
                          </span>
                        </div>

                        {nv.ChiNhanhNganHang && (
                          <div className="flex items-center justify-between text-[11px] text-stone-500 px-0.5">
                            <span className="text-stone-400">Chi nhánh:</span>
                            <span className="truncate max-w-[170px] text-right">
                              {nv.ChiNhanhNganHang}
                            </span>
                          </div>
                        )}

                        {/* VietQR Quick Scan Button */}
                        <button
                          onClick={() => setQrModalStaff(nv)}
                          className="w-full mt-1.5 py-2 bg-stone-900 hover:bg-black text-[#f3dfa2] text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Quét mã VietQR chuyển khoản
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-2 text-stone-400 text-xs italic">
                        Chưa cập nhật tài khoản ngân hàng
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================
          VIEW MODE: TABLE LIST
         ========================================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#E7DFD5] text-stone-700 uppercase font-bridal tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Nhân Viên</th>
                  <th className="py-3.5 px-4">Chức Vụ</th>
                  <th className="py-3.5 px-4">Liên Hệ</th>
                  <th className="py-3.5 px-4">Ngân Hàng</th>
                  <th className="py-3.5 px-4">Số Tài Khoản</th>
                  <th className="py-3.5 px-4">Chủ Tài Khoản</th>
                  <th className="py-3.5 px-4 text-center">VietQR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {filteredStaff.map((nv) => (
                  <tr key={nv.NhanVienID} className="hover:bg-[#FAF8F5]/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={nv.AnhNhanVien}
                          alt={nv.HoTen}
                          onClick={() => setAvatarPreview({ url: nv.AnhNhanVien, name: nv.HoTen })}
                          className="w-10 h-10 rounded-xl object-cover border border-[#c5a059] flex-shrink-0 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-stone-900 text-sm font-bridal">
                            {nv.HoTen}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-900 text-[#f3dfa2]">
                              {nv.NhanVienID}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                                nv.TrangThai === 'Đang Làm'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {nv.TrangThai}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-stone-800">{nv.ChucVu}</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {nv.Email}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{nv.SDT}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <a
                          href={`tel:${nv.SDT}`}
                          className="text-[10px] font-bold text-[#a97d3e] hover:underline"
                        >
                          Gọi
                        </a>
                        <span className="text-stone-300">•</span>
                        <a
                          href={`https://zalo.me/${nv.SDT.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          Zalo
                        </a>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-stone-800 px-2 py-1 rounded bg-[#c5a059]/15 text-[#8c642e] border border-[#c5a059]/30 inline-block">
                        {nv.NganHang || '—'}
                      </span>
                      {nv.ChiNhanhNganHang && (
                        <span className="text-[10px] text-stone-400 block mt-1">
                          {nv.ChiNhanhNganHang}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 text-sm">
                          {nv.SoTaiKhoan || '—'}
                        </span>
                        {nv.SoTaiKhoan && (
                          <button
                            onClick={() => handleCopy(nv.SoTaiKhoan || '', nv.NhanVienID)}
                            className="p-1 text-stone-400 hover:text-stone-900 rounded"
                            title="Sao chép"
                          >
                            {copiedId === nv.NhanVienID ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold uppercase text-stone-800">
                        {nv.TenChuTaiKhoan || nv.HoTen.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {nv.SoTaiKhoan ? (
                        <button
                          onClick={() => setQrModalStaff(nv)}
                          className="p-2 bg-stone-900 hover:bg-black text-[#f3dfa2] rounded-xl transition inline-flex items-center justify-center"
                          title="Xem mã VietQR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================
          VIETQR MODAL POPUP
         ========================================= */}
      {qrModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#c5a059] shadow-2xl relative space-y-4 text-center">
            <button
              onClick={() => setQrModalStaff(null)}
              className="absolute right-4 top-4 p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#8c642e] text-xs font-bold">
              <QrCode className="w-3.5 h-3.5" />
              MÃ VIETQR CHUYỂN KHOẢN
            </div>

            <div>
              <h3 className="font-bridal text-xl font-bold text-stone-900 uppercase">
                {qrModalStaff.HoTen}
              </h3>
              <p className="text-xs text-stone-500">{qrModalStaff.ChucVu}</p>
            </div>

            {/* Generated QR Code Image via standard VietQR Service */}
            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E7DFD5] inline-block shadow-inner">
              <img
                src={`https://img.vietqr.io/image/${getBankCode(
                  qrModalStaff.NganHang
                )}-${qrModalStaff.SoTaiKhoan}-compact2.png?accountName=${encodeURIComponent(
                  qrModalStaff.TenChuTaiKhoan || qrModalStaff.HoTen
                )}&addInfo=${encodeURIComponent('HP BRIDAL Chuyen Khoan')}`}
                alt="VietQR Chuyển Khoản"
                className="w-56 h-56 object-contain rounded-xl mx-auto"
                onError={(e) => {
                  // Fallback simple QR
                  (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2|99|${qrModalStaff.SoTaiKhoan}|${qrModalStaff.TenChuTaiKhoan}||0|0|`;
                }}
              />
            </div>

            <div className="space-y-1 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200 text-left">
              <div className="flex justify-between">
                <span className="text-stone-400">Ngân hàng:</span>
                <span className="font-bold text-stone-900">{qrModalStaff.NganHang}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Số tài khoản:</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {qrModalStaff.SoTaiKhoan}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Chủ tài khoản:</span>
                <span className="font-bold text-stone-900 uppercase">
                  {qrModalStaff.TenChuTaiKhoan || qrModalStaff.HoTen.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(qrModalStaff.SoTaiKhoan || '', 'modal-stk')}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {copiedId === 'modal-stk' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Đã sao chép STK
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Sao chép số TK
                  </>
                )}
              </button>
              <button
                onClick={() => setQrModalStaff(null)}
                className="flex-1 py-2.5 bg-[#c5a059] hover:bg-[#b08b46] text-black text-xs font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          AVATAR PREVIEW MODAL
         ========================================= */}
      {avatarPreview && (
        <div
          onClick={() => setAvatarPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="max-w-md w-full bg-white rounded-3xl p-4 overflow-hidden border border-[#c5a059] shadow-2xl relative text-center">
            <button
              onClick={() => setAvatarPreview(null)}
              className="absolute right-4 top-4 p-2 bg-black/50 text-white rounded-full hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={avatarPreview.url}
              alt={avatarPreview.name}
              className="w-full h-80 object-cover rounded-2xl mb-3 shadow"
            />
            <h4 className="font-bridal text-xl font-bold text-stone-900 uppercase">
              {avatarPreview.name}
            </h4>
            <p className="text-xs text-stone-500 font-sans mt-0.5">Hanh Pham Bridal Studio Team</p>
          </div>
        </div>
      )}
    </div>
  );
};
