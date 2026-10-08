import React, { useState } from 'react';
import {
  Bell,
  LogOut,
  User,
  Clock,
  DollarSign,
  Award,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ArrowRightLeft,
  ChevronDown,
  Contact,
  CheckSquare,
  Shirt,
  FileText,
  Wallet,
} from 'lucide-react';

import type { NhanVien, ThongBao } from '../types';
import { HanhPhamLogo } from './HanhPhamLogo';

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

  const unreadCount = notifications.filter((n) => !n.DaDoc).length;
  const isAdmin = currentUser.Quyen === 'Admin';

  // ============================================================
  // ADMIN TABS
  // ============================================================
  const adminTabs = [
    { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: BarChart3 },
    { id: 'nhanvien', label: 'Nhân viên', shortLabel: 'Nhân viên', icon: Users },
    { id: 'chamcong', label: 'Chấm công', shortLabel: 'Chấm công', icon: Clock },
    { id: 'luong', label: 'Lương & Thu nhập', shortLabel: 'Lương & TN', icon: DollarSign },
    { id: 'congviec', label: 'Công việc', shortLabel: 'Công việc', icon: CheckSquare },
    { id: 'vaycuoi', label: 'Váy cưới', shortLabel: 'Váy cưới', icon: Shirt },
    { id: 'hopdong', label: 'Hợp đồng', shortLabel: 'Hợp đồng', icon: FileText },
    { id: 'thuchi', label: 'Thu chi', shortLabel: 'Thu chi', icon: Wallet },
    { id: 'thongke', label: 'Thống kê', shortLabel: 'Thống kê', icon: BarChart3 },
    { id: 'thietlap', label: 'Thiết lập', shortLabel: 'Thiết lập', icon: Settings },
  ];

  // ============================================================
  // EMPLOYEE TABS
  // ============================================================
  const employeeTabs = [
    {
      id: 'home',
      label: 'Chấm công',
      shortLabel: 'Chấm công',
      icon: Clock,
    },
    {
      id: 'hoahong_me',
      label: 'Kê khai Show & Hoa hồng',
      shortLabel: 'Hoa hồng',
      icon: Award,
    },
    {
      id: 'luong_me',
      label: 'Lương của tôi',
      shortLabel: 'Lương',
      icon: DollarSign,
    },
    {
      id: 'chamcong_me',
      label: 'Lịch sử công',
      shortLabel: 'Lịch sử',
      icon: BarChart3,
    },
    {
      id: 'danhba_me',
      label: 'Danh bạ studio',
      shortLabel: 'Danh bạ',
      icon: Contact,
    },
    {
      id: 'profile_me',
      label: 'Hồ sơ',
      shortLabel: 'Hồ sơ',
      icon: User,
    },
  ];

  const activeTabs = isAdmin ? adminTabs : employeeTabs;

  // ============================================================
  // QUICK USERS
  // ============================================================
  const quickUsers = [
    {
      name: 'Hạnh Phạm (Admin / Giám Đốc)',
      email: 'admin@hanhphambridal.vn',
      role: 'Admin',
    },
    {
      name: 'Đỗ Mai Linh (Nhân viên Tư Vấn)',
      email: 'linh.mai@hanhphambridal.vn',
      role: 'Nhân viên',
    },
  ];

  // ============================================================
  // CHANGE TAB
  // ============================================================
  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
    setSwitchDropdownOpen(false);
    setNotifDropdownOpen(false);
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    setMobileMenuOpen(false);
    setSwitchDropdownOpen(false);
    setNotifDropdownOpen(false);
    onLogout();
  };

  return (
    <header
      className="
        sticky top-0 z-50
        bg-white/95
        backdrop-blur-xl
        border-b border-[#E7DFD5]
        shadow-sm
      "
    >
      {/* ======================================================
          MOBILE
      ====================================================== */}
      <div className="lg:hidden">

        {/* ====================================================
            MOBILE BRAND HEADER
        ==================================================== */}
        <div
          className="
            px-3 sm:px-4
            flex items-center justify-between
            gap-3
            bg-white/95
          "
          style={{
            paddingTop: 'max(10px, env(safe-area-inset-top))',
            paddingBottom: '9px',
            minHeight: 'calc(62px + env(safe-area-inset-top))',
          }}
        >
          {/* LOGO + BRAND */}
          <button
            type="button"
            onClick={() =>
              handleTabChange(isAdmin ? 'dashboard' : 'home')
            }
            className="
              flex items-center gap-2.5
              min-w-0 flex-1
              text-left
              active:opacity-70
              transition
            "
            aria-label="Trang chủ"
          >
            <div className="shrink-0">
              <HanhPhamLogo
                size="sm"
                variant="gold"
              />
            </div>

            <div className="min-w-0">
              <div
                className="
                  font-bridal
                  text-[14px]
                  sm:text-[15px]
                  leading-tight
                  font-bold
                  tracking-[0.08em]
                  text-stone-900
                  whitespace-nowrap
                "
              >
                HẠNH PHẠM
              </div>

              <div
                className="
                  text-[8px]
                  sm:text-[9px]
                  leading-tight
                  tracking-[0.22em]
                  text-[#a97d3e]
                  font-semibold
                "
              >
                MANAGER
              </div>
            </div>
          </button>

          {/* ACTIONS */}
          <div className="flex items-center gap-1 shrink-0">

            {/* =================================================
                NOTIFICATION
            ================================================= */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifDropdownOpen((prev) => !prev);
                  setSwitchDropdownOpen(false);

                  if (!notifDropdownOpen && unreadCount > 0) {
                    onMarkReadNotifications();
                  }
                }}
                className="
                  relative
                  w-10 h-10
                  flex items-center justify-center
                  rounded-xl
                  text-stone-600
                  hover:bg-[#FAF8F5]
                  active:bg-[#F4EEE7]
                "
                aria-label="Thông báo"
              >
                <Bell className="w-[19px] h-[19px]" />

                {unreadCount > 0 && (
                  <span
                    className="
                      absolute
                      top-1
                      right-1
                      min-w-[17px]
                      h-[17px]
                      px-1
                      bg-rose-500
                      text-white
                      text-[9px]
                      font-bold
                      rounded-full
                      flex items-center justify-center
                    "
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATION POPUP */}
              {notifDropdownOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-12
                    w-[min(88vw,340px)]
                    bg-white
                    rounded-2xl
                    shadow-2xl
                    border border-[#E7DFD5]
                    p-3
                    z-[120]
                  "
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Thông báo
                    </span>

                    <button
                      type="button"
                      onClick={onMarkReadNotifications}
                      className="text-[11px] text-[#bf954f] hover:underline"
                    >
                      Đã đọc tất cả
                    </button>
                  </div>

                  <div className="max-h-[55vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-stone-400 py-6 text-center">
                        Không có thông báo mới
                      </p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.NotificationID}
                          className="py-3 border-b border-stone-100 last:border-0"
                        >
                          <p className="text-xs font-semibold text-stone-800">
                            {n.TieuDe}
                          </p>

                          <p className="text-[11px] text-stone-500 leading-relaxed mt-1">
                            {n.NoiDung}
                          </p>

                          <p className="text-[9px] text-stone-400 mt-1">
                            {new Date(
                              n.TaoLuc
                            ).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* =================================================
                MENU
            ================================================= */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(true);
                setNotifDropdownOpen(false);
                setSwitchDropdownOpen(false);
              }}
              className="
                w-10 h-10
                flex items-center justify-center
                rounded-xl
                bg-stone-900
                text-[#dfc79f]
                shadow-sm
                hover:bg-stone-800
                active:scale-95
              "
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ====================================================
            MOBILE SUB TABS
            Nằm NGAY DƯỚI LOGO
            Có thể vuốt ngang
        ==================================================== */}
        <div
          className="
            bg-white
            border-t border-[#F1EBE3]
            border-b border-[#E7DFD5]
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              px-3
              py-2
              overflow-x-auto
              overscroll-x-contain
            "
            style={{
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {activeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    handleTabChange(tab.id)
                  }
                  className={`
                    flex
                    items-center
                    gap-1.5
                    shrink-0
                    px-3
                    py-2
                    rounded-xl
                    text-[11px]
                    font-semibold
                    whitespace-nowrap
                    transition-all
                    ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-[#FAF8F5] text-stone-600 border border-[#EEE7DE]'
                    }
                  `}
                >
                  <Icon
                    className={`
                      w-3.5 h-3.5 shrink-0
                      ${
                        isActive
                          ? 'text-[#dfc79f]'
                          : 'text-[#a97d3e]'
                      }
                    `}
                  />

                  <span>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================
          DESKTOP HEADER
      ====================================================== */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">

            {/* LOGO */}
            <div className="flex items-center gap-3">
              <HanhPhamLogo
                size="md"
                variant="gold"
              />

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

            {/* ACTIONS */}
            <div className="flex items-center gap-2 sm:gap-4">

                  type="button"
                  onClick={() => {
                    setSwitchDropdownOpen((prev) => !prev);
                    setNotifDropdownOpen(false);
                  }}
                  className="
                    flex items-center gap-1.5
                    px-2.5 py-1.5
                    rounded-lg
                    border border-[#e7dfd5]
                    text-[11px]
                    font-medium
                    text-stone-700
                    bg-[#faf8f5]
                    hover:bg-[#f4eee7]
                  "
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#bf954f]" />

                  <span>Đổi tài khoản</span>

                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {switchDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#e7dfd5] p-2 z-[120]">

                    <p className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1 tracking-wider">
                      Chuyển đổi tài khoản
                    </p>

                    <div className="space-y-1">
                      {quickUsers.map((u) => (
                        <button
                          key={u.email}
                          type="button"
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
                            <p className="truncate">
                              {u.name}
                            </p>

                            <p className="text-[10px] text-stone-400 truncate">
                              {u.email}
                            </p>
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

              {/* DESKTOP NOTIFICATION */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifDropdownOpen((prev) => !prev);
                    setSwitchDropdownOpen(false);

                    if (!notifDropdownOpen && unreadCount > 0) {
                      onMarkReadNotifications();
                    }
                  }}
                  className="
                    relative
                    p-2
                    text-stone-600
                    hover:text-stone-900
                    hover:bg-stone-100
                    rounded-full
                  "
                  aria-label="Thông báo"
                >
                  <Bell className="w-5 h-5" />

                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#e7dfd5] p-3 z-[120] max-h-96 overflow-y-auto">

                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">

                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Thông Báo Hệ Thống
                      </span>

                      <button
                        type="button"
                        onClick={onMarkReadNotifications}
                        className="text-[11px] text-[#bf954f] hover:underline"
                      >
                        Đã đọc tất cả
                      </button>

                    </div>

                    <div className="divide-y divide-stone-100 mt-2">

                      {notifications.length === 0 ? (
                        <p className="text-xs text-stone-400 py-4 text-center">
                          Không có thông báo mới
                        </p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.NotificationID}
                            className="py-2.5 space-y-1"
                          >
                            <p className="text-xs font-semibold text-stone-800">
                              {n.TieuDe}
                            </p>

                            <p className="text-[11px] text-stone-500 leading-relaxed">
                              {n.NoiDung}
                            </p>

                            <p className="text-[9px] text-stone-400">
                              {new Date(
                                n.TaoLuc
                              ).toLocaleTimeString('vi-VN')}{' '}
                              •{' '}
                              {new Date(
                                n.TaoLuc
                              ).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        ))
                      )}

                    </div>
                  </div>
                )}
              </div>

              {/* AVATAR */}
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">

                <img
                  src={
                    currentUser.AnhNhanVien ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={currentUser.HoTen}
                  title={currentUser.HoTen}
                  className="w-8 h-8 rounded-full object-cover border border-[#c5a059]"
                />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>

              </div>
            </div>
          </div>

          {/* ====================================================
              DESKTOP NAVIGATION
          ==================================================== */}
          <nav className="flex space-x-1 border-t border-[#f4eee7] py-1.5 overflow-x-auto">

            {activeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    handleTabChange(tab.id)
                  }
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? 'text-[#c5a059]'
                        : 'text-stone-400'
                    }`}
                  />

                  <span>{tab.label}</span>
                </button>
              );
            })}

          </nav>
        </div>
      </div>

      {/* ======================================================
          MOBILE DRAWER
      ====================================================== */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">

          {/* OVERLAY */}
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileMenuOpen(false)}
            className="
              absolute
              inset-0
              bg-black/35
              backdrop-blur-[2px]
            "
          />

          {/* DRAWER */}
          <aside
            className="
              absolute
              top-0
              right-0
              bottom-0
              w-[88vw]
              max-w-[390px]
              bg-[#FCFBF9]
              shadow-2xl
              flex
              flex-col
            "
            style={{
              paddingTop: 'env(safe-area-inset-top)',
            }}
          >

            {/* DRAWER HEADER */}
            <div className="px-5 pt-4 pb-4 border-b border-[#E7DFD5] bg-white">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <HanhPhamLogo
                    size="sm"
                    variant="gold"
                  />

                  <div>
                    <p className="font-bridal text-[15px] font-bold tracking-wider text-stone-900">
                      HẠNH PHẠM
                    </p>

                    <p className="text-[9px] tracking-[0.2em] text-[#a97d3e] font-semibold">
                      MANAGER
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="
                    w-10 h-10
                    rounded-xl
                    bg-stone-100
                    flex items-center justify-center
                    text-stone-600
                  "
                  aria-label="Đóng menu"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              {/* USER */}
              <div className="mt-4 flex items-center gap-3 p-3 rounded-2xl bg-[#F6F1E8] border border-[#E7DFD5]">

                <img
                  src={
                    currentUser.AnhNhanVien ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={currentUser.HoTen}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                />

                <div className="min-w-0">

                  <p className="text-sm font-bold text-stone-900 truncate">
                    {currentUser.HoTen}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5">

                    <span className="text-[10px] text-stone-500 truncate">
                      {currentUser.Email}
                    </span>

                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-900 text-[#dfc79f] font-bold uppercase">
                      {currentUser.Quyen}
                    </span>

                  </div>
                </div>
              </div>
            </div>

            {/* MENU CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 py-4">

              <p className="px-2 mb-2 text-[10px] uppercase tracking-[0.18em] font-bold text-stone-400">
                Điều hướng
              </p>

              <div className="space-y-1.5">

                {activeTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        handleTabChange(tab.id)
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-md'
                          : 'text-stone-700 bg-white border border-[#EEE7DE] hover:bg-[#F6F1E8]'
                      }`}
                    >

                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-white/10 text-[#dfc79f]'
                            : 'bg-[#F7F3ED] text-[#a97d3e]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>

                      <span className="flex-1 min-w-0">

                        <span className="block text-sm font-semibold truncate">
                          {tab.label}
                        </span>

                        {isActive && (
                          <span className="block text-[10px] text-[#dfc79f] mt-0.5">
                            Đang mở
                          </span>
                        )}

                      </span>

                      <span
                        className={`text-lg ${
                          isActive
                            ? 'text-[#dfc79f]'
                            : 'text-stone-300'
                        }`}
                      >
                        ›
                      </span>

                    </button>
                  );
                })}

              </div>

              {/* ACCOUNT SWITCH */}
              <div className="mt-6">

                <p className="px-2 mb-2 text-[10px] uppercase tracking-[0.18em] font-bold text-stone-400">
                  Tài khoản
                </p>

                <div className="rounded-2xl bg-white border border-[#EEE7DE] overflow-hidden">

                  <button
                    type="button"
                    onClick={() =>
                      setSwitchDropdownOpen(
                        (prev) => !prev
                      )
                    }
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  >

                    <span className="w-10 h-10 rounded-xl bg-[#F7F3ED] text-[#a97d3e] flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5" />
                    </span>

                    <span className="flex-1">

                      <span className="block text-sm font-semibold text-stone-800">
                        Đổi tài khoản
                      </span>

                      <span className="block text-[10px] text-stone-400 mt-0.5">
                        Kiểm thử phân quyền
                      </span>

                    </span>

                    <ChevronDown
                      className={`w-4 h-4 text-stone-400 transition-transform ${
                        switchDropdownOpen
                          ? 'rotate-180'
                          : ''
                      }`}
                    />

                  </button>

                  {switchDropdownOpen && (
                    <div className="border-t border-stone-100 p-2">

                      {quickUsers.map((u) => (
                        <button
                          key={u.email}
                          type="button"
                          onClick={() => {
                            setSwitchDropdownOpen(false);
                            onQuickSwitchUser(u.email);
                          }}
                          className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between ${
                            currentUser.Email === u.email
                              ? 'bg-[#F6F1E8]'
                              : 'hover:bg-stone-50'
                          }`}
                        >

                          <div className="min-w-0">

                            <p className="text-xs font-semibold text-stone-800 truncate">
                              {u.name}
                            </p>

                            <p className="text-[10px] text-stone-400 truncate mt-0.5">
                              {u.email}
                            </p>

                          </div>

                          <span className="ml-2 shrink-0 text-[9px] px-2 py-1 rounded-full bg-stone-100 text-stone-600 font-bold">
                            {u.role}
                          </span>

                        </button>
                      ))}

                    </div>
                  )}
                </div>
              </div>

                    >
                      Tùy biến giao diện
                    </span>

                  </span>

                </button>
              )}

            </div>

            {/* LOGOUT */}
            <div
              className="
                p-4
                border-t border-[#E7DFD5]
                bg-white
              "
              style={{
                paddingBottom:
                  'max(16px, env(safe-area-inset-bottom))',
              }}
            >
              <button
                type="button"
                onClick={handleLogout}
                className="
                  w-full
                  flex items-center justify-center gap-2
                  py-3.5
                  rounded-2xl
                  bg-rose-50
                  text-rose-600
                  border border-rose-100
                  font-bold
                  text-sm
                  hover:bg-rose-100
                  active:scale-[0.99]
                "
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>

          </aside>
        </div>
      )}
    </header>
  );
};
