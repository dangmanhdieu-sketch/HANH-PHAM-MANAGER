import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type {
  NhanVien,
  ChamCong,
  Luong,
  TamUng,
  HoaHong,
  ThongKeKPI,
  AuditLog,
  ThongBao,
  SystemConfig,
  AppDesignTheme,
  QuanLyRecord,
  QuanLyModule,
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
  TAM_UNG: TamUng[];
  HOAHONG: HoaHong[];
  THONGKE: ThongKeKPI[];
  AUDIT_LOG: AuditLog[];
  NOTIFICATIONS: ThongBao[];
  QUAN_LY: QuanLyRecord[];
  SYSTEM_CONFIG: SystemConfig;
  THEME?: AppDesignTheme;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');

const DEFAULT_APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

function getZonedParts(date: Date, timeZone: string = DEFAULT_APP_TIMEZONE) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${get('hour')}:${get('minute')}:${get('second')}`,
      hour: Number(get('hour') || 0),
      minute: Number(get('minute') || 0),
      second: Number(get('second') || 0),
    };
  } catch {
    const fallback = new Date(date);
    return {
      date: fallback.toISOString().split('T')[0],
      time: fallback.toTimeString().split(' ')[0],
      hour: fallback.getHours(),
      minute: fallback.getMinutes(),
      second: fallback.getSeconds(),
    };
  }
}


// Studio address: shared official address for all app modules and printed documents.
const DEFAULT_CONFIG: SystemConfig = {
  TenStudio: 'HANH PHAM BRIDAL',
  DiaChi: '321 Lê Quý Đôn, Tân Xuân, Bình Phước, Đồng Nai',
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
  // Local-development fallback only: keep the legacy Admin account available,
  // but never seed sample staff, attendance, payroll, commissions or demo records.
  const salt = bcrypt.genSaltSync(10);
  const admin: NhanVien = {
    NhanVienID: 'NV001',
    TenDangNhap: 'admin',
    HoTen: 'Hạnh Phạm',
    Email: 'admin@hanhphambridal.vn',
    SDT: '0903888999',
    ChucVu: 'Giám Đốc Studio',
    LuongCoBan: 35000000,
    NgayVaoLam: '2024-01-01',
    TrangThai: 'Đang Làm',
    AnhNhanVien: '',
    Quyen: 'Admin',
    MatKhau: bcrypt.hashSync('admin123', salt),
    SoTaiKhoan: '0071000888999',
    NganHang: 'Vietcombank',
    TenChuTaiKhoan: 'PHAM THI HANH',
    ChiNhanhNganHang: 'TP. Hồ Chí Minh',
    BiKhoa: false,
    TaoLuc: '2024-01-01T08:00:00Z',
  };

  return {
    NHANVIEN: [admin],
    CHAMCONG: [],
    LUONG: [],
    TAM_UNG: [],
    HOAHONG: [],
    THONGKE: [],
    AUDIT_LOG: [],
    NOTIFICATIONS: [],
    QUAN_LY: [],
    SYSTEM_CONFIG: { ...DEFAULT_CONFIG },
    THEME: { ...DEFAULT_THEME },
  };
}

function getFreshEmptyData(): DatabaseSchema {
  const username = String(process.env.INITIAL_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = String(process.env.INITIAL_ADMIN_PASSWORD || '');
  if (!password || password.length < 12) {
    throw new Error('[Firebase] INITIAL_ADMIN_PASSWORD must be configured with at least 12 characters before initializing a new database.');
  }
  const admin: NhanVien = {
    NhanVienID: 'NV001',
    TenDangNhap: username,
    HoTen: process.env.INITIAL_ADMIN_NAME || 'Quản trị viên',
    Email: process.env.INITIAL_ADMIN_EMAIL || 'admin@hanhphambridal.vn',
    SDT: '',
    ChucVu: 'Quản trị hệ thống',
    LuongCoBan: 0,
    NgayVaoLam: new Date().toISOString().slice(0, 10),
    TrangThai: 'Đang Làm',
    AnhNhanVien: '',
    Quyen: 'Admin',
    MatKhau: bcrypt.hashSync(password, 12),
    BiKhoa: false,
    TaoLuc: new Date().toISOString(),
  };
  return {
    NHANVIEN: [admin],
    CHAMCONG: [],
    LUONG: [],
    TAM_UNG: [],
    HOAHONG: [],
    THONGKE: [],
    AUDIT_LOG: [],
    NOTIFICATIONS: [],
    QUAN_LY: [],
    SYSTEM_CONFIG: { ...DEFAULT_CONFIG },
    THEME: { ...DEFAULT_THEME },
  };
}

/**
 * Firestore arrays cannot contain arrays directly. Preserve nested-array data
 * losslessly by wrapping only an array item that is itself an array in a
 * reserved map field. The decoder below restores the original JS array shape.
 * Undefined object properties are omitted; undefined array slots become null.
 */
const FIRESTORE_NESTED_ARRAY_MARKER = 'hanhPhamFirestoreArrayMarkerV1';
const LEGACY_FIRESTORE_NESTED_ARRAY_MARKER = '__HANH_PHAM_FIRESTORE_NESTED_ARRAY_V1__';

/**
 * Firestore rejects arrays nested directly inside arrays. Encode every JS array
 * as a uniquely marked map whose "items" value is an array. Any array appearing
 * inside that array is itself encoded as a map, so Firestore never receives an
 * array as an array element. Decoding restores the exact original JS structure.
 * Undefined object properties are omitted and undefined array slots become null.
 */
function sanitizeFirestoreValue(value: any): any {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return {
      [FIRESTORE_NESTED_ARRAY_MARKER]: value.map((item) =>
        item === undefined ? null : sanitizeFirestoreValue(item)
      ),
    };
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue === undefined) continue;
      result[key] = sanitizeFirestoreValue(nestedValue);
    }
    return result;
  }

  return value;
}

/** Restore arrays encoded by sanitizeFirestoreValue after Firestore reads. */
function restoreFirestoreValue(value: any): any {
  if (Array.isArray(value)) return value.map((item) => restoreFirestoreValue(item));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const keys = Object.keys(value);
    if (keys.length === 1) {
      const marker = Object.prototype.hasOwnProperty.call(value, FIRESTORE_NESTED_ARRAY_MARKER)
        ? FIRESTORE_NESTED_ARRAY_MARKER
        : Object.prototype.hasOwnProperty.call(value, LEGACY_FIRESTORE_NESTED_ARRAY_MARKER)
          ? LEGACY_FIRESTORE_NESTED_ARRAY_MARKER
          : null;
      if (marker && Array.isArray(value[marker])) {
        return value[marker].map((item: any) => restoreFirestoreValue(item));
      }
    }
    const result: Record<string, any> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = restoreFirestoreValue(nestedValue);
    }
    return result;
  }
  return value;
}

class DatabaseService {
  private db: DatabaseSchema;
  private firestoreSaveQueue: Promise<void> = Promise.resolve();
  // Each Render process gets a unique writer identity. A newly deployed process
  // claims the Firestore lease; older overlapping instances can no longer write
  // their stale in-memory database over the new instance's data.
  private readonly firestoreWriterId = randomUUID();
  // Compact per-table fingerprints of the last committed Firestore state.
  // Mutations only rewrite tables whose content actually changed.
  private firestorePersistedSnapshots: Partial<Record<(typeof this.firestoreTables)[number], string>> = {};
  private firestore: Firestore | null = null;
  private firestoreEnabled = false;
  private readonly firestoreCollection = process.env.FIREBASE_COLLECTION || 'hanh_pham_manager';
  private readonly firestoreDocument = process.env.FIREBASE_DOCUMENT || 'database';
  private readonly firestoreTables = [
    'NHANVIEN',
    'CHAMCONG',
    'LUONG',
    'TAM_UNG',
    'HOAHONG',
    'THONGKE',
    'AUDIT_LOG',
    'NOTIFICATIONS',
    'QUAN_LY',
    'SYSTEM_CONFIG',
    'THEME',
  ] as const;
  private readyPromise: Promise<void>;

  constructor() {
    ensureDirs();

    // Local file is retained only as a fallback/cache. Firestore is the
    // authoritative persistent database when FIREBASE_SERVICE_ACCOUNT_JSON exists.
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
      } catch (err) {
        console.error('Failed reading database.json, initializing defaults:', err);
        this.db = getInitialData();
      }
    } else {
      this.db = getInitialData();
    }

    this.initializeFirestore();

    if (this.firestoreEnabled) {
      // In production, Firestore is the source of truth. Never write local
      // demo/default data before the cloud database has been loaded.
      this.readyPromise = this.loadFromFirestore();
    } else if (process.env.NODE_ENV === 'production') {
      this.readyPromise = Promise.reject(
        new Error('[Firebase] Firestore is required in production. Refusing to start with demo/local data.')
      );
    } else {
      this.applyMigrations();
      if (!Array.isArray(this.db.QUAN_LY)) this.db.QUAN_LY = [];
      this.refreshKPIs();
      this.saveSync();
      this.readyPromise = Promise.resolve();
    }
  }

  private applyMigrations(): boolean {
    let hasMigration = false;

    // Migration: repair duplicate employee IDs only when related records can
    // be attributed safely by a distinct employee name. If names are ambiguous,
    // leave the records untouched; update APIs will refuse to edit by that ID.
    if (Array.isArray(this.db.NHANVIEN)) {
      const groups = new Map<string, NhanVien[]>();
      for (const staff of this.db.NHANVIEN) {
        const id = String(staff.NhanVienID || '').trim();
        if (!id) continue;
        const group = groups.get(id) || [];
        group.push(staff);
        groups.set(id, group);
      }
      const usedIds = new Set(this.db.NHANVIEN.map((staff) => String(staff.NhanVienID || '').trim()));
      const numericIds = this.db.NHANVIEN.map((staff) => {
        const match = String(staff.NhanVienID || '').match(/\d+/);
        return match ? Number(match[0]) : 0;
      });
      let nextId = Math.max(0, ...numericIds) + 1;

      for (const [duplicateId, group] of groups) {
        if (group.length < 2) continue;
        const normalizedNames = group.map((staff) => String(staff.HoTen || '').trim().toLowerCase());
        const namesAreDistinct = normalizedNames.every(Boolean) &&
          new Set(normalizedNames).size === normalizedNames.length;
        if (!namesAreDistinct) {
          console.error('[DATA INTEGRITY] Duplicate employee ID needs manual review because names are ambiguous:', duplicateId);
          continue;
        }

        // The first entry keeps its original ID. Reassign later entries and
        // move their linked attendance/payroll/commission/advance rows by name.
        for (let index = 1; index < group.length; index += 1) {
          const staff = group[index];
          let newId = `NV${String(nextId++).padStart(3, '0')}`;
          while (usedIds.has(newId)) newId = `NV${String(nextId++).padStart(3, '0')}`;
          const employeeName = String(staff.HoTen).trim().toLowerCase();

          for (const tableName of this.firestoreTables) {
            if (tableName === 'NHANVIEN' || tableName === 'NOTIFICATIONS') continue;
            const records = (this.db as any)[tableName];
            if (!Array.isArray(records)) continue;
            for (const record of records) {
              if (
                String(record?.NhanVienID || '') === duplicateId &&
                String(record?.HoTen || '').trim().toLowerCase() === employeeName
              ) {
                record.NhanVienID = newId;
              }
            }
          }

          staff.NhanVienID = newId;
          usedIds.add(newId);
          hasMigration = true;
          console.warn('[DATA INTEGRITY] Reassigned duplicate employee ID', duplicateId, 'to', newId, 'for', staff.HoTen);
        }
      }
    }

    // Migration: guarantee unique, normalized usernames. Older imports could
    // contain duplicate/blank usernames; leaving them in place makes login
    // resolve to the first employee and can attribute actions to the wrong person.
    if (this.db.NHANVIEN && Array.isArray(this.db.NHANVIEN)) {
      const usedUsernames = new Set<string>();

      this.db.NHANVIEN.forEach((nv, index) => {
        const original = String(nv.TenDangNhap || '').trim().toLowerCase();
        const base = original || (nv.NhanVienID === 'NV001'
          ? 'admin'
          : String(nv.NhanVienID || `nv${index + 1}`).trim().toLowerCase());
        let username = base;
        let suffix = 2;
        while (usedUsernames.has(username)) {
          username = `${base}-${suffix++}`;
        }

        if (nv.TenDangNhap !== username) {
          nv.TenDangNhap = username;
          hasMigration = true;
        }
        usedUsernames.add(username);
      });
    }

    // Migration: Ensure all staff have bank account & credential fields.
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

    // Migration: move legacy TamUng amounts from payroll into the TAM_UNG ledger.
    if (!Array.isArray(this.db.TAM_UNG)) {
      this.db.TAM_UNG = [];
      hasMigration = true;
    }
    if (this.db.TAM_UNG.length === 0 && Array.isArray(this.db.LUONG)) {
      this.db.LUONG.forEach((luong) => {
        const amount = Number(luong.TamUng || 0);
        if (amount > 0) {
          const parts = String(luong.Thang || '').split('/');
          const ngay = parts.length === 2 ? `${parts[1]}-${parts[0].padStart(2, '0')}-01` : new Date().toISOString().split('T')[0];
          this.db.TAM_UNG.push({
            TamUngID: `TU-MIG-${luong.LuongID}`,
            NhanVienID: luong.NhanVienID,
            HoTen: luong.HoTen,
            Ngay: ngay,
            Thang: luong.Thang,
            SoTien: amount,
            LyDo: 'Tạm ứng cũ chuyển sang hệ thống mới',
            TaoLuc: luong.NgayTao || new Date().toISOString(),
            TaoBoi: 'SYSTEM-MIGRATION',
          });
          hasMigration = true;
        }
      });
    }

    // Non-sensitive startup integrity check for the employee currently reported
    // by the studio. This helps distinguish a bad NV004 identity from a global
    // Firestore write failure without exposing passwords or bank details.
    const targetStaff = this.db.NHANVIEN.filter((staff) =>
      String(staff.NhanVienID || '').trim().toUpperCase() === 'NV004' ||
      String(staff.HoTen || '').trim().toLocaleLowerCase('vi') === 'hồ thị bích nguyệt'
    );
    if (targetStaff.length > 0) {
      console.info('[DATA INTEGRITY] NV004 employee diagnostic:', targetStaff.map((staff) => {
        const id = String(staff.NhanVienID || '');
        const username = String(staff.TenDangNhap || '').trim().toLowerCase();
        const countById = this.db.NHANVIEN.filter((item) => item.NhanVienID === id).length;
        const countByUsername = this.db.NHANVIEN.filter(
          (item) => String(item.TenDangNhap || '').trim().toLowerCase() === username
        ).length;
        const countRefs = (rows: any[]) => rows.filter((row) => row.NhanVienID === id).length;
        return {
          employeeId: id,
          name: staff.HoTen,
          usernameUnique: Boolean(username) && countByUsername === 1,
          employeeIdUnique: countById === 1,
          isLocked: Boolean(staff.BiKhoa),
          role: staff.Quyen,
          status: staff.TrangThai,
          attendanceRecords: countRefs(this.db.CHAMCONG || []),
          payrollRecords: countRefs(this.db.LUONG || []),
          advanceRecords: countRefs(this.db.TAM_UNG || []),
          commissionRecords: countRefs(this.db.HOAHONG || []),
        };
      }));
    } else {
      console.warn('[DATA INTEGRITY] NV004 / Hồ Thị Bích Nguyệt not found in loaded employee data.');
    }

    return hasMigration;
  }

  private initializeFirestore() {
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!rawCredentials) {
      console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON chưa được cấu hình. Đang dùng database.json làm fallback.');
      return;
    }

    try {
      const serviceAccount = JSON.parse(rawCredentials);
      const expectedProjectId = process.env.FIREBASE_EXPECTED_PROJECT_ID || 'hanhpham-manager-new';
      if (serviceAccount.project_id !== expectedProjectId) {
        throw new Error(`[Firebase] Service account project_id mismatch. Expected ${expectedProjectId}, received ${serviceAccount.project_id || 'missing'}.`);
      }
      const app = getApps().length > 0
        ? getApps()[0]
        : initializeApp({ credential: cert(serviceAccount), projectId: expectedProjectId });

      this.firestore = getFirestore(app);
      this.firestoreEnabled = true;
      console.log(`[Firebase] Firestore enabled: ${this.firestoreCollection}/${this.firestoreDocument}`);
    } catch (err) {
      this.firestore = null;
      this.firestoreEnabled = false;
      console.error('[Firebase] Không thể khởi tạo Firebase Admin SDK:', err);
    }
  }

  /** Wait until the persistent database has been loaded before handling API requests. */
  public async waitUntilReady(): Promise<void> {
    await this.readyPromise;
  }

  private async claimFirestoreWriterLease(): Promise<void> {
    if (!this.firestore) throw new Error('[Firebase] Firestore is not initialized.');
    const rootRef = this.firestore.collection(this.firestoreCollection).doc(this.firestoreDocument);
    const leaseRef = rootRef.collection('_runtime').doc('activeWriter');
    await this.firestore.runTransaction(async (transaction) => {
      transaction.set(leaseRef, {
        owner: this.firestoreWriterId,
        claimedAt: new Date().toISOString(),
      });
    });
    console.log('[Firebase] Active writer lease claimed for this server instance.');
  }

  private async assertFirestoreWriterLease(transaction: FirebaseFirestore.Transaction): Promise<void> {
    if (!this.firestore) throw new Error('[Firebase] Firestore is not initialized.');
    const rootRef = this.firestore.collection(this.firestoreCollection).doc(this.firestoreDocument);
    const leaseRef = rootRef.collection('_runtime').doc('activeWriter');
    const leaseSnap = await transaction.get(leaseRef);
    const owner = leaseSnap.data()?.owner;
    if (owner !== this.firestoreWriterId) {
      throw new Error('[Firebase] This Render instance is no longer the active writer. Refusing stale database write.');
    }
  }

  private async loadFromFirestore(): Promise<void> {
    if (!this.firestoreEnabled || !this.firestore) return;

    try {
      // Claim before loading. If Render overlaps old/new instances during deploy,
      // only the newest claimant is allowed to write Firestore.
      await this.claimFirestoreWriterLease();
      const rootRef = this.firestore.collection(this.firestoreCollection).doc(this.firestoreDocument);
      const rootSnap = await rootRef.get();

      // Existing Firestore data is always loaded as-is. New databases require the separate, explicit empty-init setting.

      if (!rootSnap.exists) {
        if (process.env.FIREBASE_ALLOW_EMPTY_INIT !== 'true') {
          throw new Error('[Firebase] New Firestore is empty. Set FIREBASE_ALLOW_EMPTY_INIT=true for the one-time empty initialization.');
        }
        this.db = getFreshEmptyData();
        await this.persistToFirestoreNow();
        console.log('[Firebase] Initialized new Firestore with one admin account and empty business tables.');
        return;
      }

      const rootData = rootSnap.data() || {};
      const schemaVersion = Number(rootData.__schemaVersion || 1);

      if (schemaVersion >= 2) {
        const tableSnaps = await Promise.all(
          this.firestoreTables.map((table) =>
            rootRef.collection('tables').doc(table).get()
          )
        );

        // Schema v2 is only valid when every expected table document exists
        // and contains its data field. Missing documents must never be treated
        // as empty arrays: doing so can make a healthy staff list appear erased
        // after a restart and can later overwrite cloud data with empty values.
        const missingTables: string[] = [];
        const loaded: Partial<DatabaseSchema> = {};
        for (let index = 0; index < tableSnaps.length; index += 1) {
          const snap = tableSnaps[index];
          const table = this.firestoreTables[index];
          if (!snap.exists) {
            missingTables.push(table);
            continue;
          }
          const tableMeta = snap.data() || {};
          if (tableMeta.storage === 'chunked-json-base64') {
            const chunkCount = Number(tableMeta.chunkCount || 0);
            if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 500) {
              missingTables.push(table);
              continue;
            }
            const tableRef = rootRef.collection('tables').doc(table);
            const partsRef = tableMeta.revision
              ? tableRef.collection('versions').doc(String(tableMeta.revision)).collection('parts')
              : tableRef.collection('parts');
            const partSnaps = await Promise.all(
              Array.from({ length: chunkCount }, (_, partIndex) =>
                partsRef.doc(
                  tableMeta.revision
                    ? String(partIndex).padStart(6, '0')
                    : String(partIndex).padStart(4, '0')
                ).get()
              )
            );
            if (partSnaps.some((part) => !part.exists || typeof part.data()?.payload !== 'string')) {
              missingTables.push(table);
              continue;
            }
            const encoded = partSnaps.map((part) => String(part.data()?.payload || '')).join('');
            const decoded = Buffer.from(encoded, 'base64').toString('utf8');
            (loaded as any)[table] = restoreFirestoreValue(JSON.parse(decoded));
            continue;
          }

          const data = tableMeta.data;
          if (data === undefined || data === null) {
            missingTables.push(table);
            continue;
          }
          (loaded as any)[table] = restoreFirestoreValue(data);
        }
        if (missingTables.length > 0) {
          throw new Error(
            '[Firebase] Schema v2 is incomplete. Missing/invalid table documents: ' +
            missingTables.join(', ') +
            '. Refusing to start with empty data; check Firestore path ' +
            this.firestoreCollection + '/' + this.firestoreDocument + '/tables.'
          );
        }

        { // All schema v2 table documents are present; now load authoritative data.
          this.db = {
            ...this.db,
            ...loaded,
            NHANVIEN: Array.isArray(loaded.NHANVIEN) ? loaded.NHANVIEN : [],
            CHAMCONG: Array.isArray(loaded.CHAMCONG) ? loaded.CHAMCONG : [],
            LUONG: Array.isArray(loaded.LUONG) ? loaded.LUONG : [],
            TAM_UNG: Array.isArray(loaded.TAM_UNG) ? loaded.TAM_UNG : [],
            HOAHONG: Array.isArray(loaded.HOAHONG) ? loaded.HOAHONG : [],
            THONGKE: Array.isArray(loaded.THONGKE) ? loaded.THONGKE : [],
            AUDIT_LOG: Array.isArray(loaded.AUDIT_LOG) ? loaded.AUDIT_LOG : [],
            NOTIFICATIONS: Array.isArray(loaded.NOTIFICATIONS) ? loaded.NOTIFICATIONS : [],
            QUAN_LY: Array.isArray(loaded.QUAN_LY) ? loaded.QUAN_LY : [],
            SYSTEM_CONFIG: loaded.SYSTEM_CONFIG || DEFAULT_CONFIG,
            THEME: loaded.THEME,
          };
          const migrated = this.applyMigrations();
          this.refreshKPIs();
          this.saveSync();
          this.captureFirestoreSnapshots();

          // Upgrade any legacy table document that is already too large for
          // Firestore before the next user mutation. This migrates the current
          // employee data in place without deleting or resetting any records.
          if (migrated) {
            await this.persistToFirestoreNow();
          } else {
            const oversizedTables = this.firestoreTables.filter((table) => {
              const serialized = JSON.stringify(sanitizeFirestoreValue((this.db as any)[table]));
              return Buffer.from(serialized, 'utf8').toString('base64').length > 600000;
            });
            if (oversizedTables.length > 0) {
              console.warn('[Firebase] Migrating oversized table documents to chunked storage:', oversizedTables);
              await this.persistToFirestoreNow(oversizedTables);
            }
          }
          console.log('[Firebase] Đã tải dữ liệu persistent từ Firestore.');
          console.log('[Firebase] DATA COUNTS:', JSON.stringify({
            NHANVIEN: this.db.NHANVIEN?.length || 0,
            CHAMCONG: this.db.CHAMCONG?.length || 0,
            LUONG: this.db.LUONG?.length || 0,
            TAM_UNG: this.db.TAM_UNG?.length || 0,
            HOAHONG: this.db.HOAHONG?.length || 0,
            HOPDONG: (this.db as any).HOPDONG?.length || 0,
            THU_CHI: (this.db as any).THU_CHI?.length || 0,
            QUAN_LY: this.db.QUAN_LY?.length || 0,
          }));
          return;
        }
      }

      // Legacy Firestore format: /hanh_pham_manager/database contains all tables
      // as fields. Read it once, then upgrade to split table documents so the
      // attendance photo data cannot eventually hit Firestore's 1 MiB document limit.
      const legacy: Partial<DatabaseSchema> = restoreFirestoreValue(rootData) as any;
      this.db = {
        ...this.db,
        ...legacy,
        NHANVIEN: Array.isArray(legacy.NHANVIEN) ? legacy.NHANVIEN : [],
        CHAMCONG: Array.isArray(legacy.CHAMCONG) ? legacy.CHAMCONG : [],
        LUONG: Array.isArray(legacy.LUONG) ? legacy.LUONG : [],
        TAM_UNG: Array.isArray(legacy.TAM_UNG) ? legacy.TAM_UNG : [],
        HOAHONG: Array.isArray(legacy.HOAHONG) ? legacy.HOAHONG : [],
        THONGKE: Array.isArray(legacy.THONGKE) ? legacy.THONGKE : [],
        AUDIT_LOG: Array.isArray(legacy.AUDIT_LOG) ? legacy.AUDIT_LOG : [],
        NOTIFICATIONS: Array.isArray(legacy.NOTIFICATIONS) ? legacy.NOTIFICATIONS : [],
        QUAN_LY: Array.isArray(legacy.QUAN_LY) ? legacy.QUAN_LY : [],
        SYSTEM_CONFIG: legacy.SYSTEM_CONFIG || DEFAULT_CONFIG,
        THEME: legacy.THEME,
      };
      const migrated = this.applyMigrations();
      this.refreshKPIs();
      this.saveSync();
      await this.persistToFirestoreNow();
      if (migrated) console.log('[Firebase] Đã áp dụng migration username/ngân hàng.');
      console.log('[Firebase] Đã đọc database Firestore cũ và nâng cấp sang schema persistent v2.');
    } catch (err) {
      console.error('[Firebase] Lỗi tải dữ liệu Firestore. Dừng xử lý để bảo vệ dữ liệu cloud; không dùng database.json fallback:', err);
      throw err;
    }
  }

  private captureFirestoreSnapshots(): void {
    for (const table of this.firestoreTables) {
      this.firestorePersistedSnapshots[table] = JSON.stringify((this.db as any)[table]);
    }
  }

  private getChangedFirestoreTables(): (typeof this.firestoreTables)[number][] {
    return this.firestoreTables.filter((table) => {
      const current = JSON.stringify((this.db as any)[table]);
      return current !== this.firestorePersistedSnapshots[table];
    });
  }

  private async persistToFirestoreNow(
    tablesToWrite: readonly (typeof this.firestoreTables)[number][] = this.firestoreTables
  ): Promise<void> {
    if (!this.firestoreEnabled || !this.firestore || tablesToWrite.length === 0) return;

    const rootRef = this.firestore.collection(this.firestoreCollection).doc(this.firestoreDocument);
    const committedAt = new Date().toISOString();
    const PART_SIZE = 200000;
    const smallTables: Array<{ table: (typeof this.firestoreTables)[number]; data: any; bytes: number }> = [];
    const largeTables: Array<{ table: (typeof this.firestoreTables)[number]; encoded: string; bytes: number }> = [];

    try {
      // Prepare changed tables once. Small tables are committed together in one
      // lease-checked transaction to avoid one network round-trip per table.
      for (const table of tablesToWrite) {
        const value = (this.db as any)[table];
        if (value === undefined) continue;
        const serialized = JSON.stringify(sanitizeFirestoreValue(value));
        const bytes = Buffer.byteLength(serialized, 'utf8');
        const encoded = Buffer.from(serialized, 'utf8').toString('base64');
        if (encoded.length <= PART_SIZE) {
          smallTables.push({ table, data: JSON.parse(serialized), bytes });
        } else {
          largeTables.push({ table, encoded, bytes });
        }
      }

      if (smallTables.length > 0) {
        // Each document is below 1 MiB and the aggregate is kept comfortably
        // below Firestore's 10 MiB transaction request limit.
        const aggregateBytes = smallTables.reduce((sum, item) => sum + item.bytes, 0);
        if (aggregateBytes > 7 * 1024 * 1024) {
          throw new Error(`Small Firestore table batch is too large (${aggregateBytes} bytes); refusing unsafe combined write.`);
        }
        await this.firestore.runTransaction(async (transaction) => {
          await this.assertFirestoreWriterLease(transaction);
          for (const item of smallTables) {
            transaction.set(
              rootRef.collection('tables').doc(item.table),
              { data: item.data, updatedAt: committedAt },
              { merge: false }
            );
          }
          transaction.set(rootRef, {
            __schemaVersion: 3,
            __updatedAt: committedAt,
            __storage: 'Firestore split tables',
          }, { merge: true });
        });
        for (const item of smallTables) {
          console.log('[Firebase] TABLE SAVE COMMITTED:', item.table, {
            bytes: item.bytes,
            chunks: 0,
          });
        }
      }

      // Large tables are written as immutable chunks, then atomically switched
      // by updating the table metadata only after every chunk is committed.
      for (const item of largeTables) {
        const parts: string[] = [];
        for (let offset = 0; offset < item.encoded.length; offset += PART_SIZE) {
          parts.push(item.encoded.slice(offset, offset + PART_SIZE));
        }

        const revision = committedAt.replace(/[^0-9A-Za-z]/g, '') + '-' +
          Math.random().toString(36).slice(2, 8);
        const versionRef = rootRef.collection('tables').doc(item.table)
          .collection('versions').doc(revision);
        const PARTS_PER_TRANSACTION = 25;

        for (let offset = 0; offset < parts.length; offset += PARTS_PER_TRANSACTION) {
          const batchParts = parts.slice(offset, offset + PARTS_PER_TRANSACTION);
          await this.firestore.runTransaction(async (transaction) => {
            await this.assertFirestoreWriterLease(transaction);
            batchParts.forEach((payload, batchIndex) => {
              const partIndex = offset + batchIndex;
              transaction.set(
                versionRef.collection('parts').doc(String(partIndex).padStart(6, '0')),
                { payload, index: partIndex, revision, updatedAt: committedAt },
                { merge: false }
              );
            });
          });
        }

        await this.firestore.runTransaction(async (transaction) => {
          await this.assertFirestoreWriterLease(transaction);
          transaction.set(rootRef.collection('tables').doc(item.table), {
            storage: 'chunked-json-base64',
            revision,
            chunkCount: parts.length,
            updatedAt: committedAt,
          }, { merge: false });
          transaction.set(rootRef, {
            __schemaVersion: 3,
            __updatedAt: committedAt,
            __storage: 'Firestore split tables',
          }, { merge: true });
        });

        console.log('[Firebase] TABLE SAVE COMMITTED:', item.table, {
          bytes: item.bytes,
          chunks: parts.length,
        });
      }

      for (const table of tablesToWrite) {
        this.firestorePersistedSnapshots[table] = JSON.stringify((this.db as any)[table]);
      }
    } catch (err) {
      console.error('[Firebase] Firestore save error:', err);
      throw err;
    }
  }

  private queueFirestoreSave() {
    if (!this.firestoreEnabled || !this.firestore) return;
    // Do not coalesce writes behind a shared boolean: a second edit made
    // during an in-flight Firestore batch could otherwise be skipped.
    this.firestoreSaveQueue = this.firestoreSaveQueue
      .then(() => this.persistToFirestoreNow())
      .catch((err) => {
        console.error('[Firebase] Firestore queued save error:', err);
      });
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
    // API mutation responses are persisted by the server-wide saveAndVerify
    // barrier exactly once. Queueing a full Firestore write here caused each
    // route to write once from save() and a second time from the response
    // barrier, making routine edits and deletes unnecessarily slow.
    this.saveSync();
  }

  /** Persist once to Firestore before an API reports a successful mutation. */
  public async saveAndVerify(): Promise<void> {
    await this.readyPromise;
    if (!this.firestoreEnabled || !this.firestore) {
      throw new Error('Firebase Firestore chưa kết nối; dữ liệu chưa được xác nhận lưu trên đám mây.');
    }
    this.saveSync();

    // The Firestore transaction commit is the durable-write confirmation.
    // Avoid an additional 11-document read-back on every small edit/delete:
    // it added noticeable latency without making the committed transaction safer.
    const write = this.firestoreSaveQueue
      .catch((previousError) => {
        console.error('[Firebase] Recovering after previous queued write failure:', previousError);
      })
      .then(() => {
        const changedTables = this.getChangedFirestoreTables();
        if (changedTables.length === 0) return;
        return this.persistToFirestoreNow(changedTables);
      });
    this.firestoreSaveQueue = write.catch((err) => {
      console.error('[Firebase] Verified write failed:', err);
    });
    await write;

    console.log('[Firebase] SAVE COMMITTED: changed Firestore tables persisted; project',
      process.env.FIREBASE_EXPECTED_PROJECT_ID || 'hanhpham-manager-new');
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
    // Firestore stores each table in one document (1 MiB limit).
    // Keep the newest 800 audit entries so the audit table cannot block
    // unrelated operations such as approving payroll/commission.
    if (this.db.AUDIT_LOG.length > 800) {
      this.db.AUDIT_LOG.length = 800;
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
    // Notifications are stored in one Firestore table document. Bound the
    // history to prevent an ever-growing document from exceeding Firestore's
    // 1 MiB document limit and blocking all subsequent writes.
    if (this.db.NOTIFICATIONS.length > 800) {
      this.db.NOTIFICATIONS.length = 800;
    }
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
    const today = getZonedParts(new Date()).date;
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
    const matches = this.db.NHANVIEN.filter((nv) => String(nv.NhanVienID || '') === String(id || ''));
    // Never silently select the first person when legacy data contains duplicate IDs.
    return matches.length === 1 ? matches[0] : undefined;
  }

  public findNhanVienByEmail(email: string): NhanVien | undefined {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return undefined;
    return this.db.NHANVIEN.find(
      (nv) => String(nv.Email || '').trim().toLowerCase() === normalized
    );
  }

  public findNhanVienByUsername(username: string): NhanVien | undefined {
    const normalized = String(username || '').trim().toLowerCase();
    if (!normalized) return undefined;

    return this.db.NHANVIEN.find(
      (nv) => String(nv.TenDangNhap || '').trim().toLowerCase() === normalized
    );
  }

  public createNhanVien(data: Partial<NhanVien>, adminUser: { HoTen: string; Email: string }): NhanVien {
    const employeeName = String(data.HoTen || '').trim();
    if (!employeeName) throw new Error('Vui lòng nhập họ tên nhân viên.');
    const suppliedEmail = String(data.Email || '').trim().toLowerCase();
    if (!suppliedEmail) throw new Error('Vui lòng nhập email nhân viên.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)) {
      throw new Error('Email nhân viên không đúng định dạng.');
    }
    // Generate the next unused employee ID; do not assume max+1 is free.
    const usedIds = new Set(this.db.NHANVIEN.map((nv) => String(nv.NhanVienID || '').trim()));
    const existingNumbers = this.db.NHANVIEN.map((nv) => {
      const match = String(nv.NhanVienID || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    let nextNum = Math.max(0, ...existingNumbers) + 1;
    let generatedId = `NV${String(nextNum).padStart(3, '0')}`;
    while (usedIds.has(generatedId)) {
      nextNum += 1;
      generatedId = `NV${String(nextNum).padStart(3, '0')}`;
    }

    const tenDangNhap =
      String(data.TenDangNhap || '').trim().toLowerCase() ||
      generatedId.toLowerCase();

    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(tenDangNhap)) {
      throw new Error(
        'Tên đăng nhập phải có ít nhất 3 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'
      );
    }

    if (this.findNhanVienByUsername(tenDangNhap)) {
      throw new Error(`Tên đăng nhập "${tenDangNhap}" đã tồn tại trong hệ thống!`);
    }

    // Email may be missing in legacy/imported records. Only enforce uniqueness
    // when a non-empty email is supplied.
    const normalizedEmail = suppliedEmail;
    if (normalizedEmail && this.findNhanVienByEmail(normalizedEmail)) {
      throw new Error(`Email ${normalizedEmail} đã tồn tại trong hệ thống!`);
    }

    const salt = bcrypt.genSaltSync(10);
    const password = data.MatKhau || '123456';
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newNhanVien: NhanVien = {
      NhanVienID: generatedId,
      TenDangNhap: tenDangNhap,
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
    const matchingIndexes = this.db.NHANVIEN
      .map((nv, index) => nv.NhanVienID === id ? index : -1)
      .filter((index) => index >= 0);
    if (matchingIndexes.length === 0) {
      throw new Error(`Không tìm thấy nhân viên với ID ${id}`);
    }
    if (matchingIndexes.length > 1) {
      throw new Error(`Phát hiện mã nhân viên ${id} bị trùng. Hệ thống đã chặn cập nhật để tránh sửa nhầm người; cần đối soát dữ liệu trùng mã trước.`);
    }
    const index = matchingIndexes[0];
    const current = this.db.NHANVIEN[index];

    let tenDangNhap = current.TenDangNhap || current.NhanVienID.toLowerCase();

    if (updates.TenDangNhap !== undefined) {
      tenDangNhap = String(updates.TenDangNhap || '').trim().toLowerCase();

      if (!/^[a-zA-Z0-9._-]{3,50}$/.test(tenDangNhap)) {
        throw new Error(
          'Tên đăng nhập phải có ít nhất 3 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'
        );
      }

      const usernameOwner = this.findNhanVienByUsername(tenDangNhap);
      if (usernameOwner && usernameOwner.NhanVienID !== id) {
        throw new Error(`Tên đăng nhập "${tenDangNhap}" đã được sử dụng bởi nhân viên khác.`);
      }
    }

    // Check email uniqueness safely; empty emails are not unique identifiers.
    const nextEmail = updates.Email !== undefined
      ? String(updates.Email || '').trim().toLowerCase()
      : String(current.Email || '').trim().toLowerCase();
    const currentEmail = String(current.Email || '').trim().toLowerCase();
    if (nextEmail && nextEmail !== currentEmail) {
      const emailOwner = this.findNhanVienByEmail(nextEmail);
      if (emailOwner && emailOwner !== current) {
        throw new Error(`Email ${nextEmail} đã được sử dụng bởi nhân viên khác.`);
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
      TenDangNhap: tenDangNhap,
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

    // Sync employee name to related tables when it changes.
    if (updated.HoTen !== current.HoTen) {
      this.db.CHAMCONG.forEach((cc) => {
        if (cc.NhanVienID === id) cc.HoTen = updated.HoTen;
      });
      this.db.LUONG.forEach((l) => {
        if (l.NhanVienID === id) l.HoTen = updated.HoTen;
      });
      this.db.HOAHONG.forEach((hh) => {
        if (hh.NhanVienID === id) hh.HoTen = updated.HoTen;
      });
    }

    // Salary edits must also update every unpaid payroll row, even when the employee name did not change.
    // Approved/paid rows are kept as historical records.
    if (updated.LuongCoBan !== current.LuongCoBan) {
      this.db.LUONG.forEach((l) => {
        if (l.NhanVienID === id && l.TrangThai === 'Chờ duyệt') {
          l.LuongCoBan = updated.LuongCoBan;
          this.recalculateLuong(l);
        }
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
    // logAudit() persists the combined deletion + audit record; avoid queuing
    // a redundant full-database write before it.
    this.logAudit(
      adminUser.HoTen,
      adminUser.Email,
      'Xóa nhân viên',
      `Xóa nhân viên ${nv.HoTen} (${nv.NhanVienID}) khỏi hệ thống`
    );
    return true;
  }

  // Admin reviews the employee's explanation for a late arrival or early checkout.
  public reviewChamCong(id: string, decision: 'Chấp nhận' | 'Không chấp nhận', note: string, admin: NhanVien): ChamCong | null {
    const record = this.db.CHAMCONG.find((item) => item.ChamCongID === id);
    if (!record) return null;
    record.KetQuaGiaiTrinh = decision;
    record.GhiChuDuyet = note;
    record.NguoiDuyetGiaiTrinh = admin.HoTen;
    record.NgayDuyetGiaiTrinh = new Date().toISOString();
    this.save();
    this.logAudit(admin.HoTen, admin.Email, 'Duyệt giải trình chấm công', decision + ': ' + record.HoTen + ' ngày ' + record.Ngay);
    return record;
  }

  // CHAMCONG methods
  public deleteChamCong(id: string): boolean {
    const index = this.db.CHAMCONG.findIndex((cc) => cc.ChamCongID === id);
    if (index < 0) return false;
    const deleted = this.db.CHAMCONG.splice(index, 1)[0];
    this.refreshKPIs();
    this.save();
    this.logAudit('Admin', '', 'Xóa chấm công', 'Xóa bản ghi chấm công ' + deleted.HoTen + ' (' + deleted.NhanVienID + ') ngày ' + deleted.Ngay);
    return true;
  }

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
    data: {
      anh: string;
      gps: string;
      ghiChu?: string;
      deviceTime?: string;
      deviceTimeZone?: string;
    }
  ): ChamCong {
    const now = data.deviceTime ? new Date(data.deviceTime) : new Date();
    if (Number.isNaN(now.getTime())) throw new Error('Thời gian thiết bị không hợp lệ.');
    const zoned = getZonedParts(now, data.deviceTimeZone || DEFAULT_APP_TIMEZONE);
    const todayStr = zoned.date;
    const timeStr = zoned.time; // HH:mm:ss
    const currentMinutes = zoned.hour * 60 + zoned.minute;
    if (currentMinutes >= 8 * 60 + 30 && !String(data.ghiChu || '').trim()) {
      throw new Error('Bạn đi trễ, vui lòng nhập lý do để Admin xem xét trước khi chấm công.');
    }

    // Check if already checked in today
    let record = this.db.CHAMCONG.find(
      (cc) => cc.NhanVienID === user.NhanVienID && cc.Ngay === todayStr
    );

    if (record && record.CheckIn) {
      throw new Error(`Bạn đã Check-in hôm nay lúc ${record.CheckIn}. Không thể Check-in lại!`);
    }

    // Attendance policy: before 08:30 is on time; 08:30-09:30 is late notice only;
    // after 09:30 through 13:00 deducts half a day; strictly after 13:00 is a full absence.
    const onTimeDeadline = 8 * 60 + 30;
    const halfDayDeadline = 9 * 60 + 30;
    const fullDayAbsenceDeadline = 13 * 60;
    let trangThai: ChamCong['TrangThai'] = 'Có mặt';
    let policyNote = '';
    if (currentMinutes > fullDayAbsenceDeadline) {
      trangThai = 'Nghỉ';
      policyNote = 'Check-in sau 13:00: tính nghỉ cả ngày.';
    } else if (currentMinutes >= onTimeDeadline) {
      trangThai = 'Đi trễ';
      policyNote = currentMinutes > halfDayDeadline
        ? 'Check-in sau 09:30: khấu trừ nửa ngày lương.'
        : 'Đi trễ: ghi nhận lý do, không khấu trừ lương trong khung 08:30-09:30.';
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
        GhiChu: [data.ghiChu, policyNote].filter(Boolean).join(' | '),
      };
      this.db.CHAMCONG.unshift(record);
    } else {
      record.CheckIn = timeStr;
      record.AnhCheckIn = data.anh;
      record.GPSCheckIn = data.gps;
      record.TrangThai = trangThai;
      if (data.ghiChu || policyNote) record.GhiChu = [data.ghiChu, policyNote].filter(Boolean).join(' | ');
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
    data: {
      anh: string;
      gps: string;
      ghiChu?: string;
      deviceTime?: string;
      deviceTimeZone?: string;
    }
  ): ChamCong {
    const now = data.deviceTime ? new Date(data.deviceTime) : new Date();
    if (Number.isNaN(now.getTime())) throw new Error('Thời gian thiết bị không hợp lệ.');
    const zoned = getZonedParts(now, data.deviceTimeZone || DEFAULT_APP_TIMEZONE);
    const todayStr = zoned.date;
    const timeStr = zoned.time;
    const currentMinutes = zoned.hour * 60 + zoned.minute;
    const standardCheckoutMinutes = 20 * 60 + 30;
    if (currentMinutes < standardCheckoutMinutes && !String(data.ghiChu || '').trim()) {
      throw new Error('Bạn về trước 20:30, vui lòng nhập lý do để Admin xem xét.');
    }

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

    // 20:30 is the standard reference. Early checkout is recorded for Admin review
    // and does not independently create a payroll deduction.
    if (currentMinutes < standardCheckoutMinutes && record.TrangThai !== 'Nghỉ') {
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

  // TẠM ỨNG LƯƠNG methods
  public getTamUngList(filter?: { thang?: string; nhanVienId?: string }): TamUng[] {
    let result = Array.isArray(this.db.TAM_UNG) ? [...this.db.TAM_UNG] : [];
    if (filter?.thang) result = result.filter((x) => x.Thang === filter.thang);
    if (filter?.nhanVienId) result = result.filter((x) => x.NhanVienID === filter.nhanVienId);
    return result.sort((a, b) => b.Ngay.localeCompare(a.Ngay) || b.TaoLuc.localeCompare(a.TaoLuc));
  }

  public getTongTamUng(nhanVienId: string, thang: string): number {
    // Legacy records without status remain counted as approved for backward compatibility.
    return this.getTamUngList({ nhanVienId, thang }).filter((item) => !item.TrangThai || item.TrangThai === 'Đã duyệt').reduce((sum, item) => sum + (Number(item.SoTien) || 0), 0);
  }

  private syncTamUngToLuong(luong: Luong): void {
    luong.TamUng = this.getTongTamUng(luong.NhanVienID, luong.Thang);
    this.recalculateLuong(luong);
  }

  /** Approved commission ledger is the single source of truth for payroll commission totals. */
  private syncHoaHongToLuong(luong: Luong): void {
    const [month, year] = String(luong.Thang || '').split('/');
    const prefix = month && year ? `${year}-${month.padStart(2, '0')}` : '';
    if (!prefix) throw new Error(`Kỳ lương không hợp lệ: ${luong.Thang}`);
    const approved = this.db.HOAHONG.filter((item) =>
      item.NhanVienID === luong.NhanVienID &&
      String(item.Ngay || '').startsWith(prefix) &&
      item.TrangThai === 'Đã duyệt'
    );
    luong.HoaHong = approved.reduce((sum, item) => sum + Math.max(0, Number(item.SoTienHoaHong) || 0), 0);
    approved.forEach((item) => { item.LuongID = luong.LuongID; });
    this.recalculateLuong(luong);
  }

  public createTamUng(data: { NhanVienID: string; Ngay: string; SoTien: number; LyDo?: string; GhiChu?: string; TrangThai?: 'Chờ duyệt' | 'Đã duyệt' }, adminUser: { HoTen: string; Email: string }): TamUng {
    const nv = this.findNhanVienById(data.NhanVienID);
    if (!nv) throw new Error('Nhân viên không tồn tại');
    const amount = Number(data.SoTien);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền tạm ứng phải lớn hơn 0.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.Ngay || ''))) throw new Error('Ngày tạm ứng không hợp lệ.');
    const [yyyy, mm] = String(data.Ngay).split('-');
    const thang = `${mm}/${yyyy}`;
    const luong = this.db.LUONG.find((l) => l.NhanVienID === nv.NhanVienID && l.Thang === thang);
    if (luong && luong.TrangThai !== 'Chờ duyệt') throw new Error('Bảng lương tháng này đã duyệt/đã thanh toán, không thể thêm tạm ứng.');
    const item: TamUng = {
      TamUngID: `TU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      NhanVienID: nv.NhanVienID,
      HoTen: nv.HoTen,
      Ngay: data.Ngay,
      Thang: thang,
      SoTien: Math.round(amount),
      LyDo: String(data.LyDo || '').trim(),
      GhiChu: String(data.GhiChu || '').trim(),
      TaoLuc: new Date().toISOString(),
      TaoBoi: adminUser.HoTen,
      TrangThai: data.TrangThai || 'Đã duyệt',
    };
    this.db.TAM_UNG.unshift(item);
    if (luong && item.TrangThai === 'Đã duyệt') this.syncTamUngToLuong(luong);
    this.refreshKPIs();
    this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, item.TrangThai === 'Chờ duyệt' ? 'Gửi yêu cầu ứng lương' : 'Thêm tạm ứng lương', `${item.TrangThai === 'Chờ duyệt' ? 'Yêu cầu ứng' : 'Thêm tạm ứng'} ${item.SoTien.toLocaleString('vi-VN')} đ cho ${nv.HoTen} ngày ${item.Ngay}`);
    if (item.TrangThai === 'Chờ duyệt') this.addNotification('Yêu cầu ứng lương mới', `${nv.HoTen} yêu cầu ứng ${item.SoTien.toLocaleString('vi-VN')} đ. Vui lòng kiểm tra và duyệt.`, 'info');
    return item;
  }

  public duyetTamUng(id: string, approve: boolean, lyDoTuChoi: string | undefined, adminUser: { HoTen: string; Email: string }): TamUng {
    const item = this.db.TAM_UNG.find((x) => x.TamUngID === id);
    if (!item) throw new Error('Không tìm thấy yêu cầu ứng lương.');
    if (item.TrangThai !== 'Chờ duyệt') throw new Error('Yêu cầu này đã được xử lý.');
    const luong = this.db.LUONG.find((l) => l.NhanVienID === item.NhanVienID && l.Thang === item.Thang);
    if (approve && luong && luong.TrangThai !== 'Chờ duyệt') throw new Error('Bảng lương tháng này đã duyệt hoặc thanh toán; không thể thêm khoản ứng vào kỳ đã khóa.');
    item.TrangThai = approve ? 'Đã duyệt' : 'Từ chối';
    item.NgayDuyet = new Date().toISOString();
    item.NguoiDuyet = adminUser.HoTen;
    item.LyDoTuChoi = approve ? '' : String(lyDoTuChoi || '').trim();
    if (approve && luong) this.syncTamUngToLuong(luong);
    this.refreshKPIs(); this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, approve ? 'Duyệt ứng lương' : 'Từ chối ứng lương', `${approve ? 'Duyệt' : 'Từ chối'} yêu cầu ứng ${item.SoTien.toLocaleString('vi-VN')} đ của ${item.HoTen}`);
    this.addNotification(approve ? 'Yêu cầu ứng lương đã duyệt' : 'Yêu cầu ứng lương bị từ chối', approve ? `Yêu cầu ứng ${item.SoTien.toLocaleString('vi-VN')} đ đã được duyệt và sẽ khấu trừ vào bảng lương tháng ${item.Thang}.` : `Yêu cầu ứng ${item.SoTien.toLocaleString('vi-VN')} đ bị từ chối. ${item.LyDoTuChoi || ''}`, approve ? 'success' : 'warning', item.NhanVienID);
    return item;
  }

  public deleteTamUng(id: string, adminUser: { HoTen: string; Email: string }): boolean {
    const index = this.db.TAM_UNG.findIndex((x) => x.TamUngID === id);
    if (index === -1) throw new Error('Không tìm thấy khoản tạm ứng.');
    const item = this.db.TAM_UNG[index];
    const luong = this.db.LUONG.find((l) => l.NhanVienID === item.NhanVienID && l.Thang === item.Thang);
    if (luong && luong.TrangThai !== 'Chờ duyệt') throw new Error('Bảng lương tháng này đã duyệt/đã thanh toán, không thể xóa tạm ứng.');
    this.db.TAM_UNG.splice(index, 1);
    if (luong) this.syncTamUngToLuong(luong);
    this.refreshKPIs();
    this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, 'Xóa tạm ứng lương', `Xóa tạm ứng ${item.SoTien.toLocaleString('vi-VN')} đ của ${item.HoTen} ngày ${item.Ngay}`);
    return true;
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

      // Calculate attendance and payroll deductions for the month.
      const attendance = this.db.CHAMCONG.filter(
        (cc) => cc.NhanVienID === nv.NhanVienID && cc.Ngay.startsWith(monthPrefix)
      );
      const attendanceByDate = new Map(attendance.map((cc) => [cc.Ngay, cc]));
      const isHalfDayLate = (cc: ChamCong) => {
        if (!cc.CheckIn || cc.TrangThai === 'Nghỉ' || cc.KetQuaGiaiTrinh === 'Chấp nhận') return false;
        const [hour, minute] = cc.CheckIn.split(':').map(Number);
        const minutes = hour * 60 + minute;
        return minutes > 9 * 60 + 30 && minutes <= 13 * 60;
      };
      const soNgayCong = attendance.reduce((sum, cc) => {
        if (!cc.CheckIn || cc.TrangThai === 'Nghỉ') return sum;
        return sum + (isHalfDayLate(cc) ? 0.5 : 1);
      }, 0);
      const soGioLam = attendance.reduce((sum, cc) => sum + (cc.SoGioLam || 0), 0);

      // Only explicitly approved leave requests count as leave. Missing check-ins
      // without an approved leave or an actual attendance record are not absences.
      const approvedLeaveDays = new Set<string>();
      for (const request of this.db.QUAN_LY.filter((item) =>
        item.Module === 'NGHI_PHEP' &&
        item.DuLieu?.NhanVienID === nv.NhanVienID &&
        item.DuLieu?.TrangThai === 'Đã duyệt'
      )) {
        const from = String(request.DuLieu?.TuNgay || '');
        const to = String(request.DuLieu?.DenNgay || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) continue;
        const cursor = new Date(from + 'T00:00:00Z');
        const last = new Date(to + 'T00:00:00Z');
        while (cursor <= last) {
          const day = cursor.toISOString().slice(0, 10);
          if (day.startsWith(monthPrefix) && !attendanceByDate.get(day)?.CheckIn) approvedLeaveDays.add(day);
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }

      const fullAbsenceDays = new Set<string>(approvedLeaveDays);
      attendance.forEach((cc) => {
        if ((cc.TrangThai === 'Nghỉ' || cc.TrangThai === 'Nghỉ phép') && cc.KetQuaGiaiTrinh !== 'Chấp nhận') fullAbsenceDays.add(cc.Ngay);
      });
      const ngayNghi = fullAbsenceDays.size;
      const ngayDiTreKhauTru = attendance.filter(isHalfDayLate).length;
      // Two full leave/absence days per month are salary-neutral; every further
      // day is deducted at base salary / 30. Late arrivals after 09:30 add half-day deductions.
      const donGiaNgay = Math.max(0, Number(nv.LuongCoBan || 0)) / 30;
      const ngayNghiVuotMien = Math.max(0, ngayNghi - 2);
      const khauTruNghi = Math.round(ngayNghiVuotMien * donGiaNgay);
      const khauTruDiTre = Math.round(ngayDiTreKhauTru * donGiaNgay * 0.5);
      const tongKhauTruChamCong = khauTruNghi + khauTruDiTre;
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
        Phat: tongKhauTruChamCong,
        TamUng: this.getTongTamUng(nv.NhanVienID, thang),
        TongLuong: 0,
        ThucLanh: 0,
        TrangThai: 'Chờ duyệt',
        NgayTao: new Date().toISOString(),
        GhiChu: `Bảng lương ${thang} tạo tự động. Nghỉ/ phép đã duyệt: ${ngayNghi} ngày (miễn 2 ngày, trừ ${khauTruNghi.toLocaleString('vi-VN')}đ); đi trễ sau 09:30: ${ngayDiTreKhauTru} lần (trừ ${khauTruDiTre.toLocaleString('vi-VN')}đ). Không có bản ghi chấm công không tự động tính nghỉ.`,
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

  public deleteLuong(luongId: string, adminUser: { HoTen: string; Email: string }): { message: string } {
    const index = this.db.LUONG.findIndex((item) => item.LuongID === luongId);
    if (index < 0) throw new Error('Không tìm thấy bảng lương.');
    const luong = this.db.LUONG[index];
    if (luong.TrangThai !== 'Chờ duyệt') {
      throw new Error('Chỉ được xóa bảng lương đang Chờ duyệt. Bảng lương đã duyệt hoặc đã thanh toán được giữ để bảo toàn lịch sử.');
    }
    this.db.LUONG.splice(index, 1);
    this.refreshKPIs();
    this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, 'Xóa bảng lương', `Xóa bảng lương ${luong.LuongID} của ${luong.HoTen}, kỳ ${luong.Thang}`);
    return { message: 'Đã xóa bảng lương đang chờ duyệt.' };
  }

  public updateLuongDetail(
    luongId: string,
    updates: Partial<Luong>,
    adminUser: { HoTen: string; Email: string }
  ): Luong {
    const luong = this.findLuongById(luongId);
    if (!luong) throw new Error('Không tìm thấy bảng lương');
    if (luong.TrangThai !== 'Chờ duyệt') {
      throw new Error('Chỉ được chỉnh sửa bảng lương đang Chờ duyệt. Bảng lương đã duyệt/đã thanh toán phải được giữ nguyên lịch sử.');
    }

    if (updates.LuongCoBan !== undefined) luong.LuongCoBan = Number(updates.LuongCoBan);
    if (updates.SoNgayCong !== undefined) luong.SoNgayCong = Number(updates.SoNgayCong);
    if (updates.SoGioLam !== undefined) luong.SoGioLam = Number(updates.SoGioLam);
    if (updates.PhuCap !== undefined) luong.PhuCap = Number(updates.PhuCap);
    if (updates.Thuong !== undefined) luong.Thuong = Number(updates.Thuong);
    // HoaHong is never accepted as a manually editable payroll number.
    // It is always recalculated from approved HOAHONG ledger rows below.
    if (updates.Phat !== undefined) luong.Phat = Number(updates.Phat);

    // When an admin edits the "Tạm ứng trong kỳ" field, reconcile the underlying
    // approved advance ledger too; otherwise syncTamUngToLuong would restore the old amount.
    if (updates.TamUng !== undefined) {
      const target = Number(updates.TamUng);
      if (!Number.isFinite(target) || target < 0) throw new Error('Số tiền tạm ứng không hợp lệ.');
      const approvedItems = this.db.TAM_UNG
        .filter((item) => item.NhanVienID === luong.NhanVienID && item.Thang === luong.Thang && (!item.TrangThai || item.TrangThai === 'Đã duyệt'))
        .sort((a, b) => b.Ngay.localeCompare(a.Ngay) || b.TaoLuc.localeCompare(a.TaoLuc));
      const currentTotal = approvedItems.reduce((sum, item) => sum + (Number(item.SoTien) || 0), 0);
      const roundedTarget = Math.round(target);

      if (roundedTarget < currentTotal) {
        let amountToRemove = currentTotal - roundedTarget;
        for (const item of approvedItems) {
          if (amountToRemove <= 0) break;
          const itemAmount = Math.max(0, Number(item.SoTien) || 0);
          const reduction = Math.min(itemAmount, amountToRemove);
          item.SoTien = itemAmount - reduction;
          amountToRemove -= reduction;
          if (item.SoTien <= 0) {
            const index = this.db.TAM_UNG.findIndex((entry) => entry.TamUngID === item.TamUngID);
            if (index >= 0) this.db.TAM_UNG.splice(index, 1);
          }
        }
      } else if (roundedTarget > currentTotal) {
        const delta = roundedTarget - currentTotal;
        const nv = this.findNhanVienById(luong.NhanVienID);
        if (!nv) throw new Error('Không tìm thấy nhân viên để điều chỉnh tạm ứng.');
        const [month, year] = luong.Thang.split('/');
        const today = new Date();
        const date = `${year}-${month}-01`;
        this.db.TAM_UNG.unshift({
          TamUngID: `TU-ADJ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
          NhanVienID: luong.NhanVienID,
          HoTen: luong.HoTen,
          Ngay: date,
          Thang: luong.Thang,
          SoTien: delta,
          LyDo: 'Điều chỉnh tạm ứng từ bảng lương',
          GhiChu: 'Khoản điều chỉnh phát sinh khi quản trị viên sửa bảng lương.',
          TaoLuc: new Date().toISOString(),
          TaoBoi: adminUser.HoTen,
          TrangThai: 'Đã duyệt',
        });
      }
    }
    if (updates.GhiChu !== undefined) luong.GhiChu = updates.GhiChu;

    this.syncTamUngToLuong(luong);
    this.syncHoaHongToLuong(luong);
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
    if (!nv) throw new Error('Không tìm thấy duy nhất một nhân viên theo mã đã chọn. Vui lòng kiểm tra mã nhân viên trùng.');
    const noiDung = String(data.NoiDung || '').trim();
    if (!noiDung) throw new Error('Vui lòng nhập nội dung khoản thu nhập.');
    const ngay = String(data.Ngay || '');
    if (!/^\d{4}-\\d{2}-\\d{2}$/.test(ngay) || Number.isNaN(Date.parse(ngay + 'T00:00:00Z'))) {
      throw new Error('Ngày ghi nhận hoa hồng không hợp lệ.');
    }

    const loaiKhoan = data.LoaiKhoan || 'Hoa Hồng';
    if (loaiKhoan !== 'Tiền Show' && loaiKhoan !== 'Hoa Hồng') {
      throw new Error('Loại khoản thu nhập không hợp lệ.');
    }
    const doanhThu = Number(data.DoanhThu ?? 0);
    const tyLe = Number(data.TyLeHoaHong ?? 0);
    if (!Number.isFinite(doanhThu) || doanhThu < 0) throw new Error('Doanh thu phải là số không âm.');
    if (!Number.isFinite(tyLe) || tyLe < 0 || tyLe > 100) throw new Error('Tỷ lệ hoa hồng phải từ 0 đến 100%.');

    let soTien = 0;
    if (loaiKhoan === 'Tiền Show') {
      const directAmount = Number(data.SoTienHoaHong);
      soTien = Number.isFinite(directAmount) && directAmount > 0
        ? Math.round(directAmount)
        : Math.round((doanhThu * (tyLe > 0 ? tyLe : 100)) / 100);
    } else {
      const directAmount = Number(data.SoTienHoaHong);
      soTien = tyLe === 0 && Number.isFinite(directAmount) && directAmount > 0
        ? Math.round(directAmount)
        : Math.round((doanhThu * tyLe) / 100);
    }
    if (!Number.isFinite(soTien) || soTien <= 0) {
      throw new Error('Số tiền thu nhập phải lớn hơn 0. Vui lòng kiểm tra doanh thu, tỷ lệ hoặc số tiền show.');
    }

    const hoaHongId = `HH-${randomUUID()}`;

    const newHoaHong: HoaHong = {
      HoaHongID: hoaHongId,
      NhanVienID: nv.NhanVienID,
      HoTen: nv.HoTen,
      Ngay: ngay,
      NoiDung: noiDung,
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

    // Idempotency guard: only a pending claim can be approved/rejected once.
    // This prevents double taps/retries from adding the same income twice.
    if (hh.TrangThai !== 'Chờ duyệt') {
      throw new Error(`Khoản thu nhập này đã được xử lý (${hh.TrangThai}); hệ thống không thực hiện duyệt lại.`);
    }

    const [year, month] = String(hh.Ngay || '').split('-');
    if (!/^\d{4}$/.test(year || '') || !/^\d{2}$/.test(month || '')) {
      throw new Error('Ngày của khoản hoa hồng không hợp lệ; cần đối soát dữ liệu trước khi duyệt.');
    }
    const thangStr = `${month}/${year}`;
    const luong = this.db.LUONG.find(
      (item) => item.NhanVienID === hh.NhanVienID && item.Thang === thangStr
    );

    // A locked payroll cannot be changed silently. Keep the commission pending
    // until Admin resolves the closed payroll period explicitly.
    if (dongY && luong && luong.TrangThai !== 'Chờ duyệt') {
      throw new Error(`Bảng lương ${thangStr} của ${hh.HoTen} đã ở trạng thái "${luong.TrangThai}". Không thể cộng thêm hoa hồng vào kỳ đã khóa; vui lòng xử lý điều chỉnh lương trước.`);
    }

    const now = new Date().toISOString();
    hh.TrangThai = dongY ? 'Đã duyệt' : 'Từ chối';
    hh.NgayDuyet = now;
    hh.NguoiDuyet = adminUser.HoTen;

    if (dongY && luong) {
      this.syncHoaHongToLuong(luong);
      hh.LuongID = luong.LuongID;
    } else if (!dongY) {
      hh.LuongID = undefined;
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
      dongY
        ? `Khoản hoa hồng "${hh.NoiDung}" (${hh.SoTienHoaHong.toLocaleString('vi-VN')} đ) đã được duyệt.`
        : `Khoản hoa hồng "${hh.NoiDung}" (${hh.SoTienHoaHong.toLocaleString('vi-VN')} đ) đã bị từ chối.`,
      dongY ? 'success' : 'warning',
      hh.NhanVienID
    );
    return hh;
  }

  public deleteHoaHong(id: string, adminUser: { HoTen: string; Email: string }): boolean {
    const hh = this.db.HOAHONG.find((h) => h.HoaHongID === id);
    if (!hh) throw new Error('Hoa hồng không tồn tại');

    const [year, month] = String(hh.Ngay || '').split('-');
    const thangStr = month && year ? `${month}/${year}` : '';
    const linkedLuong = (hh.LuongID ? this.findLuongById(hh.LuongID) : undefined) ||
      this.db.LUONG.find((item) => item.NhanVienID === hh.NhanVienID && item.Thang === thangStr);
    if (hh.TrangThai === 'Đã duyệt' && linkedLuong && linkedLuong.TrangThai !== 'Chờ duyệt') {
      throw new Error('Khoản hoa hồng thuộc kỳ lương đã duyệt/thanh toán. Không thể xóa làm sai lệch lịch sử tài chính.');
    }

    this.db.HOAHONG = this.db.HOAHONG.filter((h) => h.HoaHongID !== id);
    if (hh.TrangThai === 'Đã duyệt' && linkedLuong) {
      this.syncHoaHongToLuong(linkedLuong);
    }
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

  /** Read-only financial and identity integrity scan. Never repairs or mutates production data. */
  public getDataIntegrityReport() {
    const issues: Array<{ code: string; severity: 'critical' | 'warning'; message: string; records?: string[] }> = [];
    const add = (code: string, severity: 'critical' | 'warning', message: string, records?: string[]) => {
      issues.push({ code, severity, message, ...(records?.length ? { records } : {}) });
    };
    const duplicates = (rows: any[], keyOf: (row: any) => string, code: string, label: string) => {
      const groups = new Map<string, any[]>();
      rows.forEach((row) => {
        const key = String(keyOf(row) || '').trim();
        if (!key) return;
        const group = groups.get(key) || [];
        group.push(row);
        groups.set(key, group);
      });
      groups.forEach((group, key) => {
        if (group.length > 1) add(code, 'critical', `${label} "${key}" bị trùng ${group.length} bản ghi.`, group.map((row) => String(row.NhanVienID || row.HoaHongID || row.LuongID || row.ChamCongID || key)));
      });
    };

    duplicates(this.db.NHANVIEN, (row) => row.NhanVienID, 'DUPLICATE_STAFF_ID', 'Mã nhân viên');
    duplicates(this.db.NHANVIEN, (row) => String(row.TenDangNhap || '').toLowerCase(), 'DUPLICATE_USERNAME', 'Tên đăng nhập');
    duplicates(this.db.NHANVIEN, (row) => String(row.Email || '').trim().toLowerCase(), 'DUPLICATE_EMAIL', 'Email');
    duplicates(this.db.CHAMCONG, (row) => row.ChamCongID, 'DUPLICATE_ATTENDANCE_ID', 'Mã chấm công');
    duplicates(this.db.HOAHONG, (row) => row.HoaHongID, 'DUPLICATE_COMMISSION_ID', 'Mã hoa hồng');
    duplicates(this.db.LUONG, (row) => row.LuongID, 'DUPLICATE_PAYROLL_ID', 'Mã bảng lương');
    duplicates(this.db.CHAMCONG, (row) => `${row.NhanVienID}|${row.Ngay}`, 'DUPLICATE_ATTENDANCE_DAY', 'Nhân viên/ngày chấm công');
    duplicates(this.db.LUONG, (row) => `${row.NhanVienID}|${row.Thang}`, 'DUPLICATE_PAYROLL_MONTH', 'Nhân viên/kỳ lương');

    const uniqueStaff = new Set(this.db.NHANVIEN.map((row) => String(row.NhanVienID || '')));
    const checkReferences = (rows: any[], table: string, idField: string) => {
      rows.forEach((row) => {
        const id = String(row.NhanVienID || '');
        if (!id || !uniqueStaff.has(id) || this.db.NHANVIEN.filter((staff) => staff.NhanVienID === id).length !== 1) {
          add('ORPHAN_OR_AMBIGUOUS_EMPLOYEE', 'critical', `${table} ${row[idField] || '(không mã)'} không tham chiếu duy nhất tới một nhân viên.`, [String(row[idField] || id || table)]);
        }
      });
    };
    checkReferences(this.db.CHAMCONG, 'Chấm công', 'ChamCongID');
    checkReferences(this.db.HOAHONG, 'Hoa hồng', 'HoaHongID');
    checkReferences(this.db.LUONG, 'Bảng lương', 'LuongID');
    checkReferences(this.db.TAM_UNG, 'Tạm ứng', 'TamUngID');

    this.db.HOAHONG.forEach((item) => {
      const amount = Number(item.SoTienHoaHong);
      if (!Number.isFinite(amount) || amount < 0) add('INVALID_COMMISSION_AMOUNT', 'critical', `Hoa hồng ${item.HoaHongID} có số tiền không hợp lệ.`, [item.HoaHongID]);
      if (item.TrangThai === 'Đã duyệt' && item.LuongID) {
        const payroll = this.db.LUONG.find((row) => row.LuongID === item.LuongID);
        if (!payroll || payroll.NhanVienID !== item.NhanVienID) {
          add('BROKEN_COMMISSION_PAYROLL_LINK', 'critical', `Hoa hồng ${item.HoaHongID} liên kết sai hoặc thiếu bảng lương.`, [item.HoaHongID, item.LuongID]);
        } else if (payroll.Thang !== `${String(item.Ngay).slice(5, 7)}/${String(item.Ngay).slice(0, 4)}`) {
          add('COMMISSION_WRONG_PAYROLL_PERIOD', 'critical', `Hoa hồng ${item.HoaHongID} đang liên kết sai kỳ lương.`, [item.HoaHongID, payroll.LuongID]);
        }
      }
    });

    this.db.LUONG.forEach((payroll) => {
      const monthPrefix = (() => {
        const [month, year] = String(payroll.Thang || '').split('/');
        return month && year ? `${year}-${month.padStart(2, '0')}` : '';
      })();
      const expectedCommission = this.db.HOAHONG
        .filter((item) => item.NhanVienID === payroll.NhanVienID && String(item.Ngay || '').startsWith(monthPrefix) && item.TrangThai === 'Đã duyệt')
        .reduce((sum, item) => sum + (Number(item.SoTienHoaHong) || 0), 0);
      if (Math.round(Number(payroll.HoaHong || 0)) !== Math.round(expectedCommission)) {
        add('PAYROLL_COMMISSION_MISMATCH', 'critical', `Bảng lương ${payroll.LuongID} lệch hoa hồng: trên lương ${Number(payroll.HoaHong || 0)}, sổ hoa hồng đã duyệt ${expectedCommission}.`, [payroll.LuongID, payroll.NhanVienID]);
      }
      const expectedAdvance = this.getTongTamUng(payroll.NhanVienID, payroll.Thang);
      if (Math.round(Number(payroll.TamUng || 0)) !== Math.round(expectedAdvance)) {
        add('PAYROLL_ADVANCE_MISMATCH', 'warning', `Bảng lương ${payroll.LuongID} lệch tạm ứng: trên lương ${Number(payroll.TamUng || 0)}, sổ tạm ứng đã duyệt ${expectedAdvance}.`, [payroll.LuongID, payroll.NhanVienID]);
      }
      const expectedNet = Math.max(0,
        Number(payroll.LuongCoBan || 0) + Number(payroll.PhuCap || 0) +
        Number(payroll.Thuong || 0) + Number(payroll.HoaHong || 0) -
        Number(payroll.Phat || 0) - Number(payroll.TamUng || 0)
      );
      if (Math.round(Number(payroll.TongLuong || 0)) !== Math.round(expectedNet) ||
          Math.round(Number(payroll.ThucLanh || 0)) !== Math.round(expectedNet)) {
        add('PAYROLL_TOTAL_MISMATCH', 'critical', `Bảng lương ${payroll.LuongID} có tổng lương/thực lãnh không khớp công thức.`, [payroll.LuongID, payroll.NhanVienID]);
      }
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        employees: this.db.NHANVIEN.length,
        attendance: this.db.CHAMCONG.length,
        commissions: this.db.HOAHONG.length,
        payrolls: this.db.LUONG.length,
        advances: this.db.TAM_UNG.length,
        critical: issues.filter((item) => item.severity === 'critical').length,
        warning: issues.filter((item) => item.severity === 'warning').length,
        totalIssues: issues.length,
      },
      issues,
    };
  }

  public getConfig(): SystemConfig {
    const officialAddress = '321 Lê Quý Đôn, Tân Xuân, Bình Phước, Đồng Nai';
    if (this.db.SYSTEM_CONFIG.DiaChi !== officialAddress) {
      this.db.SYSTEM_CONFIG.DiaChi = officialAddress;
      this.save();
    }
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
  // Remove the known seeded demo employee and only records linked to that employee.
  // All unrelated user-entered data, Admin credentials, studio config and theme are preserved.

  public getQuanLyRecords(module?: QuanLyModule): QuanLyRecord[] {
    const list = this.db.QUAN_LY || [];
    return module ? list.filter((x) => x.Module === module) : [...list];
  }

  public createQuanLyRecord(module: QuanLyModule, data: Record<string, any>, adminUser: { HoTen: string; Email: string }): QuanLyRecord {
    if (!['CONG_VIEC', 'HOP_DONG', 'THU_CHI', 'NGHI_PHEP'].includes(module)) {
      throw new Error('Module nghiệp vụ không hợp lệ.');
    }
    const now = new Date().toISOString();
    const record: QuanLyRecord = {
      QuanLyID: `QL-${module}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      Module: module,
      DuLieu: data || {},
      TaoLuc: now,
      CapNhatLuc: now,
      TaoBoi: adminUser.HoTen,
    };
    this.db.QUAN_LY.unshift(record);
    this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, `Tạo ${module}`, JSON.stringify(data || {}));
    return record;
  }

  public updateQuanLyRecord(id: string, data: Record<string, any>, adminUser: { HoTen: string; Email: string }): QuanLyRecord {
    const record = (this.db.QUAN_LY || []).find((x) => x.QuanLyID === id);
    if (!record) throw new Error('Không tìm thấy dữ liệu nghiệp vụ.');
    record.DuLieu = { ...record.DuLieu, ...(data || {}) };
    record.CapNhatLuc = new Date().toISOString();
    this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, `Cập nhật ${record.Module}`, id);
    return record;
  }

  public deleteQuanLyRecord(id: string, adminUser: { HoTen: string; Email: string }) {
    const index = (this.db.QUAN_LY || []).findIndex((x) => x.QuanLyID === id);
    if (index < 0) throw new Error('Không tìm thấy dữ liệu nghiệp vụ.');
    const [removed] = this.db.QUAN_LY.splice(index, 1);
    this.save();
    this.logAudit(adminUser.HoTen, adminUser.Email, `Xóa ${removed.Module}`, id);
    return { message: 'Xóa dữ liệu thành công.' };
  }

  public getRawData(): DatabaseSchema {
    return this.db;
  }
}

export const dbService = new DatabaseService();
