import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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
      SoGioLam: 208,
      PhuCap: 1500000,
      Thuong: 2000000,
      HoaHong: 4500000,
      Phat: 0,
      TamUng: 0,
      TongLuong: 22000000,
      ThucLanh: 22000000,
      TrangThai: 'Đã thanh toán',
      NgayTao: '2026-09-01T00:05:00Z',
      NgayDuyet: '2026-09-30T10:00:00Z',
      NguoiDuyet: 'Hạnh Phạm',
      NgayThanhToan: '2026-10-01T15:30:00Z',
      NguoiThanhToan: 'Hạnh Phạm',
      GhiChu: 'Đã thanh toán',
    },
    {
      LuongID: 'L-102026-NV002',
      NhanVienID: 'NV002',
      HoTen: 'Đỗ Mai Linh',
      Thang: currentMonth,
      LuongCoBan: 14000000,
      SoNgayCong: 3,
      SoGioLam: 24,
      PhuCap: 1500000,
      Thuong: 1000000,
      HoaHong: 3200000,
      Phat: 0,
      TamUng: 0,
      TongLuong: 19700000,
      ThucLanh: 19700000,
      TrangThai: 'Chờ duyệt',
      NgayTao: '2026-10-01T00:05:00Z',
      GhiChu: 'Bảng lương tháng 10/2026',
    }
  ];

  const hoahongs: HoaHong[] = [
    {
      HoaHongID: 'HH-001',
      NhanVienID: 'NV002',
      HoTen: 'Đỗ Mai Linh',
      Ngay: '2026-10-02',
      NoiDung: 'Gói Váy Cưới Haute Couture - Cô dâu Thanh Trúc',
      DoanhThu: 64000000,
      TyLeHoaHong: 5,
      SoTienHoaHong: 3200000,
      TrangThai: 'Đã duyệt',
      LuongID: 'L-102026-NV002',
      NgayDuyet: '2026-10-02T16:00:00Z',
      NguoiDuyet: 'Hạnh Phạm',
      GhiChu: 'Tư vấn xuất sắc',
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      LogID: 'LOG-001',
      NguoiThucHien: 'Hạnh Phạm',
      Email: 'admin@hanhphambridal.vn',
      HanhDong: 'Khởi tạo hệ thống',
      ChiTiet: 'Hệ thống Quản trị Hanh Pham Bridal hoạt động',
      IP: '127.0.0.1',
      ThoiGian: '2026-10-01T00:00:00Z',
    }
  ];

  const notifications: ThongBao[] = [
    {
      NotificationID: 'TB-001',
      TieuDe: 'Chào mừng bạn đến với Hanh Pham Bridal',
      NoiDung: 'Hệ thống Quản trị Nhân sự & Chấm công lương chính thức đi vào hoạt động.',
      Loai: 'success',
      DaDoc: false,
      TaoLuc: new Date().toISOString(),
    }
  ];

  const thongke: ThongKeKPI[] = [
    {
      KPI_ID: 'NV',
      TieuDe: 'TỔNG NHÂN VIÊN',
      MoTa: 'Nhân viên đang làm việc',
      GiaTri: 1,
      CapNhatLuc: new Date().toISOString(),
    },
    {
      KPI_ID: 'CC',
      TieuDe: 'CHẤM CÔNG HÔM NAY',
      MoTa: 'Nhân viên đã check-in',
      GiaTri: 1,
      CapNhatLuc: new Date().toISOString(),
    },
    {
      KPI_ID: 'CD',
      TieuDe: 'LƯƠNG CHỜ DUYỆT',
      MoTa: 'Lương chờ duyệt',
      GiaTri: 19700000,
      CapNhatLuc: new Date().toISOString(),
    },
    {
      KPI_ID: 'TT',
      TieuDe: 'ĐÃ THANH TOÁN',
      MoTa: 'Lương đã thanh toán',
      GiaTri: 22000000,
      CapNhatLuc: new Date().toISOString(),
    }
  ];

  return {
    NHANVIEN: employees,
    CHAMCONG: chamcongs,
    LUONG: luongs,
    HOAHONG: hoahongs,
    THONGKE: thongke,
    AUDIT_LOG: auditLogs,
    NOTIFICATIONS: notifications,
    SYSTEM_CONFIG: DEFAULT_CONFIG,
  };
}

class DatabaseService {
  private db: DatabaseSchema;
  private isSaving = false;

  constructor() {
    ensureDirs();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
      } catch (err) {
        console.error('Failed reading database.json, initializing defaults:', err);
        this.db = getInitialData();
        this.saveSync();
      }
    } else {
      this.db = getInitialData();
      this.saveSync();
    }

    // Ensure only 1 Admin and 1 Employee as requested (purge mock legacy accounts)
    if (this.db.NHANVIEN && this.db.NHANVIEN.length > 2) {
      const allowedIds = new Set(['NV001', 'NV002']);
      this.db.NHANVIEN = this.db.NHANVIEN.filter((nv) => allowedIds.has(nv.NhanVienID));
      this.db.CHAMCONG = this.db.CHAMCONG.filter((cc) => allowedIds.has(cc.NhanVienID));
      this.db.LUONG = this.db.LUONG.filter((l) => allowedIds.has(l.NhanVienID));
      this.db.HOAHONG = this.db.HOAHONG.filter((h) => allowedIds.has(h.NhanVienID));
      this.saveSync();
    }

    // Migration: Ensure all staff have bank account & credential fields
    let hasMigration = false;
    const defaultBanks = [
      { stk: '0071000888999', bank: 'Vietcombank', name: 'PHAM THI HANH', branch: 'TP. Hồ Chí Minh' },
      { stk: '19036888666011', bank: 'Techcombank', name: 'DO MAI LINH', branch: 'Bến Nghé, Q.1' },
    ];
    if (this.db.NHANVIEN && Array.isArray(this.db.NHANVIEN)) {
      this.db.NHANVIEN.forEach((nv, idx) => {
        const def = defaultBanks[idx % defaultBanks.length];
        if (!nv.SoTaiKhoan) {
          nv.SoTaiKhoan = def.stk;
          hasMigration = true;
        }
        if (!nv.NganHang) {
          nv.NganHang = def.bank;
          hasMigration = true;
        }
        if (!nv.TenChuTaiKhoan) {
          nv.TenChuTaiKhoan = nv.HoTen ? nv.HoTen.toUpperCase() : def.name;
          hasMigration = true;
        }
        if (!nv.ChiNhanhNganHang) {
          nv.ChiNhanhNganHang = def.branch;
          hasMigration = true;
        }
        if (!nv.MatKhauHienThi) {
          nv.MatKhauHienThi = nv.Quyen === 'Admin' ? 'admin123' : '123456';
          hasMigration = true;
        }
      });
    }
    if (hasMigration) {
      this.saveSync();
    }

    this.refreshKPIs();
  }

  private saveSync() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (e) {
      console.error('Database write error:', e);
    }
  }

  public save() {
    this.saveSync();
  }

  public logAudit(nguoiThucHien: string, email: string, hanhDong: string, chiTiet: string, ip?: string) {
    const log: AuditLog = {
      LogID: `LOG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      NguoiThucHien: nguoiThucHien,
      Email: email,
      HanhDong: hanhDong,
      ChiTiet: chiTiet,
      IP: ip || '127.0.0.1',
      ThoiGian: new Date().toISOString(),
    };
    this.db.AUDIT_LOG.unshift(log);
    // Keep max 2000 logs
    if (this.db.AUDIT_LOG.length > 2000) {
      this.db.AUDIT_LOG.length = 2000;
    }
    this.save();
    return log;
  }

  public addNotification(tieuDe: string, noiDung: string, loai: 'info' | 'success' | 'warning' | 'alert' = 'info', nhanVienId?: string) {
    const notif: ThongBao = {
      NotificationID: `NOTIF-${Date.now().toString(36)}`,
      NhanVienID: nhanVienId,
      TieuDe: tieuDe,
      NoiDung: noiDung,
      Loai: loai,
      DaDoc: false,
      TaoLuc: new Date().toISOString(),
    };
    this.db.NOTIFICATIONS.unshift(notif);
    this.save();
    return notif;
  }

  public getTheme(): AppDesignTheme {
    if (!this.db.THEME) {
      this.db.THEME = { ...DEFAULT_THEME };
      this.save();
    }
    return this.db.THEME;
  }

  public updateTheme(updated: Partial<AppDesignTheme>): AppDesignTheme {
    this.db.THEME = { ...this.getTheme(), ...updated };
    this.save();
    return this.db.THEME;
  }

  public resetTheme(): AppDesignTheme {
    this.db.THEME = { ...DEFAULT_THEME };
    this.save();
    return this.db.THEME;
  }

  public refreshKPIs() {
    const today = new Date().toISOString().split('T')[0];
    const tongNhanVienDangLam = this.db.NHANVIEN.filter((nv) => nv.TrangThai === 'Đang Làm').length;
    const chamCongHomNay = this.db.CHAMCONG.filter((cc) => cc.Ngay === today && cc.CheckIn).length;
    
    const luongChoDuyet = this.db.LUONG
      .filter((l) => l.TrangThai === 'Chờ duyệt')
      .reduce((sum, l) => sum + (l.ThucLanh || 0), 0);
      
    const daThanhToan = this.db.LUONG
      .filter((l) => l.TrangThai === 'Đã thanh toán')
      .reduce((sum, l) => sum + (l.ThucLanh || 0), 0);

    const now = new Date().toISOString();
    this.db.THONGKE = [
      {
        KPI_ID: 'NV',
        TieuDe: 'TỔNG NHÂN VIÊN',
        MoTa: 'Số nhân viên đang làm việc tại studio',
        GiaTri: tongNhanVienDangLam,
        CapNhatLuc: now,
      },
      {
        KPI_ID: 'CC',
        TieuDe: 'CHẤM CÔNG HÔM NAY',
        MoTa: 'Nhân viên đã check-in hôm nay',
        GiaTri: chamCongHomNay,
        CapNhatLuc: now,
      },
      {
        KPI_ID: 'CD',
        TieuDe: 'LƯƠNG CHỜ DUYỆT',
        MoTa: 'Tổng thực lãnh các phiếu lương chờ duyệt',
        GiaTri: luongChoDuyet,
        CapNhatLuc: now,
      },
      {
        KPI_ID: 'TT',
        TieuDe: 'ĐÃ THANH TOÁN',
        MoTa: 'Tổng số tiền lương đã thanh toán',
        GiaTri: daThanhToan,
        CapNhatLuc: now,
      },
    ];
  }

  // NHANVIEN methods
  public getNhanVienList(): NhanVien[] {
    return this.db.NHANVIEN;
  }

  public findNhanVienById(id: string): NhanVien | undefined {
    return this.db.NHANVIEN.find((nv) => nv.NhanVienID === id);
  }

  public findNhanVienByEmail(email: string): NhanVien | undefined {
    return this.db.NHANVIEN.find((nv) => nv.Email.toLowerCase() === email.toLowerCase());
  }

  public createNhanVien(data: Partial<NhanVien>, adminUser: { HoTen: string; Email: string }): NhanVien {
    // Generate next NhanVienID: NV001, NV002, ...
    const existingIds = this.db.NHANVIEN.map((nv) => {
      const match = nv.NhanVienID.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNum = maxId + 1;
    const generatedId = `NV${String(nextNum).padStart(3, '0')}`;

    // Validate email uniqueness
    if (this.findNhanVienByEmail(data.Email || '')) {
      throw new Error(`Email ${data.Email} đã tồn tại trong hệ thống!`);
    }

    const salt = bcrypt.genSaltSync(10);
    const password = data.MatKhau || '123456';
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newNhanVien: NhanVien = {
      NhanVienID: generatedId,
      HoTen: data.HoTen?.trim() || '',
      Email: data.Email?.trim().toLowerCase() || '',
      SDT: data.SDT?.trim() || '',
      ChucVu: data.ChucVu?.trim() || 'Nhân viên',
      LuongCoBan: Number(data.LuongCoBan) || 0,
      NgayVaoLam: data.NgayVaoLam || new Date().toISOString().split('T')[0],
      TrangThai: data.TrangThai || 'Đang Làm',
      AnhNhanVien: data.AnhNhanVien || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      Quyen: data.Quyen || 'Nhân viên',
      MatKhau: hashedPassword,
      MatKhauHienThi: password,
      SoTaiKhoan: data.SoTaiKhoan?.trim() || '',
      NganHang: data.NganHang?.trim() || 'Vietcombank',
      TenChuTaiKhoan: data.TenChuTaiKhoan?.trim() || (data.HoTen ? data.HoTen.toUpperCase() : ''),
      ChiNhanhNganHang: data.ChiNhanhNganHang?.trim() || '',
      BiKhoa: false,
      GhiChu: data.GhiChu || '',
      TaoLuc: new Date().toISOString(),
    };

    this.db.NHANVIEN.push(newNhanVien);
    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Thêm nhân viên mới',
      `Tạo nhân viên ${newNhanVien.HoTen} (${newNhanVien.NhanVienID}, ${newNhanVien.ChucVu})`
    );

    return newNhanVien;
  }

  public updateNhanVien(id: string, updates: Partial<NhanVien>, adminUser: { HoTen: string; Email: string }): NhanVien {
    const index = this.db.NHANVIEN.findIndex((nv) => nv.NhanVienID === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy nhân viên với ID ${id}`);
    }

    const current = this.db.NHANVIEN[index];

    // Check email uniqueness if email changed
    if (updates.Email && updates.Email.toLowerCase() !== current.Email.toLowerCase()) {
      if (this.findNhanVienByEmail(updates.Email)) {
        throw new Error(`Email ${updates.Email} đã được sử dụng bởi nhân viên khác.`);
      }
    }

    let hashedPassword = current.MatKhau;
    let plainPassword = current.MatKhauHienThi;
    if (updates.MatKhau && updates.MatKhau.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      hashedPassword = bcrypt.hashSync(updates.MatKhau.trim(), salt);
      plainPassword = updates.MatKhau.trim();
    }

    const updated: NhanVien = {
      ...current,
      HoTen: updates.HoTen !== undefined ? updates.HoTen.trim() : current.HoTen,
      Email: updates.Email !== undefined ? updates.Email.trim().toLowerCase() : current.Email,
      SDT: updates.SDT !== undefined ? updates.SDT.trim() : current.SDT,
      ChucVu: updates.ChucVu !== undefined ? updates.ChucVu.trim() : current.ChucVu,
      LuongCoBan: updates.LuongCoBan !== undefined ? Number(updates.LuongCoBan) : current.LuongCoBan,
      NgayVaoLam: updates.NgayVaoLam || current.NgayVaoLam,
      TrangThai: updates.TrangThai || current.TrangThai,
      AnhNhanVien: updates.AnhNhanVien || current.AnhNhanVien,
      Quyen: updates.Quyen || current.Quyen,
      BiKhoa: updates.BiKhoa !== undefined ? updates.BiKhoa : current.BiKhoa,
      GhiChu: updates.GhiChu !== undefined ? updates.GhiChu : current.GhiChu,
      SoTaiKhoan: updates.SoTaiKhoan !== undefined ? updates.SoTaiKhoan.trim() : current.SoTaiKhoan,
      NganHang: updates.NganHang !== undefined ? updates.NganHang.trim() : current.NganHang,
      TenChuTaiKhoan: updates.TenChuTaiKhoan !== undefined ? updates.TenChuTaiKhoan.trim() : current.TenChuTaiKhoan,
      ChiNhanhNganHang: updates.ChiNhanhNganHang !== undefined ? updates.ChiNhanhNganHang.trim() : current.ChiNhanhNganHang,
      MatKhau: hashedPassword,
      MatKhauHienThi: plainPassword,
    };

    this.db.NHANVIEN[index] = updated;

    // Sync HoTen / Email to related tables if updated
    if (updated.HoTen !== current.HoTen) {
      this.db.CHAMCONG.forEach((cc) => {
        if (cc.NhanVienID === id) cc.HoTen = updated.HoTen;
      });
      this.db.LUONG.forEach((l) => {
        if (l.NhanVienID === id) {
          l.HoTen = updated.HoTen;
          // If Luong is still Chờ duyệt, update LuongCoBan if changed
          if (l.TrangThai === 'Chờ duyệt') {
            l.LuongCoBan = updated.LuongCoBan;
            this.recalculateLuong(l);
          }
        }
      });
      this.db.HOAHONG.forEach((hh) => {
        if (hh.NhanVienID === id) hh.HoTen = updated.HoTen;
      });
    }

    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Cập nhật nhân viên',
      `Sửa thông tin nhân viên ${updated.HoTen} (${updated.NhanVienID})`
    );

    return updated;
  }

  public deleteNhanVien(id: string, adminUser: { HoTen: string; Email: string }): boolean {
    const nv = this.findNhanVienById(id);
    if (!nv) throw new Error('Nhân viên không tồn tại');
    if (nv.Quyen === 'Admin' && nv.NhanVienID === 'NV001') {
      throw new Error('Không thể xóa tài khoản Quản trị viên tối cao');
    }

    this.db.NHANVIEN = this.db.NHANVIEN.filter((item) => item.NhanVienID !== id);
    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Xóa nhân viên',
      `Xóa nhân viên ${nv.HoTen} (${nv.NhanVienID}) khỏi hệ thống`
    );
    return true;
  }

  // CHAMCONG methods
  public getChamCongList(filter?: { date?: string; month?: string; nhanVienId?: string; trangThai?: string }): ChamCong[] {
    let result = [...this.db.CHAMCONG];
    if (filter?.date) {
      result = result.filter((cc) => cc.Ngay === filter.date);
    }
    if (filter?.month) {
      // MM/YYYY matching YYYY-MM-DD
      const [m, y] = filter.month.split('/');
      if (m && y) {
        const prefix = `${y}-${m.padStart(2, '0')}`;
        result = result.filter((cc) => cc.Ngay.startsWith(prefix));
      }
    }
    if (filter?.nhanVienId) {
      result = result.filter((cc) => cc.NhanVienID === filter.nhanVienId);
    }
    if (filter?.trangThai) {
      result = result.filter((cc) => cc.TrangThai === filter.trangThai);
    }

    // Sort descending by date, then check-in time
    return result.sort((a, b) => {
      const cmpDate = b.Ngay.localeCompare(a.Ngay);
      if (cmpDate !== 0) return cmpDate;
      return (b.CheckIn || '').localeCompare(a.CheckIn || '');
    });
  }

  public checkIn(
    user: NhanVien,
    data: { anh: string; gps: string; ghiChu?: string }
  ): ChamCong {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

    // Check if already checked in today
    let record = this.db.CHAMCONG.find(
      (cc) => cc.NhanVienID === user.NhanVienID && cc.Ngay === todayStr
    );

    if (record && record.CheckIn) {
      throw new Error(`Bạn đã Check-in hôm nay lúc ${record.CheckIn}. Không thể Check-in lại!`);
    }

    // Evaluate on-time or late based on config (08:30)
    const [h, m] = this.db.SYSTEM_CONFIG.GioVaoCaChuan.split(':').map(Number);
    const standardCheckInMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let trangThai: ChamCong['TrangThai'] = 'Có mặt';
    if (currentMinutes > standardCheckInMinutes) {
      trangThai = 'Đi trễ';
    }

    const chamCongId = `CC-${todayStr.replace(/-/g, '')}-${user.NhanVienID}`;

    if (!record) {
      record = {
        ChamCongID: chamCongId,
        NhanVienEmail: user.Email,
        NhanVienID: user.NhanVienID,
        HoTen: user.HoTen,
        Ngay: todayStr,
        CheckIn: timeStr,
        AnhCheckIn: data.anh,
        GPSCheckIn: data.gps,
        SoGioLam: 0,
        TrangThai: trangThai,
        GhiChu: data.ghiChu || '',
      };
      this.db.CHAMCONG.unshift(record);
    } else {
      record.CheckIn = timeStr;
      record.AnhCheckIn = data.anh;
      record.GPSCheckIn = data.gps;
      record.TrangThai = trangThai;
      if (data.ghiChu) record.GhiChu = data.ghiChu;
    }

    this.refreshKPIs();
    this.save();

    this.logAudit(
      user.HoTen,
      user.Email,
      'Check-in chấm công',
      `Check-in lúc ${timeStr}, GPS: ${data.gps}, Trạng thái: ${trangThai}`
    );

    return record;
  }

  public checkOut(
    user: NhanVien,
    data: { anh: string; gps: string; ghiChu?: string }
  ): ChamCong {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const record = this.db.CHAMCONG.find(
      (cc) => cc.NhanVienID === user.NhanVienID && cc.Ngay === todayStr
    );

    if (!record || !record.CheckIn) {
      throw new Error('Bạn chưa Check-in hôm nay. Vui lòng Check-in trước khi Check-out!');
    }

    if (record.CheckOut) {
      throw new Error(`Bạn đã Check-out hôm nay lúc ${record.CheckOut}.`);
    }

    record.CheckOut = timeStr;
    record.AnhCheckOut = data.anh;
    record.GPSCheckOut = data.gps;
    if (data.ghiChu) record.GhiChu = (record.GhiChu ? record.GhiChu + ' | ' : '') + data.ghiChu;

    // Calculate SoGioLam
    const [inH, inM, inS] = record.CheckIn.split(':').map(Number);
    const [outH, outM, outS] = timeStr.split(':').map(Number);
    const inTotalSec = inH * 3600 + inM * 60 + (inS || 0);
    const outTotalSec = outH * 3600 + outM * 60 + (outS || 0);

    const diffHours = Math.max(0, (outTotalSec - inTotalSec) / 3600);
    record.SoGioLam = Math.round(diffHours * 100) / 100;

    // Check early leave if before 17:30
    const [stdOutH, stdOutM] = this.db.SYSTEM_CONFIG.GioTanCaChuan.split(':').map(Number);
    const stdOutMinutes = stdOutH * 60 + stdOutM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes < stdOutMinutes && record.TrangThai === 'Có mặt') {
      record.TrangThai = 'Về sớm';
    }

    this.refreshKPIs();
    this.save();

    this.logAudit(
      user.HoTen,
      user.Email,
      'Check-out chấm công',
      `Check-out lúc ${timeStr}, Tổng giờ làm: ${record.SoGioLam} giờ`
    );

    return record;
  }

  // LUONG methods & Anti-duplicate check
  public recalculateLuong(luong: Luong): void {
    const tong =
      (luong.LuongCoBan || 0) +
      (luong.PhuCap || 0) +
      (luong.Thuong || 0) +
      (luong.HoaHong || 0) -
      (luong.Phat || 0) -
      (luong.TamUng || 0);
    luong.TongLuong = Math.max(0, tong);
    luong.ThucLanh = luong.TongLuong;
  }

  public getLuongList(filter?: { thang?: string; nhanVienId?: string; trangThai?: string }): Luong[] {
    let result = [...this.db.LUONG];
    if (filter?.thang) {
      result = result.filter((l) => l.Thang === filter.thang);
    }
    if (filter?.nhanVienId) {
      result = result.filter((l) => l.NhanVienID === filter.nhanVienId);
    }
    if (filter?.trangThai) {
      result = result.filter((l) => l.TrangThai === filter.trangThai);
    }
    return result.sort((a, b) => b.Thang.localeCompare(a.Thang) || a.NhanVienID.localeCompare(b.NhanVienID));
  }

  public findLuongById(id: string): Luong | undefined {
    return this.db.LUONG.find((l) => l.LuongID === id);
  }

  /**
   * Tạo bảng lương tháng cho toàn bộ nhân viên TrangThai = 'Đang Làm'
   * CRITICAL: CHỐNG TRÙNG LƯƠNG!
   * Không được tạo 2 bản ghi cùng NhanVienID + cùng Thang.
   * Trả về { createdCount, skippedCount, createdItems, skippedItems }
   */
  public taoBangLuongThang(
    thang: string, // MM/YYYY
    adminUser: { HoTen: string; Email: string }
  ): {
    createdCount: number;
    skippedCount: number;
    createdItems: string[];
    skippedItems: string[];
  } {
    const activeStaff = this.db.NHANVIEN.filter((nv) => nv.TrangThai === 'Đang Làm');
    let createdCount = 0;
    let skippedCount = 0;
    const createdItems: string[] = [];
    const skippedItems: string[] = [];

    // Parse month prefix to calculate real hours and days from CHAMCONG
    const [m, y] = thang.split('/');
    const monthPrefix = `${y}-${m.padStart(2, '0')}`;

    for (const nv of activeStaff) {
      // CHỐNG TRÙNG: Kiểm tra đã có bảng lương của nhân viên trong tháng này chưa
      const exists = this.db.LUONG.some(
        (l) => l.NhanVienID === nv.NhanVienID && l.Thang === thang
      );

      if (exists) {
        skippedCount++;
        skippedItems.push(`${nv.HoTen} (${nv.NhanVienID})`);
        continue;
      }

      // Calculate attendance statistics for this employee in this month
      const attendance = this.db.CHAMCONG.filter(
        (cc) => cc.NhanVienID === nv.NhanVienID && cc.Ngay.startsWith(monthPrefix)
      );
      const soNgayCong = attendance.filter((cc) => cc.CheckIn).length;
      const soGioLam = attendance.reduce((sum, cc) => sum + (cc.SoGioLam || 0), 0);

      // Sum approved commissions for this month
      const approvedCommissions = this.db.HOAHONG.filter(
        (hh) =>
          hh.NhanVienID === nv.NhanVienID &&
          hh.Ngay.startsWith(monthPrefix) &&
          hh.TrangThai === 'Đã duyệt'
      );
      const tongHoaHong = approvedCommissions.reduce((sum, hh) => sum + (hh.SoTienHoaHong || 0), 0);

      const luongId = `L-${thang.replace('/', '')}-${nv.NhanVienID}`;
      const newLuong: Luong = {
        LuongID: luongId,
        NhanVienID: nv.NhanVienID,
        HoTen: nv.HoTen,
        Thang: thang,
        LuongCoBan: nv.LuongCoBan,
        SoNgayCong: soNgayCong,
        SoGioLam: Math.round(soGioLam * 100) / 100,
        PhuCap: 0,
        Thuong: 0,
        HoaHong: tongHoaHong,
        Phat: 0,
        TamUng: 0,
        TongLuong: 0,
        ThucLanh: 0,
        TrangThai: 'Chờ duyệt',
        NgayTao: new Date().toISOString(),
        GhiChu: `Bảng lương ${thang} tạo tự động`,
      };

      this.recalculateLuong(newLuong);
      this.db.LUONG.push(newLuong);

      // Link approved commissions to this new LuongID
      approvedCommissions.forEach((hh) => {
        hh.LuongID = luongId;
      });

      createdCount++;
      createdItems.push(`${nv.HoTen} (${nv.NhanVienID})`);
    }

    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Tạo bảng lương tháng',
      `Tạo bảng lương tháng ${thang}: Đã tạo ${createdCount}, Bỏ qua ${skippedCount} do đã tồn tại`
    );

    this.addNotification(
      `Bảng lương tháng ${thang} đã được tạo`,
      `Đã khởi tạo bảng lương cho ${createdCount} nhân viên. ${skippedCount > 0 ? `Đã bỏ qua ${skippedCount} nhân viên đã có bảng lương.` : ''}`,
      'info'
    );

    return { createdCount, skippedCount, createdItems, skippedItems };
  }

  public updateLuongDetail(
    luongId: string,
    updates: Partial<Luong>,
    adminUser: { HoTen: string; Email: string }
  ): Luong {
    const luong = this.findLuongById(luongId);
    if (!luong) throw new Error('Không tìm thấy bảng lương');
    if (luong.TrangThai === 'Đã thanh toán') {
      throw new Error('Bảng lương đã thanh toán, không thể chỉnh sửa');
    }

    if (updates.LuongCoBan !== undefined) luong.LuongCoBan = Number(updates.LuongCoBan);
    if (updates.SoNgayCong !== undefined) luong.SoNgayCong = Number(updates.SoNgayCong);
    if (updates.SoGioLam !== undefined) luong.SoGioLam = Number(updates.SoGioLam);
    if (updates.PhuCap !== undefined) luong.PhuCap = Number(updates.PhuCap);
    if (updates.Thuong !== undefined) luong.Thuong = Number(updates.Thuong);
    if (updates.HoaHong !== undefined) luong.HoaHong = Number(updates.HoaHong);
    if (updates.Phat !== undefined) luong.Phat = Number(updates.Phat);
    if (updates.TamUng !== undefined) luong.TamUng = Number(updates.TamUng);
    if (updates.GhiChu !== undefined) luong.GhiChu = updates.GhiChu;

    this.recalculateLuong(luong);
    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Chỉnh sửa bảng lương',
      `Sửa bảng lương ${luong.LuongID} của ${luong.HoTen}: Thực lãnh mới = ${luong.ThucLanh.toLocaleString('vi-VN')} đ`
    );

    return luong;
  }

  public duyetLuong(luongId: string, adminUser: { HoTen: string; Email: string }): Luong {
    const luong = this.findLuongById(luongId);
    if (!luong) throw new Error('Không tìm thấy bảng lương');
    if (luong.TrangThai !== 'Chờ duyệt') {
      throw new Error(`Bảng lương đang ở trạng thái "${luong.TrangThai}", không thể duyệt lại.`);
    }

    luong.TrangThai = 'Đã duyệt';
    luong.NgayDuyet = new Date().toISOString();
    luong.NguoiDuyet = adminUser.HoTen;

    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Duyệt lương',
      `Duyệt phiếu lương ${luong.LuongID} của ${luong.HoTen} (Thực lãnh: ${luong.ThucLanh.toLocaleString('vi-VN')} đ)`
    );

    this.addNotification(
      `Lương tháng ${luong.Thang} đã được duyệt`,
      `Phiếu lương của bạn đã được quản trị viên duyệt với số tiền thực lãnh là ${luong.ThucLanh.toLocaleString('vi-VN')} đ.`,
      'success',
      luong.NhanVienID
    );

    return luong;
  }

  public thanhToanLuong(luongId: string, adminUser: { HoTen: string; Email: string }): Luong {
    const luong = this.findLuongById(luongId);
    if (!luong) throw new Error('Không tìm thấy bảng lương');
    if (luong.TrangThai !== 'Đã duyệt') {
      throw new Error('Chỉ có thể thanh toán bảng lương đã được duyệt');
    }

    luong.TrangThai = 'Đã thanh toán';
    luong.NgayThanhToan = new Date().toISOString();
    luong.NguoiThanhToan = adminUser.HoTen;

    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Thanh toán lương',
      `Xác nhận thanh toán lương ${luong.LuongID} của ${luong.HoTen} (${luong.ThucLanh.toLocaleString('vi-VN')} đ)`
    );

    this.addNotification(
      `Đã thanh toán lương tháng ${luong.Thang}`,
      `Lương tháng ${luong.Thang} (${luong.ThucLanh.toLocaleString('vi-VN')} đ) đã được studio thanh toán thành công!`,
      'success',
      luong.NhanVienID
    );

    return luong;
  }

  // HOAHONG methods
  public getHoaHongList(filter?: { nhanVienId?: string; trangThai?: string; month?: string }): HoaHong[] {
    let result = [...this.db.HOAHONG];
    if (filter?.nhanVienId) {
      result = result.filter((hh) => hh.NhanVienID === filter.nhanVienId);
    }
    if (filter?.trangThai) {
      result = result.filter((hh) => hh.TrangThai === filter.trangThai);
    }
    if (filter?.month) {
      const [m, y] = filter.month.split('/');
      const prefix = `${y}-${m.padStart(2, '0')}`;
      result = result.filter((hh) => hh.Ngay.startsWith(prefix));
    }
    return result.sort((a, b) => b.Ngay.localeCompare(a.Ngay));
  }

  public createHoaHong(
    data: {
      NhanVienID: string;
      Ngay: string;
      NoiDung: string;
      LoaiKhoan?: 'Tiền Show' | 'Hoa Hồng';
      DoanhThu?: number;
      TyLeHoaHong?: number;
      SoTienHoaHong?: number;
      AnhChungTu?: string;
      GhiChu?: string;
      TaoBoi?: 'Admin' | 'Nhân viên';
    },
    user: { HoTen: string; Email: string; Quyen?: string }
  ): HoaHong {
    const nv = this.findNhanVienById(data.NhanVienID);
    if (!nv) throw new Error('Nhân viên không tồn tại');

    const loaiKhoan = data.LoaiKhoan || 'Hoa Hồng';
    const doanhThu = Number(data.DoanhThu) || 0;
    const tyLe = Number(data.TyLeHoaHong) || 0;

    let soTien = 0;
    if (loaiKhoan === 'Tiền Show') {
      soTien = data.SoTienHoaHong !== undefined && data.SoTienHoaHong > 0
        ? Number(data.SoTienHoaHong)
        : Math.round((doanhThu * (tyLe > 0 ? tyLe : 100)) / 100);
    } else {
      soTien = data.SoTienHoaHong && tyLe === 0
        ? Number(data.SoTienHoaHong)
        : Math.round((doanhThu * tyLe) / 100);
    }

    const hoaHongId = `HH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const newHoaHong: HoaHong = {
      HoaHongID: hoaHongId,
      NhanVienID: nv.NhanVienID,
      HoTen: nv.HoTen,
      Ngay: data.Ngay || new Date().toISOString().split('T')[0],
      NoiDung: data.NoiDung.trim(),
      LoaiKhoan: loaiKhoan,
      DoanhThu: doanhThu,
      TyLeHoaHong: tyLe,
      SoTienHoaHong: soTien,
      AnhChungTu: data.AnhChungTu,
      TrangThai: 'Chờ duyệt',
      GhiChu: data.GhiChu || '',
      TaoBoi: data.TaoBoi || (user.Quyen === 'Admin' ? 'Admin' : 'Nhân viên'),
    };

    this.db.HOAHONG.unshift(newHoaHong);
    this.save();

    this.logAudit(
      user.HoTen,
      user.Email,
      `Thêm kê khai ${loaiKhoan}`,
      `Kê khai ${newHoaHong.HoaHongID} (${loaiKhoan}) cho ${nv.HoTen}: ${soTien.toLocaleString('vi-VN')} đ`
    );

    // If submitted by employee, send notification to admin
    if (newHoaHong.TaoBoi === 'Nhân viên') {
      this.addNotification(
        `Yêu cầu duyệt ${loaiKhoan} từ ${nv.HoTen}`,
        `${nv.HoTen} vừa gửi kê khai ${loaiKhoan}: "${newHoaHong.NoiDung}" với số tiền ${soTien.toLocaleString('vi-VN')} đ. Vui lòng kiểm tra và duyệt.`,
        'info'
      );
    }

    return newHoaHong;
  }

  public duyetHoaHong(
    hoaHongId: string,
    dongY: boolean,
    adminUser: { HoTen: string; Email: string }
  ): HoaHong {
    const hh = this.db.HOAHONG.find((item) => item.HoaHongID === hoaHongId);
    if (!hh) throw new Error('Không tìm thấy bản ghi hoa hồng');

    if (dongY) {
      hh.TrangThai = 'Đã duyệt';
      hh.NgayDuyet = new Date().toISOString();
      hh.NguoiDuyet = adminUser.HoTen;

      // Tự động cộng vào bảng lương của nhân viên trong tháng đó nếu đang 'Chờ duyệt'
      const [year, month] = hh.Ngay.split('-');
      const thangStr = `${month}/${year}`;
      const luong = this.db.LUONG.find(
        (l) => l.NhanVienID === hh.NhanVienID && l.Thang === thangStr
      );

      if (luong && luong.TrangThai === 'Chờ duyệt') {
        luong.HoaHong = (luong.HoaHong || 0) + hh.SoTienHoaHong;
        this.recalculateLuong(luong);
        hh.LuongID = luong.LuongID;
      }
    } else {
      hh.TrangThai = 'Từ chối';
      hh.NgayDuyet = new Date().toISOString();
      hh.NguoiDuyet = adminUser.HoTen;
    }

    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      dongY ? 'Duyệt hoa hồng' : 'Từ chối hoa hồng',
      `${dongY ? 'Duyệt' : 'Từ chối'} hoa hồng ${hh.HoaHongID} của ${hh.HoTen} (${hh.SoTienHoaHong.toLocaleString('vi-VN')} đ)`
    );

    this.addNotification(
      dongY ? 'Hoa hồng đã được duyệt' : 'Hoa hồng bị từ chối',
      `Khoản hoa hồng "${hh.NoiDung}" (${hh.SoTienHoaHong.toLocaleString('vi-VN')} đ) đã ${dongY ? 'được duyệt và cộng vào lương' : 'bị từ chối'}.`,
      dongY ? 'success' : 'warning',
      hh.NhanVienID
    );

    return hh;
  }

  public deleteHoaHong(id: string, adminUser: { HoTen: string; Email: string }): boolean {
    const hh = this.db.HOAHONG.find((h) => h.HoaHongID === id);
    if (!hh) throw new Error('Hoa hồng không tồn tại');

    // If already linked to a Luong, subtract from Luong if Luong is still Chờ duyệt
    if (hh.LuongID && hh.TrangThai === 'Đã duyệt') {
      const luong = this.findLuongById(hh.LuongID);
      if (luong && luong.TrangThai === 'Chờ duyệt') {
        luong.HoaHong = Math.max(0, (luong.HoaHong || 0) - hh.SoTienHoaHong);
        this.recalculateLuong(luong);
      }
    }

    this.db.HOAHONG = this.db.HOAHONG.filter((h) => h.HoaHongID !== id);
    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Xóa hoa hồng',
      `Xóa hoa hồng ${hh.HoaHongID} của ${hh.HoTen}`
    );
    return true;
  }

  // Backup & Restore
  public backupDatabase(): { filename: string; data: DatabaseSchema } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_hanhphambridal_${timestamp}.json`;
    const backupPath = path.resolve(BACKUP_DIR, filename);
    fs.writeFileSync(backupPath, JSON.stringify(this.db, null, 2), 'utf-8');
    return { filename, data: this.db };
  }

  public restoreDatabase(incoming: DatabaseSchema, adminUser: { HoTen: string; Email: string }): boolean {
    if (!incoming.NHANVIEN || !Array.isArray(incoming.NHANVIEN)) {
      throw new Error('Dữ liệu phục hồi không hợp lệ: thiếu bảng NHANVIEN');
    }
    // Make safety backup of current state first
    this.backupDatabase();

    this.db = incoming;
    this.refreshKPIs();
    this.save();

    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Khôi phục database',
      `Đã khôi phục toàn bộ database từ bản backup`
    );
    return true;
  }

  public getConfig(): SystemConfig {
    return this.db.SYSTEM_CONFIG;
  }

  public updateConfig(newConfig: Partial<SystemConfig>, adminUser: { HoTen: string; Email: string }): SystemConfig {
    this.db.SYSTEM_CONFIG = {
      ...this.db.SYSTEM_CONFIG,
      ...newConfig,
    };
    this.save();
    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Cập nhật cấu hình hệ thống',
      'Thay đổi thiết lập giờ làm / studio / tự động hóa'
    );
    return this.db.SYSTEM_CONFIG;
  }
  // RESET TOÀN BỘ DỮ LIỆU DEMO - GIỮ LẠI ADMIN
  public resetDemoData(adminUser: { HoTen: string; Email: string }) {
    // Kiểm tra tài khoản Admin NV001 phải tồn tại
    const admin = this.db.NHANVIEN.find(
      (nv) => nv.NhanVienID === 'NV001' && nv.Quyen === 'Admin'
    );

    if (!admin) {
      throw new Error('Không tìm thấy tài khoản Admin NV001. Không thể reset dữ liệu.');
    }

    // Tạo backup trước khi xóa
    const backup = this.backupDatabase();

    // GIỮ LẠI DUY NHẤT TÀI KHOẢN ADMIN
    this.db.NHANVIEN = [admin];

    // XÓA TOÀN BỘ DỮ LIỆU NGHIỆP VỤ DEMO
    this.db.CHAMCONG = [];
    this.db.LUONG = [];
    this.db.HOAHONG = [];
    this.db.NOTIFICATIONS = [];
    this.db.AUDIT_LOG = [];

    // Tắt tự động tạo lương trong thời gian nhập dữ liệu mới
    this.db.SYSTEM_CONFIG = {
      ...this.db.SYSTEM_CONFIG,
      AutomationEnabled: false,
      LanChayCuoi: new Date().toISOString(),
    };

    // Tính lại KPI từ database mới
    this.refreshKPIs();

    // Lưu database
    this.save();

    // Ghi lại một log duy nhất cho thao tác reset
    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Reset dữ liệu demo',
      'Đã xóa toàn bộ dữ liệu demo, giữ lại tài khoản Admin và cấu hình hệ thống.'
    );

    return {
      success: true,
      message: 'Đã xóa toàn bộ dữ liệu demo thành công.',
      backupFile: backup.filename,
      remainingAdmin: admin.NhanVienID,
      nhanVien: this.db.NHANVIEN.length,
      chamCong: this.db.CHAMCONG.length,
      luong: this.db.LUONG.length,
      hoaHong: this.db.HOAHONG.length,
      notifications: this.db.NOTIFICATIONS.length,
    };
  }
  public getRawData(): DatabaseSchema {
    return this.db;
  }
}

export const dbService = new DatabaseService();
