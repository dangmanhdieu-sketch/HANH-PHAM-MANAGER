/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  NhanVien,
  ChamCong,
  Luong,
  HoaHong,
  ThongKeKPI,
  ThongBao,
} from './types';
import { api, authStorage } from './api';

// Components & Views
import { Navbar } from './components/Navbar';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DailyShowCommissionModal } from './components/DailyShowCommissionModal';
import { LoginPage } from './views/LoginPage';
import { StaffDirectory } from './views/StaffDirectory';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { StaffManagement } from './views/admin/StaffManagement';
import { AttendanceManagement } from './views/admin/AttendanceManagement';
import { PayrollManagement } from './views/admin/PayrollManagement';
import { CommissionManagement } from './views/admin/CommissionManagement';
import { AuditAndAutomation } from './views/admin/AuditAndAutomation';

// Employee Views
import { EmployeeDashboard } from './views/employee/EmployeeDashboard';
import { MyAttendance } from './views/employee/MyAttendance';
import { MyPayroll } from './views/employee/MyPayroll';
import { MyCommissions } from './views/employee/MyCommissions';
import { MyProfile } from './views/employee/MyProfile';
import { VisualDesignEditor } from './views/admin/VisualDesignEditor';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<NhanVien | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const { previewTheme } = useTheme();

  // Application Data States
  const [kpis, setKpis] = useState<ThongKeKPI[]>([]);
  const [staffList, setStaffList] = useState<NhanVien[]>([]);
  const [attendanceList, setAttendanceList] = useState<ChamCong[]>([]);
  const [payrollList, setPayrollList] = useState<Luong[]>([]);
  const [commissionList, setCommissionList] = useState<HoaHong[]>([]);
  const [notifications, setNotifications] = useState<ThongBao[]>([]);
  const [automationStatus, setAutomationStatus] = useState<any>(null);

  // Employee specific stats
  const [todayAttendanceRecord, setTodayAttendanceRecord] = useState<ChamCong | null>(null);
  const [myTotalCommission, setMyTotalCommission] = useState(0);
  const [myTotalWorkDays, setMyTotalWorkDays] = useState(0);

  // Modals & Camera Check-in/Check-out
  const [cameraModal, setCameraModal] = useState<{
    open: boolean;
    title: 'CHECK-IN' | 'CHECK-OUT';
  }>({
    open: false,
    title: 'CHECK-IN',
  });

  // Modal confirm: Tạo bảng lương tháng
  const [confirmGeneratePayrollOpen, setConfirmGeneratePayrollOpen] = useState(false);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  // Daily Show & Commission Modal for Employee
  const [dailyClaimModalOpen, setDailyClaimModalOpen] = useState(false);

  // Handle unauthorized event
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      authStorage.clear();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Initialize Auth
  useEffect(() => {
    const storedUser = authStorage.getUser();
    const token = authStorage.getToken();
    if (storedUser && token) {
      setCurrentUser(storedUser);
      setCurrentTab(storedUser.Quyen === 'Admin' ? 'dashboard' : 'home');
    }
    setInitializing(false);
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!currentUser) return;

    if (currentUser.Quyen === 'Admin') {
      const results = await Promise.allSettled([
        api.dashboard.getStats(),
        api.staff.getAll(),
        api.attendance.getAll(),
        api.payroll.getAll(),
        api.commission.getAll(),
        api.dashboard.getNotifications(),
      ]);

      const [statsResult, staffResult, attendanceResult, payrollResult, commissionResult, notificationResult] = results;

      if (statsResult.status === 'fulfilled') {
        const statsData = statsResult.value;
        setKpis(statsData.kpis || []);
        setAutomationStatus(statsData.automation || null);
      } else {
        console.error('Lỗi tải Dashboard:', statsResult.reason);
      }

      if (staffResult.status === 'fulfilled') {
        setStaffList(staffResult.value);
      } else {
        console.error('Lỗi tải nhân viên:', staffResult.reason);
      }

      if (attendanceResult.status === 'fulfilled') {
        setAttendanceList(attendanceResult.value);
      } else {
        console.error('Lỗi tải chấm công:', attendanceResult.reason);
      }

      if (payrollResult.status === 'fulfilled') {
        setPayrollList(payrollResult.value);
      } else {
        console.error('Lỗi tải lương:', payrollResult.reason);
      }

      if (commissionResult.status === 'fulfilled') {
        setCommissionList(commissionResult.value);
      } else {
        console.error('Lỗi tải hoa hồng:', commissionResult.reason);
      }

      if (notificationResult.status === 'fulfilled') {
        setNotifications(notificationResult.value);
      } else {
        console.error('Lỗi tải thông báo:', notificationResult.reason);
      }
    } else {
      const results = await Promise.allSettled([
        api.dashboard.getStats(),
        api.attendance.getAll(),
        api.payroll.getAll(),
        api.commission.getAll(),
        api.dashboard.getNotifications(),
        api.staff.getAll(),
      ]);

      const [statsResult, attendanceResult, payrollResult, commissionResult, notificationResult, staffResult] = results;

      if (statsResult.status === 'fulfilled') {
        const statsData = statsResult.value;
        setTodayAttendanceRecord(statsData.todayRecord || null);
        setMyTotalCommission(statsData.tongHoaHong || 0);
        setMyTotalWorkDays(statsData.tongNgayCong || 0);
      }

      if (attendanceResult.status === 'fulfilled') {
        setAttendanceList(attendanceResult.value);
      }

      if (payrollResult.status === 'fulfilled') {
        setPayrollList(payrollResult.value);
      }

      if (commissionResult.status === 'fulfilled') {
        setCommissionList(commissionResult.value);
      }

      if (notificationResult.status === 'fulfilled') {
        setNotifications(notificationResult.value);
      }

      if (staffResult.status === 'fulfilled') {
        setStaffList(staffResult.value);
      }

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Lỗi tải dữ liệu employee #${index}:`, result.reason);
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
    }
  }, [currentUser, refreshAllData]);

  // Handle Login success
  const handleLoginSuccess = (user: NhanVien) => {
    setCurrentUser(user);
    setCurrentTab(user.Quyen === 'Admin' ? 'dashboard' : 'home');
  };

  // Handle Logout
  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
  };

  // Quick switch user account (for instant testing of Admin vs Employee data security)
  const handleQuickSwitchUser = async (email: string) => {
    try {
      const pass = email.includes('admin') ? 'admin123' : '123456';
      const res = await api.auth.login(email, pass);
      setCurrentUser(res.user as NhanVien);
      setCurrentTab(res.user.Quyen === 'Admin' ? 'dashboard' : 'home');
    } catch (err: any) {
      alert(err.message || 'Không thể chuyển đổi tài khoản');
    }
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    try {
      await api.dashboard.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, DaDoc: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  // Check-In Submit Handler (Camera + GPS)
  const handleCheckInSubmit = async (data: { anh: string; gps: string; ghiChu?: string }) => {
    const res = await api.attendance.checkIn(data);
    alert(res.message);
    await refreshAllData();
  };

  // Check-Out Submit Handler (Camera + GPS)
  const handleCheckOutSubmit = async (data: { anh: string; gps: string; ghiChu?: string }) => {
    const res = await api.attendance.checkOut(data);
    alert(res.message);
    await refreshAllData();
  };

  // Admin: TẠO BẢNG LƯƠNG THÁNG - WITH ANTI-DUPLICATE CHECK
  const handleExecuteGenerateMonthlyPayroll = async () => {
    setGeneratingPayroll(true);
    try {
      const now = new Date();
      const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const res = await api.payroll.generateMonth(currentMonth);

      setConfirmGeneratePayrollOpen(false);
      alert(res.message);
      await refreshAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo bảng lương tháng');
    } finally {
      setGeneratingPayroll(false);
    }
  };

  // Admin: Quick Duyệt Lương
  const handleApprovePayroll = async (luongId: string) => {
    try {
      const res = await api.payroll.approve(luongId);
      alert(res.message);
      await refreshAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt lương');
    }
  };

  // Admin: Trigger scheduled automation manually
  const handleTriggerAutomation = async () => {
    try {
      const res = await api.automation.triggerNow();
      alert(res.message);
      await refreshAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi kích hoạt automation');
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-stone-900 border-t-[#c5a059] rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-[#a97d3e] font-bridal font-bold">
            HẠNH PHẠM MANAGER
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.Quyen === 'Admin';
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-[#E2D4BA]">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
        onQuickSwitchUser={handleQuickSwitchUser}
        notifications={notifications}
        onMarkReadNotifications={handleMarkNotificationsRead}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-12">
        {/* =========================================
            ADMIN VIEWS
           ========================================= */}
        {isAdmin && (
          <>
            {currentTab === 'dashboard' && (
              <AdminDashboard
                kpis={kpis}
                todayAttendance={attendanceList.filter((c) => c.Ngay === todayStr)}
                pendingPayroll={payrollList.filter((l) => l.TrangThai === 'Chờ duyệt')}
                paidPayroll={payrollList.filter((l) => l.TrangThai === 'Đã thanh toán')}
                allPayroll={payrollList}
                allCommissions={commissionList}
                staffList={staffList}
                automationStatus={automationStatus}
                onGeneratePayroll={() => setConfirmGeneratePayrollOpen(true)}
                onApprovePayroll={handleApprovePayroll}
                onTriggerAutomation={handleTriggerAutomation}
                onNavigateToTab={setCurrentTab}
              />
            )}

            {currentTab === 'nhanvien' && (
              <StaffManagement
                staffList={staffList}
                onRefresh={refreshAllData}
                onNavigateToDirectory={() => setCurrentTab('danhba')}
              />
            )}

            {currentTab === 'danhba' && (
              <StaffDirectory
                staffList={staffList}
                currentUser={currentUser}
                onNavigateToStaffManagement={() => setCurrentTab('nhanvien')}
              />
            )}

            {currentTab === 'chamcong' && (
              <AttendanceManagement
                attendanceList={attendanceList}
                staffList={staffList}
                onRefresh={refreshAllData}
              />
            )}

            {currentTab === 'luong' && (
              <PayrollManagement
                payrollList={payrollList}
                staffList={staffList}
                onRefresh={refreshAllData}
                onGenerateMonthlyPayroll={() => setConfirmGeneratePayrollOpen(true)}
              />
            )}

            {currentTab === 'hoahong' && (
              <CommissionManagement
                commissionList={commissionList}
                staffList={staffList}
                onRefresh={refreshAllData}
              />
            )}

            {currentTab === 'luongchoduyet' && (
              <PayrollManagement
                payrollList={payrollList}
                staffList={staffList}
                onRefresh={refreshAllData}
                onGenerateMonthlyPayroll={() => setConfirmGeneratePayrollOpen(true)}
                initialFilterStatus="Chờ duyệt"
              />
            )}

            {currentTab === 'dathanhtoan' && (
              <PayrollManagement
                payrollList={payrollList}
                staffList={staffList}
                onRefresh={refreshAllData}
                onGenerateMonthlyPayroll={() => setConfirmGeneratePayrollOpen(true)}
                initialFilterStatus="Đã thanh toán"
              />
            )}

            {currentTab === 'automation' && (
              <AuditAndAutomation onRefreshAll={refreshAllData} />
            )}

            {currentTab === 'thietke' && <VisualDesignEditor />}
          </>
        )}

        {/* =========================================
            EMPLOYEE VIEWS
           ========================================= */}
        {!isAdmin && (
          <>
            {currentTab === 'home' && (
              <EmployeeDashboard
                currentUser={currentUser}
                todayRecord={todayAttendanceRecord}
                latestPayroll={payrollList[0] || null}
                totalCommissions={myTotalCommission}
                totalWorkDays={myTotalWorkDays}
                onOpenCheckIn={() => setCameraModal({ open: true, title: 'CHECK-IN' })}
                onOpenCheckOut={() => setCameraModal({ open: true, title: 'CHECK-OUT' })}
                onOpenDailyClaim={() => setDailyClaimModalOpen(true)}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'chamcong_me' && (
              <MyAttendance attendanceList={attendanceList} />
            )}

            {currentTab === 'danhba_me' && (
              <StaffDirectory
                staffList={staffList}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'luong_me' && (
              <MyPayroll currentUser={currentUser} payrollList={payrollList} />
            )}

            {currentTab === 'hoahong_me' && (
              <MyCommissions
                currentUser={currentUser}
                commissionList={commissionList}
                onRefresh={refreshAllData}
              />
            )}

            {currentTab === 'profile_me' && (
              <MyProfile currentUser={currentUser} onRefresh={refreshAllData} />
            )}
          </>
        )}
      </main>

      {/* Ambient background glow if enabled in theme */}
      {previewTheme.showBackgroundGlow && (
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[850px] h-[350px] rounded-full blur-3xl opacity-40 pointer-events-none -z-10"
          style={{
            background: `radial-gradient(circle, ${previewTheme.primaryColor} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E7DFD5] bg-white py-6 mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-400">
          <p className="font-bridal font-bold tracking-widest text-stone-700 uppercase">
            {previewTheme.brandName} {previewTheme.brandSubtitle}
          </p>
          <p className="text-[11px] mt-0.5">
            {previewTheme.footerText}
          </p>
          <p className="text-[10px] text-stone-300 mt-1">
            {previewTheme.tagline}
          </p>
        </div>
      </footer>

      {/* CAMERA & GPS CAPTURE MODAL */}
      <CameraCaptureModal
        isOpen={cameraModal.open}
        onClose={() => setCameraModal({ ...cameraModal, open: false })}
        title={cameraModal.title}
        onSubmit={cameraModal.title === 'CHECK-IN' ? handleCheckInSubmit : handleCheckOutSubmit}
      />

      {/* DAILY SHOW FEE & COMMISSION CLAIM MODAL FOR EMPLOYEE */}
      <DailyShowCommissionModal
        isOpen={dailyClaimModalOpen}
        onClose={() => setDailyClaimModalOpen(false)}
        currentUser={currentUser}
        onSubmit={async (data) => {
          await api.commission.create(data);
          alert('Đã gửi kê khai thành công! Quản trị viên sẽ phê duyệt và cộng vào bảng lương của bạn.');
          await refreshAllData();
        }}
      />

      {/* CONFIRMATION MODAL: TẠO BẢNG LƯƠNG THÁNG (REQUIREMENT XXX) */}
      <ConfirmationModal
        isOpen={confirmGeneratePayrollOpen}
        onClose={() => setConfirmGeneratePayrollOpen(false)}
        onConfirm={handleExecuteGenerateMonthlyPayroll}
        title="TẠO BẢNG LƯƠNG THÁNG NÀY"
        message="Bạn có chắc chắn muốn tạo bảng lương cho toàn bộ nhân viên đang làm trong tháng này?&#10;&#10;Hệ thống sẽ tự động quét toàn bộ nhân viên có trạng thái 'Đang Làm', tự động bỏ qua những nhân viên đã có bảng lương để chống trùng lặp."
        confirmText="XÁC NHẬN TẠO LƯƠNG"
        cancelText="HỦY"
        type="warning"
        loading={generatingPayroll}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
