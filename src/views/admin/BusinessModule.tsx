import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit3, Save, X, FileText, CheckSquare, Wallet, Upload, Camera } from 'lucide-react';
import type { NhanVien, QuanLyModule, QuanLyRecord } from '../../types';
import { api } from '../../api';

interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface ModuleConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldConfig[];
}

interface Props {
  module: QuanLyModule;
  staffList: NhanVien[];
  currentUser?: NhanVien | null;
  onRefresh: () => void;
}

const formatMoneyInput = (value: unknown) => { const digits = String(value ?? '').replace(/[^0-9]/g, ''); return digits ? Number(digits).toLocaleString('vi-VN') : ''; };
const parseMoneyInput = (value: string) => { const digits = value.replace(/[^0-9]/g, ''); return digits ? Number(digits) : 0; };
const defaultInstallments = () => [{Dot:1,TenDot:'Đợt 1',HanThanhToan:'',SoTienDuKien:0,GhiChu:''}];

const CONFIG: Record<QuanLyModule, ModuleConfig> = {
  CONG_VIEC: {
    title: 'Công việc',
    icon: CheckSquare,
    fields: [
      { key: 'TieuDe', label: 'Tên công việc', placeholder: 'VD: Chuẩn bị váy cưới' },
      { key: 'Han', label: 'Hạn hoàn thành', type: 'date' },
      { key: 'TrangThai', label: 'Trạng thái', placeholder: 'Chưa làm / Đang làm / Hoàn thành' },
      { key: 'MucDo', label: 'Mức độ', placeholder: 'Thấp / Trung bình / Cao' },
      { key: 'NhanVienID', label: 'Nhân viên phụ trách' },
      { key: 'HopDongID', label: 'Mã hợp đồng liên quan', placeholder: 'Có thể bỏ trống' },
      { key: 'GhiChu', label: 'Ghi chú', placeholder: 'Nội dung chi tiết' },
    ],
  },
  HOP_DONG: {
    title: 'Hợp đồng',
    icon: FileText,
    fields: [
      { key: 'MaHopDong', label: 'Mã hợp đồng' },
      { key: 'KhachHang', label: 'Tên khách hàng' },
      { key: 'SDT', label: 'Số điện thoại' },
      { key: 'NgayKy', label: 'Ngày ký', type: 'date' },
      { key: 'NgayCuoi', label: 'Ngày cưới', type: 'date' },
      { key: 'GoiDichVu', label: 'Gói dịch vụ' },
      { key: 'TongGiaTri', label: 'Tổng giá trị', type: 'number' },
      { key: 'DaThu', label: 'Đã thu', type: 'number' },
      { key: 'NhanVienID', label: 'Nhân viên phụ trách' },
      { key: 'TrangThai', label: 'Trạng thái', placeholder: 'Tư vấn / Đã ký / Đang thực hiện / Hoàn thành / Hủy' },
      { key: 'GhiChu', label: 'Ghi chú' },
    ],
  },
  THU_CHI: {
    title: 'Thu chi',
    icon: Wallet,
    fields: [
      { key: 'Ngay', label: 'Ngày', type: 'date' },
      { key: 'Loai', label: 'Loại', options: [
        { value: 'THU', label: 'THU' },
        { value: 'CHI', label: 'CHI' },
      ] },
      { key: 'DanhMuc', label: 'Lý do chi', placeholder: 'Nhập lý do thu/chi...' },
      { key: 'SoTien', label: 'Số tiền', type: 'number' },
      { key: 'HopDongID', label: 'Mã hợp đồng liên quan', placeholder: 'Có thể bỏ trống' },
      { key: 'DoiTuong', label: 'Đối tượng' },
      { key: 'GhiChu', label: 'Ghi chú' },
    ],
  },
};

export const BusinessModule: React.FC<Props> = ({ module, staffList, currentUser, onRefresh }) => {
  const isEmployee = !!currentUser && currentUser.Quyen !== 'Admin';
  const loggedInStaff = currentUser
    ? staffList.find((staff) => staff.NhanVienID === currentUser.NhanVienID)
    : undefined;
  const loggedInStaffName = String(
    currentUser?.HoTen ||
    loggedInStaff?.HoTen ||
    currentUser?.TenDangNhap ||
    currentUser?.NhanVienID ||
    ''
  ).trim();
  const config = CONFIG[module];
  const Icon = config.icon;

  const [records, setRecords] = useState<QuanLyRecord[]>([]);
  const [receiptRecords, setReceiptRecords] = useState<QuanLyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<QuanLyRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cashflowType, setCashflowType] = useState<'THU' | 'CHI'>('THU');

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await api.quanLy.getAll(module);
      setRecords(data);
      if (module === 'HOP_DONG') {
        const receipts = await api.quanLy.getAll('THU_CHI');
        setReceiptRecords(receipts);
      }
    } catch (error: any) {
      alert(error?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [module]);

  const totalThu = records.filter(r => String(r.DuLieu?.Loai || '').toUpperCase() === 'THU' && r.DuLieu?.TrangThaiDuyet === 'Đã duyệt').reduce((sum,r)=>sum+Number(r.DuLieu?.SoTien||0),0);
  const totalChi = records.filter(r => String(r.DuLieu?.Loai || '').toUpperCase() === 'CHI' && r.DuLieu?.TrangThaiDuyet === 'Đã duyệt').reduce((sum,r)=>sum+Number(r.DuLieu?.SoTien||0),0);

  const visibleRecords = useMemo(() => {
    if (module !== 'THU_CHI' || !isEmployee) return records;
    const employeeId = String(currentUser?.NhanVienID || '');
    const employeeName = loggedInStaffName.toLowerCase();
    return records.filter((record) => {
      const data = record.DuLieu || {};
      const creatorId = String(data.NhanVienID || data.NguoiTaoID || data.NguoiLapID || '');
      const creatorName = String(data.NguoiTao || data.NguoiLap || data.NhanVien || '').trim().toLowerCase();
      return (employeeId && creatorId === employeeId) || (employeeName && creatorName === employeeName);
    });
  }, [records, module, isEmployee, currentUser?.NhanVienID, loggedInStaffName]);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return visibleRecords;
    return visibleRecords.filter((record) =>
      JSON.stringify(record.DuLieu).toLowerCase().includes(keyword)
    );
  }, [visibleRecords, search]);

  const getTodayLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
  };

  const openCreate = (type?: 'THU' | 'CHI') => {
    setEditing(null);
    const loai = type || cashflowType;
    setCashflowType(loai);
    if (module === 'THU_CHI') {
      setFormData({
        Ngay: getTodayLocal(),
        Loai: loai,
        NhanVienID: currentUser?.NhanVienID || '',
        NhanVien: loggedInStaffName,
        NguoiTao: loggedInStaffName,
        TrangThaiDuyet: isEmployee ? 'Chờ Admin duyệt' : 'Đã duyệt',
      });
    } else {
      setFormData(module === 'HOP_DONG' ? { NgayTao: getTodayLocal(), TongGiaTri: 0, GiaGoiBanDau: 0, GiamGiaTrucTiep: 0, ChietKhauPhanTram: 0, KhuyenMaiBoSung: 0, PhuThuDichVu: 0, TienDatCoc: 0, LichThanhToan: defaultInstallments(), TrangThai: isEmployee ? 'Chờ admin duyệt' : 'Đã xác nhận', LoaiDichVu: 'Trọn gói cưới' } : {});
    }
    setFormOpen(true);
  };

  const openEdit = (record: QuanLyRecord) => {
    if (module === 'THU_CHI' && isEmployee) return;
    setEditing(record);
    setFormData({ ...record.DuLieu });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFormData({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, any> = { ...formData };
      if (module === 'THU_CHI' && isEmployee && !editing) {
        payload.NhanVienID = currentUser?.NhanVienID || '';
        payload.NhanVien = loggedInStaffName;
        payload.NguoiTao = loggedInStaffName;
        payload.NguoiTaoID = currentUser?.NhanVienID || '';
        payload.TrangThaiDuyet = 'Chờ Admin duyệt';
      }
      if (module === 'HOP_DONG') {
        const base = Number(payload.GiaGoiBanDau ?? payload.TongGiaTri ?? 0);
        const direct = Number(payload.GiamGiaTrucTiep || 0);
        const rate = Number(payload.ChietKhauPhanTram || 0);
        const promo = Number(payload.KhuyenMaiBoSung || 0);
        const surcharge = Number(payload.PhuThuDichVu || 0);
        const discount = Math.round(base * rate / 100);
        if (base <= 0 || direct < 0 || rate < 0 || rate > 100 || promo < 0 || surcharge < 0 || direct + discount + promo > base) {
          throw new Error('Giá gói phải lớn hơn 0; các khoản giảm trừ không được âm hoặc vượt giá gói.');
        }
        payload.TongGiaTri = base - direct - discount - promo + surcharge;
        payload.NgayTao = payload.NgayTao || new Date().toISOString();
        payload.LichThanhToan = Array.isArray(payload.LichThanhToan) ? payload.LichThanhToan : defaultInstallments();
        delete payload.DaThu;
        delete payload.CongNo;
      }
      if (editing) {
        await api.quanLy.update(editing.QuanLyID, payload);
      } else {
        await api.quanLy.create(module, payload);
      }

      closeForm();
      await loadRecords();
      onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không thể lưu dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const approveCashflow = async (record: QuanLyRecord) => {
    if (module === 'HOP_DONG') {
      const next = window.prompt('Nhập trạng thái mới: Đã xác nhận / Đang thực hiện / Hoàn thành / Đã hủy', 'Đã xác nhận');
      if (!next) return;
      if (!['Đã xác nhận','Đang thực hiện','Hoàn thành','Đã hủy'].includes(next)) { alert('Trạng thái không hợp lệ.'); return; }
      const reason = next === 'Đã hủy' ? window.prompt('Lý do hủy hợp đồng:') : '';
      try { await api.quanLy.update(record.QuanLyID, { TrangThai: next, ...(next === 'Đã hủy' ? { LyDoHuy: reason || '', NguoiHuy: currentUser?.HoTen || '', ThoiGianHuy: new Date().toISOString() } : {}) }); await loadRecords(); onRefresh(); } catch (error:any) { alert(error?.message || 'Không thể cập nhật hợp đồng.'); }
      return;
    }
    if (module !== 'THU_CHI' || getStatus(record) === 'Đã duyệt') return;
    if (!window.confirm('Duyệt phiếu này?')) return;
    try {
      await api.quanLy.update(record.QuanLyID, { TrangThaiDuyet: 'Đã duyệt' });
      await loadRecords();
      onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không thể duyệt phiếu.');
    }
  };

  const handleDelete = async (record: QuanLyRecord) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi này?')) return;

    try {
      await api.quanLy.delete(record.QuanLyID);
      await loadRecords();
      onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không thể xóa dữ liệu.');
    }
  };

  const handleProofImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        setFormData((prev) => ({ ...prev, AnhChungTu: compressed }));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const getStatus = (record: QuanLyRecord) => String(record.Module === 'HOP_DONG' ? (record.DuLieu?.TrangThai || 'Nháp') : (record.DuLieu?.TrangThaiDuyet || 'Chờ Admin duyệt'));

  const getContractCollected = (record: QuanLyRecord) => receiptRecords.filter((receipt) => receipt.DuLieu?.Loai === 'THU' && receipt.DuLieu?.HopDongID === record.DuLieu?.MaHopDong && receipt.DuLieu?.TrangThaiDuyet === 'Đã duyệt').reduce((sum, receipt) => sum + Number(receipt.DuLieu?.SoTien || 0), 0);

  const getTitle = (record: QuanLyRecord) => {
    const data = record.DuLieu || {};

    if (module === 'HOP_DONG') {
      return [data.MaHopDong, data.KhachHang, data.NgayCuoiNhaTrai ? 'Nhà trai: ' + data.NgayCuoiNhaTrai : '', data.NgayCuoiNhaGai ? 'Nhà gái: ' + data.NgayCuoiNhaGai : ''].filter(Boolean).join(' • ') || 'Hợp đồng chưa đặt tên';
    }
    if (module === 'CONG_VIEC') {
      return data.TieuDe || 'Công việc chưa đặt tên';
    }
    return [data.DanhMuc, data.SoTien ? Number(data.SoTien).toLocaleString('vi-VN') + ' đ' : '']
      .filter(Boolean)
      .join(' • ') || 'Khoản thu chi';
  };

  const getLink = (record: QuanLyRecord) => {
    const data = record.DuLieu || {};
    return data.NhanVienID || data.HopDongID || data.MaHopDong || '—';
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5]">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Icon className="w-5 h-5 text-[#bf954f]" />
              {config.title}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              {module === 'THU_CHI'
                ? 'Quản lý phiếu thu, phiếu chi và trạng thái duyệt.'
                : 'Dữ liệu nghiệp vụ được lưu tập trung và có thể liên kết với nhân viên, hợp đồng và tài chính.'}
            </p>
          </div>
          {module !== 'THU_CHI' ? (
            <button type="button" onClick={() => openCreate()} className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> THÊM {config.title.toUpperCase()}
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => openCreate('THU')} className="px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> PHIẾU THU
              </button>
              <button type="button" onClick={() => openCreate('CHI')} className="px-4 py-2.5 bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> PHIẾU CHI
              </button>
            </div>
          )}
        </div>
      </div>

      {module === 'THU_CHI' && !isEmployee && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="text-xs font-bold text-emerald-800">TỔNG PHIẾU THU ĐÃ DUYỆT</div><div className="mt-2 text-2xl font-bold text-emerald-700">+{totalThu.toLocaleString('vi-VN')} đ</div></div><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><div className="text-xs font-bold text-rose-800">TỔNG PHIẾU CHI ĐÃ DUYỆT</div><div className="mt-2 text-2xl font-bold text-rose-700">-{totalChi.toLocaleString('vi-VN')} đ</div></div></div>}
      <div className="bg-white p-3 rounded-xl border border-[#E7DFD5] flex items-center gap-2">
        <Search className="w-4 h-4 text-stone-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={'Tìm trong ' + config.title.toLowerCase() + '...'}
          className="flex-1 outline-none text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E7DFD5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FAF8F5]">
              <tr>
                <th className="p-3 text-left">Nội dung chính</th>
                <th className="p-3 text-left">Số tiền</th>
                <th className="p-3 text-left">Trạng thái</th>
                <th className="p-3 text-left">Cập nhật</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-stone-400">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-stone-400">Chưa có dữ liệu.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.QuanLyID} className="hover:bg-[#FAF8F5]">
                    <td className="p-3 font-semibold">{getTitle(record)}</td>
                    <td className="p-3 text-stone-700 font-semibold">
                      {module === 'THU_CHI' && record.DuLieu?.SoTien
                        ? (String(record.DuLieu?.Loai || '').toUpperCase() === 'CHI' ? '-' : '+') + Number(record.DuLieu.SoTien).toLocaleString('vi-VN') + ' đ'
                        : module === 'HOP_DONG'
                          ? `Giá trị ${Number(record.DuLieu?.TongGiaTri || 0).toLocaleString('vi-VN')} đ · Cọc ${Number(record.DuLieu?.TienDatCoc || 0).toLocaleString('vi-VN')} đ · Thu thêm ${getContractCollected(record).toLocaleString('vi-VN')} đ · Còn ${Math.max(0, Number(record.DuLieu?.TongGiaTri || 0) - Number(record.DuLieu?.TienDatCoc || 0) - getContractCollected(record)).toLocaleString('vi-VN')} đ`
                          : getLink(record)}
                    </td>
                    <td className="p-3">
                      <span className={getStatus(record) === 'Đã xác nhận' || getStatus(record) === 'Hoàn thành' || getStatus(record) === 'Đã duyệt' ? 'px-2 py-1 rounded-full bg-emerald-50 text-emerald-700' : getStatus(record) === 'Đã hủy' ? 'px-2 py-1 rounded-full bg-rose-50 text-rose-700' : 'px-2 py-1 rounded-full bg-amber-50 text-amber-700'}>
                        {getStatus(record)}
                      </span>
                    </td>
                    <td className="p-3 text-stone-400">
                      {new Date(record.CapNhatLuc).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {!isEmployee && (
                        <>
                          {module === 'HOP_DONG' && ['Chờ admin duyệt','Nháp'].includes(getStatus(record)) && (
                            <button type="button" onClick={() => void approveCashflow(record)} className="px-2.5 py-1.5 mr-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">DUYỆT</button>
                          )}
                          {module === 'HOP_DONG' && !isEmployee && (
                            <button type="button" onClick={() => void approveCashflow(record)} className="px-2.5 py-1.5 mr-1 rounded-lg bg-stone-800 text-white text-[10px] font-bold">TRẠNG THÁI</button>
                          )}
                          {module === 'THU_CHI' && getStatus(record) !== 'Đã duyệt' && (
                            <button type="button" onClick={() => void approveCashflow(record)} className="px-2.5 py-1.5 mr-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold" title="Duyệt phiếu">
                              DUYỆT
                            </button>
                          )}
                          <button type="button" onClick={() => openEdit(record)} className="p-2 text-stone-500 hover:text-stone-900" title="Sửa">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => void handleDelete(record)} className="p-2 text-stone-400 hover:text-rose-600" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {module === 'THU_CHI' ? (editing ? (cashflowType === 'THU' ? 'CẬP NHẬT PHIẾU THU' : 'CẬP NHẬT PHIẾU CHI') : (cashflowType === 'THU' ? 'PHIẾU THU' : 'PHIẾU CHI')) : `${editing ? 'CẬP NHẬT' : 'THÊM'} ${config.title.toUpperCase()}`}
              </h2>
              <button type="button" onClick={closeForm} disabled={saving}>
                <X />
              </button>
            </div>

            {module === 'HOP_DONG' ? (
              <div className="space-y-4">
                <section className="border rounded-xl p-4"><h3 className="font-bold mb-3">Thông tin khách hàng</h3><div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">Mã hợp đồng</label><input readOnly value={String(formData.MaHopDong||'Tự tạo khi lưu')} className="w-full border rounded-lg p-2 bg-stone-50"/></div>
                  <div><label className="block text-xs mb-1">Tên cô dâu/chú rể *</label><input required value={String(formData.KhachHang||'')} onChange={e=>setFormData({...formData,KhachHang:e.target.value})} className="w-full border rounded-lg p-2"/></div>
                  <div><label className="block text-xs mb-1">Số điện thoại *</label><input required value={String(formData.SDT||'')} onChange={e=>setFormData({...formData,SDT:e.target.value})} className="w-full border rounded-lg p-2"/></div>
                  <div><label className="block text-xs mb-1">Địa chỉ</label><input value={String(formData.DiaChi||'')} onChange={e=>setFormData({...formData,DiaChi:e.target.value})} className="w-full border rounded-lg p-2"/></div>
                </div></section>
                <section className="border rounded-xl p-4"><h3 className="font-bold mb-3">Ngày cưới</h3><div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">Ngày cưới nhà trai</label><input type="date" value={String(formData.NgayCuoiNhaTrai||'')} onChange={e=>setFormData({...formData,NgayCuoiNhaTrai:e.target.value})} className="w-full border rounded-lg p-2"/></div>
                  <div><label className="block text-xs mb-1">Ngày cưới nhà gái</label><input type="date" value={String(formData.NgayCuoiNhaGai||'')} onChange={e=>setFormData({...formData,NgayCuoiNhaGai:e.target.value})} className="w-full border rounded-lg p-2"/></div>
                </div></section>
                <section className="border rounded-xl p-4"><h3 className="font-bold mb-3">Gói dịch vụ</h3><div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">Loại dịch vụ</label><select value={String(formData.LoaiDichVu||'Trọn gói cưới')} onChange={e=>setFormData({...formData,LoaiDichVu:e.target.value})} className="w-full border rounded-lg p-2">{['Chụp ảnh cưới','Quay phim cưới','Trang điểm cô dâu','Thuê váy cưới','Trọn gói cưới','Dịch vụ khác'].map(x=><option key={x}>{x}</option>)}</select></div>
                  <div><label className="block text-xs mb-1">Tên gói *</label><select value={['Luxury','Kim cương','VIP'].includes(String(formData.GoiDichVu||''))?String(formData.GoiDichVu):formData.GoiDichVu?'Khác':''} onChange={e=>setFormData({...formData,GoiDichVu:e.target.value==='Khác'?'':e.target.value})} className="w-full border rounded-lg p-2"><option value="">-- Chọn gói --</option><option>Luxury</option><option>Kim cương</option><option>VIP</option><option>Khác</option></select>{(!['Luxury','Kim cương','VIP'].includes(String(formData.GoiDichVu||'')))&&<input required placeholder="Nhập tên gói khác" value={String(formData.GoiDichVu||'')} onChange={e=>setFormData({...formData,GoiDichVu:e.target.value})} className="w-full border rounded-lg p-2 mt-2"/>}</div>
                  <div><label className="block text-xs mb-1">Nhân viên phụ trách</label><select value={String(formData.NhanVienID||currentUser?.NhanVienID||'')} disabled={isEmployee} onChange={e=>{const x=staffList.find(n=>n.NhanVienID===e.target.value);setFormData({...formData,NhanVienID:e.target.value,NhanVien:x?.HoTen||''})}} className="w-full border rounded-lg p-2"><option value="">-- Chọn nhân viên --</option>{staffList.map(x=><option key={x.NhanVienID} value={x.NhanVienID}>{x.HoTen}</option>)}</select></div>
                  <div><label className="block text-xs mb-1">Ghi chú / yêu cầu</label><input value={String(formData.GhiChu||'')} onChange={e=>setFormData({...formData,GhiChu:e.target.value})} className="w-full border rounded-lg p-2"/></div>
                </div></section>
                <section className="border rounded-xl p-4"><h3 className="font-bold mb-3">Giá trị hợp đồng</h3><div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">Giá gói ban đầu (đ)</label><input type="number" min="0" value={String(formData.GiaGoiBanDau??0)} onChange={e=>setFormData({...formData,GiaGoiBanDau:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div><div><label className="block text-xs mb-1">Giảm giá trực tiếp (đ)</label><input type="number" min="0" value={String(formData.GiamGiaTrucTiep??0)} onChange={e=>setFormData({...formData,GiamGiaTrucTiep:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div><div><label className="block text-xs mb-1">Chiết khấu (%)</label><input type="number" min="0" value={String(formData.ChietKhauPhanTram??0)} onChange={e=>setFormData({...formData,ChietKhauPhanTram:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div><div><label className="block text-xs mb-1">Khuyến mãi bằng tiền (đ)</label><input type="number" min="0" value={String(formData.KhuyenMaiBoSung??0)} onChange={e=>setFormData({...formData,KhuyenMaiBoSung:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div><div><label className="block text-xs mb-1">Phụ thu dịch vụ (đ)</label><input type="number" min="0" value={String(formData.PhuThuDichVu??0)} onChange={e=>setFormData({...formData,PhuThuDichVu:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div><div><label className="block text-xs mb-1">Khấu trừ tiền cọc đã nhận (đ)</label><input type="number" min="0" value={String(formData.TienDatCoc??0)} onChange={e=>setFormData({...formData,TienDatCoc:Number(e.target.value)})} className="w-full border rounded-lg p-2"/><p className="text-[11px] text-stone-500 mt-1">Số tiền khách đã đặt cọc, tự trừ khỏi công nợ.</p></div>
                </div><div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm space-y-1">
                  <div>Chiết khấu: <b>{Math.round(Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)*Number(formData.ChietKhauPhanTram||0)/100).toLocaleString('vi-VN')} đ</b></div>
                  <div>Tổng giảm trừ: <b>{(Number(formData.GiamGiaTrucTiep||0)+Math.round(Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)*Number(formData.ChietKhauPhanTram||0)/100)+Number(formData.KhuyenMaiBoSung||0)).toLocaleString('vi-VN')} đ</b></div>
                  <div className="text-base">Tổng giá trị hợp đồng: <b className="text-emerald-700">{Math.max(0,Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)-Number(formData.GiamGiaTrucTiep||0)-Math.round(Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)*Number(formData.ChietKhauPhanTram||0)/100)-Number(formData.KhuyenMaiBoSung||0)+Number(formData.PhuThuDichVu||0)).toLocaleString('vi-VN')} đ</b></div><div>Trừ tiền cọc đã nhận: <b>{Number(formData.TienDatCoc||0).toLocaleString('vi-VN')} đ</b></div><div className="text-base">Còn phải thanh toán sau cọc: <b className="text-amber-700">{Math.max(0,Math.max(0,Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)-Number(formData.GiamGiaTrucTiep||0)-Math.round(Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)*Number(formData.ChietKhauPhanTram||0)/100)-Number(formData.KhuyenMaiBoSung||0)+Number(formData.PhuThuDichVu||0))-Number(formData.TienDatCoc||0)).toLocaleString('vi-VN')} đ</b></div>
                </div></section>
                <section className="border rounded-xl p-4"><div className="flex justify-between items-center mb-3"><h3 className="font-bold">Lịch thanh toán</h3><button type="button" onClick={()=>setFormData(p=>({...p,LichThanhToan:[...(Array.isArray(p.LichThanhToan)?p.LichThanhToan as any[]:defaultInstallments()),{Dot:(Array.isArray(p.LichThanhToan)?(p.LichThanhToan as any[]).length:1)+1,TenDot:'Đợt '+((Array.isArray(p.LichThanhToan)?(p.LichThanhToan as any[]).length:1)+1),HanThanhToan:'',SoTienDuKien:0,GhiChu:''}]}))} className="text-xs bg-stone-900 text-white rounded-lg px-3 py-2">+ Thêm đợt</button></div>
                  {(Array.isArray(formData.LichThanhToan)?formData.LichThanhToan as any[]:defaultInstallments()).map((p:any,i:number)=><div key={i} className="grid sm:grid-cols-12 gap-2 border-b py-2 items-end">
                    <div className="sm:col-span-3"><label className="text-xs">Tên đợt</label><input value={p.TenDot||''} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,TenDot:e.target.value}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-3"><label className="text-xs">Hạn thanh toán</label><input type="date" value={p.HanThanhToan||''} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,HanThanhToan:e.target.value}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-3"><label className="text-xs">Số tiền dự kiến</label><input type="number" min="0" value={p.SoTienDuKien||0} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,SoTienDuKien:Number(e.target.value)}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-2"><label className="text-xs">Ghi chú</label><input value={p.GhiChu||''} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,GhiChu:e.target.value}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-1"><button type="button" onClick={()=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).filter((_:any,j:number)=>j!==i)}))} className="text-xs text-rose-700">Xóa</button></div>
                  </div>)}
                  <div className="mt-3 text-sm font-bold">Tổng dự kiến: {(Array.isArray(formData.LichThanhToan)?(formData.LichThanhToan as any[]).reduce((s:number,p:any)=>s+Number(p.SoTienDuKien||0),0):0).toLocaleString('vi-VN')} đ · Còn phải thanh toán sau cọc: {Math.max(0,Math.max(0,Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)-Number(formData.GiamGiaTrucTiep||0)-Math.round(Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)*Number(formData.ChietKhauPhanTram||0)/100)-Number(formData.KhuyenMaiBoSung||0)+Number(formData.PhuThuDichVu||0))-Number(formData.TienDatCoc||0)).toLocaleString('vi-VN')} đ</div>
                </section>
                <section className="rounded-xl bg-stone-50 p-4 text-sm space-y-2"><h3 className="font-bold">Tổng hợp tài chính</h3><div>Tiền cọc đã nhận: <b>{Number(formData.TienDatCoc||0).toLocaleString('vi-VN')} đ</b></div><div>Thu thêm đã duyệt: <b>{(editing?getContractCollected(editing):0).toLocaleString('vi-VN')} đ</b></div><div>Công nợ còn lại: <b>{Math.max(0,Math.max(0,Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)-Number(formData.GiamGiaTrucTiep||0)-Math.round(Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)*Number(formData.ChietKhauPhanTram||0)/100)-Number(formData.KhuyenMaiBoSung||0)+Number(formData.PhuThuDichVu||0))-Number(formData.TienDatCoc||0)-(editing?getContractCollected(editing):0)).toLocaleString('vi-VN')} đ</b></div></section>
              </div>
            ) : module === 'THU_CHI' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold mb-1">Ngày {cashflowType === 'THU' ? 'thu' : 'chi'}</label>
                  <input type="date" value={String(formData.Ngay ?? '')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-stone-50" /></div>
                <div><label className="block text-xs font-semibold mb-1">Nhân viên {cashflowType === 'THU' ? 'thu' : 'chi'}</label>
                  <input value={String(formData.NhanVien || formData.NguoiTao || loggedInStaffName || 'Đang tải tên nhân viên...')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-stone-50" /></div>
                <div><label className="block text-xs font-semibold mb-1">{cashflowType === 'THU' ? 'Nội dung thu' : 'Lý do chi'}</label>
                  <input value={String(formData.NoiDungThu ?? formData.DanhMuc ?? '')} onChange={e=>setFormData({...formData,NoiDungThu:e.target.value,DanhMuc:e.target.value})} placeholder={cashflowType === 'THU' ? 'Nhập nội dung thu...' : 'Nhập lý do chi...'} className="w-full border rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-xs font-semibold mb-1">Số tiền {cashflowType === 'THU' ? 'thu' : 'chi'}</label>
                  <input inputMode="numeric" value={formatMoneyInput(formData.SoTien ?? '')} onChange={e=>setFormData({...formData,SoTien:parseMoneyInput(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-xs font-semibold mb-1">Phương thức thanh toán</label>
                  <select value={String(formData.PhuongThucThanhToan ?? 'Tiền mặt')} onChange={e=>setFormData({...formData,PhuongThucThanhToan:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option>Tiền mặt</option><option>Chuyển khoản</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Mã hợp đồng liên quan</label>
                  <input value={String(formData.HopDongID ?? '')} onChange={e=>setFormData({...formData,HopDongID:e.target.value})} placeholder="Có thể bỏ trống" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div>
                  <label className="block text-xs font-semibold mb-2">Ảnh chứng từ</label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-sm font-semibold cursor-pointer">
                      <Upload className="w-4 h-4" /> Chọn ảnh từ máy
                      <input type="file" accept="image/*" className="hidden" onChange={e=>{handleProofImage(e.target.files?.[0]);e.currentTarget.value='';}} />
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold cursor-pointer">
                      <Camera className="w-4 h-4" /> Chụp ảnh
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{handleProofImage(e.target.files?.[0]);e.currentTarget.value='';}} />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Chọn ảnh có sẵn trong thiết bị hoặc chụp trực tiếp bằng camera điện thoại.</p>
                  {formData.AnhChungTu && <div className="mt-3 flex items-start gap-3"><img src={String(formData.AnhChungTu)} alt="Ảnh chứng từ" className="h-24 w-24 rounded-lg object-cover border" /><button type="button" onClick={()=>setFormData({...formData,AnhChungTu:''})} className="text-xs text-rose-600 font-semibold">Xóa ảnh</button></div>}
                </div>
                <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1">Ghi chú</label>
                  <textarea value={String(formData.GhiChu ?? '')} onChange={e=>setFormData({...formData,GhiChu:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} /></div>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.key === 'GhiChu' ? 'sm:col-span-2' : ''}
                >
                  <label className="block text-xs font-semibold mb-1">{field.label}</label>

                  {field.key === 'NhanVienID' ? (
                    <select
                      value={String(formData[field.key] ?? '')}
                      onChange={(event) =>
                        setFormData({ ...formData, [field.key]: event.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffList.map((staff) => (
                        <option key={staff.NhanVienID} value={staff.NhanVienID}>
                          {staff.HoTen} ({staff.NhanVienID})
                        </option>
                      ))}
                    </select>
                  ) : field.options ? (
                    <select
                      value={String(formData[field.key] ?? '')}
                      onChange={(event) =>
                        setFormData({ ...formData, [field.key]: event.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={String(formData[field.key] ?? '')}
                      onChange={(event) => {
                        const value =
                          field.type === 'number'
                            ? Number(event.target.value)
                            : event.target.value;
                        setFormData({ ...formData, [field.key]: value });
                      }}
                      placeholder={field.placeholder}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-stone-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-stone-900 text-white font-bold flex gap-2 items-center"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : module === 'THU_CHI' && isEmployee ? 'GỬI PHIẾU' : module === 'HOP_DONG' && isEmployee && !editing ? 'GỬI DUYỆT HỢP ĐỒNG' : 'Lưu dữ liệu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
