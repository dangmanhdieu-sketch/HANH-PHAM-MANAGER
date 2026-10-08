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
  VAY_CUOI: {
    title: 'Váy cưới',
    icon: Shirt,
    fields: [
      { key: 'MaVay', label: 'Mã váy' },
      { key: 'TenVay', label: 'Tên váy' },
      { key: 'BoSuuTap', label: 'Bộ sưu tập' },
      { key: 'Size', label: 'Size' },
      { key: 'Mau', label: 'Màu' },
      { key: 'GiaThue', label: 'Giá thuê', type: 'number' },
      { key: 'TrangThai', label: 'Trạng thái', placeholder: 'Sẵn sàng / Đang giữ / Đã thuê / Bảo trì' },
      { key: 'HopDongID', label: 'Mã hợp đồng đang sử dụng', placeholder: 'Có thể bỏ trống' },
      { key: 'GhiChu', label: 'Ghi chú' },
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

export const BusinessModule: React.FC<Props> = ({ module, staffList, onRefresh }) => {
  const config = CONFIG[module];
  const Icon = config.icon;

  const [records, setRecords] = useState<QuanLyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<QuanLyRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await api.quanLy.getAll(module);
      setRecords(data);
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

  const openCreate = () => {
    setEditing(null);
    setFormData(module === 'THU_CHI' ? { Ngay: getTodayLocal(), Loai: 'THU' } : {});
    setFormOpen(true);
  };

  const openEdit = (record: QuanLyRecord) => {
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
      <div className="bg-white p-5 rounded-2xl border border-[#E7DFD5] flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Icon className="w-5 h-5 text-[#bf954f]" />
            {config.title}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Dữ liệu nghiệp vụ được lưu tập trung và có thể liên kết với nhân viên, hợp đồng và tài chính.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          THÊM {config.title.toUpperCase()}
        </button>
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
                <th className="p-3 text-left">Liên kết</th>
                <th className="p-3 text-left">Cập nhật</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-stone-400">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-stone-400">Chưa có dữ liệu.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.QuanLyID} className="hover:bg-[#FAF8F5]">
                    <td className="p-3 font-semibold">{getTitle(record)}</td>
                    <td className="p-3 text-stone-500">{getLink(record)}</td>
                    <td className="p-3 text-stone-400">
                      {new Date(record.CapNhatLuc).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        className="p-2 text-stone-500 hover:text-stone-900"
                        title="Sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(record)}
                        className="p-2 text-stone-400 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
