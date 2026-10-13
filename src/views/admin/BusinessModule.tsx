import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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
// Hợp đồng cũ chưa có TienDatCoc: dùng số tiền đợt thanh toán đầu tiên làm tiền cọc đã nhập trước đây.
const getContractDeposit = (data: Record<string, any> | undefined) => {
  const explicitDeposit = Number(data?.TienDatCoc || 0);
  // Form mới có trường TienDatCoc; form cũ có thể chỉ lưu cọc ở đợt thanh toán đầu.
  // Nếu TienDatCoc đang bằng 0 nhưng đợt đầu có số tiền, dùng số đợt đầu để tương thích dữ liệu cũ.
  if (Number.isFinite(explicitDeposit) && explicitDeposit > 0) return explicitDeposit;
  const installments = Array.isArray(data?.LichThanhToan) ? data.LichThanhToan : [];
  const firstInstallment = Math.max(0, Number(installments[0]?.SoTienDuKien || 0));
  return firstInstallment > 0 ? firstInstallment : Math.max(0, explicitDeposit);
};

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
  const [contractRecords, setContractRecords] = useState<QuanLyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<QuanLyRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cashflowType, setCashflowType] = useState<'THU' | 'CHI'>('THU');
  const [selectedContract, setSelectedContract] = useState<QuanLyRecord | null>(null);
  const contractPrintRef = useRef<HTMLElement | null>(null);
  const [downloadingJpeg, setDownloadingJpeg] = useState(false);

  const loadRecords = async () => {
    try {
      setLoading(true);
      let data = await api.quanLy.getAll(module);
      // Migration an toàn: hợp đồng cũ đang chờ duyệt được chuyển sang đã xác nhận.
      // Chỉ cập nhật trạng thái hợp đồng; không thay đổi phiếu thu hay trạng thái thu/chi.
      if (module === 'HOP_DONG' && !isEmployee) {
        const pendingContracts = data.filter((record) =>
          ['Chờ admin duyệt', 'Chờ Admin duyệt'].includes(String(record.DuLieu?.TrangThai || '').trim())
        );
        for (const record of pendingContracts) {
          await api.quanLy.update(record.QuanLyID, { TrangThai: 'Đã xác nhận' });
        }
        if (pendingContracts.length > 0) {
          data = await api.quanLy.getAll(module);
        }
      }
      setRecords(data);
      if (module === 'HOP_DONG') {
        let receipts = await api.quanLy.getAll('THU_CHI');
        // Đồng bộ tiền cọc cho hợp đồng cũ: chỉ tạo phiếu còn thiếu, không tạo trùng.
        // Phiếu mới luôn chờ Admin duyệt; không tự duyệt hoặc tự cộng doanh thu.
        if (!isEmployee) {
          const receiptRows = receipts;
          let createdCount = 0;
          for (const contract of data) {
            const details = contract.DuLieu || {};
            const deposit = getContractDeposit(details);
            if (deposit <= 0) continue;
            const contractCode = String(details.MaHopDong || contract.QuanLyID || '');
            const contractName = String(details.KhachHang || '');
            const hasDepositReceipt = receiptRows.some((receipt) => {
              const d = receipt.DuLieu || {};
              if (String(d.Loai || '').toUpperCase() !== 'THU') return false;
              const source = String(d.NguonTao || '');
              const linkedId = String(d.HopDongQuanLyID || '');
              const linkedCode = String(d.MaHopDong || d.HopDongID || '');
              const description = String(d.NoiDungThu || d.DanhMuc || d.GhiChu || '').toLowerCase();
              const linkedToContract = linkedId === String(contract.QuanLyID) || (!!contractCode && linkedCode === contractCode);
              const clearlyDeposit = source === 'TIEN_COC_HOP_DONG' || (description.includes('cọc') && linkedToContract);
              return linkedToContract && clearlyDeposit;
            });
            if (hasDepositReceipt) continue;
            await api.quanLy.create('THU_CHI', {
              Ngay: String(details.NgayTao || getTodayLocal()).slice(0, 10),
              Loai: 'THU',
              DanhMuc: `Thu tiền cọc · ${contractCode} · ${contractName}`,
              NoiDungThu: `Thu tiền cọc hợp đồng ${contractCode} - ${contractName}`,
              SoTien: deposit,
              HopDongID: contractCode,
              MaHopDong: contractCode,
              TenHopDong: contractName,
              DoiTuong: contractName,
              NhanVienID: String(details.NhanVienID || ''),
              NhanVien: String(details.NhanVien || details.NguoiTao || ''),
              NguoiTao: String(details.NguoiTao || details.NhanVien || 'Đồng bộ hợp đồng cũ'),
              NguoiTaoID: String(details.NguoiTaoID || details.NhanVienID || ''),
              PhuongThucThanhToan: String(details.PhuongThucThanhToan || 'Tiền mặt'),
              TrangThaiDuyet: 'Chờ Admin duyệt',
              GhiChu: `Phiếu thu cọc được đồng bộ từ hợp đồng cũ ${contractCode} - ${contractName}`,
              NguonTao: 'TIEN_COC_HOP_DONG',
              HopDongQuanLyID: contract.QuanLyID,
            });
            createdCount += 1;
          }
          if (createdCount > 0) {
            receipts = await api.quanLy.getAll('THU_CHI');
            console.info(`Đã đồng bộ ${createdCount} phiếu thu cọc từ hợp đồng cũ.`);
          }
        }
        setReceiptRecords(receipts);
      }
      if (module === 'THU_CHI') {
        const contracts = await api.quanLy.getAll('HOP_DONG');
        setContractRecords(contracts.filter((r) => !['Đã hủy', 'Hủy'].includes(String(r.DuLieu?.TrangThai || ''))));
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
      const status = String(data.TrangThaiDuyet || 'Chờ Admin duyệt').trim().toLowerCase();
      // Nhân viên chỉ xem phiếu do mình lập khi phiếu vẫn đang chờ duyệt.
      if (status === 'đã duyệt' || status === 'da duyet' || status === 'approved') return false;
      const creatorId = String(data.NguoiTaoID || data.NguoiLapID || data.NhanVienID || '');
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
      setFormData(module === 'HOP_DONG' ? { NgayTao: getTodayLocal(), TongGiaTri: 0, GiaGoiBanDau: 0, GiamGiaTrucTiep: 0, ChietKhauPhanTram: 0, KhuyenMaiBoSung: 0, PhuThuDichVu: 0, TienDatCoc: 0, LichThanhToan: defaultInstallments(), TrangThai: 'Đã xác nhận', LoaiDichVu: 'Trọn gói cưới' } : {});
    }
    setFormOpen(true);
  };

  const openEdit = (record: QuanLyRecord) => {
    if (module === 'THU_CHI' && isEmployee) return;
    setEditing(record);
    if (module === 'HOP_DONG') {
      const data = record.DuLieu || {};
      const legacyTotal = Math.max(0, Number(data.GiaGoiBanDau ?? data.TongGiaTri ?? 0));
      const installments = Array.isArray(data.LichThanhToan)
        ? data.LichThanhToan
        : [{ Dot: 1, TenDot: 'Đợt 1', HanThanhToan: '', SoTienDuKien: getContractDeposit(data), GhiChu: '' }];
      setFormData({
        ...data,
        GiaGoiBanDau: data.GiaGoiBanDau ?? legacyTotal,
        GiamGiaTrucTiep: data.GiamGiaTrucTiep ?? 0,
        ChietKhauPhanTram: data.ChietKhauPhanTram ?? 0,
        KhuyenMaiBoSung: data.KhuyenMaiBoSung ?? 0,
        PhuThuDichVu: data.PhuThuDichVu ?? 0,
        TienDatCoc: getContractDeposit(data),
        LichThanhToan: installments,
      });
    } else {
      setFormData({ ...record.DuLieu });
    }
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
      if (module === 'THU_CHI' && !editing && payload.Loai === 'THU' && payload.HopDongQuanLyID) {
        const linked = contractRecords.find((r) => r.QuanLyID === String(payload.HopDongQuanLyID));
        if (linked) { const d = linked.DuLieu || {}; payload.HopDongID = String(d.MaHopDong || linked.QuanLyID); payload.MaHopDong = payload.HopDongID; payload.TenHopDong = String(d.KhachHang || ''); payload.DoiTuong = payload.TenHopDong; payload.NguonTao = 'THU_TU_HOP_DONG'; }
      }
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
        const createdRecord = await api.quanLy.create(module, payload);

        // Tự tạo phiếu thu cho khoản cọc trên hợp đồng, bất kể người tạo.
        // Mọi khoản thu từ hợp đồng đều chờ Admin duyệt trước khi tính doanh thu.
        if (module === 'HOP_DONG') {
          const deposit = getContractDeposit(payload);
          if (deposit > 0) {
            const savedContract = createdRecord?.DuLieu || payload;
            const contractCode = String(savedContract.MaHopDong || payload.MaHopDong || createdRecord?.QuanLyID || '');
            const contractName = String(savedContract.KhachHang || payload.KhachHang || '');
            await api.quanLy.create('THU_CHI', {
              Ngay: getTodayLocal(), Loai: 'THU',
              DanhMuc: `Thu tiền cọc · ${contractCode} · ${contractName}`,
              NoiDungThu: `Thu tiền cọc hợp đồng ${contractCode} - ${contractName}`,
              SoTien: deposit, HopDongID: contractCode, MaHopDong: contractCode,
              TenHopDong: contractName, DoiTuong: contractName,
              NhanVienID: currentUser?.NhanVienID || '', NhanVien: loggedInStaffName,
              NguoiTao: loggedInStaffName, NguoiTaoID: currentUser?.NhanVienID || '',
              PhuongThucThanhToan: payload.PhuongThucThanhToan || 'Tiền mặt',
              TrangThaiDuyet: 'Chờ Admin duyệt',
              GhiChu: `Phiếu thu tự tạo từ hợp đồng ${contractCode} - ${contractName}`,
              NguonTao: 'TIEN_COC_HOP_DONG', HopDongQuanLyID: createdRecord?.QuanLyID || '',
            });
          }
        }
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

  const createContractPaymentReceipt = async (record: QuanLyRecord) => {
    const data = record.DuLieu || {};
    const code = String(data.MaHopDong || record.QuanLyID || '');
    const customer = String(data.KhachHang || '');
    const rawAmount = window.prompt(`Nhập số tiền khách vừa thanh toán cho hợp đồng ${code} - ${customer} (VNĐ):`);
    if (rawAmount === null) return;
    const amount = Number(rawAmount.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    const paymentLabel = window.prompt('Khoản thanh toán này là gì?', 'Thanh toán đợt tiếp theo');
    if (paymentLabel === null) return;
    try {
      setSaving(true);
      await api.quanLy.create('THU_CHI', {
        Ngay: getTodayLocal(),
        Loai: 'THU',
        DanhMuc: `${paymentLabel} · ${code} · ${customer}`,
        NoiDungThu: `${paymentLabel} hợp đồng ${code} - ${customer}`,
        SoTien: amount,
        HopDongID: code,
        MaHopDong: code,
        TenHopDong: customer,
        DoiTuong: customer,
        NhanVienID: currentUser?.NhanVienID || '',
        NhanVien: loggedInStaffName,
        NguoiTao: loggedInStaffName || 'Admin',
        NguoiTaoID: currentUser?.NhanVienID || '',
        PhuongThucThanhToan: 'Tiền mặt',
        TrangThaiDuyet: 'Chờ Admin duyệt',
        GhiChu: `Phiếu thu thanh toán hợp đồng ${code} - ${customer}`,
        NguonTao: 'THU_TU_HOP_DONG',
        HopDongQuanLyID: record.QuanLyID,
      });
      alert('Đã tạo phiếu thu ở trạng thái Chờ Admin duyệt. Phiếu chỉ được tính vào doanh thu sau khi Admin duyệt.');
      await loadRecords();
      onRefresh();
    } catch (error: any) {
      alert(error?.message || 'Không thể tạo phiếu thu thanh toán.');
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

  const downloadContractJpeg = async () => {
    const article = contractPrintRef.current;
    if (!article || downloadingJpeg) return;
    let exportNode: HTMLElement | null = null;
    try {
      setDownloadingJpeg(true);
      // Bản in bị ẩn trên màn hình; chụp một bản sao hiển thị ngoài vùng nhìn thấy.
      exportNode = article.cloneNode(true) as HTMLElement;
      Object.assign(exportNode.style, {
        display: 'block',
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: '794px',
        minWidth: '794px',
        maxWidth: '794px',
        height: 'auto',
        maxHeight: 'none',
        overflow: 'visible',
        boxSizing: 'border-box',
        padding: '28px',
        background: '#ffffff',
        color: '#202020',
        fontSize: '12px',
        lineHeight: '1.35',
      });
      exportNode.style.setProperty('display', 'block', 'important');
      document.body.appendChild(exportNode);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(exportNode, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
      });
      if (!canvas.width || !canvas.height) throw new Error('Không tạo được ảnh hợp đồng.');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Không thể tạo tệp JPEG.')), 'image/jpeg', 0.95);
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const contractData = selectedContract?.DuLieu || {};
      link.download = `Hop-dong-${String(contractData.MaHopDong || selectedContract?.QuanLyID || 'cuoi').replace(/[^a-zA-Z0-9_-]/g, '-')}.jpg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      alert('Chưa thể tạo ảnh JPEG. Hãy thử lại; nếu vẫn lỗi, vui lòng báo Admin kiểm tra.');
      console.error('Lỗi xuất JPEG hợp đồng:', error);
    } finally {
      exportNode?.remove();
      setDownloadingJpeg(false);
    }
  };

  const getStatus = (record: QuanLyRecord) => String(record.Module === 'HOP_DONG' ? (record.DuLieu?.TrangThai || 'Nháp') : (record.DuLieu?.TrangThaiDuyet || 'Chờ Admin duyệt'));

  const getContractCollected = (record: QuanLyRecord) => {
    const contractCode = String(record.DuLieu?.MaHopDong || record.QuanLyID);
    const approvedReceipts = receiptRecords
      .filter((receipt) =>
        String(receipt.DuLieu?.Loai || '').toUpperCase() === 'THU' &&
        receipt.DuLieu?.TrangThaiDuyet === 'Đã duyệt' &&
        (
          String(receipt.DuLieu?.HopDongID || '') === contractCode ||
          String(receipt.DuLieu?.HopDongQuanLyID || '') === String(record.QuanLyID)
        )
      )
      .reduce((sum, receipt) => sum + Math.max(0, Number(receipt.DuLieu?.SoTien || 0)), 0);
    const contractValue = Math.max(0, Number(record.DuLieu?.TongGiaTri ?? record.DuLieu?.GiaGoiBanDau ?? 0));
    // Chỉ tiền có phiếu thu được Admin duyệt mới được tính là đã thu.
    return Math.min(contractValue, approvedReceipts);
  };
  const getInstallmentsTotal = (data: Record<string, any> | undefined) => (Array.isArray(data?.LichThanhToan) ? data.LichThanhToan : []).reduce((sum: number, row: any) => sum + Math.max(0, Number(row?.SoTienDuKien || 0)), 0);

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
                {module === 'HOP_DONG' ? (
                  <>
                    <th className="p-4 text-left">MÃ HỢP ĐỒNG</th>
                    <th className="p-4 text-left">TÊN KHÁCH HÀNG</th>
                    <th className="p-4 text-left">NGÀY TẠO</th>
                    <th className="p-4 text-left">TRẠNG THÁI</th>
                    <th className="p-4 text-right">THAO TÁC</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 text-left">Nội dung chính</th>
                    <th className="p-3 text-left">Số tiền</th>
                    <th className="p-3 text-left">Trạng thái</th>
                    <th className="p-3 text-left">Cập nhật</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </>
                )}
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
                  <tr key={record.QuanLyID} onClick={module === 'HOP_DONG' ? () => setSelectedContract(record) : undefined} className={module === 'HOP_DONG' ? 'border-b border-stone-200 bg-white hover:bg-amber-50 transition-colors cursor-pointer' : 'hover:bg-[#FAF8F5]'}>
                    {module === 'HOP_DONG' ? (
                      <>
                        <td className="p-4 text-stone-900 font-bold">{String(record.DuLieu?.MaHopDong || record.QuanLyID)}</td>
                        <td className="p-4 text-stone-900 font-semibold">{String(record.DuLieu?.KhachHang || 'Chưa có tên khách hàng')}</td>
                        <td className="p-4 text-stone-700">{String(record.DuLieu?.NgayTao || record.CapNhatLuc || '').slice(0,10) || '—'}</td>
                        <td className="p-4"><span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-950 text-emerald-400">{getStatus(record)}</span></td>
                        <td className="p-4 text-right whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => openEdit(record)} className="p-2 text-stone-400 hover:text-amber-400" title="Sửa hợp đồng"><Edit3 className="w-4 h-4"/></button>
                          <button type="button" onClick={() => void handleDelete(record)} className="p-2 text-stone-400 hover:text-rose-400" title="Xóa hợp đồng"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </>
                    ) : (
                    <>
                    <td className="p-3 font-semibold">{getTitle(record)}</td>
                    <td className="p-3 text-stone-700 font-semibold">
                      {module === 'THU_CHI' && record.DuLieu?.SoTien
                        ? (String(record.DuLieu?.Loai || '').toUpperCase() === 'CHI' ? '-' : '+') + Number(record.DuLieu.SoTien).toLocaleString('vi-VN') + ' đ'
                        : module === 'HOP_DONG'
                          ? `Giá trị ${Math.max(0, Number(record.DuLieu?.GiaGoiBanDau ?? record.DuLieu?.TongGiaTri ?? 0) - Number(record.DuLieu?.GiamGiaTrucTiep || 0) - Math.round(Number(record.DuLieu?.GiaGoiBanDau ?? record.DuLieu?.TongGiaTri ?? 0) * Number(record.DuLieu?.ChietKhauPhanTram || 0) / 100) - Number(record.DuLieu?.KhuyenMaiBoSung || 0) + Number(record.DuLieu?.PhuThuDichVu || 0)).toLocaleString('vi-VN')} đ · Cọc ${getContractDeposit(record.DuLieu).toLocaleString('vi-VN')} đ · Đã thu ${getContractCollected(record).toLocaleString('vi-VN')} đ · Còn ${Math.max(0, Math.max(0, Number(record.DuLieu?.GiaGoiBanDau ?? record.DuLieu?.TongGiaTri ?? 0) - Number(record.DuLieu?.GiamGiaTrucTiep || 0) - Math.round(Number(record.DuLieu?.GiaGoiBanDau ?? record.DuLieu?.TongGiaTri ?? 0) * Number(record.DuLieu?.ChietKhauPhanTram || 0) / 100) - Number(record.DuLieu?.KhuyenMaiBoSung || 0) + Number(record.DuLieu?.PhuThuDichVu || 0)) - getContractCollected(record)).toLocaleString('vi-VN')} đ`
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
                          {module === 'HOP_DONG' && (
                            <button type="button" disabled={saving} onClick={() => void createContractPaymentReceipt(record)} className="px-2.5 py-1.5 mr-1 rounded-lg bg-emerald-700 text-white text-[10px] font-bold">+ PHIẾU THU</button>
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
                    </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {module === 'HOP_DONG' && selectedContract && (() => {
        const d = selectedContract.DuLieu || {};
        const code = String(d.MaHopDong || selectedContract.QuanLyID);
        const customer = String(d.KhachHang || 'Chưa có tên');
        const value = Math.max(0, Number(d.TongGiaTri ?? d.GiaGoiBanDau ?? 0) - Number(d.GiamGiaTrucTiep || 0) - Math.round(Number(d.GiaGoiBanDau ?? d.TongGiaTri ?? 0) * Number(d.ChietKhauPhanTram || 0) / 100) - Number(d.KhuyenMaiBoSung || 0) + Number(d.PhuThuDichVu || 0));
        const collected = getContractCollected(selectedContract);
        const receipts = receiptRecords.filter((receipt) => String(receipt.DuLieu?.Loai || '').toUpperCase() === 'THU' && (String(receipt.DuLieu?.HopDongQuanLyID || '') === String(selectedContract.QuanLyID) || String(receipt.DuLieu?.HopDongID || receipt.DuLieu?.MaHopDong || '') === code));
        const money = (n: unknown) => Number(n || 0).toLocaleString('vi-VN') + ' đ';
        const field = (label: string, value: unknown) => <div className="rounded-xl bg-stone-900/70 p-3"><div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div><div className="mt-1 text-sm font-semibold text-stone-100 break-words">{String(value || '—')}</div></div>;
        return <div className="fixed inset-0 z-[90] bg-[#111110] text-stone-100 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex items-center justify-start">
              <button type="button" onClick={() => setSelectedContract(null)} className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-white"><X className="w-4 h-4"/> Quay lại danh sách hợp đồng</button>
            </div>
            <style>{`@media print {
              @page { size: A4 portrait; margin: 5mm; }
              html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
              body * { visibility: hidden !important; }
              .contract-print-sheet, .contract-print-sheet * { visibility: visible !important; }
              .contract-print-sheet {
                display: block !important; position: absolute !important; left: 0 !important; top: 0 !important;
                width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;
                margin: 0 !important; padding: 0 !important; overflow: visible !important;
                background: #fff !important; color: #202020 !important; font-family: Arial, sans-serif !important;
                font-size: 9pt !important; line-height: 1.32 !important;
                -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
              }
              .contract-print-sheet header { gap: 10px !important; padding-bottom: 7px !important; margin-bottom: 7px !important; border-bottom-width: 2px !important; }
              .contract-print-sheet header > div:first-child { width: 42px !important; height: 42px !important; font-size: 16px !important; }
              .contract-print-sheet h1 { font-size: 14pt !important; margin: 8px 0 3px !important; line-height: 1.2 !important; }
              .contract-print-sheet h2 { font-size: 9.5pt !important; margin: 9px 0 5px !important; padding-bottom: 4px !important; line-height: 1.2 !important; }
              .contract-print-sheet p { font-size: 9pt !important; line-height: 1.38 !important; margin-top: 4px !important; margin-bottom: 5px !important; }
              .contract-print-sheet section { margin-top: 9px !important; }
              .contract-print-sheet table { width: 100% !important; border-collapse: collapse !important; margin-top: 5px !important; font-size: 8pt !important; break-inside: avoid !important; }
              .contract-print-sheet th, .contract-print-sheet td { border: 1px solid #c9c2b8 !important; padding: 4px 5px !important; text-align: left !important; line-height: 1.25 !important; }
              .contract-print-sheet th { background: #f4efe7 !important; }
              .contract-print-sheet ol { margin: 4px 0 !important; padding-left: 18px !important; line-height: 1.3 !important; }
              .contract-print-sheet li { margin: 0 0 3px !important; }
              .contract-print-sheet .print-no-break { break-inside: avoid !important; }
              .contract-print-sheet section:last-of-type { margin-top: 15px !important; gap: 20px !important; }
              .contract-print-sheet section:last-of-type p { font-size: 8pt !important; }
              .contract-print-sheet section:last-of-type div[style*="height"] { height: 48px !important; }
              .contract-print-sheet footer { display: none !important; }
            }
            @media screen { .contract-print-sheet { display: none; } }`}</style>
            <article ref={contractPrintRef} className="contract-print-sheet">
              <header style={{display:'flex',alignItems:'center',gap:'16px',borderBottom:'3px solid #b08a45',paddingBottom:'14px',marginBottom:'18px'}}>
                <div style={{width:'66px',height:'66px',border:'2px solid #b08a45',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:700,color:'#9a763b',flexShrink:0}}>HP</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'19px',fontWeight:700,letterSpacing:'1.4px'}}>HẠNH PHẠM</div>
                  <div style={{fontSize:'11px',letterSpacing:'3px',color:'#9a763b',fontWeight:700}}>LUXURY BRIDAL</div>
                  <div style={{fontSize:'9px',marginTop:'5px'}}>HỢP ĐỒNG DỊCH VỤ CƯỚI · Mã hợp đồng: {code}</div>
                </div>
                <div style={{textAlign:'right',fontSize:'9px'}}><b>HỢP ĐỒNG</b><br/>Mã: {code}</div>
              </header>
              <h1 style={{textAlign:'center',fontSize:'17px',fontWeight:700,margin:'12px 0 4px'}}>HỢP ĐỒNG DỊCH VỤ CƯỚI</h1>
              <p style={{textAlign:'center',fontSize:'10px',marginBottom:'12px'}}>Số: {code} <span style={{margin:'0 8px',color:'#b08a45'}}>•</span> Ngày tạo: {String(d.NgayTao || selectedContract.CapNhatLuc || '').slice(0,10) || '—'}</p>
              <p style={{lineHeight:1.5,marginTop:'8px',marginBottom:'8px'}}>Hai bên cùng thống nhất lập hợp đồng dịch vụ với các nội dung dưới đây:</p>
              <section className="print-no-break" style={{marginTop:'12px'}}>
                <h2 style={{fontSize:'12px',fontWeight:700,borderBottom:'1px solid #b08a45',paddingBottom:'5px'}}>ĐIỀU 1. THÔNG TIN CÁC BÊN</h2>
                <p style={{lineHeight:1.7}}><b>BÊN A – ĐƠN VỊ CUNG CẤP DỊCH VỤ:</b> HẠNH PHẠM Luxury Bridal<br/>Đại diện/nhân viên phụ trách: {String(d.NguoiTao || d.NhanVienTao || d.TenNguoiTao || d.NhanVien || staffList.find(s=>s.NhanVienID===d.NhanVienID)?.HoTen || '………………………………')}<br/>Địa chỉ: Mặt Định, 321 Lê Quý Đôn, Tân Xuân, Phường Bình Phước, TP Đồng Nai<br/>Điện thoại: 0936347879</p>
                <p style={{lineHeight:1.7}}><b>BÊN B – KHÁCH HÀNG:</b><br/>Tên cô dâu/chú rể: {customer}<br/>Số điện thoại: {String(d.SDT || '………………………………')}<br/>Địa chỉ: {String(d.DiaChi || '………………………………')}</p>
              </section>
              <section className="print-no-break" style={{marginTop:'12px'}}>
                <h2 style={{fontSize:'12px',fontWeight:700,borderBottom:'1px solid #b08a45',paddingBottom:'5px'}}>ĐIỀU 2. NỘI DUNG DỊCH VỤ VÀ LỊCH CƯỚI</h2>
                <table><tbody>
                  <tr><th>Loại dịch vụ</th><td>{String(d.LoaiDichVu || 'Dịch vụ cưới')}</td><th>Gói dịch vụ</th><td>{String(d.GoiDichVu || '—')}</td></tr>
                  <tr><th>Ngày cưới nhà trai</th><td>{String(d.NgayCuoiNhaTrai || '—')}</td><th>Ngày cưới nhà gái</th><td>{String(d.NgayCuoiNhaGai || '—')}</td></tr>
                  <tr><th>Yêu cầu / ghi chú</th><td colSpan={3}>{String(d.GhiChu || 'Theo nội dung hai bên thống nhất')}</td></tr>
                </tbody></table>
              </section>
              <section style={{marginTop:'12px'}}>
                <h2 style={{fontSize:'12px',fontWeight:700,borderBottom:'1px solid #b08a45',paddingBottom:'5px'}}>ĐIỀU 3. GIÁ TRỊ HỢP ĐỒNG VÀ THANH TOÁN</h2>
                <table><tbody>
                  <tr><th>Giá gói ban đầu</th><td>{money(d.GiaGoiBanDau ?? d.TongGiaTri)}</td><th>Giảm giá trực tiếp</th><td>{money(d.GiamGiaTrucTiep)}</td></tr>
                  <tr><th>Chiết khấu</th><td>{d.ChietKhauPhanTram ? String(d.ChietKhauPhanTram)+'%' : '0%'}</td><th>Phụ thu dịch vụ</th><td>{money(d.PhuThuDichVu)}</td></tr>
                  <tr><th colSpan={3}>TỔNG GIÁ TRỊ HỢP ĐỒNG</th><td><b>{money(value)}</b></td></tr>
                  <tr><th colSpan={3}>Đã thu được Admin duyệt</th><td>{money(collected)}</td></tr>
                  <tr><th colSpan={3}>Còn phải thanh toán</th><td>{money(Math.max(0,value-collected))}</td></tr>
                </tbody></table>
                <table style={{marginTop:'10px'}}><thead><tr><th>Đợt thanh toán</th><th>Hạn thanh toán</th><th>Số tiền dự kiến</th><th>Ghi chú</th></tr></thead><tbody>
                  {(Array.isArray(d.LichThanhToan)?d.LichThanhToan:[]).length ? (d.LichThanhToan as any[]).map((p:any,i:number)=><tr key={i}><td>{p.TenDot || 'Đợt '+(i+1)}</td><td>{p.HanThanhToan || '—'}</td><td>{money(p.SoTienDuKien)}</td><td>{p.GhiChu || '—'}</td></tr>) : <tr><td colSpan={4}>Lịch thanh toán theo thỏa thuận giữa hai bên.</td></tr>}
                </tbody></table>
              </section>
              <section style={{marginTop:'12px'}}>
                <h2 style={{fontSize:'12px',fontWeight:700,borderBottom:'1px solid #b08a45',paddingBottom:'5px'}}>ĐIỀU 4. THỎA THUẬN CHUNG</h2>
                <ol style={{paddingLeft:'18px',lineHeight:1.65}}>
                  <li>Bên A thực hiện dịch vụ theo gói, lịch và các nội dung đã thống nhất trong hợp đồng này.</li>
                  <li>Bên B thanh toán theo các đợt và số tiền đã thỏa thuận; các khoản thanh toán được xác nhận bằng phiếu thu.</li>
                  <li>Mọi thay đổi về dịch vụ, thời gian, chi phí hoặc yêu cầu phát sinh cần được hai bên xác nhận trước khi thực hiện.</li>
                  <li>Việc thay đổi lịch, hủy dịch vụ, hoàn/không hoàn tiền và xử lý phát sinh thực hiện theo thỏa thuận bằng văn bản được hai bên xác nhận và quy định pháp luật hiện hành.</li>
                  <li>Hợp đồng có hiệu lực khi hai bên ký xác nhận; hợp đồng được lập thành hai bản có giá trị như nhau, mỗi bên giữ một bản.</li>
                </ol>
              </section>
              <section className="print-no-break" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'28px',marginTop:'30px',textAlign:'center'}}>
                <div><b>ĐẠI DIỆN BÊN A</b><p style={{fontSize:'9px',marginTop:'4px'}}>(Ký, ghi rõ họ tên)</p><div style={{height:'76px'}}></div><b>HẠNH PHẠM Luxury Bridal</b></div>
                <div><b>ĐẠI DIỆN BÊN B – KHÁCH HÀNG</b><p style={{fontSize:'9px',marginTop:'4px'}}>(Ký, ghi rõ họ tên)</p><div style={{height:'76px'}}></div><b>{customer}</b></div>
              </section>
            </article>
            <div className="rounded-2xl border border-stone-800 bg-gradient-to-br from-stone-900 to-stone-950 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">Chi tiết hợp đồng</p><h1 className="mt-2 text-3xl font-bold">{code}</h1><p className="mt-2 text-lg text-stone-300">{customer}</p><p className="mt-1 text-sm text-stone-500">Ngày tạo: {String(d.NgayTao || selectedContract.CapNhatLuc || '').slice(0,10) || '—'}</p></div>
                <span className="rounded-full bg-emerald-950 px-3 py-1.5 text-sm font-semibold text-emerald-400">{getStatus(selectedContract)}</span>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-black/25 p-4"><p className="text-xs text-stone-400">Giá trị hợp đồng</p><p className="mt-2 text-xl font-bold">{money(value)}</p></div>
                <div className="rounded-xl bg-black/25 p-4"><p className="text-xs text-stone-400">Đã thu được Admin duyệt</p><p className="mt-2 text-xl font-bold text-emerald-400">{money(collected)}</p></div>
                <div className="rounded-xl bg-black/25 p-4"><p className="text-xs text-stone-400">Còn phải thu</p><p className="mt-2 text-xl font-bold text-amber-400">{money(Math.max(0,value-collected))}</p></div>
              </div>
            </div>
            <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-5">
              <h2 className="mb-4 text-base font-bold">Thông tin khách hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {field('Tên khách hàng / cô dâu chú rể', customer)}{field('Số điện thoại', d.SDT)}{field('Địa chỉ', d.DiaChi)}{field('Ngày cưới nhà trai', d.NgayCuoiNhaTrai)}{field('Ngày cưới nhà gái', d.NgayCuoiNhaGai)}{field('Nhân viên phụ trách', d.NhanVien || staffList.find(s=>s.NhanVienID===d.NhanVienID)?.HoTen)}{field('Loại dịch vụ', d.LoaiDichVu)}{field('Gói dịch vụ', d.GoiDichVu)}{field('Ghi chú', d.GhiChu)}
              </div>
            </section>
            <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-5">
              <h2 className="mb-4 text-base font-bold">Giá trị & lịch thanh toán</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {field('Giá gói ban đầu', money(d.GiaGoiBanDau ?? d.TongGiaTri))}{field('Giảm giá trực tiếp', money(d.GiamGiaTrucTiep))}{field('Chiết khấu (%)', d.ChietKhauPhanTram ? String(d.ChietKhauPhanTram)+'%' : '0%')}{field('Phụ thu dịch vụ', money(d.PhuThuDichVu))}
              </div>
              <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-stone-800 text-left text-stone-500"><th className="p-3">Đợt thanh toán</th><th className="p-3">Hạn thanh toán</th><th className="p-3 text-right">Số tiền dự kiến</th><th className="p-3">Ghi chú</th></tr></thead><tbody>{(Array.isArray(d.LichThanhToan)?d.LichThanhToan:[]).map((p:any,i:number)=><tr key={i} className="border-b border-stone-900"><td className="p-3">{p.TenDot || 'Đợt '+(i+1)}</td><td className="p-3">{p.HanThanhToan || '—'}</td><td className="p-3 text-right">{money(p.SoTienDuKien)}</td><td className="p-3 text-stone-400">{p.GhiChu || '—'}</td></tr>)}</tbody></table></div>
            </section>
            <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div><h2 className="text-base font-bold">Lịch sử phiếu thu</h2><p className="mt-1 text-xs text-stone-500">Thêm khoản khách vừa thanh toán tại đây; phiếu sẽ chờ Admin duyệt.</p></div>
                <button type="button" disabled={saving || collected >= value} onClick={() => void createContractPaymentReceipt(selectedContract)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold hover:bg-emerald-600 disabled:opacity-40"><Plus className="w-4 h-4"/> Thêm cọc / thanh toán</button>
                <span className="text-xs text-stone-500">{receipts.length} phiếu</span>
              </div>
              {receipts.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-stone-800 text-left text-stone-500"><th className="p-3">Ngày thu</th><th className="p-3">Nội dung</th><th className="p-3 text-right">Số tiền</th><th className="p-3">Trạng thái</th></tr></thead><tbody>{receipts.map(receipt=><tr key={receipt.QuanLyID} className="border-b border-stone-900"><td className="p-3">{String(receipt.DuLieu?.Ngay || '').slice(0,10) || '—'}</td><td className="p-3">{String(receipt.DuLieu?.NoiDungThu || receipt.DuLieu?.DanhMuc || 'Phiếu thu')}</td><td className="p-3 text-right font-semibold">{money(receipt.DuLieu?.SoTien)}</td><td className="p-3"><span className={receipt.DuLieu?.TrangThaiDuyet === 'Đã duyệt' ? 'text-emerald-400' : 'text-amber-400'}>{String(receipt.DuLieu?.TrangThaiDuyet || 'Chờ Admin duyệt')}</span></td></tr>)}</tbody></table></div> : <p className="text-sm text-stone-500">Chưa có phiếu thu liên kết với hợp đồng này.</p>}
            </section>
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-950/60 p-5">
              <div><h2 className="font-bold">Hoàn thành hợp đồng</h2><p className="mt-1 text-sm text-stone-500">Chỉ hoàn thành khi tổng phiếu thu đã được Admin duyệt đủ giá trị hợp đồng.</p></div>
              {getStatus(selectedContract) === 'Hoàn thành' ? <span className="rounded-full bg-emerald-950 px-3 py-2 text-sm font-semibold text-emerald-400">Hợp đồng đã hoàn thành</span> : <button type="button" disabled={saving || collected < value} onClick={async () => {
                if (collected < value) { alert('Chưa thể hoàn thành: số tiền đã được Admin duyệt chưa đủ giá trị hợp đồng.'); return; }
                if (!window.confirm('Xác nhận hoàn thành hợp đồng này?')) return;
                try {
                  setSaving(true);
                  await api.quanLy.update(selectedContract.QuanLyID, { TrangThai: 'Hoàn thành' });
                  await loadRecords();
                  onRefresh();
                  setSelectedContract((prev) => prev ? { ...prev, DuLieu: { ...prev.DuLieu, TrangThai: 'Hoàn thành' } } : prev);
                  alert('Đã cập nhật trạng thái hợp đồng: Hoàn thành.');
                } catch (error: any) { alert(error?.message || 'Không thể hoàn thành hợp đồng.'); }
                finally { setSaving(false); }
              }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"><CheckSquare className="w-4 h-4"/> Hoàn thành hợp đồng</button>}
            </section>
            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-800 pt-5 pb-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-500"><FileText className="w-4 h-4"/> In / Tải PDF</button>
              <button type="button" disabled={downloadingJpeg} onClick={() => void downloadContractJpeg()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60">{downloadingJpeg ? 'Đang tạo JPEG...' : 'Tải JPEG'}</button>
              <button type="button" onClick={() => { const r = selectedContract; setSelectedContract(null); openEdit(r); }} className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-5 py-3 text-sm hover:bg-stone-800"><Edit3 className="w-4 h-4"/> Sửa hợp đồng</button>
            </div>
          </div>
        </div>;
      })()}

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
                <section className="border rounded-xl p-4"><h3 className="font-bold mb-3">Giá trị hợp đồng & thanh toán</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className="block text-xs mb-1">Giá gói ban đầu (đ)</label><input type="number" min="0" value={String(formData.GiaGoiBanDau??0)} onChange={e=>setFormData({...formData,GiaGoiBanDau:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div>
                    <div><label className="block text-xs mb-1">Giảm giá trực tiếp (đ)</label><input type="number" min="0" value={String(formData.GiamGiaTrucTiep??0)} onChange={e=>setFormData({...formData,GiamGiaTrucTiep:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div>
                    <div><label className="block text-xs mb-1">Phụ thu dịch vụ (đ)</label><input type="number" min="0" value={String(formData.PhuThuDichVu??0)} onChange={e=>setFormData({...formData,PhuThuDichVu:Number(e.target.value)})} className="w-full border rounded-lg p-2"/></div>
                  </div>
                  <div className="flex justify-between items-center mt-5 mb-3"><h4 className="font-bold">Các đợt thanh toán</h4><button type="button" onClick={()=>setFormData(p=>({...p,LichThanhToan:[...(Array.isArray(p.LichThanhToan)?p.LichThanhToan as any[]:defaultInstallments()),{Dot:(Array.isArray(p.LichThanhToan)?(p.LichThanhToan as any[]).length:1)+1,TenDot:'Đợt '+((Array.isArray(p.LichThanhToan)?(p.LichThanhToan as any[]).length:1)+1),HanThanhToan:'',SoTienDuKien:0,GhiChu:''}]}))} className="text-xs bg-stone-900 text-white rounded-lg px-3 py-2">+ Thêm đợt</button></div>
                  {(Array.isArray(formData.LichThanhToan)?formData.LichThanhToan as any[]:defaultInstallments()).map((p:any,i:number)=><div key={i} className="grid sm:grid-cols-12 gap-2 border-b py-2 items-end">
                    <div className="sm:col-span-3"><label className="text-xs">Tên đợt</label><input value={p.TenDot||''} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,TenDot:e.target.value}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-3"><label className="text-xs">Hạn thanh toán</label><input type="date" value={p.HanThanhToan||''} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,HanThanhToan:e.target.value}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-3"><label className="text-xs">{i===0?'Tiền cọc / đợt 1 (đ)':'Số tiền đợt '+(i+1)+' (đ)'}</label><input type="number" min="0" value={p.SoTienDuKien||0} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,SoTienDuKien:Number(e.target.value)}:z),...(i===0?{TienDatCoc:Number(e.target.value)}:{})}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-2"><label className="text-xs">Ghi chú</label><input value={p.GhiChu||''} onChange={e=>setFormData(x=>({...x,LichThanhToan:(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).map((z:any,j:number)=>j===i?{...z,GhiChu:e.target.value}:z)}))} className="w-full border rounded p-2 text-xs"/></div>
                    <div className="sm:col-span-1"><button type="button" onClick={()=>setFormData(x=>{const rows=(Array.isArray(x.LichThanhToan)?x.LichThanhToan as any[]:defaultInstallments()).filter((_:any,j:number)=>j!==i);return {...x,LichThanhToan:rows,TienDatCoc:Number(rows[0]?.SoTienDuKien||0)}})} className="text-xs text-rose-700">Xóa</button></div>
                  </div>)}
                  <div className="mt-3 text-sm font-bold">Tổng các đợt dự kiến: {(Array.isArray(formData.LichThanhToan)?(formData.LichThanhToan as any[]).reduce((sum:number,row:any)=>sum+Number(row.SoTienDuKien||0),0):0).toLocaleString('vi-VN')} đ</div>
                  <div className="mt-4 rounded-lg bg-stone-50 border p-3 text-sm space-y-2">
                    <div className="text-base">Tổng giá trị hợp đồng: <b className="text-emerald-700">{Math.max(0,Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)-Number(formData.GiamGiaTrucTiep||0)+Number(formData.PhuThuDichVu||0)).toLocaleString('vi-VN')} đ</b></div>
                    <div>Tiền cọc / đợt 1: <b>{Number(formData.TienDatCoc||0).toLocaleString('vi-VN')} đ</b></div>
                    <div>Còn phải thanh toán theo các đợt đã nhập: <b className="text-amber-700">{Math.max(0,Math.max(0,Number(formData.GiaGoiBanDau||formData.TongGiaTri||0)-Number(formData.GiamGiaTrucTiep||0)+Number(formData.PhuThuDichVu||0))-(Array.isArray(formData.LichThanhToan)?(formData.LichThanhToan as any[]).reduce((sum:number,row:any)=>sum+Math.max(0,Number(row.SoTienDuKien||0)),0):0)).toLocaleString('vi-VN')} đ</b></div>
                  </div>
                </section>
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
                <div><label className="block text-xs font-semibold mb-1">Liên kết hợp đồng</label>
                  <select value={String(formData.HopDongQuanLyID || '')} onChange={e=>{const contract=contractRecords.find(r=>r.QuanLyID===e.target.value);const d=contract?.DuLieu||{};const code=String(d.MaHopDong||contract?.QuanLyID||'');const name=String(d.KhachHang||'');setFormData({...formData,HopDongQuanLyID:contract?.QuanLyID||'',HopDongID:code,MaHopDong:code,TenHopDong:name,DoiTuong:name,DanhMuc:cashflowType==='THU'?(`Thu tiền hợp đồng ${code} - ${name}`):String(formData.DanhMuc||''),NoiDungThu:cashflowType==='THU'?(`Thu tiền hợp đồng ${code} - ${name}`):String(formData.NoiDungThu||'')})}} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">-- Không liên kết hợp đồng --</option>{contractRecords.map(r=>{const d=r.DuLieu||{};return <option key={r.QuanLyID} value={r.QuanLyID}>{String(d.MaHopDong||r.QuanLyID)} · {String(d.KhachHang||'Chưa có tên')}</option>})}</select>{formData.HopDongID && <p className="text-xs text-stone-500 mt-1">Mã: {String(formData.HopDongID)} · Khách hàng: {String(formData.TenHopDong||formData.DoiTuong||'')}</p>}</div>
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
                {saving ? 'Đang lưu...' : module === 'THU_CHI' && isEmployee ? 'GỬI PHIẾU' : module === 'HOP_DONG' && !editing ? 'TẠO HỢP ĐỒNG' : 'Lưu dữ liệu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
