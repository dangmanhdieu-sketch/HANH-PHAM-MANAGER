import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit3, Save, X, FileText, CheckSquare, Shirt, Wallet } from 'lucide-react';
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

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return records;
    return records.filter((record) =>
      JSON.stringify(record.DuLieu).toLowerCase().includes(keyword)
    );
  }, [records, search]);

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
        NhanVien: currentUser?.HoTen || '',
        TrangThaiDuyet: isEmployee ? 'Chờ Admin duyệt' : 'Đã duyệt',
      });
    } else {
      setFormData(module === 'HOP_DONG' ? { NgayTao: new Date().toISOString().slice(0, 10), TongGiaTri: 0, TrangThai: isEmployee ? 'Chờ admin duyệt' : 'Đã xác nhận', LoaiDichVu: 'Trọn gói cưới' } : {});
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
      if (editing) {
        await api.quanLy.update(editing.QuanLyID, formData as Record<string, any>);
      } else {
        await api.quanLy.create(module, formData as Record<string, any>);
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

  const getStatus = (record: QuanLyRecord) => String(record.DuLieu?.TrangThaiDuyet || 'Chờ Admin duyệt');

  const getTitle = (record: QuanLyRecord) => {
    const data = record.DuLieu || {};

    if (module === 'HOP_DONG') {
      return [data.MaHopDong, data.KhachHang].filter(Boolean).join(' • ') || 'Hợp đồng chưa đặt tên';
    }
    if (module === 'CONG_VIEC') {
      return data.TieuDe || 'Công việc chưa đặt tên';
    }
    if (module === 'VAY_CUOI') {
      return [data.MaVay, data.TenVay].filter(Boolean).join(' • ') || 'Váy chưa đặt tên';
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
                        ? Number(record.DuLieu.SoTien).toLocaleString('vi-VN') + ' đ'
                        : getLink(record)}
                    </td>
                    <td className="p-3">
                      {module === 'HOP_DONG' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold mb-1">Mã hợp đồng</label><input value={String(formData.MaHopDong || 'Tự tạo khi lưu')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-stone-50" /></div>
                <div><label className="block text-xs font-semibold mb-1">Ngày tạo</label><input value={String(formData.NgayTao || new Date().toISOString().slice(0,10)).slice(0,10)} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-stone-50" /></div>
                <div><label className="block text-xs font-semibold mb-1">Họ tên cô dâu/chú rể *</label><input required value={String(formData.KhachHang || '')} onChange={e=>setFormData({...formData,KhachHang:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Số điện thoại *</label><input required value={String(formData.SDT || '')} onChange={e=>setFormData({...formData,SDT:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Địa chỉ</label><input value={String(formData.DiaChi || '')} onChange={e=>setFormData({...formData,DiaChi:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Ngày cưới</label><input type="date" value={String(formData.NgayCuoi || '')} onChange={e=>setFormData({...formData,NgayCuoi:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Loại dịch vụ</label><select value={String(formData.LoaiDichVu || 'Trọn gói cưới')} onChange={e=>setFormData({...formData,LoaiDichVu:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">{['Chụp ảnh cưới','Quay phim cưới','Trang điểm cô dâu','Thuê váy cưới','Trọn gói cưới','Dịch vụ khác'].map(x=><option key={x}>{x}</option>)}</select></div>
                <div><label className="block text-xs font-semibold mb-1">Tên gói dịch vụ *</label><input required value={String(formData.GoiDichVu || '')} onChange={e=>setFormData({...formData,GoiDichVu:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Tổng giá trị hợp đồng (VNĐ) *</label><input required min="1" type="number" value={String(formData.TongGiaTri ?? '')} onChange={e=>setFormData({...formData,TongGiaTri:Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Nhân viên phụ trách</label><select value={String(formData.NhanVienID || currentUser?.NhanVienID || '')} disabled={isEmployee} onChange={e=>{const s=staffList.find(x=>x.NhanVienID===e.target.value);setFormData({...formData,NhanVienID:e.target.value,NhanVien:s?.HoTen||''})}} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">-- Chọn nhân viên --</option>{staffList.map(s=><option key={s.NhanVienID} value={s.NhanVienID}>{s.HoTen}</option>)}</select></div>
                <div><label className="block text-xs font-semibold mb-1">Phương thức thanh toán</label><select value={String(formData.PhuongThucThanhToan || 'Tiền mặt')} onChange={e=>setFormData({...formData,PhuongThucThanhToan:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option>Tiền mặt</option><option>Chuyển khoản</option><option>Kết hợp</option></select></div>
                <div className="sm:col-span-2"><label className="block text-xs font-semibold mb-1">Yêu cầu đặc biệt / Ghi chú</label><textarea rows={3} value={String(formData.GhiChu || '')} onChange={e=>setFormData({...formData,GhiChu:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
            ) : module === 'THU_CHI' ? (
                        <span className={getStatus(record) === 'Đã duyệt' ? 'px-2 py-1 rounded-full bg-emerald-50 text-emerald-700' : 'px-2 py-1 rounded-full bg-amber-50 text-amber-700'}>
                          {getStatus(record)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-stone-400">
                      {new Date(record.CapNhatLuc).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {!isEmployee && (
                        <>
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
                {editing ? 'CẬP NHẬT' : 'THÊM'} {config.title.toUpperCase()}
              </h2>
              <button type="button" onClick={closeForm} disabled={saving}>
                <X />
              </button>
            </div>

            {module === 'THU_CHI' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold mb-1">Ngày {cashflowType === 'THU' ? 'thu' : 'chi'}</label>
                  <input type="date" value={String(formData.Ngay ?? '')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-stone-50" /></div>
                <div><label className="block text-xs font-semibold mb-1">Nhân viên {cashflowType === 'THU' ? 'thu' : 'chi'}</label>
                  <input value={String(formData.NhanVien ?? currentUser?.HoTen ?? '')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-stone-50" /></div>
                <div><label className="block text-xs font-semibold mb-1">Khách hàng / Đối tượng</label>
                  <input value={String(formData.KhachHang ?? '')} onChange={e=>setFormData({...formData,KhachHang:e.target.value,DoiTuong:e.target.value})} placeholder="Nhập tên khách hàng..." className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">{cashflowType === 'THU' ? 'Nội dung thu' : 'Lý do chi'}</label>
                  <select value={String(formData.NoiDungThu ?? formData.DanhMuc ?? '')} onChange={e=>setFormData({...formData,NoiDungThu:e.target.value,DanhMuc:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    {(cashflowType === 'THU' ? ['Tiền cọc','Thanh toán hợp đồng','Tiền thuê váy','Tiền dịch vụ','Tiền phát sinh','Khác'] : ['Mua sắm','Marketing','Lương','Vận hành','Hoàn tiền','Khác']).map(x=><option key={x} value={x}>{x}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold mb-1">Số tiền {cashflowType === 'THU' ? 'thu' : 'chi'}</label>
                  <input type="number" min="0" value={String(formData.SoTien ?? '')} onChange={e=>setFormData({...formData,SoTien:Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-xs font-semibold mb-1">Phương thức thanh toán</label>
                  <select value={String(formData.PhuongThucThanhToan ?? 'Tiền mặt')} onChange={e=>setFormData({...formData,PhuongThucThanhToan:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option>Tiền mặt</option><option>Chuyển khoản</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Mã hợp đồng liên quan</label>
                  <input value={String(formData.HopDongID ?? '')} onChange={e=>setFormData({...formData,HopDongID:e.target.value})} placeholder="Có thể bỏ trống" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold mb-1">Ảnh chứng từ</label>
                  <input type="file" accept="image/*" capture="environment" onChange={e=>handleProofImage(e.target.files?.[0])} className="w-full text-xs" />
                  {formData.AnhChungTu && <img src={String(formData.AnhChungTu)} className="mt-2 h-24 rounded-lg object-cover border" />}</div>
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
                {saving ? 'Đang lưu...' : module === 'THU_CHI' && isEmployee ? 'GỬI PHIẾU' : 'Lưu dữ liệu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
