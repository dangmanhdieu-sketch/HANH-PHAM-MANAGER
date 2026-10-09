import React, { useState, useEffect } from 'react';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import {
  Settings,
  AlertTriangle,
  Shield,
  Play,
  RotateCcw,
  Download,
  Upload,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle,
  History,
  FileJson,
  Palette,
  ImagePlus,
  Building2,
} from 'lucide-react';
import type { AuditLog, SystemConfig } from '../../types';
import { api } from '../../api';

interface AuditAndAutomationProps {
  onRefreshAll: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const AuditAndAutomation: React.FC<AuditAndAutomationProps> = ({ onRefreshAll, onNavigateToTab }) => {
  const { previewTheme, setPreviewTheme, applyPreset, saveTheme, isSaving } = useTheme();
  const [logoPreview, setLogoPreview] = useState<string>('');

  const handleLogoFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Vui lòng chọn tệp ảnh logo.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Logo nên nhỏ hơn 2 MB để tải nhanh.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      setLogoPreview(value);
      setPreviewTheme((prev) => ({ ...prev, customLogoUrl: value, logoType: 'custom_url' }));
      try {
        localStorage.setItem('hanhpham_custom_logo', value);
        window.dispatchEvent(new Event('hanhpham-logo-changed'));
      } catch { alert('Không thể lưu ảnh logo trên trình duyệt này.'); }
    };
    reader.readAsDataURL(file);
  };
  const [automationStatus, setAutomationStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAuto, setRunningAuto] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [auto, logs, cfg] = await Promise.all([
        api.automation.getStatus(),
        api.dashboard.getAuditLogs(),
        api.system.getConfig(),
      ]);
      setAutomationStatus(auto);
      setAuditLogs(logs);
      setConfig(cfg);
    } catch (err) {
      console.error('Error loading automation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerManual = async () => {
    setRunningAuto(true);
    try {
      const res = await api.automation.triggerNow();
      alert(res.message);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi kích hoạt automation');
    } finally {
      setRunningAuto(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSavingConfig(true);
    try {
      const updated = await api.system.updateConfig(config);
      setConfig(updated);
      alert('Đã cập nhật cấu hình hệ thống thành công!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const blob = await api.system.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_hanhphambridal_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Không thể tải bản backup');
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('CẢNH BÁO: Khôi phục database sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu trong bản backup. Bạn có chắc chắn muốn tiếp tục?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setRestoring(true);
        const parsed = JSON.parse(reader.result as string);
        await api.system.restoreBackup(parsed);
        alert('Khôi phục database thành công!');
        await loadData();
        onRefreshAll();
      } catch (err: any) {
        alert('Lỗi khôi phục: ' + (err.message || 'File JSON không hợp lệ'));
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };
  const handleResetDemoData = async () => {
    alert('Chức năng xóa dữ liệu demo chưa được kết nối với API. Hãy dùng Khôi phục từ bản backup hoặc quản lý dữ liệu trong từng mục.');
  };

  const filteredLogs = auditLogs.filter((log) => {
    const term = logSearch.toLowerCase();
    return (
      log.NguoiThucHien.toLowerCase().includes(term) ||
      log.HanhDong.toLowerCase().includes(term) ||
      log.ChiTiet.toLowerCase().includes(term) ||
      log.Email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#bf954f]" />
            SETTING
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Chỉnh giao diện, thương hiệu, sao lưu dữ liệu, phân quyền nhân viên và vận hành hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button type="button" onClick={()=>onNavigateToTab('nhanvien')} className="text-left bg-white border border-[#E7DFD5] rounded-xl p-4 hover:border-[#c5a059]"><Shield className="w-5 h-5 text-[#bf954f]"/><p className="font-bold text-sm mt-2">Phân quyền nhân viên</p><p className="text-xs text-stone-500 mt-1">Quản lý tài khoản, vai trò và trạng thái nhân viên.</p></button>
        <button type="button" onClick={handleDownloadBackup} className="text-left bg-white border border-[#E7DFD5] rounded-xl p-4 hover:border-[#c5a059]"><Download className="w-5 h-5 text-[#bf954f]"/><p className="font-bold text-sm mt-2">Sao chép dữ liệu</p><p className="text-xs text-stone-500 mt-1">Tải bản sao lưu dữ liệu để lưu trữ an toàn.</p></button>
        <button type="button" onClick={()=>onNavigateToTab('thuchi')} className="text-left bg-white border border-[#E7DFD5] rounded-xl p-4 hover:border-[#c5a059]"><Building2 className="w-5 h-5 text-[#bf954f]"/><p className="font-bold text-sm mt-2">Quản lý nghiệp vụ</p><p className="text-xs text-stone-500 mt-1">Đi tới khu vực quản lý phiếu thu chi và dữ liệu liên quan.</p></button>
      </section>

      {/* BRAND & APP APPEARANCE SETTINGS */}
      <section className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7DFD5]"><Palette className="w-5 h-5 text-[#bf954f]" /></div>
          <div><h2 className="font-bold text-stone-900">Giao diện ứng dụng & thương hiệu</h2><p className="text-xs text-stone-500 mt-1">Tùy chỉnh màu sắc, tên thương hiệu và logo hiển thị trên ứng dụng.</p></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold mb-1">Tên thương hiệu hiển thị</label><input value={previewTheme.brandName} onChange={e=>setPreviewTheme(p=>({...p,brandName:e.target.value}))} className="w-full border rounded-lg p-2.5 text-sm"/></div>
          <div><label className="block text-xs font-semibold mb-1">Dòng mô tả thương hiệu</label><input value={previewTheme.brandSubtitle} onChange={e=>setPreviewTheme(p=>({...p,brandSubtitle:e.target.value}))} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Ví dụ: Luxury Bridal Studio"/></div>
          <div><label className="block text-xs font-semibold mb-1">Slogan</label><input value={previewTheme.tagline} onChange={e=>setPreviewTheme(p=>({...p,tagline:e.target.value}))} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Slogan thương hiệu"/></div>
          <div><label className="block text-xs font-semibold mb-1">Mẫu giao diện</label><select onChange={e=>applyPreset(e.target.value)} defaultValue="" className="w-full border rounded-lg p-2.5 text-sm"><option value="" disabled>Chọn giao diện có sẵn</option>{THEME_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="block text-xs font-semibold mb-1">Màu chủ đạo</label><div className="flex gap-2"><input type="color" value={previewTheme.primaryColor} onChange={e=>setPreviewTheme(p=>({...p,primaryColor:e.target.value}))} className="h-10 w-14 border rounded"/><input value={previewTheme.primaryColor} onChange={e=>setPreviewTheme(p=>({...p,primaryColor:e.target.value}))} className="flex-1 border rounded-lg p-2 text-sm"/></div></div>
          <div><label className="block text-xs font-semibold mb-1">Màu nền ứng dụng</label><div className="flex gap-2"><input type="color" value={previewTheme.appBgColor} onChange={e=>setPreviewTheme(p=>({...p,appBgColor:e.target.value}))} className="h-10 w-14 border rounded"/><input value={previewTheme.appBgColor} onChange={e=>setPreviewTheme(p=>({...p,appBgColor:e.target.value}))} className="flex-1 border rounded-lg p-2 text-sm"/></div></div>
        </div>
        <div className="rounded-xl border border-dashed border-stone-300 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-stone-900 flex items-center justify-center overflow-hidden shrink-0">
            {(logoPreview || previewTheme.customLogoUrl) ? <img src={logoPreview || previewTheme.customLogoUrl} alt="Logo thương hiệu" className="w-full h-full object-contain"/> : <ImagePlus className="w-8 h-8 text-[#dfc79f]"/>}
          </div>
          <div className="flex-1"><p className="font-semibold text-sm">Logo thương hiệu</p><p className="text-xs text-stone-500 mt-1">Chọn ảnh PNG, JPG hoặc WebP, tối đa 2 MB. Logo được áp dụng trên trình duyệt hiện tại.</p><label className="inline-flex mt-3 items-center gap-2 rounded-lg bg-stone-900 text-white px-4 py-2 text-xs font-bold cursor-pointer"><ImagePlus className="w-4 h-4"/> Thay ảnh logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e=>{handleLogoFile(e.target.files?.[0]);e.currentTarget.value='';}}/></label></div>
        </div>
        <div className="flex justify-end"><button type="button" disabled={isSaving} onClick={()=>void saveTheme()} className="px-5 py-2.5 rounded-xl bg-stone-900 text-[#dfc79f] text-xs font-bold disabled:opacity-50">{isSaving?'Đang lưu...':'LƯU GIAO DIỆN & THƯƠNG HIỆU'}</button></div>
      </section>

      {/* AUTOMATION ENGINE CARD */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-stone-900 text-[#dfc79f]">
              <Sparkles className="w-5 h-5 text-[#c5a059]" />
            </div>
            <div>
              <h2 className="text-base font-bold font-bridal text-stone-900">
                SCHEDULED AUTOMATION: TỰ ĐỘNG TẠO LƯƠNG THÁNG
              </h2>
              <p className="text-xs text-stone-500">
                Chạy định kỳ vào ngày 1 hàng tháng, giờ Việt Nam (GMT+7) với thuật toán chống trùng lặp.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang hoạt động (Background Worker)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Quy luật kích hoạt</span>
            <p className="text-stone-900 font-bold text-sm mt-1">
              {automationStatus?.schedulePattern || 'Ngày 1 hàng tháng lúc 00:05 (GMT+7)'}
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Thời điểm chạy kế tiếp</span>
            <p className="text-indigo-900 font-bold text-sm mt-1">
              {automationStatus?.nextScheduledRun || '01/11/2026 lúc 00:05 (GMT+7)'}
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5]">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Lần chạy gần nhất</span>
            <p className="text-stone-700 font-medium text-xs mt-1">
              {automationStatus?.lastRun ? new Date(automationStatus.lastRun).toLocaleString('vi-VN') : 'Đã khởi tạo'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-stone-500">
            * Cả Automation và nút tạo lương thủ công đều sử dụng chung module kiểm tra chống trùng lặp theo Mã NV và Tháng.
          </p>
          <button
            type="button"
            onClick={handleTriggerManual}
            disabled={runningAuto}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-50"
          >
            <Play className="w-4 h-4 text-[#c5a059]" />
            <span>{runningAuto ? 'Đang kích hoạt...' : 'Kích hoạt Automation ngay'}</span>
          </button>
        </div>
      </div>

      {/* BACKUP & RESTORE SECTION */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
          <div className="p-2.5 rounded-xl bg-[#FAF8F5] text-stone-700 border border-[#E7DFD5]">
            <FileJson className="w-5 h-5 text-[#bf954f]" />
          </div>
          <div>
            <h2 className="text-base font-bold font-bridal text-stone-900">
              SAO LƯU & KHÔI PHỤC DỮ LIỆU (BACKUP & RESTORE)
            </h2>
            <p className="text-xs text-stone-500">
              Bảo toàn dữ liệu chấm công, hồ sơ nhân sự, bảng lương và hoa hồng theo tiêu chuẩn an toàn.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Export / Download backup */}
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] space-y-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Tải Xuống Bản Sao Lưu Database (JSON)
            </h3>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              Tải về toàn bộ cơ sở dữ liệu hiện tại bao gồm: 7 bảng (NHANVIEN, CHAMCONG, LUONG, HOAHONG, THONGKE, AUDIT_LOG, NOTIFICATIONS).
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg font-semibold text-stone-800 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Backup (.json)</span>
            </button>
          </div>

          {/* Restore Backup */}
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] space-y-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#bf954f]" />
              Khôi Phục Database Từ File Sao Lưu
            </h3>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              Tải lên file JSON đã sao lưu trước đó. Hệ thống sẽ tự động sao lưu phiên bản hiện tại trước khi ghi đè để đảm bảo an toàn tuyệt đối.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-[#dfc79f]" />
              <span>{restoring ? 'Đang khôi phục...' : 'Chọn file JSON khôi phục'}</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                disabled={restoring}
                onChange={handleRestoreFile}
              />
            </label>
          </div>
        </div>
                {/* RESET DEMO DATA */}
        <div className="mt-4 p-5 rounded-xl border-2 border-red-200 bg-red-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                XÓA DỮ LIỆU DEMO
              </h3>

              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Xóa nhân viên mẫu, chấm công, lương, hoa hồng và dữ liệu demo.
                Tài khoản Admin sẽ được giữ lại.
              </p>

              <p className="text-[11px] text-red-600 mt-1">
                Hệ thống sẽ tự động tạo bản backup trước khi xóa.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetDemoData}
              disabled={resetting}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                {resetting
                  ? 'Đang xóa dữ liệu...'
                  : 'XÓA TOÀN BỘ DỮ LIỆU DEMO'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* STUDIO CONFIGURATION */}
      {config && (
        <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] text-stone-700 border border-[#E7DFD5]">
              <MapPin className="w-5 h-5 text-[#bf954f]" />
            </div>
            <div>
              <h2 className="text-base font-bold font-bridal text-stone-900">
                THIẾT LẬP THƯƠNG HIỆU & GIỜ LÀM VIỆC STUDIO
              </h2>
              <p className="text-xs text-stone-500">
                Cấu hình tọa độ GPS phòng chống giả mạo và thiết lập mốc giờ tính trễ.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Tên Thương Hiệu</label>
              <input
                type="text"
                value={config.TenStudio}
                onChange={(e) => setConfig({ ...config, TenStudio: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Địa Chỉ Trụ Sở</label>
              <input
                type="text"
                value={config.DiaChi}
                onChange={(e) => setConfig({ ...config, DiaChi: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Hotline Studio</label>
              <input
                type="text"
                value={config.Hotline}
                onChange={(e) => setConfig({ ...config, Hotline: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Vĩ Độ GPS (Latitude)</label>
              <input
                type="number"
                step="0.0001"
                value={config.ViDoStudio}
                onChange={(e) => setConfig({ ...config, ViDoStudio: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kinh Độ GPS (Longitude)</label>
              <input
                type="number"
                step="0.0001"
                value={config.KinhDoStudio}
                onChange={(e) => setConfig({ ...config, KinhDoStudio: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Giờ Vào Ca Chuẩn (Trễ nếu sau)</label>
              <input
                type="time"
                value={config.GioVaoCaChuan}
                onChange={(e) => setConfig({ ...config, GioVaoCaChuan: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Giờ Tan Ca Chuẩn (Sớm nếu trước)</label>
              <input
                type="time"
                value={config.GioTanCaChuan}
                onChange={(e) => setConfig({ ...config, GioTanCaChuan: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Giờ Chạy Lương Tự Động (GMT+7)</label>
              <input
                type="time"
                value={config.TuDongTaoLuongGio}
                onChange={(e) => setConfig({ ...config, TuDongTaoLuongGio: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider transition shadow-md"
              >
                {savingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AUDIT LOG SECTION */}
      <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#bf954f]" />
            <div>
              <h2 className="text-base font-bold font-bridal text-stone-900">
                NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOG)
              </h2>
              <p className="text-xs text-stone-500">
                Ghi nhận mọi thao tác: Tạo/sửa nhân viên, chấm công, tạo lương, duyệt lương, thanh toán, duyệt hoa hồng.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Lọc nhật ký thao tác..."
              className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-stone-500 uppercase tracking-wider sticky top-0 border-b border-[#E7DFD5]">
              <tr>
                <th className="px-5 py-3 font-semibold">Thời Gian</th>
                <th className="px-5 py-3 font-semibold">Người Thực Hiện</th>
                <th className="px-5 py-3 font-semibold">Hành Động</th>
                <th className="px-5 py-3 font-semibold">Chi Tiết Thao Tác</th>
                <th className="px-5 py-3 font-semibold">Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFD5]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-stone-400">
                    Không có bản ghi nhật ký kiểm toán nào.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.LogID} className="hover:bg-[#FAF8F5] transition text-stone-700">
                    <td className="px-5 py-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {new Date(log.ThoiGian).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-stone-900">{log.NguoiThucHien}</p>
                      <p className="text-[10px] text-stone-400">{log.Email}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-stone-800">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px]">
                        {log.HanhDong}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[320px] text-stone-600 leading-relaxed">
                      {log.ChiTiet}
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] text-stone-400">
                      {log.IP || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
