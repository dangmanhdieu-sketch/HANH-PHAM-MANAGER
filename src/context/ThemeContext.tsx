import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppDesignTheme } from '../types';
import { api } from '../api';

export const DEFAULT_THEME_CLIENT: AppDesignTheme = {
  brandName: 'HẠNH PHẠM MANAGER',
  brandSubtitle: '',
  tagline: '',
  logoType: 'monogram_crest',
  customLogoUrl: '',
  logoSize: 'md',
  primaryColor: '#c5a059',
  primaryHoverColor: '#a97d3e',
  accentColor: '#dfc79f',
  navbarBgColor: '#0c0a09',
  navbarTextColor: '#ffffff',
  appBgColor: '#FAF8F5',
  cardBorderRadius: '2xl',
  fontFamily: 'serif',
  buttonStyle: 'rounded',
  showBackgroundGlow: true,
  cardShadow: 'md',
  footerText: '© 2026 HẠNH PHẠM MANAGER. All rights reserved.',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: Partial<AppDesignTheme>;
  previewColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'champagne_gold',
    name: 'Champagne Gold (Mặc Định)',
    description: 'Vàng Champagne ánh kim, đen huyền bí & kem ấm quý phái',
    previewColor: '#c5a059',
    theme: {
      primaryColor: '#c5a059',
      primaryHoverColor: '#a97d3e',
      accentColor: '#dfc79f',
      navbarBgColor: '#0c0a09',
      navbarTextColor: '#ffffff',
      appBgColor: '#FAF8F5',
      fontFamily: 'serif',
      cardBorderRadius: '2xl',
      buttonStyle: 'rounded',
      showBackgroundGlow: true,
      cardShadow: 'md',
    },
  },
  {
    id: 'rose_gold',
    name: 'Rose Gold Lãng Mạn',
    description: 'Vàng hồng phớt lãng mạn, thanh tao dành cho cô dâu nhẹ nhàng',
    previewColor: '#c48b9f',
    theme: {
      primaryColor: '#c48b9f',
      primaryHoverColor: '#aa7085',
      accentColor: '#f3d5df',
      navbarBgColor: '#2b1b22',
      navbarTextColor: '#ffffff',
      appBgColor: '#FDF8F9',
      fontFamily: 'serif',
      cardBorderRadius: '2xl',
      buttonStyle: 'pill',
      showBackgroundGlow: true,
      cardShadow: 'md',
    },
  },
  {
    id: 'pure_minimalist',
    name: 'Pure White Tinh Khôi',
    description: 'Trắng sứ váy cưới cao cấp, nét chữ thanh mảnh tối giản',
    previewColor: '#78716c',
    theme: {
      primaryColor: '#44403c',
      primaryHoverColor: '#1c1917',
      accentColor: '#d6d3d1',
      navbarBgColor: '#ffffff',
      navbarTextColor: '#1c1917',
      appBgColor: '#F9FAFB',
      fontFamily: 'sans',
      cardBorderRadius: 'xl',
      buttonStyle: 'square',
      showBackgroundGlow: false,
      cardShadow: 'sm',
    },
  },
  {
    id: 'emerald_luxury',
    name: 'Emerald Royal Quý Tộc',
    description: 'Xanh ngọc lục bảo kết hợp vàng kim phong cách hoàng gia Pháp',
    previewColor: '#047857',
    theme: {
      primaryColor: '#047857',
      primaryHoverColor: '#065f46',
      accentColor: '#d1fae5',
      navbarBgColor: '#022c22',
      navbarTextColor: '#ffffff',
      appBgColor: '#F2F9F6',
      fontFamily: 'playfair',
      cardBorderRadius: '2xl',
      buttonStyle: 'rounded',
      showBackgroundGlow: true,
      cardShadow: 'lg',
    },
  },
  {
    id: 'midnight_luxury',
    name: 'Obsidian Midnight Quyến Rũ',
    description: 'Tone nền tối huyền bí sang trọng làm nổi bật ánh kim vàng',
    previewColor: '#292524',
    theme: {
      primaryColor: '#e0a96d',
      primaryHoverColor: '#c59155',
      accentColor: '#f7e1d7',
      navbarBgColor: '#1c1917',
      navbarTextColor: '#ffffff',
      appBgColor: '#141211',
      fontFamily: 'serif',
      cardBorderRadius: '2xl',
      buttonStyle: 'rounded',
      showBackgroundGlow: true,
      cardShadow: 'glow',
    },
  },
];

interface ThemeContextType {
  theme: AppDesignTheme;
  previewTheme: AppDesignTheme;
  setPreviewTheme: React.Dispatch<React.SetStateAction<AppDesignTheme>>;
  applyPreset: (presetId: string) => void;
  saveTheme: () => Promise<void>;
  resetTheme: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isVisualEditorOpen: boolean;
  setIsVisualEditorOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppDesignTheme>(DEFAULT_THEME_CLIENT);
  const [previewTheme, setPreviewTheme] = useState<AppDesignTheme>(DEFAULT_THEME_CLIENT);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisualEditorOpen, setIsVisualEditorOpen] = useState(false);

  // Fetch initial theme from backend
  useEffect(() => {
    let mounted = true;
    api.theme
      .get()
      .then((data) => {
        if (mounted && data) {
          const merged = { ...DEFAULT_THEME_CLIENT, ...data };
          setTheme(merged);
          setPreviewTheme(merged);
        }
      })
      .catch((err) => {
        console.warn('Could not load theme, using defaults:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Apply CSS custom properties dynamically to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', previewTheme.primaryColor);
    root.style.setProperty('--color-primary-hover', previewTheme.primaryHoverColor);
    root.style.setProperty('--color-accent', previewTheme.accentColor);
    root.style.setProperty('--color-navbar-bg', previewTheme.navbarBgColor);
    root.style.setProperty('--color-navbar-text', previewTheme.navbarTextColor);
    root.style.setProperty('--color-app-bg', previewTheme.appBgColor);

    // Apply background color to body
    document.body.style.backgroundColor = previewTheme.appBgColor;

    // Apply font family class
    document.body.classList.remove('font-serif-theme', 'font-sans-theme', 'font-playfair-theme', 'font-montserrat-theme');
    document.body.classList.add(`font-${previewTheme.fontFamily}-theme`);
  }, [previewTheme]);

  const hasUnsavedChanges = JSON.stringify(theme) !== JSON.stringify(previewTheme);

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setPreviewTheme((prev) => ({
        ...prev,
        ...preset.theme,
      }));
    }
  };

  const saveTheme = async () => {
    setIsSaving(true);
    try {
      const saved = await api.theme.update(previewTheme);
      setTheme(saved);
      setPreviewTheme(saved);
      alert('✨ Đã lưu và áp dụng thiết kế giao diện toàn hệ thống thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu thiết kế giao diện');
    } finally {
      setIsSaving(false);
    }
  };

  const resetTheme = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục giao diện mặc định ban đầu của Hanh Pham Bridal?')) {
      return;
    }
    setIsSaving(true);
    try {
      const reset = await api.theme.reset();
      setTheme(reset);
      setPreviewTheme(reset);
      alert('Đã khôi phục thiết kế mặc định!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi khôi phục thiết kế');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        previewTheme,
        setPreviewTheme,
        applyPreset,
        saveTheme,
        resetTheme,
        isSaving,
        hasUnsavedChanges,
        isVisualEditorOpen,
        setIsVisualEditorOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
