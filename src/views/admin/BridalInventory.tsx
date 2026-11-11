import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api';
import type { InventoryCategory, InventoryEvent, InventoryItem, InventoryStatus, QuanLyRecord } from '../../types';
import { Camera, ChevronLeft, ChevronRight, Clock3, Package, QrCode, Search, Shirt, X, Images, UserRound, Sparkles, Trash2, Download } from 'lucide-react';

const CATEGORIES: InventoryCategory[] = ['Váy cưới', 'Vest', 'Áo dài', 'Phụ kiện'];
const STATUSES: InventoryStatus[] = ['Có sẵn', 'Đang đặt', 'Đang thuê', 'Đang giặt', 'Đang sửa', 'Hư hỏng', 'Thanh lý'];
const EMPTY_FORM: Partial<InventoryItem> = {
  name: '', category: 'Váy cưới', size: '', color: '', collection: '', location: 'Kho chính', locationNote: '',
  rentalPrice: 0, salePrice: 0, imageUrl: '', description: '', notes: '',
};
const money = (value: number) => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const getDisplayImageUrl = (value?: string) => {
  const url = String(value || '').trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const driveId = parsed.searchParams.get('id') || parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    if (parsed.hostname === 'drive.google.com' && driveId) {
      return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(driveId) + '&sz=w1200';
    }
  } catch { /* retain the original image URL */ }
  return url;
};

export const BridalInventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingQr, setDeletingQr] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [history, setHistory] = useState<InventoryEvent[]>([]);
  const [tryOnHistory, setTryOnHistory] = useState<QuanLyRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnFiles, setTryOnFiles] = useState<File[]>([]);
  const [tryOnStaff, setTryOnStaff] = useState<import('../../types').NhanVien[]>([]);
  const [tryOnStaffId, setTryOnStaffId] = useState('');
  const [tryOnContracts, setTryOnContracts] = useState<import('../../types').QuanLyRecord[]>([]);
  const [tryOnContractId, setTryOnContractId] = useState('');
  const [tryOnManualNames, setTryOnManualNames] = useState(false);
  const [tryOnProducts, setTryOnProducts] = useState<InventoryItem[]>([]);
  const [tryOnRecordId, setTryOnRecordId] = useState('');
  const [tryOnNearWarning, setTryOnNearWarning] = useState('');
  const [tryOnDetailProduct, setTryOnDetailProduct] = useState<InventoryItem | null>(null);
  const [tryOnDetailOpen, setTryOnDetailOpen] = useState(false);
  const [tryOnProductStatuses, setTryOnProductStatuses] = useState<Record<string, { label: string; tone: 'green' | 'red' | 'orange' }>>({});
  const [tryOnQrInput, setTryOnQrInput] = useState('');
  const [tryOnScannerOpen, setTryOnScannerOpen] = useState(false);
  const [tryOnConflict, setTryOnConflict] = useState('');
  const [tryOnPickupBride, setTryOnPickupBride] = useState(false);
  const [tryOnPickupGroom, setTryOnPickupGroom] = useState(false);
  const [tryOnBride, setTryOnBride] = useState('');
  const [tryOnGroom, setTryOnGroom] = useState('');
  const [tryOnBrideDate, setTryOnBrideDate] = useState('');
  const [tryOnGroomDate, setTryOnGroomDate] = useState('');
  const [tryOnSaving, setTryOnSaving] = useState(false);

  const downloadQrLabel = async () => {
    if (!selected) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const previewWindow = isIOS ? window.open('', '_blank') : null;
    try {
      const width = 640;
      const qrSize = 440;
      const qrDataUrl = await QRCode.toDataURL(selected.qrCode, { width: qrSize, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } });
      const image = new Image(); image.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Không tạo được ảnh QR.')); });
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = 540;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Trình duyệt không hỗ trợ tạo ảnh.');
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, canvas.height);
      ctx.fillStyle = '#111111'; ctx.textAlign = 'center'; ctx.font = 'bold 38px monospace';
      ctx.fillText(selected.qrCode, width / 2, 62);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(image, (width - qrSize) / 2, 85, qrSize, qrSize);
      const blob = await new Promise<Blob>((resolve, reject) => { canvas.toBlob(value => value ? resolve(value) : reject(new Error('Không xuất được ảnh PNG.')), 'image/png'); });
      const objectUrl = URL.createObjectURL(blob);
      if (isIOS) {
        if (!previewWindow) throw new Error('Safari đang chặn cửa sổ ảnh. Hãy cho phép mở cửa sổ bật lên rồi thử lại.');
        previewWindow.location.href = objectUrl;
        setError('Ảnh QR đã mở ở tab mới. Trên iPhone, nhấn giữ ảnh rồi chọn Lưu vào Ảnh hoặc dùng nút Chia sẻ để lưu vào Tệp.');
      } else {
        const link = document.createElement('a'); link.download = 'QR-' + selected.qrCode + '.png'; link.href = objectUrl;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        setError('Đã tạo lệnh tải ảnh QR PNG. Kiểm tra thư mục Tải xuống của trình duyệt.');
      }
    } catch (error: any) { if (previewWindow && !previewWindow.closed) previewWindow.close(); setError(error?.message || 'Không tải được ảnh tem QR.'); }
  };

  const load = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.inventory.list({
        limit: 25,
        cursor: cursor || undefined,
        category: category || undefined,
        status: status || undefined,
        q: query.trim() || undefined,
      });
      setItems(result.items);
      setNextCursor(result.nextCursor);
    } catch (e: any) {
      setError(e?.message || 'Không tải được kho sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [category, status, query]);

  useEffect(() => { void load(null); setCursorStack([]); }, [load]);

  useEffect(() => {
    let active = true;
    if (!selected) { setQrImage(''); setHistory([]); setTryOnHistory([]); return; }
    QRCode.toDataURL(selected.qrCode, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
      .then(url => { if (active) setQrImage(url); })
      .catch(() => { if (active) setQrImage(''); });
    setHistoryLoading(true);
    Promise.all([api.inventory.history(selected.qrCode), api.quanLy.getAll('THU_VAY')])
      .then(([rows, records]) => { if (!active) return; setHistory(rows); setTryOnHistory(records.filter(record => (Array.isArray(record.DuLieu?.SanPhamVay) ? record.DuLieu.SanPhamVay : []).some((product: any) => String(product.MaQR || product.qrCode || '').toUpperCase() === selected.qrCode.toUpperCase()))); })
      .catch(() => { if (active) { setHistory([]); setTryOnHistory([]); } })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [selected]);

  useEffect(() => {
    if (!scannerOpen) return;
    const scanner = new Html5Qrcode('bridal-inventory-qr-reader');
    let stopped = false;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      async (decoded) => {
        if (stopped) return;
        stopped = true;
        try { await scanner.stop(); } catch {}
        setScannerOpen(false);
        const code = decoded.trim().toUpperCase();
        try {
          const item = await api.inventory.get(code);
          setSelected(item);
        } catch (e: any) {
          setError(e?.message || 'Không tìm thấy sản phẩm theo mã QR vừa quét.');
        }
      },
      () => {}
    ).catch((e: any) => {
      setError(e?.message || 'Không mở được camera. Hãy cấp quyền camera cho trình duyệt.');
      setScannerOpen(false);
    });
    return () => {
      stopped = true;
      try { scanner.stop(); } catch {}
      try { scanner.clear(); } catch {}
    };
  }, [scannerOpen]);

  const summary = useMemo(() => ({
    total: items.length,
    ready: items.filter(x => x.status === 'Có sẵn').length,
    rented: items.filter(x => x.status === 'Đang thuê').length,
    care: items.filter(x => ['Đang giặt', 'Đang sửa', 'Hư hỏng'].includes(x.status)).length,
  }), [items]);


  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.'); return; }
    setSaving(true); setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl;
      });
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Không xử lý được ảnh.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      const folderKey = form.category === 'Vest' ? 'suits' : form.category === 'Áo dài' ? 'aoDai' : form.category === 'Phụ kiện' ? 'accessories' : 'dresses';
      const result = await api.inventory.uploadImage(compressed, file.name.replace(/\.[^.]+$/, '') + '.jpg', folderKey);
      setForm(prev => ({ ...prev, imageUrl: result.imageUrl }));
    } catch (e: any) { setError(e?.message || 'Tải ảnh lên Google Drive thất bại.'); }
    finally { setSaving(false); }
  };


  const openTryOn = async () => {
    setError(''); setTryOnConflict(''); setTryOnProducts([]); setTryOnRecordId(''); setTryOnNearWarning(''); setTryOnProductStatuses({}); setTryOnDetailProduct(null); setTryOnDetailOpen(false); setTryOnQrInput('');
    setTryOnContractId(''); setTryOnManualNames(false); setTryOnPickupBride(false); setTryOnPickupGroom(false); setTryOnBrideDate(''); setTryOnGroomDate(''); setTryOnStaffId(''); setTryOnFiles([]); setTryOnOpen(true);
    try {
      const [contracts, staff] = await Promise.all([api.quanLy.getAll('HOP_DONG'), api.staff.getAll()]);
      setTryOnContracts(contracts.filter(record => !['Đã hủy', 'Hủy'].includes(String(record.DuLieu?.TrangThai || ''))));
      setTryOnStaff(staff.filter(person => !['Đã nghỉ', 'Nghỉ việc'].includes(String(person.TrangThai || ''))));
    } catch (e: any) { setError(e?.message || 'Không tải được danh sách hợp đồng hoặc nhân viên.'); }
  };

  useEffect(() => {
    let active = true;
    if (!tryOnProducts.length) { setTryOnProductStatuses({}); return; }
    const selectedDates = [tryOnPickupBride ? tryOnBrideDate : '', tryOnPickupGroom ? tryOnGroomDate : ''].filter(Boolean);
    const refreshStatuses = async () => {
      try {
        const existingRecords = selectedDates.length ? await api.quanLy.getAll('THU_VAY') : [];
        if (!active) return;
        const next: Record<string, { label: string; tone: 'green' | 'red' | 'orange' }> = {};
        for (const product of tryOnProducts) {
          const laundry = String(product.status || '').trim().toLowerCase().includes('giặt');
          const conflict = existingRecords.some(record => {
            const data = record.DuLieu || {};
            const dates = [data.NgayLayVayNhaGai, data.NgayLayVayNhaTrai].filter(Boolean).map((value: string) => String(value).slice(0, 10));
            const savedProducts = Array.isArray(data.SanPhamVay) ? data.SanPhamVay : [];
            return dates.some((date: string) => selectedDates.includes(date)) &&
              savedProducts.some((saved: any) => String(saved.MaQR || saved.qrCode || '').toUpperCase() === product.qrCode.toUpperCase());
          });
          if (laundry) next[product.qrCode] = { label: 'Đang giặt', tone: 'orange' };
          else if (conflict) next[product.qrCode] = { label: 'Trùng lịch', tone: 'red' };
          else next[product.qrCode] = { label: 'Sẵn sàng', tone: 'green' };
        }
        setTryOnProductStatuses(next);
      } catch (error) {
        console.error('Không kiểm tra được lịch thuê váy:', error);
      }
    };
    void refreshStatuses();
    return () => { active = false; };
  }, [tryOnProducts, tryOnPickupBride, tryOnPickupGroom, tryOnBrideDate, tryOnGroomDate]);

  const addTryOnProduct = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    if (!tryOnContractId && !tryOnManualNames) { setTryOnConflict('Vui lòng chọn hợp đồng hoặc chọn Khác trước khi quét mã.'); return; }
    if (!tryOnStaffId) { setTryOnConflict('Vui lòng chọn nhân viên thử đồ phụ trách trước khi quét mã.'); return; }
    if ((!tryOnPickupBride && !tryOnPickupGroom) || (tryOnPickupBride && !tryOnBrideDate) || (tryOnPickupGroom && !tryOnGroomDate)) { setTryOnConflict('Vui lòng chọn ít nhất một bên lấy đồ và nhập đủ ngày cho tất cả các bên đã chọn.'); return; }
    if (tryOnProducts.some(item => item.qrCode.toUpperCase() === code)) { setTryOnConflict('Sản phẩm này đã được quét trong hồ sơ hiện tại.'); return; }
    try {
      const item = await api.inventory.get(code);
      if (!['Váy cưới', 'Vest', 'Áo dài', 'Phụ kiện'].includes(item.category)) { setTryOnConflict('Mã QR không thuộc danh mục sản phẩm được quản lý.'); return; }
      const chosenDates = [tryOnPickupBride ? tryOnBrideDate : '', tryOnPickupGroom ? tryOnGroomDate : ''].filter(Boolean);
      const historyRecords = await api.quanLy.getAll('THU_VAY');
      const productBookings = historyRecords.filter(record => record.QuanLyID !== tryOnRecordId && (Array.isArray(record.DuLieu?.SanPhamVay) ? record.DuLieu.SanPhamVay : []).some((saved: any) => String(saved.MaQR || saved.qrCode || '').toUpperCase() === code));
      const conflictDates = productBookings.flatMap(record => [record.DuLieu?.NgayLayVayNhaGai, record.DuLieu?.NgayLayVayNhaTrai].filter(Boolean).map((v: string) => String(v).slice(0,10)));
      const exactBooking = productBookings.find(record => [record.DuLieu?.NgayLayVayNhaGai, record.DuLieu?.NgayLayVayNhaTrai].filter(Boolean).map((v: string) => String(v).slice(0,10)).some((date: string) => chosenDates.includes(date)));
      if (exactBooking) { setTryOnConflict('Mã này đã có lịch chọn trùng ngày trong hợp đồng ' + (exactBooking.DuLieu?.MaHopDong || exactBooking.DuLieu?.TenHopDong || 'khác') + '. Không thể chọn trùng lịch.'); return; }
      const nearDate = conflictDates.some((date: string) => chosenDates.some(chosen => Math.abs(new Date(date+'T00:00:00').getTime()-new Date(chosen+'T00:00:00').getTime()) <= 86400000));
      setTryOnNearWarning(nearDate ? 'Lưu ý: Váy này có lịch khách khác sát ngày (trước hoặc sau 1 ngày). Vẫn có thể chọn nếu đã xác nhận với quản lý.' : '');
      setTryOnProducts(current => [...current, item]); setTryOnDetailProduct(item); setTryOnDetailOpen(true); setTryOnConflict(''); setTryOnQrInput('');
    } catch (e: any) { setTryOnConflict(e?.message || 'Không tìm thấy sản phẩm theo mã QR.'); }
  };

  useEffect(() => {
    if (!tryOnScannerOpen) return;
    const scanner = new Html5Qrcode('try-on-qr-reader');
    let stopped = false;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } }, async decoded => {
      if (stopped) return;
      stopped = true;
      try { await scanner.stop(); } catch {}
      setTryOnScannerOpen(false);
      await addTryOnProduct(decoded);
    }, () => {}).catch((e: any) => {
      setTryOnConflict(e?.message || 'Không mở được camera. Hãy cấp quyền camera.'); setTryOnScannerOpen(false);
    });
    return () => { stopped = true; try { scanner.stop(); } catch {} try { scanner.clear(); } catch {} };
  }, [tryOnScannerOpen]);

  const uploadTryOnPhotos = async () => {
    const linkedContract = tryOnContracts.find(record => record.QuanLyID === tryOnContractId);
    if (!tryOnManualNames && !linkedContract) { setError('Vui lòng chọn hợp đồng hoặc chọn Khác.'); return; }
    if (!tryOnStaffId) { setError('Vui lòng chọn nhân viên thử đồ phụ trách.'); return; }
    if (!tryOnPickupBride && !tryOnPickupGroom) { setError('Vui lòng chọn Nhà gái hoặc Nhà trai trước khi quét mã.'); return; }
    if ((tryOnPickupBride && !tryOnBrideDate) || (tryOnPickupGroom && !tryOnGroomDate)) { setError('Vui lòng nhập đầy đủ ngày lấy đồ cho bên đã chọn.'); return; }
    if (!tryOnProducts.length) { setError('Vui lòng quét ít nhất một sản phẩm.'); return; }
    if (tryOnConflict) { setError(tryOnConflict); return; }
    try {
      const existingRecords = await api.quanLy.getAll('THU_VAY');
      const selectedDates = [tryOnPickupBride ? tryOnBrideDate : '', tryOnPickupGroom ? tryOnGroomDate : ''].filter(Boolean);
      for (const product of tryOnProducts) {
        const conflict = existingRecords.find(record => {
          if (record.QuanLyID === tryOnRecordId) return false;
          const data = record.DuLieu || {};
          const dates = [data.NgayLayVayNhaGai, data.NgayLayVayNhaTrai].filter(Boolean).map((date: string) => String(date).slice(0,10));
          const savedProducts = Array.isArray(data.SanPhamVay) ? data.SanPhamVay : [];
          return dates.some((date: string) => selectedDates.includes(date)) && savedProducts.some((saved: any) => String(saved.MaQR || saved.qrCode || '').toUpperCase() === product.qrCode.toUpperCase());
        });
        if (conflict) { setError(`Mã ${product.qrCode} đã có hồ sơ khác trùng đúng ngày lấy đồ. Không thể lưu trùng lịch.`); return; }
      }
    } catch (e: any) { setError(e?.message || 'Không kiểm tra được lịch thuê. Vui lòng thử lại.'); return; }
    if (!tryOnFiles.length) { setError('Vui lòng chọn ít nhất một ảnh váy khách đã chọn.'); return; }
    setTryOnSaving(true); setError('');
    try {
      const uploadedPhotos: Array<{ fileName: string; imageUrl: string; fileId: string }> = [];
      for (const file of tryOnFiles) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Ảnh chỉ hỗ trợ JPG, PNG hoặc WebP.');
        const raw = await new Promise<string>((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result||'')); reader.onerror=()=>reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file); });
        const image = await new Promise<HTMLImageElement>((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=raw; });
        const scale=Math.min(1,1600/Math.max(image.width,image.height));
        const canvas=document.createElement('canvas'); canvas.width=Math.round(image.width*scale); canvas.height=Math.round(image.height*scale);
        const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Không xử lý được ảnh.');
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        const safeName=String(linkedContract?.DuLieu?.MaHopDong || 'Khach-thu-vay').replace(/[^a-zA-Z0-9_-]/g,'_');
        const uploaded = await api.inventory.uploadImage(canvas.toDataURL('image/jpeg',0.82), safeName+'_'+Date.now()+'.jpg','tryOn');
        uploadedPhotos.push({ fileName: file.name, imageUrl: uploaded.imageUrl, fileId: uploaded.fileId });
      }
      const recordData = {
        HopDongQuanLyID: linkedContract?.QuanLyID || '',
        MaHopDong: linkedContract?.DuLieu?.MaHopDong || '',
        TenHopDong: linkedContract?.DuLieu?.KhachHang || '',
        NhapNgoaiHopDong: tryOnManualNames,
        TenCoDau: '', TenChuRe: '', KhachHang: String(linkedContract?.DuLieu?.KhachHang || ''),
        NhanVienThuID: tryOnStaffId,
        NhanVienThu: String(tryOnStaff.find(person => person.NhanVienID === tryOnStaffId)?.HoTen || ''),
        SanPhamVay: tryOnProducts.map(item => ({ MaQR: item.qrCode, TenSanPham: item.name, DanhMuc: item.category, AnhSanPham: item.imageUrl, TrangThai: item.status, MoTa: item.description })),
        LayVayNhaGai: tryOnPickupBride,
        LayVayNhaTrai: tryOnPickupGroom,
        NgayLayVayNhaGai: tryOnPickupBride ? tryOnBrideDate : '',
        NgayLayVayNhaTrai: tryOnPickupGroom ? tryOnGroomDate : '',
        AnhVay: uploadedPhotos,
        SoLuongAnh: uploadedPhotos.length,
        TaoLuc: new Date().toISOString(),
      };
      if (tryOnRecordId) await api.quanLy.update(tryOnRecordId, recordData);
      else await api.quanLy.create('THU_VAY', recordData);
      setTryOnOpen(false); setTryOnFiles([]); setTryOnProducts([]); setTryOnRecordId(''); setTryOnContractId(''); setTryOnManualNames(false); setTryOnBrideDate(''); setTryOnGroomDate(''); setTryOnStaffId('');
      alert('Đã lưu hồ sơ thử và chọn váy, liên kết hợp đồng và ảnh trên Google Drive.');
    } catch(e:any) { setError(e?.message || 'Không lưu được ảnh thử váy.'); }
    finally { setTryOnSaving(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({ ...item });
    setSelected(null);
    setFormOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api.inventory.update(editing.qrCode, form);
      else await api.inventory.create(form);
      setFormOpen(false);
      await load(null);
      setCursorStack([]);
    } catch (e: any) {
      setError(e?.message || 'Không lưu được sản phẩm.');
    } finally { setSaving(false); }
  };

  const deleteItem = async (item: InventoryItem) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa sản phẩm "${item.name}" (${item.qrCode}) khỏi kho? Thao tác này không thể hoàn tác.`);
    if (!confirmed) return;
    setDeletingQr(item.qrCode);
    setError('');
    try {
      await api.inventory.delete(item.qrCode);
      if (selected?.qrCode === item.qrCode) setSelected(null);
      await load(null);
      setCursorStack([]);
    } catch (e: any) {
      setError(e?.message || 'Không xóa được sản phẩm.');
    } finally {
      setDeletingQr(null);
    }
  };

  const openScannedCode = async () => {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    try { setSelected(await api.inventory.get(code)); setError(''); }
    catch (e: any) { setError(e?.message || 'Không tìm thấy mã QR.'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a97d3e]">HẠNH PHẠM LUXURY BRIDAL</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Quản lý váy & phụ kiện</h1>
          <p className="mt-1 text-sm text-stone-500">Quản lý riêng váy cưới, vest, áo dài và phụ kiện bằng mã QR định danh.</p>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <button onClick={openCreate} className="group rounded-2xl border border-[#D8C39B] bg-gradient-to-br from-[#28231D] to-[#665238] p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5">
          <QrCode className="mb-3 text-[#E6C98F]" size={25}/><p className="font-bold">Tạo định danh SP</p><p className="mt-1 text-xs text-white/70">Tạo hồ sơ và mã QR</p>
        </button>
        <button onClick={()=>void openTryOn()} className="rounded-2xl border border-[#E7DFD5] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5">
          <UserRound className="mb-3 text-[#A97D3E]" size={25}/><p className="font-bold text-stone-900">Thử & Chọn váy</p><p className="mt-1 text-xs text-stone-500">Lưu ảnh khách thử váy</p>
        </button>
        {[
          {key:'Váy cưới',title:'Kho váy cưới',desc:'Ảnh và mã QR váy',icon:Shirt},
          {key:'Vest',title:'Kho vest',desc:'Vest chú rể',icon:Package},
          {key:'Áo dài',title:'Kho áo dài',desc:'Áo dài cưới',icon:Sparkles},
          {key:'Phụ kiện',title:'Kho phụ kiện',desc:'Voan, giày, trang sức',icon:Images},
        ].map(card=>{const Icon=card.icon;return <button key={card.key} onClick={()=>{setCategory(card.key);setStatus('');setQuery('');}} className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${category===card.key?'border-[#C5A059] bg-[#FBF6EC]':'border-[#E7DFD5] bg-white'}`}><Icon className="mb-3 text-[#A97D3E]" size={25}/><p className="font-bold text-stone-900">{card.title}</p><p className="mt-1 text-xs text-stone-500">{card.desc}</p></button>})}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Sản phẩm trang này</p><p className="mt-1 text-2xl font-bold">{summary.total}</p></div>
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Có sẵn</p><p className="mt-1 text-2xl font-bold text-emerald-700">{summary.ready}</p></div>
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Đang thuê</p><p className="mt-1 text-2xl font-bold text-amber-700">{summary.rented}</p></div>
        <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4"><p className="text-xs text-stone-500">Đang giặt / sửa / lỗi</p><p className="mt-1 text-2xl font-bold text-rose-700">{summary.care}</p></div>
      </div>

      <div className="rounded-2xl border border-[#E7DFD5] bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã QR hoặc tên sản phẩm..." className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-3 text-sm"/></div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-3 text-sm"><option value="">Tất cả danh mục</option>{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-3 text-sm"><option value="">Tất cả tình trạng</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
          <button onClick={() => setScannerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c5a059] px-4 py-3 text-sm font-bold text-[#a97d3e]"><Camera size={17}/> Quét QR</button>
          <button onClick={() => { setScanInput(''); setScannerOpen(false); }} className="rounded-xl border border-stone-200 px-3 py-3 text-sm">Nhập mã</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#FAF8F5] text-xs uppercase text-stone-500"><tr><th className="p-3">Sản phẩm</th><th className="p-3">Mã định danh QR</th><th className="p-3">Danh mục</th><th className="p-3">Mô tả</th><th className="p-3">Tình trạng</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? <tr><td colSpan={5} className="p-8 text-center text-stone-400">Đang tải kho...</td></tr> :
                items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-stone-400">Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên.</td></tr> :
                items.map(item => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-[#FAF8F5]">
                  <td className="p-3"><div className="flex items-center gap-3">{item.imageUrl ? <img src={getDisplayImageUrl(item.imageUrl)} className="h-12 w-10 rounded-lg object-cover" alt={item.name}/> : <div className="flex h-12 w-10 items-center justify-center rounded-lg bg-stone-100"><Shirt size={18} className="text-stone-400"/></div>}<div><p className="font-semibold text-stone-900">{item.name}</p><p className="text-xs text-stone-400">{item.description || item.collection || item.category}</p></div></div></td>
                  <td className="p-3 font-mono text-xs text-[#a97d3e]">{item.qrCode}</td><td className="p-3">{item.category}</td><td className="p-3">{item.description || '—'}</td>
                  <td className="p-3"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span><button type="button" disabled={deletingQr===item.qrCode} onClick={(event)=>{event.stopPropagation();void deleteItem(item);}} title="Xóa sản phẩm" aria-label={`Xóa ${item.name}`} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={16}/></button></div></td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-xs text-stone-500">Tối đa 25 sản phẩm mỗi lần tải</span>
          <div className="flex gap-2"><button disabled={cursorStack.length===0 || loading} onClick={() => { const next=[...cursorStack]; const prev=next.pop() || ''; setCursorStack(next); void load(prev || null); }} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-30"><ChevronLeft size={16}/></button><button disabled={!nextCursor || loading} onClick={() => { setCursorStack(v=>[...v, nextCursor!]); void load(nextCursor); }} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-30"><ChevronRight size={16}/></button></div>
        </div>
      </div>

      {scanInput !== null && <div className="rounded-2xl border border-[#E7DFD5] bg-white p-3"><form onSubmit={e=>{e.preventDefault();void openScannedCode();}} className="flex gap-2"><input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="Nhập hoặc dán mã QR, ví dụ HP-VAY-..." className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"/><button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Tra cứu</button></form></div>}


      {tryOnDetailOpen && tryOnDetailProduct && <div className="fixed inset-0 z-[140] flex flex-col bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
          <button type="button" onClick={() => setTryOnDetailOpen(false)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><ChevronLeft size={18}/> Quay lại quét</button>
          <span className="text-sm font-bold text-stone-500">THÔNG TIN VÁY</span>
          <button type="button" onClick={() => { setTryOnProducts(current => current.filter(x => x.qrCode !== tryOnDetailProduct.qrCode)); setTryOnDetailProduct(null); setTryOnDetailOpen(false); }} className="text-sm font-semibold text-rose-600">Bỏ váy</button>
        </header>
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4">
          <div className="flex w-full max-w-3xl flex-1 items-center justify-center overflow-hidden rounded-2xl bg-stone-50">
            {tryOnDetailProduct.imageUrl
              ? <img src={getDisplayImageUrl(tryOnDetailProduct.imageUrl)} alt={tryOnDetailProduct.name} className="max-h-[68vh] w-full object-contain"/>
              : <div className="flex flex-col items-center gap-2 p-10 text-stone-400"><Shirt size={64}/><span>Chưa có ảnh váy trong hồ sơ sản phẩm</span></div>}
          </div>
          <div className="w-full max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold text-stone-900">{tryOnDetailProduct.name || 'Váy cưới'}</h2>
            {(() => {
              const availability = tryOnProductStatuses[tryOnDetailProduct.qrCode] || { label: 'Đang kiểm tra lịch...', tone: 'orange' as const };
              const toneClass = availability.tone === 'green' ? 'bg-lime-300 text-lime-950' : availability.tone === 'red' ? 'bg-red-600 text-white' : 'bg-orange-400 text-white';
              return <div className={`mx-auto mt-3 inline-flex rounded-full px-8 py-3 text-xl font-black ${toneClass}`}>{availability.label}</div>;
            })()}
          </div>
          <button type="button" onClick={() => setTryOnDetailOpen(false)} className="w-full max-w-3xl rounded-xl bg-stone-900 px-5 py-4 text-base font-bold text-white">Quay lại để quét váy tiếp theo</button>
        </main>
      </div>}
      {tryOnScannerOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3"><div className="w-full max-w-md rounded-2xl bg-white p-4"><div className="mb-3 flex items-center justify-between"><b>Quét QR váy</b><button type="button" onClick={()=>setTryOnScannerOpen(false)}><X/></button></div><div id="try-on-qr-reader" className="overflow-hidden rounded-xl"/><p className="mt-3 text-xs text-stone-500">Quét mã QR trên váy để kiểm tra ngày thuê.</p></div></div>}

      {tryOnOpen && <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-3"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#A97D3E]">HẠNH PHẠM LUXURY BRIDAL</p><h2 className="text-xl font-bold">Thử & Chọn váy</h2></div><button onClick={()=>setTryOnOpen(false)}><X/></button></div>
        <label className="block text-sm font-semibold">Chọn hợp đồng<select value={tryOnManualNames ? '__manual__' : tryOnContractId} onChange={e=>{const value=e.target.value;setTryOnManualNames(value==='__manual__');setTryOnContractId(value==='__manual__'?'':value);}} className="mt-1 w-full rounded-xl border p-3">
          <option value="">-- Chọn hợp đồng --</option>{tryOnContracts.map(record=><option key={record.QuanLyID} value={record.QuanLyID}>{record.DuLieu?.MaHopDong || record.QuanLyID} · {record.DuLieu?.KhachHang || 'Chưa có tên khách'}</option>)}
          <option value="__manual__">Khác – khách không có hợp đồng</option>
        </select></label>
        <label className="mt-3 block text-sm font-semibold">Nhân viên thử đồ phụ trách<select required value={tryOnStaffId} onChange={e=>setTryOnStaffId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">-- Chọn nhân viên --</option>{tryOnStaff.map(person=><option key={person.NhanVienID} value={person.NhanVienID}>{person.HoTen}</option>)}</select></label>
        <div className="mt-4">
          <p className="text-sm font-semibold">Bên lấy váy</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={()=>setTryOnPickupBride(v=>!v)} className={`flex-1 rounded-xl border p-3 text-sm font-semibold ${tryOnPickupBride?'border-[#A97D3E] bg-amber-50 text-[#805B2B]':'border-stone-200'}`}>{tryOnPickupBride?'✓ ':''}Nhà gái</button>
            <button type="button" onClick={()=>setTryOnPickupGroom(v=>!v)} className={`flex-1 rounded-xl border p-3 text-sm font-semibold ${tryOnPickupGroom?'border-[#A97D3E] bg-amber-50 text-[#805B2B]':'border-stone-200'}`}>{tryOnPickupGroom?'✓ ':''}Nhà trai</button>
          </div>
          {tryOnPickupBride && <label className="mt-3 block text-sm font-semibold">Ngày lấy váy nhà gái<input type="date" value={tryOnBrideDate} onChange={e=>setTryOnBrideDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>}
          {tryOnPickupGroom && <label className="mt-3 block text-sm font-semibold">Ngày lấy váy nhà trai<input type="date" value={tryOnGroomDate} onChange={e=>setTryOnGroomDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>}
        </div>
        <div className="mt-4 rounded-xl border border-[#E7DFD5] p-3">
          <p className="text-sm font-semibold">Quét QR váy để kiểm tra trùng lịch</p>
          <form onSubmit={e=>{e.preventDefault();void addTryOnProduct(tryOnQrInput);}} className="mt-2 flex gap-2"><input disabled={!((tryOnContractId || tryOnManualNames) && tryOnStaffId && (tryOnPickupBride || tryOnPickupGroom) && (!tryOnPickupBride || !!tryOnBrideDate) && (!tryOnPickupGroom || !!tryOnGroomDate))} value={tryOnQrInput} onChange={e=>setTryOnQrInput(e.target.value)} placeholder="Nhập mã QR sản phẩm..." className="min-w-0 flex-1 rounded-lg border p-3 text-sm disabled:bg-stone-100"/><button disabled={!((tryOnContractId || tryOnManualNames) && tryOnStaffId && (tryOnPickupBride || tryOnPickupGroom) && (!tryOnPickupBride || !!tryOnBrideDate) && (!tryOnPickupGroom || !!tryOnGroomDate))} className="rounded-lg bg-stone-900 px-3 text-sm font-bold text-white disabled:opacity-40">Đối chiếu</button></form>
          <button type="button" disabled={!((tryOnContractId || tryOnManualNames) && tryOnStaffId && (tryOnPickupBride || tryOnPickupGroom) && (!tryOnPickupBride || !!tryOnBrideDate) && (!tryOnPickupGroom || !!tryOnGroomDate))} onClick={()=>setTryOnScannerOpen(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#A97D3E] p-3 text-sm font-bold text-[#A97D3E] disabled:opacity-40"><Camera size={17}/> Quét mã QR bằng camera</button>
          {!((tryOnContractId || tryOnManualNames) && tryOnStaffId && (tryOnPickupBride || tryOnPickupGroom) && (!tryOnPickupBride || !!tryOnBrideDate) && (!tryOnPickupGroom || !!tryOnGroomDate)) && <p className="mt-2 text-xs text-amber-700">Chọn hợp đồng/Khác, nhân viên thử đồ và bên lấy đồ kèm ngày để mở chức năng quét.</p>}
          {tryOnProducts.length > 0 && <p className="mt-3 text-xs text-stone-500">Đã quét {tryOnProducts.length} váy. Chạm “Xem váy vừa quét” để mở lại trang hình ảnh.</p>}
          {tryOnDetailProduct && <button type="button" onClick={() => setTryOnDetailOpen(true)} className="mt-2 w-full rounded-lg border border-[#A97D3E] p-2 text-sm font-semibold text-[#8A642F]">Xem váy vừa quét</button>}
          {tryOnNearWarning && <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{tryOnNearWarning}</p>}
          {tryOnConflict && <p className="mt-2 text-sm font-semibold text-rose-700">{tryOnConflict}</p>}
        </div>
        <label className="mt-3 block text-sm font-semibold">Ảnh khách thử & chọn trang phục<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{setTryOnFiles(current=>[...current,...Array.from(e.target.files||[])]);e.currentTarget.value='';}} className="mt-1 w-full rounded-xl border p-3 text-sm"/></label>
        <p className="mt-2 text-xs text-stone-500">Chỉ một nút thêm ảnh: trên điện thoại có thể chọn ảnh trong thư viện hoặc chọn camera; có thể thêm nhiều ảnh cùng lúc, hoặc mở lại để chụp/thêm tiếp nhiều ảnh vào cùng hồ sơ.</p>
        {tryOnFiles.length>0 && <p className="mt-2 text-sm text-stone-600">Đã chọn {tryOnFiles.length} ảnh.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={()=>setTryOnOpen(false)} className="rounded-xl border px-4 py-2">Hủy</button><button disabled={tryOnSaving} onClick={()=>void uploadTryOnPhotos()} className="rounded-xl bg-stone-900 px-5 py-2 font-bold text-white disabled:opacity-50">{tryOnSaving?'Đang tải ảnh...':'Lưu ảnh lên Drive'}</button></div>
      </div></div>}

      {formOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm vào kho'}</h2><button type="button" onClick={()=>setFormOpen(false)}><X/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">Danh mục<select value={form.category} onChange={e=>setForm({...form,category:e.target.value as InventoryCategory})} className="mt-1 w-full rounded-lg border p-3 text-sm">{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Tên / định danh sản phẩm<input readOnly value={form.name || (form.category==='Váy cưới'?'VAY-xxxx':form.category==='Vest'?'VEST-xxxx':form.category==='Áo dài'?'AODAI-xxxx':'PK-xxxx')} className="mt-1 w-full rounded-lg border bg-stone-50 p-3 text-sm font-semibold"/></label>
          {(form.category === 'Vest' || form.category === 'Áo dài') && <label className="text-xs font-semibold text-stone-600">Size (tự nhập)<input value={form.size || ''} onChange={e=>setForm({...form,size:e.target.value})} placeholder="Nhập size tùy ý, ví dụ S, M, L, 38..." className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>}
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Ảnh sản phẩm — tải thẳng lên Google Drive
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void uploadImage(e.target.files?.[0])} className="mt-1 w-full rounded-lg border p-3 text-sm"/>
            <span className="mt-1 block text-[11px] font-normal text-stone-400">Ảnh tự nén còn tối đa 1600px, lưu trong Drive chung. Tối đa 8 MB sau nén.</span>
            {form.imageUrl && <img src={form.imageUrl} alt="Ảnh xem trước" className="mt-2 h-36 rounded-xl object-contain bg-stone-50"/>}
          </label>
          <label className="text-xs font-semibold text-stone-600">Vị trí hiện tại<input value={form.location || 'Kho chính'} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Ví dụ: Kho A - Kệ 2" className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600">Ghi chú vị trí<input value={form.locationNote || ''} onChange={e=>setForm({...form,locationNote:e.target.value})} placeholder="Ví dụ: Khu váy ren, tầng 1" className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Mô tả sản phẩm<textarea value={form.description || ''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Mô tả kiểu dáng, chất liệu, chi tiết thiết kế..." className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
        </div>
        {editing && <label className="block text-xs font-semibold text-stone-600">Tình trạng<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as InventoryStatus})} className="mt-1 w-full rounded-lg border p-3 text-sm">{STATUSES.map(x=><option key={x}>{x}</option>)}</select></label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setFormOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Đang lưu...':'Lưu sản phẩm'}</button></div>
      </form></div>}

      {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3" onClick={()=>setSelected(null)}><div onClick={e=>e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a97d3e]">Hồ sơ sản phẩm</p><h2 className="text-xl font-bold">{selected.name}</h2></div><button onClick={()=>setSelected(null)}><X/></button></div>
        <div className="mt-4 grid gap-5 md:grid-cols-[1fr_220px]">
          <div className="space-y-3"><div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 p-3 text-sm"><div><p className="text-xs text-stone-400">Vị trí hiện tại</p><b>{selected.location || 'Kho chính'}</b></div><div><p className="text-xs text-stone-400">Ghi chú vị trí</p><b>{selected.locationNote || '—'}</b></div><div><p className="text-xs text-stone-400">Số hồ sơ khách đã chọn</p><b>{tryOnHistory.length}</b></div><div><p className="text-xs text-stone-400">Trạng thái hiện tại</p><b>{selected.status}</b></div></div>{selected.imageUrl && <img src={getDisplayImageUrl(selected.imageUrl)} alt={selected.name} className="max-h-72 w-full rounded-xl object-contain bg-stone-50"/>}<div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-stone-400">Danh mục</p><b>{selected.category}</b></div><div><p className="text-xs text-stone-400">Tình trạng</p><b>{selected.status}</b></div><div className="col-span-2"><p className="text-xs text-stone-400">Mô tả</p><b>{selected.description || '—'}</b></div></div></div>
          <div id="qr-print-area">
            <div className="qr-print-brand">HẠNH PHẠM LUXURY BRIDAL</div>
            <div className="qr-print-name">{selected.name}</div>
            <div className="qr-print-category">{selected.category}{selected.size ? ' · Size ' + selected.size : ''}</div>
            {qrImage && <img src={qrImage} alt="Mã QR sản phẩm"/>}
            <div className="qr-print-code">{selected.qrCode}</div>
          </div>
          <div className="space-y-3 text-center"><div className="rounded-xl border p-3"><p className="font-mono text-xs font-bold">{selected.qrCode}</p>{qrImage && <img src={qrImage} alt="QR sản phẩm" className="mx-auto mt-2 w-44"/>}<button type="button" onClick={()=>void downloadQrLabel()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-3 text-sm font-bold text-white"><Download size={16}/> Tải mã QR (PNG)</button><p className="mt-2 text-left text-xs text-stone-500">Không cần chọn khổ giấy. iPhone sẽ mở ảnh ở tab mới; nhấn giữ ảnh để lưu hoặc chia sẻ.</p></div><button onClick={()=>openEdit(selected)} className="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white">Chỉnh sửa sản phẩm</button><button disabled={deletingQr===selected.qrCode} onClick={()=>void deleteItem(selected)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={16}/>{deletingQr===selected.qrCode?'Đang xóa...':'Xóa sản phẩm'}</button></div>
        </div>
        <div className="mt-5 border-t pt-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><UserRound size={16}/> Lịch sử khách thử & chọn sản phẩm</h3>{historyLoading?<p className="text-sm text-stone-400">Đang tải lịch sử...</p>:tryOnHistory.length===0?<p className="text-sm text-stone-400">Chưa có khách nào được ghi nhận chọn sản phẩm này.</p>:tryOnHistory.map(record=>{const d=record.DuLieu||{};const p=(Array.isArray(d.SanPhamVay)?d.SanPhamVay:[]).find((x:any)=>String(x.MaQR||x.qrCode||'').toUpperCase()===selected.qrCode.toUpperCase());return <div key={record.QuanLyID} className="mb-3 rounded-xl border p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><b>{d.TenHopDong||d.KhachHang||d.TenCoDau||'Khách lẻ'} · {d.MaHopDong||'Không có mã HĐ'}</b><span className="text-stone-500">{d.NhanVienThu||'Chưa ghi nhân viên'}</span></div><p className="mt-1 text-stone-600">Nhà gái: {d.NgayLayVayNhaGai||'—'} · Nhà trai: {d.NgayLayVayNhaTrai||'—'}</p><p className="mt-1 text-stone-600">Sản phẩm: {p?.TenSanPham||selected.name} · {p?.DanhMuc||selected.category}</p><p className="mt-1 text-stone-500">Ngày ghi nhận: {d.TaoLuc?new Date(d.TaoLuc).toLocaleString('vi-VN'):'—'}</p></div>})}</div><div className="mt-5 border-t pt-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><Clock3 size={16}/> Nhật ký kho & thay đổi</h3>{history.length===0?<p className="text-sm text-stone-400">Chưa có lịch sử thao tác.</p>:history.map(row=><div key={row.id} className="flex justify-between gap-3 border-b py-2 text-xs"><div><b>{row.action}</b><p className="text-stone-500">{row.note} · {row.performedBy}</p></div><time className="shrink-0 text-stone-400">{new Date(row.createdAt).toLocaleString('vi-VN')}</time></div>)}</div>
      </div></div>}

      {scannerOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3"><div className="w-full max-w-md rounded-2xl bg-white p-4"><div className="mb-3 flex items-center justify-between"><b>Quét mã QR sản phẩm</b><button onClick={()=>setScannerOpen(false)}><X/></button></div><div id="bridal-inventory-qr-reader" className="overflow-hidden rounded-xl"/><p className="mt-3 text-xs text-stone-500">Đưa mã QR vào khung hình. Nếu camera không hoạt động, bạn có thể nhập mã định danh ở ô tra cứu.</p></div></div>}
    </div>
  );
};
