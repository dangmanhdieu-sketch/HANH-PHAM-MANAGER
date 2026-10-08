import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type {
  NhanVien,
  ChamCong,
  Luong,
  HoaHong,
  ThongKeKPI,
  AuditLog,
  ThongBao,
  SystemConfig,
  AppDesignTheme,
} from '../src/types.ts';

export const DEFAULT_THEME: AppDesignTheme = {
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

interface DatabaseSchema {
  NHANVIEN: NhanVien[];
  CHAMCONG: ChamCong[];
  LUONG: Luong[];
  HOAHONG: HoaHong[];
  THONGKE: ThongKeKPI[];
  AUDIT_LOG: AuditLog[];
  NOTIFICATIONS: ThongBao[];
  SYSTEM_CONFIG: SystemConfig;
  THEME?: AppDesignTheme;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');

// Studio coordinates: Hanh Pham Bridal - 156 Nam Ky Khoi Nghia, District 1, Ho Chi Minh City
const DEFAULT_CONFIG: SystemConfig = {
  TenStudio: 'HANH PHAM BRIDAL',
  DiaChi: '156 Nam Kỳ Khởi Nghĩa, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  Hotline: '0988 123 456',
  ViDoStudio: 10.7769,
  KinhDoStudio: 106.6953,
  BanKinhChoPhepMet: 200,
  GioVaoCaChuan: '08:30',
  GioTanCaChuan: '17:30',
  TuDongTaoLuongNgay: 1,
  TuDongTaoLuongGio: '00:05',
  AutomationEnabled: true,
  LanChayCuoi: new Date().toISOString(),
};

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const staffHash = bcrypt.hashSync('123456', salt);

  const employees: NhanVien[] = [
    {
      NhanVienID: 'NV001',
      TenDangNhap: 'admin',
      HoTen: 'Hạnh Phạm',
      Email: 'admin@hanhphambridal.vn',
      SDT: '0903888999',
      ChucVu: 'Giám Đốc Studio',
      LuongCoBan: 35000000,
      NgayVaoLam: '2024-01-01',
      TrangThai: 'Đang Làm',
      AnhNhanVien: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      Quyen: 'Admin',
      MatKhau: adminHash,
      MatKhauHienThi: 'admin123',
      SoTaiKhoan: '0071000888999',
      NganHang: 'Vietcombank',
      TenChuTaiKhoan: 'PHAM THI HANH',
      ChiNhanhNganHang: 'TP. Hồ Chí Minh',
      BiKhoa: false,
      GhiChu: 'Quản trị viên tối cao Hanh Pham Bridal',
      TaoLuc: '2024-01-01T08:00:00Z',
    },
    {
      NhanVienID: 'NV002',
      TenDangNhap: 'nv002',
      HoTen: 'Đỗ Mai Linh',
      Email: 'linh.mai@hanhphambridal.vn',
      SDT: '0912345678',
      ChucVu: 'Chuyên Viên Tư Vấn & Stylist Váy Cưới',
      LuongCoBan: 14000000,
      NgayVaoLam: '2024-03-01',
      TrangThai: 'Đang Làm',
      AnhNhanVien: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
      Quyen: 'Nhân viên',
      MatKhau: staffHash,
      MatKhauHienThi: '123456',
      SoTaiKhoan: '19036888666011',
      NganHang: 'Techcombank',
      TenChuTaiKhoan: 'DO MAI LINH',
      ChiNhanhNganHang: 'Bến Nghé, Q.1',
      BiKhoa: false,
      TaoLuc: '2024-03-01T08:00:00Z',
    }
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const chamcongs: ChamCong[] = [
    {
      ChamCongID: `CC-${todayStr.replace(/-/g, '')}-NV002`,
      NhanVienEmail: 'linh.mai@hanhphambridal.vn',
      NhanVienID: 'NV002',
      HoTen: 'Đỗ Mai Linh',
      Ngay: todayStr,
      CheckIn: '08:30:00',
      AnhCheckIn: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      GPSCheckIn: '10.7769, 106.6953 (Studio Hanh Pham)',
      CheckOut: undefined,
      SoGioLam: 0,
      TrangThai: 'Có mặt',
      GhiChu: 'Đón cô dâu thử váy ca sáng',
    }
  ];

  const currentMonth = '10/2026';
  const prevMonth = '09/2026';

  const luongs: Luong[] = [
    {
      LuongID: 'L-092026-NV002',
      NhanVienID: 'NV002',
      HoTen: 'Đỗ Mai Linh',
      Thang: prevMonth,
      LuongCoBan: 14000000,
      SoNgayCong: 26,
