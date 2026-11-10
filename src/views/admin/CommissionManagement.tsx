import React, { useEffect, useRef, useState } from 'react';
import { formatMoney, formatNumber } from '../../utils/format';
import {
  Award,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Download,
  DollarSign,
  Calendar,
  Sparkles,
  AlertCircle,
  X,
  Image as ImageIcon,
  Camera,
  Clock,
  User,
  Upload,
} from 'lucide-react';
import type { HoaHong, NhanVien, LoaiKhoanThuNhap, TrangThaiHoaHong } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { api } from '../../api';

interface CommissionManagementProps {
  commissionList: HoaHong[];
  staffList: NhanVien[];
  onRefresh: () => void;
}

export const CommissionManagement: React.FC<CommissionManagementProps> = ({
  commissionList,
  staffList,
  onRefresh,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.NhanVienID || '');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [showPendingQueue, setShowPendingQueue] = useState(false);
  const [editingCommission, setEditingCommission] = useState<HoaHong | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [customShowTask, setCustomShowTask] = useState(false);
  const [deleteConfirmHH, setDeleteConfirmHH] = useState<HoaHong | null>(null);
  const [approveConfirmHH, setApproveConfirmHH] = useState<{ hh: HoaHong; dongY: boolean } | null>(null);
  const [approvingHH, setApprovingHH] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  // Reflect a completed server-side review locally; avoid a full app-wide reload
  // (which can freeze the mobile screen when the commission ledger is large).
  const [reviewedStatuses, setReviewedStatuses] = useState<Record<string, TrangThaiHoaHong>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const openCamera = async () => {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError('Không thể mở camera. Hãy cấp quyền Camera cho trình duyệt rồi thử lại.');
    }
  };

  const captureProofPhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setCameraError('Camera chưa sẵn sàng. Vui lòng chờ 1–2 giây rồi chụp lại.');
      return;
    }
    const canvas = document.createElement('canvas');
    // Keep proof photos readable while limiting Base64 payload size. Smaller
    // images reduce Firestore serialization, network transfer and mobile load time.
    // Existing stored photos are untouched; this applies only to new captures.
    const maxSize = 960;
    const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.62);
    setFormData((prev) => ({ ...prev, AnhChungTu: dataUrl }));
    stopCamera();
    setCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Form state
  const [formData, setFormData] = useState({
    NhanVienID: staffList[0]?.NhanVienID || 'NV002',
    ChiNhanh: 'HP_DONG_XOAI',
    Ngay: new Date().toISOString().split('T')[0],
    NoiDung: '',
    LoaiKhoan: 'Hoa Hồng' as LoaiKhoanThuNhap,
    DoanhThu: 20000000,
    TyLeHoaHong: 5,
    SoTienHoaHong: 1000000,
    AnhChungTu: '',
    GhiChu: '',
    TrangThaiThanhToan: 'Chưa thanh toán' as 'Đã thanh toán' | 'Chưa thanh toán',
    PhuongThucThanhToan: '' as '' | 'Chuyển khoản' | 'Tiền mặt',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered list
  const currentCommissionList = commissionList.map((hh) =>
    reviewedStatuses[hh.HoaHongID] ? { ...hh, TrangThai: reviewedStatuses[hh.HoaHongID] } : hh
  );

  const filteredList = currentCommissionList.filter((hh) => {
    const matchStaff = showPendingQueue || hh.NhanVienID === selectedStaffId;
    const matchBranch = selectedBranch === 'ALL' || hh.ChiNhanh === selectedBranch;
    const matchStatus = showPendingQueue ? hh.TrangThai === 'Chờ duyệt' : (selectedStatus === 'ALL' || hh.TrangThai === selectedStatus);
    const matchMonth = (hh.Ngay || '').startsWith(selectedMonth);
    const matchDate = showPendingQueue || !selectedDate || hh.Ngay === selectedDate;
    const isShow = hh.LoaiKhoan === 'Tiền Show' || hh.NoiDung.includes('Tiền Show');
    const matchType =
      selectedType === 'ALL' ||
      (selectedType === 'Tiền Show' && isShow) ||
      (selectedType === 'Hoa Hồng' && !isShow);

    return matchStaff && matchBranch && matchStatus && matchType && matchMonth && matchDate;
  });

  // Calculate metrics
  const totalApprovedMoney = filteredList
    .filter((hh) => hh.TrangThai === 'Đã duyệt')
    .reduce((sum, hh) => sum + hh.SoTienHoaHong, 0);

  const pendingList = currentCommissionList.filter((hh) => hh.TrangThai === 'Chờ duyệt');
  const totalPendingMoney = pendingList.reduce((sum, hh) => sum + hh.SoTienHoaHong, 0);

  // Computed amount for form preview
  const computedAmount =
    formData.LoaiKhoan === 'Tiền Show'
      ? formData.SoTienHoaHong
      : (Number(formData.TyLeHoaHong) > 0 ? Math.round((Number(formData.DoanhThu) * Number(formData.TyLeHoaHong)) / 100) : Number(formData.SoTienHoaHong || 0));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.NoiDung.trim()) {
      setFormError('Vui lòng nhập nội dung hợp đồng hoặc dịch vụ.');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      if (!['HP_DONG_XOAI', 'HP_BINH_LONG'].includes(formData.ChiNhanh)) throw new Error('Vui lòng chọn chi nhánh.');
      if (editingCommission) {
        await api.commission.update(editingCommission.HoaHongID, {
          NhanVienID: formData.NhanVienID, Ngay: formData.Ngay, NoiDung: formData.NoiDung, ChiNhanh: formData.ChiNhanh as 'HP_DONG_XOAI' | 'HP_BINH_LONG',
          LoaiKhoan: formData.LoaiKhoan, DoanhThu: formData.DoanhThu,
          TyLeHoaHong: formData.TyLeHoaHong, SoTienHoaHong: computedAmount, GhiChu: formData.GhiChu,
        });
      } else {
        await api.commission.create({ ...formData, SoTienHoaHong: computedAmount });
      }
      setModalOpen(false);
      setEditingCommission(null);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || (editingCommission ? 'Lỗi khi sửa hoa hồng' : 'Lỗi khi tạo hoa hồng'));
    } finally {
      setSaving(false);
    }
  };

  const openEditCommission = (hh: HoaHong) => {
    setEditingCommission(hh);
    setCustomShowTask(hh.LoaiKhoan === 'Tiền Show' && !['MK đám hỏi, rước dâu, nhà thờ','MK cô dâu Đám cưới','MK chụp cổng 1c','MK chụp cổng 2c','MK tiệc tại tiệm','MK tiệc tại nhà khách','MK bà sui','Chụp TT Máy lẻ','Chụp TT máy Tặng','Chụp PS máy Lẻ','Chụp PS Kèm Máy TT','Quay PS','Quay TT'].includes(hh.NoiDung));
    setFormData({ NhanVienID: hh.NhanVienID, ChiNhanh: hh.ChiNhanh || 'HP_DONG_XOAI', Ngay: hh.Ngay, NoiDung: hh.NoiDung, LoaiKhoan: hh.LoaiKhoan || 'Hoa Hồng', DoanhThu: Number(hh.DoanhThu || 0), TyLeHoaHong: Number(hh.TyLeHoaHong || 0), SoTienHoaHong: Number(hh.SoTienHoaHong || 0), AnhChungTu: hh.AnhChungTu || '', GhiChu: hh.GhiChu || '', TrangThaiThanhToan: hh.TrangThaiThanhToan || 'Chưa thanh toán', PhuongThucThanhToan: hh.PhuongThucThanhToan || '' });
    setFormError(null);
    setModalOpen(true);
  };

  const handleApproveAction = async () => {
    if (!approveConfirmHH || approvingHH) return;
    setApprovingHH(true);
    setApproveError(null);
    console.info('[Commission] Admin confirmed approval action:', {
      commissionId: approveConfirmHH.hh.HoaHongID,
      approve: approveConfirmHH.dongY,
    });
    try {
      const result = await api.commission.approve(
        approveConfirmHH.hh.HoaHongID,
        approveConfirmHH.dongY
      );
      console.info('[Commission] Approval API completed:', result?.message || 'OK');
      // Only update the visible status and close the confirmation after the
      // server confirms that the review and payroll synchronization completed.
      const reviewedId = approveConfirmHH.hh.HoaHongID;
      const nextStatus = approveConfirmHH.dongY ? 'Đã duyệt' : 'Từ chối';
      setReviewedStatuses((prev) => ({ ...prev, [reviewedId]: nextStatus }));
      setApproveConfirmHH(null);
      setApproveError(null);
    } catch (err: any) {
      const message = err?.message || 'Không thể kết nối máy chủ để duyệt hoa hồng.';
      console.error('[Commission] Approval failed:', err);
      setApproveError(message);
    } finally {
      setApprovingHH(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmHH) return;
    try {
      await api.commission.delete(deleteConfirmHH.HoaHongID);
      setDeleteConfirmHH(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa hoa hồng');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#bf954f]" />
            Hoa hồng & Show
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.system.getExportUrl('hoahong')}
            download
            className="flex items-center gap-2 px-4 py-2 border border-[#E7DFD5] text-stone-700 hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-[#bf954f]" />
            <span>Xuất CSV</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setEditingCommission(null);
              setCustomShowTask(false);
              setFormData({
                ChiNhanh: '',
                NhanVienID: staffList[0]?.NhanVienID || 'NV002',
                Ngay: new Date().toISOString().split('T')[0],
                NoiDung: '',
                LoaiKhoan: 'Tiền Show',
                DoanhThu: 20000000,
                TyLeHoaHong: 5,
                SoTienHoaHong: 800000,
                AnhChungTu: '',
                GhiChu: '',
                TrangThaiThanhToan: 'Chưa thanh toán',
                PhuongThucThanhToan: '',
              });
              setFormError(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition border border-[#c5a059]/40"
          >
            <Plus className="w-4 h-4 text-[#c5a059]" />
            <span>THÊM TIỀN SHOW / HOA HỒNG</span>
          </button>
        </div>
      </div>

      {/* PENDING NOTIFICATION STRIP FOR ADMIN */}
      {pendingList.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Có {pendingList.length} phiếu kê khai đang chờ Admin phê duyệt!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tổng số tiền chờ duyệt: <strong>{formatNumber(totalPendingMoney)} VNĐ</strong>. Sau khi duyệt, khoản này sẽ tự động cộng vào bảng lương tháng tương ứng của nhân viên.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowPendingQueue(true); setSelectedStatus('Chờ duyệt'); setSelectedStaffId(''); setSelectedDate(''); }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm whitespace-nowrap"
          >
            Xem phiếu chờ duyệt
          </button>
        </div>
      )}

      {/* KPI mini strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E7DFD5] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-stone-400">Khoản Đã Duyệt (Cộng Vào Lương)</p>
            <p className="text-2xl font-bold font-bridal text-emerald-800 mt-1">
              +{formatNumber(totalApprovedMoney)} VNĐ
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E7DFD5] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-stone-400">Khoản Chờ Admin Duyệt</p>
            <p className="text-2xl font-bold font-bridal text-amber-800 mt-1">
              {formatNumber(totalPendingMoney)} VNĐ
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#E7DFD5] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto"><div className="flex items-center gap-1.5"><span className="font-semibold text-stone-600">Chi nhánh:</span><select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg bg-white text-xs"><option value="ALL">Tất cả chi nhánh</option><option value="HP_DONG_XOAI">HP Đồng Xoài</option><option value="HP_BINH_LONG">HP Bình Long</option></select></div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600">Nhân viên:</span>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white text-xs"
            >
              <option value="">-- Chọn nhân viên --</option>
              {staffList.map((s) => (
                <option key={s.NhanVienID} value={s.NhanVienID}>
                  {s.HoTen} ({s.NhanVienID})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600">Phân loại:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white text-xs"
            >
              <option value="ALL">Tất cả (Tiền Show & Hoa Hồng)</option>
              <option value="Tiền Show">Chỉ Tiền Đi Show</option>
              <option value="Hoa Hồng">Chỉ Hoa Hồng Hợp Đồng</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white text-xs"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Chờ duyệt">Chờ duyệt ({pendingList.length})</option>
              <option value="Đã duyệt">Đã duyệt</option>
              <option value="Từ chối">Từ chối</option>
            </select>
          </div>
        </div>
          <div className="flex items-center gap-1.5"><span className="font-semibold text-stone-600">Tháng:</span><input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(''); setShowPendingQueue(false); }} className="px-3 py-2 border border-stone-200 rounded-lg bg-white text-xs" /></div>
          <div className="flex items-center gap-1.5"><span className="font-semibold text-stone-600">Ngày:</span><input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setShowPendingQueue(false); }} className="px-3 py-2 border border-stone-200 rounded-lg bg-white text-xs" /></div>
          {showPendingQueue && <button type="button" onClick={() => { setShowPendingQueue(false); setSelectedStaffId(staffList[0]?.NhanVienID || ''); setSelectedDate(new Date().toISOString().slice(0, 10)); setSelectedStatus('ALL'); }} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white">Quay lại xem theo nhân viên</button>}
        </div>
      </div>

      {/* Commission Table */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Nhân viên</th>
                <th className="px-5 py-3.5 font-semibold">Ngày</th>
                <th className="px-5 py-3.5 font-semibold">Phân Loại</th>
                <th className="px-5 py-3.5 font-semibold">Nội Dung Chi Tiết</th>
                <th className="px-5 py-3.5 font-semibold">Số Tiền Đề Nghị</th>
                <th className="px-5 py-3.5 font-semibold">Ảnh Chứng Từ</th>
                <th className="px-5 py-3.5 font-semibold">Trạng Thái</th>
                <th className="px-5 py-3.5 font-semibold text-right">Phê Duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-stone-400">
                    Chưa có bản ghi tiền show hoặc hoa hồng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredList.map((hh) => {
                  const isShow = hh.LoaiKhoan === 'Tiền Show' || hh.NoiDung.includes('Tiền Show');
                  return (
                    <tr key={hh.HoaHongID} className="hover:bg-[#FAF8F5] transition">
                      <td className="px-5 py-4">
                        <p className="font-bold text-stone-900">{hh.HoTen}</p>
                        <p className="text-[10px] text-stone-400 font-mono">{hh.NhanVienID}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-stone-700 whitespace-nowrap">
                        {new Date(hh.Ngay).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isShow
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-[#FAF8F5] text-[#a97d3e] border border-[#ebdcc3]'
                          }`}
                        >
                          {isShow ? 'Tiền Show' : 'Hoa Hồng'}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-[260px]">
                        <p className="font-medium text-stone-900">{hh.NoiDung}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {hh.TaoBoi === 'Nhân viên' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200">
                              Kê khai bởi Nhân viên
                            </span>
                          )}
                          {hh.GhiChu && <span className="text-[10px] text-stone-400 italic truncate">{hh.GhiChu}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-[#a97d3e] text-sm whitespace-nowrap">
                        +{formatNumber(hh.SoTienHoaHong)} đ
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {hh.AnhChungTu ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(hh.AnhChungTu!)}
                            className="p-1 rounded-lg border border-stone-200 hover:border-[#bf954f] flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 transition"
                            title="Bấm để xem ảnh chứng từ"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#bf954f]" />
                            <span>Xem ảnh</span>
                          </button>
                        ) : (
                          <span className="text-stone-300">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            hh.TrangThai === 'Đã duyệt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : hh.TrangThai === 'Chờ duyệt'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {hh.TrangThai}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {hh.TrangThai === 'Chờ duyệt' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveConfirmHH({ hh, dongY: true })}
                                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-[#dfc79f] rounded-lg font-bold text-[10px] uppercase transition border border-[#c5a059]/60 shadow-sm"
                              >
                                DUYỆT & CỘNG LƯƠNG
                              </button>
                              <button
                                type="button"
                                onClick={() => setApproveConfirmHH({ hh, dongY: false })}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-[10px] uppercase transition"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          <button type="button" onClick={() => openEditCommission(hh)} className="p-1.5 text-stone-500 hover:text-[#a97d3e] rounded-lg transition" title="Sửa phiếu"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmHH(hh)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition"
                            title="Xóa bản ghi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Admin creates Show Fee or Commission */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E7DFD5] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
              <h3 className="text-base font-bold font-bridal text-stone-900 uppercase">
                {editingCommission ? 'CHỈNH SỬA PHIẾU HOA HỒNG' : 'GHI NHẬN TIỀN SHOW / HOA HỒNG MỚI (ADMIN)'}
              </h3>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setEditingCommission(null); }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {formError}
                </div>
              )}

              <section className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
                <label className="block text-sm font-bold text-stone-900 mb-2">CHI NHÁNH GHI NHẬN HOA HỒNG *</label>
                <select required value={formData.ChiNhanh} onChange={(e) => setFormData({ ...formData, ChiNhanh: e.target.value })} className="w-full px-3 py-3 text-base border-2 border-stone-400 rounded-lg bg-white">
                  <option value="HP_DONG_XOAI">HP Đồng Xoài</option>
                  <option value="HP_BINH_LONG">HP Bình Long</option>
                </select>
              </section>
              {/* LoaiKhoan selection */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Loại khoản</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setCustomShowTask(false); setFormData({ ...formData, LoaiKhoan: 'Tiền Show', NoiDung: '' }); }}
                    className={`py-2 px-3 rounded-lg border text-center font-bold ${
                      formData.LoaiKhoan === 'Tiền Show'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    Tiền Đi Show
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomShowTask(false); setFormData({ ...formData, LoaiKhoan: 'Hoa Hồng' }); }}
                    className={`py-2 px-3 rounded-lg border text-center font-bold ${
                      formData.LoaiKhoan === 'Hoa Hồng'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    Hoa Hồng Hợp Đồng
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">
                    Nhân viên thụ hưởng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.NhanVienID}
                    onChange={(e) => setFormData({ ...formData, NhanVienID: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] bg-white"
                  >
                    {staffList.map((s) => (
                      <option key={s.NhanVienID} value={s.NhanVienID}>
                        {s.HoTen} - {s.ChucVu} ({s.NhanVienID})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">Nội dung công việc / Tên show cưới <span className="text-rose-500">*</span></label>
                  {formData.LoaiKhoan === 'Tiền Show' ? <>
                    <select required value={customShowTask ? 'Khác' : formData.NoiDung} onChange={(e) => {
                      const fees: Record<string, number> = {'MK đám hỏi, rước dâu, nhà thờ':800000,'MK cô dâu Đám cưới':1000000,'MK chụp cổng 1c':300000,'MK chụp cổng 2c':500000,'MK tiệc tại tiệm':300000,'MK tiệc tại nhà khách':300000,'MK bà sui':500000,'Chụp TT Máy lẻ':1200000,'Chụp TT máy Tặng':500000,'Chụp PS máy Lẻ':2000000,'Chụp PS Kèm Máy TT':1500000,'Quay PS':3500000,'Quay TT':2500000};
                      const value=e.target.value; setCustomShowTask(value==='Khác'); setFormData(prev=>({...prev,NoiDung:value==='Khác'?'':value,SoTienHoaHong:fees[value]??prev.SoTienHoaHong}));
                    }} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white">
                      <option value="">-- Chọn công việc --</option>
                      <option value="MK đám hỏi, rước dâu, nhà thờ">MK đám hỏi, rước dâu, nhà thờ — 800.000đ</option>
                      <option value="MK cô dâu Đám cưới">MK cô dâu Đám cưới — 1.000.000đ</option>
                      <option value="MK chụp cổng 1c">MK chụp cổng 1c — 300.000đ</option>
                      <option value="MK chụp cổng 2c">MK chụp cổng 2c — 500.000đ</option>
                      <option value="MK tiệc tại tiệm">MK tiệc tại tiệm — 300.000đ</option>
                      <option value="MK tiệc tại nhà khách">MK tiệc tại nhà khách — 300.000đ</option>
                      <option value="MK bà sui">MK bà sui — 500.000đ</option>
                      <option value="Chụp TT Máy lẻ">Chụp TT Máy lẻ — 1.200.000đ</option>
                      <option value="Chụp TT máy Tặng">Chụp TT máy Tặng — 500.000đ</option>
                      <option value="Chụp PS máy Lẻ">Chụp PS máy Lẻ — 2.000.000đ</option>
                      <option value="Chụp PS Kèm Máy TT">Chụp PS Kèm Máy TT — 1.500.000đ</option>
                      <option value="Quay PS">Quay PS — 3.500.000đ</option><option value="Quay TT">Quay TT — 2.500.000đ</option><option value="Khác">Khác (tự nhập)</option>
                    </select>
                    {customShowTask && <input type="text" required value={formData.NoiDung} onChange={e=>setFormData(prev=>({...prev,NoiDung:e.target.value}))} placeholder="Nhập nội dung công việc khác" className="mt-2 w-full px-3 py-2 border border-stone-200 rounded-lg" />}
                  </> : <input type="text" required value={formData.NoiDung} onChange={e=>setFormData({...formData,NoiDung:e.target.value})} placeholder="VD: Tên hợp đồng / khách hàng" className="w-full px-3 py-2 border border-stone-200 rounded-lg" />}
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Ngày thực hiện</label>
                  <input
                    type="date"
                    value={formData.Ngay}
                    onChange={(e) => setFormData({ ...formData, Ngay: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>

                {formData.LoaiKhoan === 'Tiền Show' ? (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Số tiền show (VNĐ)</label>
                    <input
                      type="number"
                      step="50000"
                      value={formData.SoTienHoaHong}
                      onChange={(e) => setFormData({ ...formData, SoTienHoaHong: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f] font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Tỷ Lệ Hoa Hồng (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.TyLeHoaHong}
                      onChange={(e) => setFormData({ ...formData, TyLeHoaHong: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>
                )}

                {formData.LoaiKhoan === 'Hoa Hồng' && (
                  <div className="col-span-2">
                    <label className="block font-semibold text-stone-700 mb-1">Doanh Thu Hợp Đồng (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000000"
                      value={formData.DoanhThu}
                      onChange={(e) => setFormData({ ...formData, DoanhThu: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                    />
                  </div>
                )}

                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-stone-200 p-3">
                  <div><label className="block font-semibold text-stone-700 mb-1">Trạng thái thanh toán</label><select value={formData.TrangThaiThanhToan} onChange={e=>setFormData(prev=>({...prev,TrangThaiThanhToan:e.target.value as 'Đã thanh toán'|'Chưa thanh toán',PhuongThucThanhToan:e.target.value==='Chưa thanh toán'?'':prev.PhuongThucThanhToan}))} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"><option value="Chưa thanh toán">Chưa thanh toán</option><option value="Đã thanh toán">Đã thanh toán</option></select></div>
                  {formData.TrangThaiThanhToan==='Đã thanh toán' && <div><label className="block font-semibold text-stone-700 mb-1">Phương thức thanh toán</label><select required value={formData.PhuongThucThanhToan} onChange={e=>setFormData(prev=>({...prev,PhuongThucThanhToan:e.target.value as 'Chuyển khoản'|'Tiền mặt'|''}))} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"><option value="">-- Chọn phương thức --</option><option value="Chuyển khoản">Chuyển khoản</option><option value="Tiền mặt">Tiền mặt</option></select></div>}
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">Ảnh Chứng Từ / Nghiệm Thu</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs"
                    >
                      <Camera className="w-4 h-4 text-[#dfc79f]" />
                      Chụp ảnh trực tiếp
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl font-bold text-xs cursor-pointer">
                      <Upload className="w-4 h-4 text-[#bf954f]" />
                      Chọn ảnh từ máy
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const input = e.currentTarget;
                          if (!file.type.startsWith('image/')) {
                            setFormError('Vui lòng chọn tệp hình ảnh hợp lệ.');
                            input.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const image = new Image();
                            image.onload = () => {
                              // Resize both camera captures and uploaded files so
                              // new Base64 proofs remain lightweight for Firestore.
                              const maxSize = 960;
                              const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                              const canvas = document.createElement('canvas');
                              canvas.width = Math.max(1, Math.round(image.width * scale));
                              canvas.height = Math.max(1, Math.round(image.height * scale));
                              const context = canvas.getContext('2d');
                              if (!context) {
                                setFormError('Không thể xử lý ảnh. Vui lòng chọn ảnh khác.');
                                return;
                              }
                              context.drawImage(image, 0, 0, canvas.width, canvas.height);
                              setFormData((prev) => ({
                                ...prev,
                                AnhChungTu: canvas.toDataURL('image/jpeg', 0.62),
                              }));
                              setFormError(null);
                            };
                            image.onerror = () => setFormError('Không thể đọc ảnh. Vui lòng chọn ảnh khác.');
                            image.src = String(reader.result || '');
                          };
                          reader.onerror = () => setFormError('Không thể tải ảnh lên. Vui lòng thử lại.');
                          reader.readAsDataURL(file);
                          input.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {formData.AnhChungTu && (
                    <div className="mt-3 flex items-center gap-3">
                      <img src={formData.AnhChungTu} alt="Ảnh chứng từ" className="w-20 h-20 object-cover rounded-xl border border-stone-200" />
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, AnhChungTu: '' }))} className="text-xs text-rose-600 hover:underline">
                        Xóa ảnh
                      </button>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">Ghi chú thêm</label>
                  <input
                    type="text"
                    value={formData.GhiChu}
                    onChange={(e) => setFormData({ ...formData, GhiChu: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
                  />
                </div>
              </div>

              {/* Amount preview */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] flex items-center justify-between">
                <span className="text-stone-600 font-medium">Số tiền ghi nhận:</span>
                <span className="text-base font-bold font-mono text-[#a97d3e]">
                  {formatNumber(computedAmount)} VNĐ
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7DFD5]">
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
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider shadow-md"
                >
                  {saving ? 'Đang lưu...' : editingCommission ? 'Lưu thay đổi' : 'Lưu Bản Ghi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Image Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-[#c5a059]">
            <img src={previewImage} alt="Proof" className="w-full h-auto rounded-xl object-cover" />
            <p className="text-center text-xs text-stone-500 mt-2 font-mono">
              Ảnh chứng từ / phiếu nghiệm thu
            </p>
          </div>
        </div>
      )}
      {/* Camera capture modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h3 className="font-bold text-stone-900">CHỤP ẢNH CHỨNG TỪ</h3>
              <button type="button" onClick={() => { stopCamera(); setCameraOpen(false); }} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                {cameraError && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white bg-black/60">{cameraError}</div>}
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <button type="button" onClick={captureProofPhoto} className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-xs">
                  <Camera className="w-4 h-4 text-[#dfc79f]" />
                  CHỤP ẢNH
                </button>
                <button type="button" onClick={() => { stopCamera(); setCameraOpen(false); }} className="px-5 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs">
                  HỦY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={Boolean(deleteConfirmHH)}
        onClose={() => setDeleteConfirmHH(null)}
        onConfirm={handleDelete}
        title="XÁC NHẬN XÓA"
        message={`Bạn có chắc chắn muốn xóa bản ghi "${deleteConfirmHH?.NoiDung}" (${deleteConfirmHH ? formatNumber(deleteConfirmHH.SoTienHoaHong) : "0"} đ) của ${deleteConfirmHH?.HoTen}?`}
        confirmText="XÓA"
        type="danger"
      />

      {/* Confirmation Modal for Approve / Reject */}
      <ConfirmationModal
        isOpen={Boolean(approveConfirmHH)}
        onClose={() => {
          if (approvingHH) return;
          setApproveError(null);
          setApproveConfirmHH(null);
        }}
        onConfirm={handleApproveAction}
        loading={approvingHH}
        errorMessage={approveError}
        title={approveConfirmHH?.dongY ? 'PHÊ DUYỆT THU NHẬP' : 'TỪ CHỐI'}
        message={
          approveConfirmHH?.dongY
            ? `Phê duyệt khoản thu nhập ${approveConfirmHH ? formatNumber(approveConfirmHH.hh.SoTienHoaHong) : "0"} VNĐ cho ${approveConfirmHH?.hh.HoTen}? Khoản này sẽ được cộng trực tiếp vào bảng lương tháng ${approveConfirmHH?.hh.Ngay.split('-')[1]}/${approveConfirmHH?.hh.Ngay.split('-')[0]}.`
            : `Từ chối khoản thu nhập "${approveConfirmHH?.hh.NoiDung}" của ${approveConfirmHH?.hh.HoTen}?`
        }
        confirmText={approveConfirmHH?.dongY ? 'DUYỆT & CỘNG LƯƠNG' : 'TỪ CHỐI'}
        type={approveConfirmHH?.dongY ? 'success' : 'warning'}
      />
    </div>
  );
};
