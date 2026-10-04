import React, { useState } from 'react';
import {
  Bell,
  LogOut,
  User,
  Shield,
  Clock,
  DollarSign,
  Award,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  Contact,
  CreditCard,
  Palette,
} from 'lucide-react';
import type { NhanVien, ThongBao } from '../types';
import { HanhPhamLogo } from './HanhPhamLogo';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentUser: NhanVien;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onQuickSwitchUser: (email: string) => void;
  notifications: ThongBao[];
  onMarkReadNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onLogout,
  onQuickSwitchUser,
  notifications,
  onMarkReadNotifications,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [switchDropdownOpen, setSwitchDropdownOpen] = useState(false);

  const { previewTheme } = useTheme();

  const unreadCount = notifications.filter((n) => !n.DaDoc).length;
  const isAdmin = currentUser.Quyen === 'Admin';

  const adminTabs = [
    { id: 'dashboard', label: 'Tổng quan', icon: BarChart3 },
    { id: 'nhanvien', label: 'Nhân viên & Danh bạ', icon: Users },
    { id: 'chamcong', label: 'Chấm công', icon: Clock },
    { id: 'luong', label: 'Bảng lương', icon: DollarSign },
    { id: 'hoahong', label: 'Hoa hồng & Show', icon: Award },
    { id: 'thietke', label: 'Thiết kế app', icon: Palette },
  ];

  const employeeTabs = [
    { id: 'home', label: 'Chấm công', icon: Clock },
    { id: 'hoahong_me', label: 'Kê khai Show & Hoa hồng', icon: Award },
    { id: 'luong_me', label: 'Lương của tôi', icon: DollarSign },
    { id: 'chamcong_me', label: 'Lịch sử công', icon: BarChart3 },
    { id: 'danhba_me', label: 'Danh bạ studio', icon: Contact },
    { id: 'profile_me', label: 'Hồ sơ', icon: User },
  ];

  const activeTabs = isAdmin ? adminTabs : employeeTabs;

  const quickUsers = [
    { name: 'Hạnh Phạm (Admin / Giám Đốc)', email: 'admin@hanhphambridal.vn', role: 'Admin' },
    { name: 'Đỗ Mai Linh (Nhân viên Tư Vấn)', email: 'linh.mai@hanhphambridal.vn', role: 'Nhân viên' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7DFD5] shadow-sm">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <HanhPhamLogo size="md" variant="gold" />
            <div className="flex items-center gap-2">
              <span className="font-bridal text-xl font-bold tracking-wider text-stone-900 uppercase">
                HẠNH PHẠM MANAGER
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wider border ${
                  isAdmin
                    ? 'bg-stone-900 text-[#dfc79f] border-[#c5a059]'
                    : 'bg-[#faf8f5] text-[#a97d3e] border-[#ebdcc3]'
                }`}
              >
                {currentUser.Quyen}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Design Editor Button for Admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => onTabChange('thietke')}
                title="Tùy biến thiết kế trực quan không cần code"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                  currentTab === 'thietke'
                    ? 'bg-stone-900 text-[#f3dfa2] border-[#c5a059]'
                    : 'bg-[#FAF8F5] hover:bg-[#F4EEE7] text-stone-800 border-[#E7DFD5]'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-[#c5a059]" />
                <span className="hidden sm:inline">Thiết kế app</span>
              </button>
            )}

            {/* Quick Account Switcher (For testing permissions instantly) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitchDropdownOpen(!switchDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e7dfd5] text-[11px] font-medium text-stone-700 bg-[#faf8f5] hover:bg-[#f4eee7] transition"
                title="Đổi tài khoản nhanh để kiểm thử phân quyền"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#bf954f]" />
                <span className="hidden md:inline">Đổi tài khoản</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {switchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#e7dfd5] p-2 z-50 animate-fade-in">
                  <p className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1 tracking-wider">
                    Chuyển đổi tài khoản (Kiểm thử)
                  </p>
                  <div className="space-y-1">
                    {quickUsers.map((u) => (
                      <button
                        key={u.email}
                        onClick={() => {
                          setSwitchDropdownOpen(false);
                          onQuickSwitchUser(u.email);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                          currentUser.Email === u.email
                            ? 'bg-[#f6f1e6] text-stone-900 font-bold border border-[#dfc79f]'
                            : 'hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{u.name}</p>
                          <p className="text-[10px] text-stone-400 truncate">{u.email}</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 font-semibold text-stone-600">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  if (!notifDropdownOpen && unreadCount > 0) {
                    onMarkReadNotifications();
                  }
                }}
                className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#e7dfd5] p-3 z-50 animate-fade-in max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Thông Báo Hệ Thống
                    </span>
                    <button
                      onClick={onMarkReadNotifications}
                      className="text-[11px] text-[#bf954f] hover:underline"
                    >
                      Đã đọc tất cả
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-stone-400 py-4 text-center">Không có thông báo mới</p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div key={n.NotificationID} className="py-2.5 space-y-1">
                          <p className="text-xs font-semibold text-stone-800">{n.TieuDe}</p>
                          <p className="text-[11px] text-stone-500 leading-relaxed">{n.NoiDung}</p>
                          <p className="text-[9px] text-stone-400">
                            {new Date(n.TaoLuc).toLocaleTimeString('vi-VN')} •{' '}
                            {new Date(n.TaoLuc).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clean User Avatar & Logout (Removed Name & Founder subtext as requested) */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <img
                src={currentUser.AnhNhanVien || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.HoTen}
                title={currentUser.HoTen}
                className="w-8 h-8 rounded-full object-cover border border-[#c5a059]"
              />
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex space-x-1 border-t border-[#f4eee7] py-1.5 overflow-x-auto">
          {activeTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-sm font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c5a059]' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly, standardized mobile UI) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-[#E7DFD5] px-1 py-1 flex items-center justify-around shadow-2xl">
        {activeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all ${
                isActive ? 'text-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-stone-900 text-[#dfc79f] shadow-sm' : 'bg-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] mt-0.5 truncate max-w-[62px] text-center leading-tight ${isActive ? 'font-bold text-stone-900' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
