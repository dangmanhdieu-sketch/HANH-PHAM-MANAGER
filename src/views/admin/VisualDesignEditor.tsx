import React, { useEffect, useState } from 'react';
import {
  Palette,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  Type,
  Layout,
  Crown,
  Image as ImageIcon,
  Sliders,
  Sun,
  Shield,
} from 'lucide-react';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import type { SystemConfig } from '../../types';
import { api } from '../../api';

export const VisualDesignEditor: React.FC = () => {
  const {
    previewTheme,
    setPreviewTheme,
    applyPreset,
    saveTheme,
    resetTheme,
    isSaving,
    hasUnsavedChanges,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'presets' | 'brand' | 'colors' | 'typography' | 'layout'>('presets');
  const [studioConfig, setStudioConfig] = useState<SystemConfig>({
    TenStudio: '',
    DiaChi: '',
    Hotline: '',
    KinhDoStudio: 0,
    ViDoStudio: 0,
    BanKinhChoPhepMet: 200,
    GioVaoCaChuan: '08:30',
    GioTanCaChuan: '17:30',
    TuDongTaoLuongNgay: 1,
    TuDongTaoLuongGio: '00:05',
    AutomationEnabled: true,
  });
  const [savingStudio, setSavingStudio] = useState(false);

  useEffect(() => {
    api.system.getConfig()
      .then((config) => setStudioConfig(config))
      .catch((err) => console.error('Không thể tải thông tin Studio:', err));
  }, []);

  const updateStudioField = <K extends keyof SystemConfig>(
    field: K,
    value: SystemConfig[K]
  ) => {
    setStudioConfig((prev) => ({ ...prev, [field]: value }));
  };

  const saveStudioConfig = async () => {
    setSavingStudio(true);
    try {
      const saved = await api.system.updateConfig(studioConfig);
      setStudioConfig(saved);
      alert('Đã lưu thông tin Studio thành công.');
    } catch (err: any) {
      alert(err?.message || 'Không thể lưu thông tin Studio.');
    } finally {
      setSavingStudio(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Thiết bị/trình duyệt không hỗ trợ lấy vị trí.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStudioConfig((prev) => ({
          ...prev,
          ViDoStudio: Number(position.coords.latitude.toFixed(7)),
          KinhDoStudio: Number(position.coords.longitude.toFixed(7)),
        }));
      },
      (error) => {
        alert(
          error.message ||
            'Không thể lấy vị trí hiện tại. Hãy cho phép trình duyệt truy cập vị trí.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Helper for color swatches
  const colorPresets = [
    { label: 'Champagne Gold', primary: '#c5a059', hover: '#a97d3e', accent: '#dfc79f' },
    { label: 'Rose Gold', primary: '#c48b9f', hover: '#aa7085', accent: '#f3d5df' },
    { label: 'Obsidian Noir', primary: '#292524', hover: '#1c1917', accent: '#d6d3d1' },
    { label: 'Emerald Royale', primary: '#047857', hover: '#065f46', accent: '#d1fae5' },
    { label: 'Sapphire Bridal', primary: '#1d4ed8', hover: '#1e40af', accent: '#dbeafe' },
    { label: 'Rich Bronze', primary: '#a16207', hover: '#854d0e', accent: '#fef08a' },
  ];

  const bgPresets = [
    { label: 'Kem Ấm (Warm Ivory)', color: '#FAF8F5' },
    { label: 'Trắng Sứ (Clean White)', color: '#FFFFFF' },
    { label: 'Nude Beige (Mềm Mại)', color: '#F4EEE7' },
    { label: 'Hồng Phấn (Soft Blush)', color: '#FDF8F9' },
    { label: 'Đêm Huyền Bí (Dark Mode)', color: '#141211' },
  ];

  const navbarBgPresets = [
    { label: 'Đen Obsidian', color: '#0c0a09', text: '#ffffff' },
    { label: 'Nâu Gỗ Trầm', color: '#1c1917', text: '#ffffff' },
    { label: 'Trắng Kem Sáng', color: '#ffffff', text: '#1c1917' },
    { label: 'Xanh Rừng Sâu', color: '#022c22', text: '#ffffff' },
  ];

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-bridal text-stone-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#a97d3e]" />
            Thiết kế ứng dụng
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {hasUnsavedChanges && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Có thay đổi chưa lưu
            </span>
          )}

          <button
            type="button"
            onClick={resetTheme}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-semibold transition"
          >
            <RotateCcw className="w-4 h-4 text-stone-500" />
            Khôi phục mặc định
          </button>

          <button
            type="button"
            onClick={saveTheme}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-[#f3dfa2] text-xs font-bold uppercase tracking-wider transition shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#c5a059]" />
                <span>Áp dụng & Lưu thiết kế</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN: CONTROLS (7 Cols on LG)
           ======================================================== */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center border-b border-[#E7DFD5] bg-[#FAF8F5] p-1.5 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'presets'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#dfc79f]" />
              Mẫu Thiết Kế (Presets)
            </button>

            <button
              onClick={() => setActiveTab('brand')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'brand'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-[#dfc79f]" />
              Thương Hiệu & Logo
            </button>

            <button
              onClick={() => setActiveTab('colors')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'colors'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#dfc79f]" />
              Màu Sắc Toàn Diện
            </button>

            <button
              onClick={() => setActiveTab('typography')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'typography'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white'
              }`}
            >
              <Type className="w-3.5 h-3.5 text-[#dfc79f]" />
              Phông Chữ
            </button>

            <button
              onClick={() => setActiveTab('layout')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'layout'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5 text-[#dfc79f]" />
              Bo Góc & Hiệu Ứng
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* TAB 1: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
                    1. Chọn Mẫu Thiết Kế Sang Trọng 1 Chạm
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Áp dụng ngay phong cách phối màu và kiểu dáng hoàn hảo chuẩn studio cưới cao cấp.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {THEME_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className="p-4 rounded-xl border border-stone-200 hover:border-stone-900 bg-white hover:bg-[#FAF8F5] transition text-left group flex items-start gap-3.5 shadow-sm hover:shadow-md"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm"
                        style={{ backgroundColor: p.previewColor }}
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-stone-900 group-hover:text-black">
                            {p.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                          {p.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: BRAND & LOGO */}
            {activeTab === 'brand' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
                    2. Tên Thương Hiệu & Logo Studio
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Nội dung hiển thị trên thanh tiêu đề, chân trang và phiếu in ấn.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tên Thương Hiệu Chính (Brand Name):
                    </label>
                    <input
                      type="text"
                      value={previewTheme.brandName}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, brandName: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900 font-semibold"
                      placeholder="VD: HANH PHAM"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phụ Đề Thương Hiệu (Subtitle / Slogan):
                    </label>
                    <input
                      type="text"
                      value={previewTheme.brandSubtitle}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, brandSubtitle: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900 font-semibold"
                      placeholder="VD: BRIDAL STUDIO hoặc HAUTE COUTURE"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Khẩu hiệu chân trang (Footer Text):
                    </label>
                    <input
                      type="text"
                      value={previewTheme.footerText}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, footerText: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 space-y-3">
                  <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">
                    Kiểu Biểu Tượng Logo:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'monogram_crest', label: 'Huy Hiệu H&P (Crest)' },
                      { id: 'diamond_tiara', label: 'Vương Miện (Tiara)' },
                      { id: 'wedding_rings', label: 'Nhẫn Cưới (Rings)' },
                      { id: 'custom_url', label: 'Tải Ảnh Riêng' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setPreviewTheme((prev) => ({
                            ...prev,
                            logoType: item.id as any,
                          }))
                        }
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition ${
                          previewTheme.logoType === item.id
                            ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {previewTheme.logoType === 'custom_url' && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mt-2 space-y-2">
                      <label className="block text-xs font-bold text-amber-900">
                        Đường dẫn (URL) ảnh logo của bạn:
                      </label>
                      <input
                        type="text"
                        value={previewTheme.customLogoUrl}
                        onChange={(e) =>
                          setPreviewTheme((prev) => ({ ...prev, customLogoUrl: e.target.value }))
                        }
                        placeholder="https://... hoặc data:image/png;base64,..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none font-mono"
                      />
                      <p className="text-[11px] text-amber-700">
                        Hỗ trợ ảnh logo định dạng trong suốt (PNG, SVG) hoặc link ảnh online.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: COLORS */}
            {activeTab === 'colors' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
                    3. Bảng Màu Sắc Giao Diện Toàn Hệ Thống
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Chọn màu điểm nhấn kim loại, màu nền ứng dụng và màu thanh menu.
                  </p>
                </div>

                {/* Primary Accent Color */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Màu Ánh Kim / Điểm Nhấn Chính (Primary Gold/Metallic):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={previewTheme.primaryColor}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({
                          ...prev,
                          primaryColor: e.target.value,
                          primaryHoverColor: e.target.value,
                        }))
                      }
                      className="w-12 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={previewTheme.primaryColor}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({
                          ...prev,
                          primaryColor: e.target.value,
                          primaryHoverColor: e.target.value,
                        }))
                      }
                      className="px-3 py-2 text-xs font-mono font-bold rounded-xl border border-stone-300 w-32 uppercase"
                    />
                  </div>

                  {/* Swatches */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {colorPresets.map((swatch) => (
                      <button
                        key={swatch.label}
                        type="button"
                        onClick={() =>
                          setPreviewTheme((prev) => ({
                            ...prev,
                            primaryColor: swatch.primary,
                            primaryHoverColor: swatch.hover,
                            accentColor: swatch.accent,
                          }))
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 text-[11px] font-semibold hover:border-stone-400 bg-white"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: swatch.primary }}
                        ></span>
                        <span>{swatch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Color */}
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Màu Nền Ứng Dụng (App Background):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={previewTheme.appBgColor}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, appBgColor: e.target.value }))
                      }
                      className="w-12 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={previewTheme.appBgColor}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, appBgColor: e.target.value }))
                      }
                      className="px-3 py-2 text-xs font-mono font-bold rounded-xl border border-stone-300 w-32 uppercase"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {bgPresets.map((bg) => (
                      <button
                        key={bg.label}
                        type="button"
                        onClick={() =>
                          setPreviewTheme((prev) => ({ ...prev, appBgColor: bg.color }))
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 text-[11px] font-semibold hover:border-stone-400 bg-white"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-stone-300"
                          style={{ backgroundColor: bg.color }}
                        ></span>
                        <span>{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navbar Color */}
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Màu Nền Thanh Điều Hướng (Navbar Background):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={previewTheme.navbarBgColor}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, navbarBgColor: e.target.value }))
                      }
                      className="w-12 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={previewTheme.navbarBgColor}
                      onChange={(e) =>
                        setPreviewTheme((prev) => ({ ...prev, navbarBgColor: e.target.value }))
                      }
                      className="px-3 py-2 text-xs font-mono font-bold rounded-xl border border-stone-300 w-32 uppercase"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {navbarBgPresets.map((nav) => (
                      <button
                        key={nav.label}
                        type="button"
                        onClick={() =>
                          setPreviewTheme((prev) => ({
                            ...prev,
                            navbarBgColor: nav.color,
                            navbarTextColor: nav.text,
                          }))
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 text-[11px] font-semibold hover:border-stone-400 bg-white"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-stone-300"
                          style={{ backgroundColor: nav.color }}
                        ></span>
                        <span>{nav.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TYPOGRAPHY */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
                    4. Phông Chữ & Phong Cách Tiêu Đề
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Lựa chọn phong cách chữ thể hiện phong thái hoàng gia hoặc hiện đại.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'serif',
                      name: 'Cormorant Serif (Hoàng Gia)',
                      sample: 'Hanh Pham Haute Couture',
                      desc: 'Nét chữ thanh mảnh vương giả cổ điển phong cách váy cưới Paris.',
                    },
                    {
                      id: 'playfair',
                      name: 'Playfair Display (Sang Trọng)',
                      sample: 'Hanh Pham Luxury Bridal',
                      desc: 'Độ tương phản cao, nét đậm thanh lịch, nổi bật đẳng cấp.',
                    },
                    {
                      id: 'sans',
                      name: 'Plus Jakarta Sans (Tối Giản)',
                      sample: 'Hanh Pham Modern Studio',
                      desc: 'Gọn gàng, rõ nét, dễ đọc, phong cách Scandinavia hiện đại.',
                    },
                    {
                      id: 'montserrat',
                      name: 'Montserrat (Mạnh Mẽ)',
                      sample: 'HANH PHAM BRIDAL',
                      desc: 'Chữ in hoa thẳng thắn, quyền lực, ấn tượng cao cấp.',
                    },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() =>
                        setPreviewTheme((prev) => ({
                          ...prev,
                          fontFamily: font.id as any,
                        }))
                      }
                      className={`p-4 rounded-xl border text-left transition ${
                        previewTheme.fontFamily === font.id
                          ? 'border-stone-900 bg-[#FAF8F5] shadow-sm'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        {font.name}
                      </span>
                      <p className="text-base font-bold text-stone-900 mt-1 font-bridal">
                        {font.sample}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1">{font.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: LAYOUT & EFFECTS */}
            {activeTab === 'layout' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
                    5. Bo Góc Khối & Hiệu Ứng Trực Quan
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Độ mềm mại của các thẻ hồ sơ, nút bấm và hiệu ứng ánh sáng.
                  </p>
                </div>

                {/* Border Radius */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Độ Bo Góc Khối Thẻ (Border Radius):
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'md', label: 'Vuông Nhẹ (12px)' },
                      { id: '2xl', label: 'Bo Tròn Đẹp (16px)' },
                      { id: '3xl', label: 'Bo Tròn Lớn (24px)' },
                    ].map((radius) => (
                      <button
                        key={radius.id}
                        type="button"
                        onClick={() =>
                          setPreviewTheme((prev) => ({
                            ...prev,
                            cardBorderRadius: radius.id as any,
                          }))
                        }
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                          previewTheme.cardBorderRadius === radius.id
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                      >
                        {radius.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Style */}
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Kiểu Dáng Nút Bấm (Button Shape):
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'square', label: 'Vuông Góc' },
                      { id: 'rounded', label: 'Bo Tròn Chuẩn' },
                      { id: 'pill', label: 'Viên Thuốc (Pill)' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() =>
                          setPreviewTheme((prev) => ({
                            ...prev,
                            buttonStyle: btn.id as any,
                          }))
                        }
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                          previewTheme.buttonStyle === btn.id
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glow Effect Toggle */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-900 block">
                      Hiệu Ứng Ánh Sáng Vàng Kim (Luxury Ambient Glow)
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Tạo quầng sáng nhẹ nhàng lãng mạn ở nền ứng dụng phía trên.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={previewTheme.showBackgroundGlow}
                    onChange={(e) =>
                      setPreviewTheme((prev) => ({
                        ...prev,
                        showBackgroundGlow: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 rounded text-stone-900 accent-stone-900 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: STUDIO INFORMATION
           ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E7DFD5] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E7DFD5] bg-[#FAF8F5]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-900">
                THÔNG TIN STUDIO
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Cập nhật địa chỉ, hotline và vị trí dùng cho chấm công GPS.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tên Studio
                </label>
                <input
                  value={studioConfig.TenStudio}
                  onChange={(e) => updateStudioField('TenStudio', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                  placeholder="HANH PHAM BRIDAL"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Địa chỉ tiệm
                </label>
                <textarea
                  value={studioConfig.DiaChi}
                  onChange={(e) => updateStudioField('DiaChi', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e] resize-none"
                  placeholder="Nhập địa chỉ đầy đủ của tiệm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Hotline
                </label>
                <input
                  value={studioConfig.Hotline}
                  onChange={(e) => updateStudioField('Hotline', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                  placeholder="0988 123 456"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Vĩ độ
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={studioConfig.ViDoStudio}
                    onChange={(e) =>
                      updateStudioField('ViDoStudio', Number(e.target.value))
                    }
                    className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kinh độ
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={studioConfig.KinhDoStudio}
                    onChange={(e) =>
                      updateStudioField('KinhDoStudio', Number(e.target.value))
                    }
                    className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={getCurrentLocation}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 transition"
              >
                📍 Lấy vị trí hiện tại của tiệm
              </button>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bán kính chấm công GPS (mét)
                </label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={studioConfig.BanKinhChoPhepMet}
                  onChange={(e) =>
                    updateStudioField(
                      'BanKinhChoPhepMet',
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Giờ vào chuẩn
                  </label>
                  <input
                    type="time"
                    value={studioConfig.GioVaoCaChuan}
                    onChange={(e) =>
                      updateStudioField('GioVaoCaChuan', e.target.value)
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Giờ tan chuẩn
                  </label>
                  <input
                    type="time"
                    value={studioConfig.GioTanCaChuan}
                    onChange={(e) =>
                      updateStudioField('GioTanCaChuan', e.target.value)
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#a97d3e]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={saveStudioConfig}
                disabled={savingStudio}
                className="w-full px-5 py-3 rounded-xl bg-stone-900 hover:bg-black text-[#f3dfa2] text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
              >
                {savingStudio ? 'Đang lưu...' : 'Lưu thông tin Studio'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
