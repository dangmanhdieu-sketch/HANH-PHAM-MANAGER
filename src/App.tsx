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
import { AuditAndAutomation } from './views/admin/AuditAndAutomation';
import { BusinessModule } from './views/admin/BusinessModule';

// Employee Views
import { EmployeeDashboard } from './views/employee/EmployeeDashboard';
import { MyAttendance } from './views/employee/MyAttendance';
import { MyPayroll } from './views/employee/MyPayroll';
import { MyCommissions } from './views/employee/MyCommissions';
import { MyProfile } from './views/employee/MyProfile';
import { LeaveRequests } from './views/LeaveRequests';
import { ThemeProvider, useTheme } from './context/ThemeContext';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[HẠNH PHẠM MANAGER] Runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-white border border-rose-200 rounded-2xl shadow-xl p-6 text-center">
            <div className="text-rose-600 font-bold text-lg mb-2">HẠNH PHẠM MANAGER</div>
            <div className="text-stone-700 font-semibold mb-2">Ứng dụng gặp lỗi khi khởi động</div>
            <div className="text-xs text-stone-500 bg-stone-50 rounded-xl p-3 text-left break-words mb-4">
              {this.state.message || 'Lỗi không xác định'}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold"
            >
              TẢI LẠI ỨNG DỤNG
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [dashboardFinanceSummary, setDashboardFinanceSummary] = useState({
    approvedCommissionTotal: 0,
    pendingPayrollTotal: 0,
  });

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
      setCurrentTab(storedUser.Quyen === 'Admin' ? 'dashboard' : storedUser.Quyen === 'Freelancer' ? 'luong_me' : 'home');
    }
    setInitializing(false);
  }, []);

  // Load only the data needed by the active screen. This avoids downloading
  // every business table on login, tab changes, and after small edits.
  const refreshTabData = useCallback(async (tab: string) => {
    if (!currentUser) return;

    const loadNotifications = async () => {
      try {
        setNotifications(await api.dashboard.getNotifications());
      } catch (error) {
        console.error('Lỗi tải thông báo:', error);
      }
    };

    if (currentUser.Quyen === 'Admin') {
      switch (tab) {
        case 'dashboard': {
          const results = await Promise.allSettled([
            api.dashboard.getStats(),
            api.staff.getAll(),
            api.dashboard.getNotifications(),
          ]);
          const [stats, staff, notice] = results;
          if (stats.status === 'fulfilled') {
            setKpis(stats.value.kpis || []);
            setAttendanceList(stats.value.todayChamCong || []);
            setPayrollList(stats.value.pendingLuong || []);
            setAutomationStatus(stats.value.automation || null);
            setDashboardFinanceSummary({
              approvedCommissionTotal: Number(stats.value.approvedCommissionTotal || 0),
              pendingPayrollTotal: Number(stats.value.pendingPayrollTotal || 0),
            });
          }
          if (staff.status === 'fulfilled') setStaffList(staff.value);
          if (notice.status === 'fulfilled') setNotifications(notice.value);
          results.forEach((result, index) => {
            if (result.status === 'rejected') console.error('Lỗi tải Dashboard mục #' + index, result.reason);
          });
          return;
        }
        case 'nhanvien':
        case 'danhba':
          setStaffList(await api.staff.getAll());
          return;
        case 'chamcong': {
          const [attendance, staff] = await Promise.all([
            api.attendance.getAll(),
            api.staff.getAll(),
          ]);
          setAttendanceList(attendance);
          setStaffList(staff);
          return;
        }
        case 'luong':
        case 'luongchoduyet':
        case 'dathanhtoan': {
          const [payroll, commission, staff] = await Promise.all([
            api.payroll.getAll(),
            api.commission.getAll(),
            api.staff.getAll(),
          ]);
          setPayrollList(payroll);
          setCommissionList(commission);
          setStaffList(staff);
          return;
        }
        case 'thietlap':
          await Promise.all([api.dashboard.getAuditLogs(), api.automation.getStatus(), api.system.getConfig()]);
          await loadNotifications();
          return;
        case 'nghiphep':
          await loadNotifications();
          return;
        case 'congviec':
        case 'hopdong':
        case 'thuchi':
          setStaffList(await api.staff.getAll());
          return;
        default:
          await loadNotifications();
          return;
      }
    }

    // Employee/Freelancer/Sale screens only fetch the signed-in employee's
    // relevant data; server routes enforce employee scoping.
    switch (tab) {
      case 'home': {
        const [stats, notice] = await Promise.all([
          api.dashboard.getStats(),
          api.dashboard.getNotifications(),
        ]);
        setTodayAttendanceRecord(stats.todayRecord || null);
        setMyTotalCommission(stats.tongHoaHong || 0);
        setMyTotalWorkDays(stats.tongNgayCong || 0);
        setPayrollList(stats.luongGanNhat ? [stats.luongGanNhat] : []);
        setNotifications(notice);
        return;
      }
      case 'chamcong_me':
        setAttendanceList(await api.attendance.getAll());
        return;
      case 'luong_me': {
        const [payroll, commission] = await Promise.all([
          api.payroll.getAll(),
          api.commission.getAll(),
        ]);
        setPayrollList(payroll);
        setCommissionList(commission);
        return;
      }
      case 'hoahong_me':
        setCommissionList(await api.commission.getAll());
        return;
      case 'danhba_me':
        setStaffList(await api.staff.getAll());
        return;
      case 'profile_me':
        setStaffList(await api.staff.getAll());
        return;
      case 'nghiphep_me':
        await loadNotifications();
        return;
      case 'thuchi_me':
      case 'hopdong_me':
        setStaffList(await api.staff.getAll());
        return;
      default:
        await loadNotifications();
    }
  }, [currentUser]);

  // Kept for explicit full refresh actions in Settings / recovery workflows.
  const refreshAllData = useCallback(async () => {
    if (!currentUser) return;
    const tab = currentTab;
    if (currentUser.Quyen === 'Admin') {
      const [stats, staff, attendance, payroll, commission, notice] = await Promise.all([
        api.dashboard.getStats(), api.staff.getAll(), api.attendance.getAll(),
        api.payroll.getAll(), api.commission.getAll(), api.dashboard.getNotifications(),
      ]);
      setKpis(stats.kpis || []);
      setAttendanceList(attendance);
      setPayrollList(payroll);
      setCommissionList(commission);
      setStaffList(staff);
      setNotifications(notice);
      setAutomationStatus(stats.automation || null);
    } else {
      await refreshTabData(tab);
    }
  }, [currentUser, currentTab, refreshTabData]);

  useEffect(() => {
    if (currentUser) void refreshTabData(currentTab);
  }, [currentUser, currentTab, refreshTabData]);

  // Lightweight dashboard polling: refresh only summary cards and notifications,
  // not all attendance/payroll/commission records every minute.
  useEffect(() => {
    if (!currentUser || currentUser.Quyen !== 'Admin' || currentTab !== 'dashboard') return;
    const timer = window.setInterval(async () => {
      const results = await Promise.allSettled([
        api.dashboard.getStats(),
        api.dashboard.getNotifications(),
      ]);
      if (results[0].status === 'fulfilled') {
        setKpis(results[0].value.kpis || []);
        setAttendanceList(results[0].value.todayChamCong || []);
        setAutomationStatus(results[0].value.automation || null);
      }
      if (results[1].status === 'fulfilled') setNotifications(results[1].value);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [currentUser, currentTab]);

  // Handle Login success
  const handleLoginSuccess = (user: NhanVien) => {
    setCurrentUser(user);
    setCurrentTab(user.Quyen === 'Admin' ? 'dashboard' : user.Quyen === 'Freelancer' ? 'luong_me' : 'home');
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
      setCurrentTab(res.user.Quyen === 'Admin' ? 'dashboard' : res.user.Quyen === 'Freelancer' ? 'luong_me' : 'home');
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
    await refreshTabData(currentTab);
  };

  // Check-Out Submit Handler (Camera + GPS)
  const handleCheckOutSubmit = async (data: { anh: string; gps: string; ghiChu?: string }) => {
    const res = await api.attendance.checkOut(data);
    alert(res.message);
    await refreshTabData(currentTab);
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
      await refreshTabData(currentTab);
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
      await refreshTabData(currentTab);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt lương');
    }
  };

  // Admin: Trigger scheduled automation manually
  const handleTriggerAutomation = async () => {
    try {
      const res = await api.automation.triggerNow();
      alert(res.message);
      await refreshTabData(currentTab);
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
                onRefresh={() => refreshTabData(currentTab)}
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

            {currentTab === 'nghiphep' && <LeaveRequests currentUser={currentUser} isAdmin onRefresh={() => refreshTabData(currentTab)} />}

            {currentTab === 'chamcong' && (
              <AttendanceManagement
                attendanceList={attendanceList}
                staffList={staffList}
                onRefresh={() => refreshTabData(currentTab)}
              />
            )}

            {currentTab === 'luong' && (
              <PayrollManagement
                payrollList={payrollList}
                commissionList={commissionList}
                staffList={staffList}
                onRefresh={() => refreshTabData(currentTab)}
                onGenerateMonthlyPayroll={() => setConfirmGeneratePayrollOpen(true)}
              />
            )}

            {currentTab === 'luongchoduyet' && (
              <PayrollManagement
                payrollList={payrollList}
                commissionList={commissionList}
                staffList={staffList}
                onRefresh={() => refreshTabData(currentTab)}
                onGenerateMonthlyPayroll={() => setConfirmGeneratePayrollOpen(true)}
                initialFilterStatus="Chờ duyệt"
              />
            )}

            {currentTab === 'dathanhtoan' && (
              <PayrollManagement
                payrollList={payrollList}
                commissionList={commissionList}
                staffList={staffList}
                onRefresh={() => refreshTabData(currentTab)}
                onGenerateMonthlyPayroll={() => setConfirmGeneratePayrollOpen(true)}
                initialFilterStatus="Đã thanh toán"
              />
            )}

            {currentTab === 'congviec' && <BusinessModule module="CONG_VIEC" staffList={staffList} onRefresh={() => refreshTabData(currentTab)} />}
            {currentTab === 'hopdong' && <BusinessModule module="HOP_DONG" staffList={staffList} currentUser={currentUser} onRefresh={() => refreshTabData(currentTab)} />}
            {currentTab === 'thuchi' && <BusinessModule module="THU_CHI" staffList={staffList} currentUser={currentUser} onRefresh={() => refreshTabData(currentTab)} />}
            {currentTab === 'thietlap' && (
              <AuditAndAutomation onRefreshAll={refreshAllData} onNavigateToTab={setCurrentTab} />
            )}

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
                isFreelancer={currentUser.Quyen === 'Freelancer'}
              />
            )}

            {currentTab === 'nghiphep_me' && <LeaveRequests currentUser={currentUser} isAdmin={false} onRefresh={() => refreshTabData(currentTab)} />}

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
              <MyPayroll currentUser={currentUser} payrollList={payrollList} isFreelancer={currentUser.Quyen === 'Freelancer'} onOpenDailyClaim={() => setDailyClaimModalOpen(true)} />
            )}

            {currentTab === 'hoahong_me' && (
              <MyCommissions
                currentUser={currentUser}
                commissionList={commissionList}
                onRefresh={() => refreshTabData(currentTab)}
              />
            )}

            {currentTab === 'thuchi_me' && (
              <BusinessModule
                module="THU_CHI"
                staffList={staffList}
                currentUser={currentUser}
                onRefresh={() => refreshTabData(currentTab)}
              />
            )}

            {currentTab === 'hopdong_me' && currentUser.Quyen === 'Sale' && (
              <BusinessModule
                module="HOP_DONG"
                staffList={staffList}
                currentUser={currentUser}
                onRefresh={() => refreshTabData(currentTab)}
              />
            )}

            {currentTab === 'profile_me' && (
              <MyProfile currentUser={currentUser} onRefresh={() => refreshTabData(currentTab)} />
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
          // Chỉ chờ API xác nhận lưu thành công; làm mới dashboard ở nền
          // để modal không giữ trạng thái gửi trong lúc tải lại nhiều phân hệ.
          await api.commission.create(data);
          alert('Đã gửi kê khai thành công! Quản trị viên sẽ phê duyệt và cộng vào bảng lương của bạn.');
          void refreshTabData(currentTab).catch((refreshError) => console.error('Làm mới sau kê khai thất bại:', refreshError));
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
    <AppErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
