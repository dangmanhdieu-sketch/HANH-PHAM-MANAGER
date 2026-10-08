import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
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
      AnhNhanVien:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
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
      AnhNhanVien:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
      Quyen: 'Nhân viên',
      MatKhau: staffHash,
      MatKhauHienThi: '123456',
      SoTaiKhoan: '19036888666011',
      NganHang: 'Techcombank',
      TenChuTaiKhoan: 'DO MAI LINH',
      ChiNhanhNganHang: 'Bến Nghé, Q.1',
      BiKhoa: false,
      TaoLuc: '2024-03-01T08:00:00Z',
    },
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
      AnhCheckIn:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      GPSCheckIn: '10.7769, 106.6953 (Studio Hanh Pham)',
      CheckOut: undefined,
      SoGioLam: 0,
      TrangThai: 'Có mặt',
      GhiChu: 'Đón cô dâu thử váy ca sáng',
    },
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
    },
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
    },
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
    },
  ];

  const notifications: ThongBao[] = [
    {
      NotificationID: 'TB-001',
      TieuDe: 'Chào mừng bạn đến với Hanh Pham Bridal',
      NoiDung:
        'Hệ thống Quản trị Nhân sự & Chấm công lương chính thức đi vào hoạt động.',
      Loai: 'success',
      DaDoc: false,
      TaoLuc: new Date().toISOString(),
    },
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
    },
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
  private firestoreSaveQueue: Promise<void> = Promise.resolve();
  private firestoreSaveQueued = false;
  private firestore: Firestore | null = null;
  private firestoreEnabled = false;

  private readonly firestoreCollection =
    process.env.FIREBASE_COLLECTION || 'hanh_pham_manager';

  private readonly firestoreDocument =
    process.env.FIREBASE_DOCUMENT || 'database';

  private readonly firestoreTables = [
    'NHANVIEN',
    'CHAMCONG',
    'LUONG',
    'HOAHONG',
    'THONGKE',
    'AUDIT_LOG',
    'NOTIFICATIONS',
    'SYSTEM_CONFIG',
    'THEME',
  ] as const;

  private readyPromise: Promise<void>;

  constructor() {
    ensureDirs();

    /*
     * database.json CHỈ được dùng làm dữ liệu khởi tạo ban đầu.
     * Khi Firestore đã tồn tại, Firestore sẽ là nguồn dữ liệu chính.
     */
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
      } catch (err) {
        console.error(
          'Không đọc được database.json, tạm thời dùng dữ liệu mặc định:',
          err
        );
        this.db = getInitialData();
      }
    } else {
      this.db = getInitialData();
    }

    this.applyMigrations();
    this.refreshKPIs();

    /*
     * KHÔNG saveSync() trước khi Firestore được đọc.
     *
     * Đây là điểm rất quan trọng:
     * nếu save database demo trước, một số trường hợp khởi động lại
     * có thể khiến database local trở thành nguồn dữ liệu sai.
     */
    this.initializeFirestore();

    this.readyPromise = this.loadFromFirestore();
  }

  private applyMigrations(): boolean {
    let hasMigration = false;

    if (this.db.NHANVIEN && Array.isArray(this.db.NHANVIEN)) {
      const usedUsernames = new Set<string>();

      this.db.NHANVIEN.forEach((nv) => {
        let username = String(nv.TenDangNhap || '')
          .trim()
          .toLowerCase();

        if (!username) {
          username =
            nv.NhanVienID === 'NV001'
              ? 'admin'
              : nv.NhanVienID.toLowerCase();
        }

        if (usedUsernames.has(username)) {
          username = nv.NhanVienID.toLowerCase();
        }

        if (nv.TenDangNhap !== username) {
          nv.TenDangNhap = username;
          hasMigration = true;
        } else {
          nv.TenDangNhap = username;
        }

        usedUsernames.add(username);
      });
    }

    const defaultBanks = [
      {
        stk: '0071000888999',
        bank: 'Vietcombank',
        name: 'PHAM THI HANH',
        branch: 'TP. Hồ Chí Minh',
      },
      {
        stk: '19036888666011',
        bank: 'Techcombank',
        name: 'DO MAI LINH',
        branch: 'Bến Nghé, Q.1',
      },
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
          nv.TenChuTaiKhoan = nv.HoTen
            ? nv.HoTen.toUpperCase()
            : def.name;
          hasMigration = true;
        }

        if (!nv.ChiNhanhNganHang) {
          nv.ChiNhanhNganHang = def.branch;
          hasMigration = true;
        }

        if (!nv.MatKhauHienThi) {
          nv.MatKhauHienThi =
            nv.Quyen === 'Admin' ? 'admin123' : '123456';
          hasMigration = true;
        }
      });
    }

    return hasMigration;
  }

  private initializeFirestore() {
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!rawCredentials) {
      console.warn(
        '[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON chưa được cấu hình. ' +
          'Đang dùng database.json làm fallback.'
      );
      return;
    }

    try {
      const serviceAccount = JSON.parse(rawCredentials);

      const app =
        getApps().length > 0
          ? getApps()[0]
          : initializeApp({
              credential: cert(serviceAccount),
            });

      this.firestore = getFirestore(app);
      this.firestoreEnabled = true;

      console.log(
        `[Firebase] Firestore enabled: ${this.firestoreCollection}/${this.firestoreDocument}`
      );
    } catch (err) {
      this.firestore = null;
      this.firestoreEnabled = false;

      console.error(
        '[Firebase] Không thể khởi tạo Firebase Admin SDK:',
        err
      );
    }
  }

  public async waitUntilReady(): Promise<void> {
    await this.readyPromise;
  }

  private async loadFromFirestore(): Promise<void> {
    if (!this.firestoreEnabled || !this.firestore) {
      return;
    }

    try {
      const rootRef = this.firestore
        .collection(this.firestoreCollection)
        .doc(this.firestoreDocument);

      const rootSnap = await rootRef.get();

      /*
       * CHỈ migrate database.json lên Firebase nếu Firebase hoàn toàn
       * chưa có document.
       *
       * Sau lần đầu này, database.json KHÔNG BAO GIỜ được dùng để
       * ghi đè dữ liệu Firebase khi server restart/redeploy.
       */
      if (!rootSnap.exists) {
        await this.persistToFirestoreNow();

        console.log(
          '[Firebase] Firestore document chưa tồn tại. ' +
            'Đã migrate database.json lên Firestore lần đầu.'
        );

        return;
      }

      const rootData = rootSnap.data() || {};
      const schemaVersion = Number(rootData.__schemaVersion || 1);

      /*
       * SCHEMA V2 - dữ liệu nằm trong subcollection tables.
       */
      if (schemaVersion >= 2) {
        const tableSnaps = await Promise.all(
          this.firestoreTables.map((table) =>
            rootRef.collection('tables').doc(table).get()
          )
        );

        const loaded: Partial<DatabaseSchema> = {};

        tableSnaps.forEach((snap, index) => {
          if (!snap.exists) {
            return;
          }

          const table = this.firestoreTables[index];
          const data = snap.data()?.data;

          if (data !== undefined) {
            (loaded as any)[table] = data;
          }
        });

        /*
         * Nếu NHANVIEN tồn tại trong Firebase thì Firebase được xem là
         * nguồn dữ liệu chính tuyệt đối.
         */
        if (Array.isArray(loaded.NHANVIEN)) {
          this.db = {
            ...this.db,
            ...loaded,

            NHANVIEN: loaded.NHANVIEN,

            CHAMCONG: Array.isArray(loaded.CHAMCONG)
              ? loaded.CHAMCONG
              : [],

            LUONG: Array.isArray(loaded.LUONG)
              ? loaded.LUONG
              : [],

            HOAHONG: Array.isArray(loaded.HOAHONG)
              ? loaded.HOAHONG
              : [],

            THONGKE: Array.isArray(loaded.THONGKE)
              ? loaded.THONGKE
              : [],

            AUDIT_LOG: Array.isArray(loaded.AUDIT_LOG)
              ? loaded.AUDIT_LOG
              : [],

            NOTIFICATIONS: Array.isArray(loaded.NOTIFICATIONS)
              ? loaded.NOTIFICATIONS
              : [],

            SYSTEM_CONFIG:
              loaded.SYSTEM_CONFIG || this.db.SYSTEM_CONFIG,

            THEME:
              loaded.THEME || this.db.THEME,
          };

          const migrated = this.applyMigrations();
          this.refreshKPIs();

          /*
           * Chỉ ghi ngược lên Firebase khi thực sự có migration
           * như username/bank fields.
           */
          if (migrated) {
            await this.persistToFirestoreNow();
          }

          this.saveSync();

          console.log(
            '[Firebase] Đã tải dữ liệu persistent từ Firestore.'
          );

          return;
        }

        /*
         * Schema v2 tồn tại nhưng thiếu NHANVIEN:
         *
         * TUYỆT ĐỐI KHÔNG lấy database.json demo ghi đè Firebase.
         */
        console.error(
          '[Firebase] Schema v2 tồn tại nhưng không có bảng NHANVIEN ' +
            'trong Firestore. KHÔNG ghi đè bằng database.json demo.'
        );

        return;
      }

      /*
       * LEGACY FORMAT
       *
       * Dữ liệu cũ nằm trực tiếp trong document:
       * /hanh_pham_manager/database
       *
       * Đọc dữ liệu cũ từ Firebase rồi nâng cấp sang schema v2.
       */
      const legacy: Partial<DatabaseSchema> = rootData as any;

      this.db = {
        ...this.db,
        ...legacy,

        NHANVIEN: Array.isArray(legacy.NHANVIEN)
          ? legacy.NHANVIEN
          : this.db.NHANVIEN,

        CHAMCONG: Array.isArray(legacy.CHAMCONG)
          ? legacy.CHAMCONG
          : this.db.CHAMCONG,

        LUONG: Array.isArray(legacy.LUONG)
          ? legacy.LUONG
          : this.db.LUONG,

        HOAHONG: Array.isArray(legacy.HOAHONG)
          ? legacy.HOAHONG
          : this.db.HOAHONG,

        THONGKE: Array.isArray(legacy.THONGKE)
          ? legacy.THONGKE
          : this.db.THONGKE,

        AUDIT_LOG: Array.isArray(legacy.AUDIT_LOG)
          ? legacy.AUDIT_LOG
          : this.db.AUDIT_LOG,

        NOTIFICATIONS: Array.isArray(legacy.NOTIFICATIONS)
          ? legacy.NOTIFICATIONS
          : this.db.NOTIFICATIONS,

        SYSTEM_CONFIG:
          legacy.SYSTEM_CONFIG || this.db.SYSTEM_CONFIG,

        THEME:
          legacy.THEME || this.db.THEME,
      };

      const migrated = this.applyMigrations();
      this.refreshKPIs();

      /*
       * Legacy Firebase data đã có -> nâng cấp sang schema v2.
       * Không dùng database.json để thay thế dữ liệu legacy.
       */
      await this.persistToFirestoreNow();

      this.saveSync();

      if (migrated) {
        console.log(
          '[Firebase] Đã áp dụng migration username/ngân hàng.'
        );
      }

      console.log(
        '[Firebase] Đã đọc dữ liệu Firestore cũ và nâng cấp ' +
          'sang schema persistent v2.'
      );
    } catch (err) {
      /*
       * Nếu Firebase lỗi mạng/tạm thời:
       * giữ dữ liệu local hiện tại nhưng KHÔNG ghi local demo lên Firebase.
       */
      console.error(
        '[Firebase] Lỗi tải dữ liệu Firestore. ' +
          'Không ghi đè dữ liệu Firebase:',
        err
      );
    }
  }
