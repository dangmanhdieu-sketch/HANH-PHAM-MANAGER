import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { gzipSync } from 'node:zlib';
import dotenv from 'dotenv';
import { dbService } from './server/db.ts';
import { inventoryService } from './server/inventory.ts';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { uploadInventoryImage, uploadAttendancePhoto, getAttendancePhotoDataUrl, createGoogleDriveAuthorizationUrl, exchangeGoogleDriveCode } from './server/drive.ts';
import { automationManager } from './server/automation.ts';
import type { NhanVien } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High payload limit for camera photo uploads in base64
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Compress large JSON API responses for faster loading on mobile networks.
// Node's built-in gzip avoids an extra runtime dependency. Mutations are still
// persisted/verified by the middleware below before the compressed response is sent.
app.use((req: Request, res: Response, next: NextFunction) => {
  const acceptsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  if (!acceptsGzip || req.method === 'HEAD') return next();

  const originalSend = res.send.bind(res);
  res.send = ((body?: any) => {
    const contentType = String(res.getHeader('Content-Type') || '');
    const alreadyEncoded = Boolean(res.getHeader('Content-Encoding'));
    if (
      alreadyEncoded ||
      !contentType.includes('application/json') ||
      res.statusCode === 204 ||
      res.statusCode === 304 ||
      body === undefined ||
      body === null
    ) {
      return originalSend(body);
    }

    const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
    if (payload.length < 1024) return originalSend(body);

    try {
      const compressed = gzipSync(payload, { level: 1 });
      res.setHeader('Content-Encoding', 'gzip');
      res.vary('Accept-Encoding');
      res.removeHeader('Content-Length');
      return originalSend(compressed);
    } catch (error) {
      console.error('[HTTP] JSON gzip compression failed; sending uncompressed response:', error);
      return originalSend(body);
    }
  }) as Response['send'];

  next();
});


// Firebase/Firestore startup gate: wait until dbService has loaded the
// persistent database from Firestore before any API route reads or writes data.
app.use('/api', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await dbService.waitUntilReady();
    next();
  } catch (error) {
    next(error);
  }
});

// Persistence barrier for every API mutation.
// Routes may update in-memory data and call save() without awaiting Firestore.
// Delay every successful mutation response until all Firestore tables have been
// written and read back successfully. This prevents false "saved" confirmations.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Login is an authentication request, not a business-data mutation. Do not
  // turn a successful credential check into a failed login because an audit
  // write is temporarily unavailable. The login audit is queued separately.
  if (req.method === 'POST' && req.path === '/auth/login') return next();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const originalSend = res.send.bind(res);
  let persistenceStarted = false;

  res.send = ((body?: any) => {
    if (persistenceStarted || res.statusCode < 200 || res.statusCode >= 300) {
      return originalSend(body);
    }

    persistenceStarted = true;
    void dbService.saveAndVerify()
      .then(() => originalSend(body))
      .catch((error: any) => {
        console.error('[API] Mutation blocked because Firestore persistence was not verified:', {
          method: req.method,
          path: req.path,
          error: error?.message || error,
        });
        if (!res.headersSent) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        // Never send raw infrastructure errors, credentials, or provider response
        // bodies to employee browsers. Keep diagnostics in protected server logs.
        return originalSend(JSON.stringify({
          error: 'Máy chủ chưa xác nhận lưu dữ liệu lên Firebase. Vui lòng thử lại sau ít phút hoặc báo Admin kiểm tra nhật ký Render.',
          code: 'FIRESTORE_SAVE_NOT_VERIFIED',
        }));
      });

    return res;
  }) as Response['send'];

  next();
});

// Helper to create a simple signed token for session
function createToken(user: NhanVien): string {
  const payload = {
    id: user.NhanVienID,
    username: user.TenDangNhap,
    email: user.Email,
    role: user.Quyen,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function parseToken(tokenStr: string): { id: string; username?: string; email: string; role: string; exp: number } | null {
  try {
    const raw = Buffer.from(tokenStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.exp && parsed.exp > Date.now()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Auth Middleware
interface AuthRequest extends Request {
  user?: NhanVien;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng cung cấp token xác thực.' });
  }

  const payload = parseToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }

  // Resolve the authenticated account by its unique login name first.
  // Looking up by NhanVienID alone can select another employee if legacy data
  // contains duplicated IDs, causing check-in and commission records to be
  // attributed to the first matching employee in the array.
  const user = payload.username
    ? dbService.findNhanVienByUsername(payload.username)
    : dbService.findNhanVienById(payload.id);
  const matchingEmployeeIds = dbService.getNhanVienList()
    .filter((employee) => employee.NhanVienID === payload.id).length;

  // A token must resolve to exactly one employee record. Otherwise two people
  // sharing one legacy ID could write attendance/commission under the same ID.
  if (!user || user.NhanVienID !== payload.id || matchingEmployeeIds !== 1) {
    console.error('[AUTH] Token identity does not match the employee record:', {
      tokenId: payload.id,
      tokenUsername: payload.username || null,
      matchedId: user?.NhanVienID || null,
    });
    return res.status(401).json({
      error: 'Thông tin nhân viên của phiên đăng nhập không còn khớp dữ liệu hệ thống. Vui lòng đăng xuất và đăng nhập lại.',
    });
  }

  if (user.BiKhoa) {
    return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
  }

  req.user = user;
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.Quyen !== 'Admin') {
    return res.status(403).json({ error: 'Từ chối truy cập: Thao tác này chỉ dành cho Admin.' });
  }
  next();
}
// 1. AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    // Hỗ trợ username là chính; email chỉ giữ tương thích với client cũ.
    const username = String(req.body?.username || req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({
        error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.',
      });
    }

    let user = dbService.findNhanVienByUsername(username);

    // Tạm thời cho phép Email đăng nhập để tương thích app cũ.
    if (!user && username.includes('@')) {
      user = dbService.findNhanVienByEmail(username);
    }

    if (!user) {
      return res.status(401).json({
        error: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    if (user.BiKhoa) {
      return res.status(403).json({
        error: 'Tài khoản của bạn đã bị khóa.',
      });
    }

    // Chỉ xác thực bằng mật khẩu đã hash trong database.
    // Không còn mật khẩu hard-code như admin123 / 211811868 / 123456.
    const isMatch = !!user.MatKhau && bcrypt.compareSync(password, user.MatKhau);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const token = createToken(user);
    const { MatKhau: _, ...userSafe } = user;

    dbService.logAudit(
      user.HoTen,
      user.Email,
      'Đăng nhập hệ thống',
      `Đăng nhập thành công với username: ${user.TenDangNhap}`,
      req.ip
    );

    // Persist login audit asynchronously. Authentication must remain available
    // even if Firestore is briefly unavailable; failures remain visible in logs.
    void dbService.saveAndVerify().catch((error: any) => {
      console.error('[AUTH] Login succeeded but audit log sync failed:', error?.message || error);
    });

    return res.json({
      user: userSafe,
      token,
      message: 'Đăng nhập thành công',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: err.message || 'Lỗi server',
    });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const { MatKhau: _, ...userSafe } = req.user!;
  res.json({ user: userSafe });
});

app.post('/api/auth/change-password', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const user = req.user!;
    if (user.MatKhau && !bcrypt.compareSync(oldPassword, user.MatKhau)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    dbService.updateNhanVien(user.NhanVienID, { MatKhau: newPassword }, { HoTen: user.HoTen, Email: user.Email });
    return res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. NHANVIEN (STAFF) ROUTES
// ==========================================

app.get('/api/nhanvien', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  // Non-admin can only see their own profile or public staff directory list (without salary)
  if (user.Quyen === 'Admin') {
    const list = dbService.getNhanVienList().map(({ MatKhau, ...safe }) => safe);
    return res.json(list);
  } else {
    // Return staff directory list with public info + bank info for all staff
    const list = dbService.getNhanVienList().map((nv) => {
      if (nv.NhanVienID === user.NhanVienID) {
        const { MatKhau, ...safe } = nv;
        return safe;
      }
      return {
        NhanVienID: nv.NhanVienID,
        HoTen: nv.HoTen,
        ChucVu: nv.ChucVu,
        AnhNhanVien: nv.AnhNhanVien,
        TrangThai: nv.TrangThai,
        SDT: nv.SDT,
        Email: nv.Email,
        NgayVaoLam: nv.NgayVaoLam,
        SoTaiKhoan: nv.SoTaiKhoan,
        NganHang: nv.NganHang,
        TenChuTaiKhoan: nv.TenChuTaiKhoan,
        ChiNhanhNganHang: nv.ChiNhanhNganHang,
        // Redacted for others (internal finance & auth)
        LuongCoBan: 0,
        Quyen: nv.Quyen,
      };
    });
    return res.json(list);
  }
});

app.get('/api/nhanvien/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const targetId = req.params.id;

  if (user.Quyen !== 'Admin' && user.NhanVienID !== targetId) {
    return res.status(403).json({ error: 'Bạn không có quyền xem thông tin nhân viên khác.' });
  }

  const nv = dbService.findNhanVienById(targetId);
  if (!nv) {
    return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
  }

  const { MatKhau: _, ...safe } = nv;
  return res.json(safe);
});

app.post('/api/nhanvien', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const created = dbService.createNhanVien(req.body, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    const { MatKhau: _, ...safe } = created;
    return res.status(201).json(safe);
  } catch (err: any) {
    console.error('[API] Create employee failed:', err);
    return res.status(400).json({ error: err.message || 'Không thể tạo nhân viên.' });
  }
});

app.put('/api/nhanvien/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const targetId = req.params.id;

    // Security Check: Non-admins cannot alter sensitive fields
    if (user.Quyen !== 'Admin') {
      if (user.NhanVienID !== targetId) {
        return res.status(403).json({ error: 'Không thể chỉnh sửa hồ sơ người khác.' });
      }
      // Non-admin can only update their own phone, avatar and bank account info
      const allowedSelfUpdates = {
        SDT: req.body.SDT,
        AnhNhanVien: req.body.AnhNhanVien,
        SoTaiKhoan: req.body.SoTaiKhoan,
        NganHang: req.body.NganHang,
        TenChuTaiKhoan: req.body.TenChuTaiKhoan,
        ChiNhanhNganHang: req.body.ChiNhanhNganHang,
      };
      const updated = dbService.updateNhanVien(targetId, allowedSelfUpdates, {
        HoTen: user.HoTen,
        Email: user.Email,
      });
      const { MatKhau: _, ...safe } = updated;
      return res.json(safe);
    }

    // Admin updates
    const updated = dbService.updateNhanVien(targetId, req.body, {
      HoTen: user.HoTen,
      Email: user.Email,
    });
    const { MatKhau: _, ...safe } = updated;
    return res.json(safe);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/nhanvien/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    dbService.deleteNhanVien(req.params.id, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({ message: 'Xóa nhân viên thành công.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/nhanvien/:id/toggle-lock', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const nv = dbService.findNhanVienById(req.params.id);
    if (!nv) return res.status(404).json({ error: 'Nhân viên không tồn tại' });
    if (nv.NhanVienID === req.user!.NhanVienID) {
      return res.status(400).json({ error: 'Bạn không thể tự khóa tài khoản của chính mình.' });
    }

    const newLockState = !nv.BiKhoa;
    const updated = dbService.updateNhanVien(nv.NhanVienID, { BiKhoa: newLockState }, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });

    dbService.logAudit(
      req.user!.HoTen,
      req.user!.Email,
      newLockState ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      `${newLockState ? 'Khóa' : 'Mở khóa'} tài khoản ${updated.HoTen} (${updated.NhanVienID})`
    );

    const { MatKhau: _, ...safe } = updated;
    return res.json(safe);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. CHAMCONG (ATTENDANCE) ROUTES
// ==========================================

app.get('/api/chamcong', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { date, month, trangThai, nhanVienId } = req.query as Record<string, string>;

  // Security Check: If non-admin, strictly enforce nhanVienId = user.NhanVienID
  const targetNhanVienId = user.Quyen === 'Admin' ? nhanVienId : user.NhanVienID;

  const records = dbService.getChamCongList({
    date,
    month,
    nhanVienId: targetNhanVienId,
    trangThai,
  });

  // Keep large base64 photos out of list responses; fetch them only when opened.
  return res.json(records.map(({ AnhCheckIn, AnhCheckOut, ...record }) => ({
    ...record,
    HasCheckInPhoto: Boolean(AnhCheckIn),
    HasCheckOutPhoto: Boolean(AnhCheckOut),
  })));
});

app.get('/api/chamcong/:id/photos', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const record = dbService.getChamCongPhotos(req.params.id);
    if (!record) return res.status(404).json({ error: 'Không tìm thấy bản ghi chấm công.' });
    const attendance = dbService.getChamCongList().find((item) => item.ChamCongID === req.params.id);
    if (!attendance) return res.status(404).json({ error: 'Không tìm thấy bản ghi chấm công.' });
    if (user.Quyen !== 'Admin' && attendance.NhanVienID !== user.NhanVienID) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh chấm công này.' });
    }
    const [AnhCheckIn, AnhCheckOut] = await Promise.all([
      getAttendancePhotoDataUrl(record.AnhCheckIn || ''),
      getAttendancePhotoDataUrl(record.AnhCheckOut || ''),
    ]);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ AnhCheckIn, AnhCheckOut });
  } catch (error: any) {
    console.error('[ATTENDANCE] Photo read failed:', error);
    return res.status(502).json({ error: error.message || 'Không tải được ảnh chấm công.' });
  }
});

app.post('/api/chamcong/migrate-photos', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const records = dbService.getChamCongList({ date: req.body?.date, month: req.body?.month });
    const limit = Math.min(Math.max(Number(req.body?.limit) || 10, 1), 20);
    let scanned = 0;
    let migrated = 0;
    let failed = 0;
    const errors: Array<{ id: string; field: string; error: string }> = [];
    for (const item of records) {
      if (migrated >= limit) break;
      const photos = dbService.getChamCongPhotos(item.ChamCongID);
      if (!photos) continue;
      for (const field of ['AnhCheckIn', 'AnhCheckOut'] as const) {
        const value = photos[field] || '';
        if (!value.startsWith('data:image/')) continue;
        scanned++;
        try {
          const date = String(item.Ngay || new Date().toISOString().slice(0, 10));
          const uploaded = await uploadAttendancePhoto(value, `${field.toLowerCase()}-${item.NhanVienID}-${item.ChamCongID}.jpg`, date);
          const updated = dbService.updateChamCongPhotos(item.ChamCongID, { [field]: uploaded.photoRef });
          if (!updated) throw new Error('Không tìm thấy bản ghi chấm công sau khi upload.');
          await dbService.saveAndVerify();
          migrated++;
          photos[field] = uploaded.photoRef;
        } catch (error: any) {
          failed++;
          errors.push({ id: item.ChamCongID, field, error: error?.message || String(error) });
          console.error('[ATTENDANCE] Legacy photo migration failed:', item.ChamCongID, field, error);
        }
      }
      if (migrated >= limit) break;
    }
    return res.json({ scanned, migrated, failed, remainingInSelection: records.reduce((count, item) => {
      const p = dbService.getChamCongPhotos(item.ChamCongID);
      return count + Number(Boolean(p?.AnhCheckIn?.startsWith('data:image/'))) + Number(Boolean(p?.AnhCheckOut?.startsWith('data:image/')));
    }, 0), errors });
  } catch (error: any) {
    console.error('[ATTENDANCE] Legacy photo migration batch failed:', error);
    return res.status(500).json({ error: error?.message || 'Không thể chuyển ảnh chấm công cũ.' });
  }
});

app.delete('/api/chamcong/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user!.Quyen !== 'Admin') {
    return res.status(403).json({ error: 'Chỉ Admin mới có quyền xóa chấm công.' });
  }
  try {
    const deleted = dbService.deleteChamCong(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy bản ghi chấm công.' });
    return res.json({ message: 'Đã xóa bản ghi chấm công.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể xóa bản ghi chấm công.' });
  }
});

app.put('/api/chamcong/:id/review-explanation', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const decision = req.body?.decision;
    if (!['Chấp nhận', 'Không chấp nhận'].includes(decision)) {
      return res.status(400).json({ error: 'Kết quả xét duyệt không hợp lệ.' });
    }
    const record = dbService.reviewChamCong(req.params.id, decision, String(req.body?.note || '').slice(0, 1000), req.user!);
    if (!record) return res.status(404).json({ error: 'Không tìm thấy bản ghi chấm công.' });
    return res.json({ message: 'Đã lưu kết quả xét duyệt giải trình.', record });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể duyệt giải trình.' });
  }
});

app.get('/api/chamcong/today', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const todayStr = `${get('year')}-${get('month')}-${get('day')}`;

  if (user.Quyen === 'Admin') {
    const records = dbService.getChamCongList({ date: todayStr });
    return res.json(records);
  } else {
    const records = dbService.getChamCongList({ date: todayStr, nhanVienId: user.NhanVienID });
    return res.json(records[0] || null);
  }
});

app.post('/api/chamcong/checkin', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { anh, gps, ghiChu, deviceTime, deviceTimeZone } = req.body;
    if (!anh) {
      return res.status(400).json({ error: 'Yêu cầu chụp ảnh chân dung khi Check-in.' });
    }
    if (!gps) {
      return res.status(400).json({ error: 'Yêu cầu vị trí GPS khi Check-in.' });
    }

    const attendanceDate = deviceTime && !Number.isNaN(new Date(deviceTime).getTime())
      ? new Intl.DateTimeFormat('en-CA', { timeZone: deviceTimeZone || process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(deviceTime))
      : new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const storedPhoto = await uploadAttendancePhoto(String(anh), `checkin-${req.user!.NhanVienID}-${attendanceDate}.jpg`, attendanceDate);
    const record = dbService.checkIn(req.user!, {
      anh: storedPhoto.photoRef,
      gps,
      ghiChu,
      deviceTime,
      deviceTimeZone,
    });

    return res.json({
      message: 'Check-in thành công!',
      record,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/chamcong/checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { anh, gps, ghiChu, deviceTime, deviceTimeZone } = req.body;
    if (!anh) {
      return res.status(400).json({ error: 'Yêu cầu chụp ảnh chân dung khi Check-out.' });
    }
    if (!gps) {
      return res.status(400).json({ error: 'Yêu cầu vị trí GPS khi Check-out.' });
    }

    const attendanceDate = deviceTime && !Number.isNaN(new Date(deviceTime).getTime())
      ? new Intl.DateTimeFormat('en-CA', { timeZone: deviceTimeZone || process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(deviceTime))
      : new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const storedPhoto = await uploadAttendancePhoto(String(anh), `checkout-${req.user!.NhanVienID}-${attendanceDate}.jpg`, attendanceDate);
    const record = dbService.checkOut(req.user!, {
      anh: storedPhoto.photoRef,
      gps,
      ghiChu,
      deviceTime,
      deviceTimeZone,
    });

    return res.json({
      message: 'Check-out thành công!',
      record,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// QUẢN LÝ NGHIỆP VỤ LIÊN KẾT
// ==========================================
// Lightweight report payload: omit receipt photos and unrelated fields so the
// analytics screen does not download large base64 images for every receipt.
app.get('/api/reports/contracts-revenue', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const startedAt = Date.now();
  const records = dbService.getQuanLyRecords();
  const contractRecords = records.filter((record) => record.Module === 'HOP_DONG');
  const contractCodes = new Set<string>();
  const contractIds = new Set<string>();

  const contracts = contractRecords.map((record) => {
    const data = record.DuLieu || {};
    const code = String(data.MaHopDong || record.QuanLyID || '');
    contractIds.add(String(record.QuanLyID));
    if (code) contractCodes.add(code);
    return {
      QuanLyID: record.QuanLyID,
      Module: record.Module,
      TaoLuc: record.TaoLuc,
      DuLieu: {
        MaHopDong: data.MaHopDong,
        KhachHang: data.KhachHang,
        GoiDichVu: data.GoiDichVu,
        TenGoi: data.TenGoi,
        NgayKy: data.NgayKy,
        NgayTao: data.NgayTao,
        TongGiaTri: data.TongGiaTri,
        GiaGoiBanDau: data.GiaGoiBanDau,
        TrangThai: data.TrangThai,
      },
    };
  });

  // Only send receipts linked to one of the contracts in this report.
  const receipts = records
    .filter((record) => record.Module === 'THU_CHI')
    .filter((record) => {
      const data = record.DuLieu || {};
      if (String(data.Loai || '').toUpperCase() !== 'THU') return false;
      const contractCode = String(data.HopDongID || data.MaHopDong || '');
      const linkedContractId = String(data.HopDongQuanLyID || '');
      return (contractCode && contractCodes.has(contractCode)) ||
        (linkedContractId && contractIds.has(linkedContractId));
    })
    .map((record) => {
      const data = record.DuLieu || {};
      return {
        QuanLyID: record.QuanLyID,
        Module: record.Module,
        TaoLuc: record.TaoLuc,
        DuLieu: {
          Loai: data.Loai,
          TrangThaiDuyet: data.TrangThaiDuyet,
          HopDongID: data.HopDongID,
          MaHopDong: data.MaHopDong,
          HopDongQuanLyID: data.HopDongQuanLyID,
          SoTien: data.SoTien,
          Ngay: data.Ngay,
        },
      };
    });

  const elapsedMs = Date.now() - startedAt;
  console.info('[REPORTS] contracts-revenue', JSON.stringify({
    elapsedMs,
    totalRecordsScanned: records.length,
    contractCount: contracts.length,
    matchedReceiptCount: receipts.length,
  }));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Server-Timing', `report;dur=${elapsedMs}`);
  return res.json({ contracts, receipts });
});

app.post('/api/inventory/upload-image', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await uploadInventoryImage(String(req.body?.dataUrl || ''), String(req.body?.fileName || 'bridal-image.jpg'), String(req.body?.folderKey || 'dresses'));
    return res.status(201).json(result);
  } catch (error: any) {
    console.error('[INVENTORY] Google Drive upload failed:', error);
    return res.status(400).json({ error: error.message || 'Không thể tải ảnh lên Google Drive.' });
  }
});

// Isolated bridal inventory API. Inventory records are stored in their own Firestore collections.
app.get('/api/inventory/items', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await inventoryService.list({
      limit: Number(req.query.limit) || 25,
      cursor: String(req.query.cursor || ''),
      category: String(req.query.category || ''),
      status: String(req.query.status || ''),
      q: String(req.query.q || ''),
    });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(result);
  } catch (error: any) {
    console.error('[INVENTORY] List failed:', error);
    return res.status(500).json({ error: error.message || 'Không thể tải danh sách kho.' });
  }
});

app.get('/api/inventory/items/:qrCode', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const item = await inventoryService.get(String(req.params.qrCode || '').toUpperCase());
    if (!item) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
    return res.json(item);
  } catch (error: any) {
    console.error('[INVENTORY] Detail failed:', error);
    return res.status(500).json({ error: 'Không thể tải hồ sơ sản phẩm.' });
  }
});

app.get('/api/inventory/items/:qrCode/history', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const item = await inventoryService.get(String(req.params.qrCode || '').toUpperCase());
    if (!item) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
    return res.json(await inventoryService.history(item.id));
  } catch (error: any) {
    console.error('[INVENTORY] History failed:', error);
    return res.status(500).json({ error: 'Không thể tải lịch sử sản phẩm.' });
  }
});

app.post('/api/inventory/items', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const item = await inventoryService.create(req.body || {}, req.user!.HoTen);
    return res.status(201).json(item);
  } catch (error: any) {
    console.error('[INVENTORY] Create failed:', error);
    return res.status(400).json({ error: error.message || 'Không thể tạo sản phẩm.' });
  }
});

app.put('/api/inventory/items/:qrCode', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const item = await inventoryService.update(String(req.params.qrCode || '').toUpperCase(), req.body || {}, req.user!.HoTen);
    return res.json(item);
  } catch (error: any) {
    console.error('[INVENTORY] Update failed:', error);
    return res.status(400).json({ error: error.message || 'Không thể cập nhật sản phẩm.' });
  }
});

app.delete('/api/inventory/items/:qrCode', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await inventoryService.delete(String(req.params.qrCode || '').toUpperCase(), req.user!.HoTen);
    return res.json(result);
  } catch (error: any) {
    console.error('[INVENTORY] Delete failed:', error);
    return res.status(400).json({ error: error.message || 'Không thể xóa sản phẩm.' });
  }
});

// ==========================================
// BRIDAL INVENTORY (ISOLATED FIRESTORE COLLECTION)
// ==========================================
app.get('/api/vay-cuoi', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit || 30);
    const cursor = String(req.query.cursor || '');
    const result = await dbService.listVayCuoiItems(limit, cursor || undefined);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(result);
  } catch (err: any) {
    return res.status(503).json({ error: err.message || 'Không thể tải kho sản phẩm.' });
  }
});

app.get('/api/vay-cuoi/qr/:maQR', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const item = await dbService.getVayCuoiItemByQr(String(req.params.maQR || ''));
    if (!item) return res.status(404).json({ error: 'Không tìm thấy mã QR sản phẩm.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(item);
  } catch (err: any) {
    return res.status(503).json({ error: err.message || 'Không thể tra cứu mã QR.' });
  }
});

app.post('/api/vay-cuoi', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const payload = { ...(req.body || {}) };
    if (payload.AnhUrl && !/^https?:\/\//i.test(String(payload.AnhUrl))) {
      return res.status(400).json({ error: 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://.' });
    }
    const item = await dbService.createVayCuoiItem(payload, req.user!.HoTen);
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể thêm sản phẩm vào kho.' });
  }
});

app.put('/api/vay-cuoi/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const payload = { ...(req.body || {}) };
    if (payload.AnhUrl && !/^https?:\/\//i.test(String(payload.AnhUrl))) {
      return res.status(400).json({ error: 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://.' });
    }
    const item = await dbService.updateVayCuoiItem(String(req.params.id || ''), payload, req.user!.HoTen);
    return res.json(item);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể cập nhật sản phẩm.' });
  }
});

app.get('/api/quan-ly', authenticateToken, (req: AuthRequest, res: Response) => {
  const module = req.query.module as any;
  let records = dbService.getQuanLyRecords(module || undefined);

  // Employees must request a specific module and may only read their own permitted records.
  if (!module || !['CONG_VIEC', 'THU_CHI', 'HOP_DONG', 'NGHI_PHEP', 'THU_VAY', 'LICH_CUOI'].includes(module)) {
    return res.status(400).json({ error: 'Vui lòng chọn phân hệ dữ liệu hợp lệ.' });
  }
  if (req.user!.Quyen !== 'Admin') {
    if (module === 'THU_VAY') return res.status(403).json({ error: 'Chỉ Admin được xem hồ sơ thử và chọn váy.' });
    if (module === 'LICH_CUOI' && req.user!.Quyen === 'Freelancer') return res.status(403).json({ error: 'Tài khoản Freelancer không có quyền xem lịch điều phối.' });
    if (!['THU_CHI', 'HOP_DONG', 'NGHI_PHEP', 'LICH_CUOI'].includes(module)) {
      return res.status(403).json({ error: 'Bạn không có quyền xem phân hệ dữ liệu này.' });
    }
    records = records.filter((record) => record.DuLieu?.NhanVienID === req.user!.NhanVienID);
  }

  return res.json(records);
});

app.post('/api/quan-ly', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { module, data } = req.body || {};

    if (!['CONG_VIEC', 'THU_CHI', 'HOP_DONG', 'NGHI_PHEP', 'THU_VAY', 'LICH_CUOI'].includes(module)) {
      return res.status(400).json({ error: 'Loại dữ liệu không hợp lệ.' });
    }
    if (module === 'THU_VAY' && req.user!.Quyen !== 'Admin') return res.status(403).json({ error: 'Chỉ Admin được tạo hồ sơ thử và chọn váy.' });
    if (module === 'LICH_CUOI' && req.user!.Quyen === 'Freelancer') return res.status(403).json({ error: 'Tài khoản Freelancer không có quyền tạo lịch điều phối.' });
    if (req.user!.Quyen !== 'Admin' && !['THU_CHI', 'HOP_DONG', 'NGHI_PHEP', 'LICH_CUOI'].includes(module)) {
      return res.status(403).json({ error: 'Bạn không có quyền tạo dữ liệu nghiệp vụ này.' });
    }

    const payload = { ...(data || {}) };

    if (module === 'NGHI_PHEP') {
      const from = String(payload.TuNgay || '');
      const to = String(payload.DenNgay || '');
      const reason = String(payload.LyDo || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from || !reason) {
        return res.status(400).json({ error: 'Vui lòng chọn ngày nghỉ hợp lệ và nhập lý do.' });
      }
      if (req.user!.Quyen !== 'Admin') {
        payload.NhanVienID = req.user!.NhanVienID;
        payload.HoTen = req.user!.HoTen;
        payload.TrangThai = 'Chờ duyệt';
      } else {
        payload.NhanVienID = payload.NhanVienID || req.user!.NhanVienID;
        payload.HoTen = payload.HoTen || req.user!.HoTen;
        payload.TrangThai = payload.TrangThai || 'Đã duyệt';
      }
      payload.NgayGui = new Date().toISOString();
      payload.LoaiNghi = String(payload.LoaiNghi || 'Nghỉ phép năm');
    }

    if (module === 'HOP_DONG') {
      if (!['HP_DONG_XOAI', 'HP_BINH_LONG', 'HP_LUMA'].includes(String(payload.ChiNhanh || ''))) return res.status(400).json({ error: 'Vui lòng chọn chi nhánh Đồng Xoài, Bình Long hoặc Luma.' });
      if (!String(payload.KhachHang || '').trim() || !String(payload.SDT || '').trim() ||
          !String(payload.GoiDichVu || '').trim() || !Number.isFinite(Number(payload.TongGiaTri)) ||
          Number(payload.TongGiaTri) <= 0) {
        return res.status(400).json({ error: 'Vui lòng nhập khách hàng, số điện thoại, gói dịch vụ và giá trị hợp đồng hợp lệ.' });
      }
      if (req.user!.Quyen !== 'Admin') {
        payload.NhanVienID = req.user!.NhanVienID;
        payload.NhanVien = req.user!.HoTen;
        payload.TrangThai = 'Chờ admin duyệt';
      } else if (!payload.TrangThai) {
        payload.TrangThai = 'Đã xác nhận';
      }
      const existingContracts = dbService.getQuanLyRecords('HOP_DONG');
      if (!payload.MaHopDong) {
        const usedCodes = new Set(existingContracts.map((x) => String(x.DuLieu?.MaHopDong || '')));
        let nextNumber = 1;
        while (usedCodes.has(`HP${String(nextNumber).padStart(3, '0')}`)) nextNumber += 1;
        payload.MaHopDong = `HP${String(nextNumber).padStart(3, '0')}`;
      }
      const duplicateContract = existingContracts.some((x) => x.DuLieu?.MaHopDong === payload.MaHopDong);
      if (duplicateContract) return res.status(409).json({ error: 'Mã hợp đồng đã tồn tại. Vui lòng thử lại.' });
      payload.NgayTao = payload.NgayTao || new Date().toISOString();
      const basePrice = Number(payload.GiaGoiBanDau ?? payload.TongGiaTri);
      const directDiscount = Number(payload.GiamGiaTrucTiep || 0);
      const discountRate = Number(payload.ChietKhauPhanTram || 0);
      const promoDiscount = Number(payload.KhuyenMaiBoSung || 0);
      const surcharge = Number(payload.PhuThuDichVu || 0);
      const percentageDiscount = Math.round(basePrice * discountRate / 100);
      if (basePrice <= 0 || directDiscount < 0 || discountRate < 0 || discountRate > 100 || promoDiscount < 0 || surcharge < 0 || directDiscount + percentageDiscount + promoDiscount > basePrice) {
        return res.status(400).json({ error: 'Các khoản giảm trừ không hợp lệ hoặc vượt giá gói ban đầu.' });
      }
      payload.GiaGoiBanDau = basePrice;
      payload.TienChietKhau = percentageDiscount;
      payload.TongGiamTru = directDiscount + percentageDiscount + promoDiscount;
      payload.TongGiaTri = basePrice - payload.TongGiamTru + surcharge;
      payload.TienDatCoc = Number(payload.TienDatCoc || 0);
      if (!Number.isFinite(payload.TienDatCoc) || payload.TienDatCoc < 0 || payload.TienDatCoc > payload.TongGiaTri) {
        return res.status(400).json({ error: 'Tiền cọc phải từ 0 đến tổng giá trị hợp đồng.' });
      }
      payload.LichThanhToan = Array.isArray(payload.LichThanhToan) ? payload.LichThanhToan.map((p: any) => ({ ...p, SoTienDuKien: Math.max(0, Number(p.SoTienDuKien || 0)) })) : [];
      payload.TrangThai = req.user!.Quyen === 'Admin' ? (payload.TrangThai || 'Đã xác nhận') : 'Chờ admin duyệt';
      payload.LichSuTrangThai = [{ TrangThai: payload.TrangThai, ThoiGian: new Date().toISOString(), NguoiThucHien: req.user!.HoTen, GhiChu: 'Tạo hợp đồng' }];
      delete payload.DaThu;
      delete payload.CongNo;
    }

    if (module === 'LICH_CUOI') {
      const allowedServices = ['Chụp ảnh cưới', 'Chụp ảnh cổng', 'Ngày cưới', 'Giao album', 'Makeup ngày cưới', 'Chụp phóng sự cưới', 'Thử váy cưới'];
      if (!allowedServices.includes(String(payload.DichVu || ''))) return res.status(400).json({ error: 'Loại dịch vụ lịch cưới không hợp lệ.' });
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(payload.Ngay || '')) || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(payload.Gio || ''))) return res.status(400).json({ error: 'Vui lòng chọn ngày và giờ hợp lệ.' });
      if (!String(payload.KhachHang || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập tên khách hàng.' });
      const duration = Math.max(30, Math.min(1440, Number(payload.ThoiLuong || 180)));
      payload.ThoiLuong = duration;
      payload.TrangThai = payload.TrangThai || 'Chờ xác nhận';
      if (!['Chờ xác nhận', 'Đã xác nhận', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'].includes(String(payload.TrangThai))) return res.status(400).json({ error: 'Trạng thái lịch không hợp lệ.' });
      const staffIds = [payload.ThoChupID, payload.MakeupID, payload.NguoiPhuTrachID].filter(Boolean).map(String);
      for (const staffId of staffIds) if (!dbService.findNhanVienById(staffId)) return res.status(400).json({ error: 'Nhân viên được phân công không tồn tại.' });
      if (payload.ThoChupID && payload.ThoChupID === payload.MakeupID) return res.status(400).json({ error: 'Không thể phân công một người vừa chụp vừa makeup cùng lịch.' });
      const start = Number(String(payload.Gio).slice(0,2))*60 + Number(String(payload.Gio).slice(3,5));
      const assigned = [payload.ThoChupID, payload.MakeupID].filter(Boolean);
      const conflict = dbService.getQuanLyRecords('LICH_CUOI').find((r) => r.DuLieu?.Ngay === payload.Ngay && r.DuLieu?.TrangThai !== 'Đã hủy' && [r.DuLieu?.ThoChupID, r.DuLieu?.MakeupID].some((id: string) => assigned.includes(id)) && start < (Number(String(r.DuLieu?.Gio || '00:00').slice(0,2))*60 + Number(String(r.DuLieu?.Gio || '00:00').slice(3,5))) + Number(r.DuLieu?.ThoiLuong || 180) && (Number(String(r.DuLieu?.Gio || '00:00').slice(0,2))*60 + Number(String(r.DuLieu?.Gio || '00:00').slice(3,5))) < start + duration);
      if (conflict) return res.status(409).json({ error: `Nhân viên đã có lịch ${conflict.DuLieu?.DichVu} lúc ${conflict.DuLieu?.Gio} ngày ${conflict.DuLieu?.Ngay}.` });
      payload.NguoiTaoID = req.user!.NhanVienID;
      payload.NguoiTao = req.user!.HoTen;
    }

    if (module === 'THU_CHI') {
      if (!['HP_DONG_XOAI', 'HP_BINH_LONG', 'HP_LUMA'].includes(String(payload.ChiNhanh || ''))) return res.status(400).json({ error: 'Vui lòng chọn chi nhánh Đồng Xoài, Bình Long hoặc Luma.' });
      // Người lập phiếu luôn lấy từ tài khoản đang đăng nhập, kể cả Admin.
      payload.NhanVienID = req.user!.NhanVienID;
      payload.NhanVien = req.user!.HoTen || req.user!.TenDangNhap || req.user!.NhanVienID || 'Chưa xác định';
      if (req.user!.Quyen !== 'Admin') {
        payload.TrangThaiDuyet = 'Chờ Admin duyệt';
      } else if (!payload.TrangThaiDuyet) {
        payload.TrangThaiDuyet = 'Đã duyệt';
      }

      payload.Loai = String(payload.Loai || '').toUpperCase();
      if (!['THU', 'CHI'].includes(payload.Loai)) {
        return res.status(400).json({ error: 'Phiếu phải là THU hoặc CHI.' });
      }
      if (!payload.SoTien || Number(payload.SoTien) <= 0) {
        return res.status(400).json({ error: 'Số tiền phải lớn hơn 0.' });
      }
    }

    const record = dbService.createQuanLyRecord(module, payload, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    if (module === 'LICH_CUOI') {
      const assignedIds = Array.from(new Set([payload.ThoChupID, payload.MakeupID, payload.NguoiPhuTrachID].filter(Boolean).map(String)));
      for (const staffId of assignedIds) dbService.addNotification('Lịch cưới mới được phân công', `${payload.DichVu} – ${payload.KhachHang}, ngày ${payload.Ngay} lúc ${payload.Gio}. Vui lòng mở Lịch cưới & Điều phối để xác nhận.`, 'info', staffId);
      dbService.addNotification('Lịch cưới vừa được tạo', `${payload.DichVu} – ${payload.KhachHang}, ngày ${payload.Ngay} lúc ${payload.Gio}.`, 'info');
    }
    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể tạo dữ liệu.' });
  }
});

app.put('/api/quan-ly/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const current = dbService.getQuanLyRecords().find((x) => x.QuanLyID === req.params.id);
    if (!current) return res.status(404).json({ error: 'Không tìm thấy dữ liệu.' });
    if (current.Module === 'LICH_CUOI') {
      if (req.user!.Quyen === 'Freelancer') return res.status(403).json({ error: 'Tài khoản Freelancer không có quyền sửa lịch điều phối.' });
    } else if (req.user!.Quyen !== 'Admin') {
      return res.status(403).json({ error: 'Chỉ Admin được cập nhật dữ liệu này.' });
    }
    const changes = { ...(req.body?.data || {}) };
    if (current.Module === 'LICH_CUOI') {
      const merged = { ...current.DuLieu, ...changes };
      const allowedServices = ['Chụp ảnh cưới', 'Chụp ảnh cổng', 'Ngày cưới', 'Giao album', 'Makeup ngày cưới', 'Chụp phóng sự cưới', 'Thử váy cưới'];
      if (!allowedServices.includes(String(merged.DichVu || '')) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(merged.Ngay || '')) || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(merged.Gio || '')) || !String(merged.KhachHang || '').trim()) {
        return res.status(400).json({ error: 'Thông tin lịch cưới chưa hợp lệ.' });
      }
      if (!['Chờ xác nhận', 'Đã xác nhận', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'].includes(String(merged.TrangThai))) return res.status(400).json({ error: 'Trạng thái lịch không hợp lệ.' });
      const duration = Math.max(30, Math.min(1440, Number(merged.ThoiLuong || 180)));
      merged.ThoiLuong = duration;
      const assignedIds = [merged.ThoChupID, merged.MakeupID, merged.NguoiPhuTrachID].filter(Boolean).map(String);
      for (const staffId of assignedIds) if (!dbService.findNhanVienById(staffId)) return res.status(400).json({ error: 'Nhân viên được phân công không tồn tại.' });
      if (merged.ThoChupID && merged.ThoChupID === merged.MakeupID) return res.status(400).json({ error: 'Không thể phân công một người vừa chụp vừa makeup cùng lịch.' });
      const start = Number(String(merged.Gio).slice(0,2))*60 + Number(String(merged.Gio).slice(3,5));
      const assigned = [merged.ThoChupID, merged.MakeupID].filter(Boolean);
      const conflict = dbService.getQuanLyRecords('LICH_CUOI').find((r) => r.QuanLyID !== current.QuanLyID && r.DuLieu?.Ngay === merged.Ngay && r.DuLieu?.TrangThai !== 'Đã hủy' && [r.DuLieu?.ThoChupID, r.DuLieu?.MakeupID].some((id: string) => assigned.includes(id)) && start < (Number(String(r.DuLieu?.Gio || '00:00').slice(0,2))*60 + Number(String(r.DuLieu?.Gio || '00:00').slice(3,5))) + Number(r.DuLieu?.ThoiLuong || 180) && (Number(String(r.DuLieu?.Gio || '00:00').slice(0,2))*60 + Number(String(r.DuLieu?.Gio || '00:00').slice(3,5))) < start + duration);
      if (conflict) return res.status(409).json({ error: `Nhân viên đã có lịch ${conflict.DuLieu?.DichVu} lúc ${conflict.DuLieu?.Gio} ngày ${conflict.DuLieu?.Ngay}.` });
      changes.ThoiLuong = duration;
    }

    if (current.Module === 'HOP_DONG') {
      delete changes.DaThu;
      delete changes.CongNo;
      const merged = { ...current.DuLieu, ...changes };
      const basePrice = Number(merged.GiaGoiBanDau ?? merged.TongGiaTri);
      const directDiscount = Number(merged.GiamGiaTrucTiep || 0);
      const discountRate = Number(merged.ChietKhauPhanTram || 0);
      const promoDiscount = Number(merged.KhuyenMaiBoSung || 0);
      const surcharge = Number(merged.PhuThuDichVu || 0);
      const percentageDiscount = Math.round(basePrice * discountRate / 100);
      if (basePrice <= 0 || directDiscount < 0 || discountRate < 0 || discountRate > 100 || promoDiscount < 0 || surcharge < 0 || directDiscount + percentageDiscount + promoDiscount > basePrice) {
        return res.status(400).json({ error: 'Các khoản giảm trừ không hợp lệ hoặc vượt giá gói ban đầu.' });
      }
      changes.GiaGoiBanDau = basePrice;
      changes.TienChietKhau = percentageDiscount;
      changes.TongGiamTru = directDiscount + percentageDiscount + promoDiscount;
      changes.TongGiaTri = basePrice - changes.TongGiamTru + surcharge;
      const deposit = Number(merged.TienDatCoc || 0);
      if (!Number.isFinite(deposit) || deposit < 0 || deposit > changes.TongGiaTri) {
        return res.status(400).json({ error: 'Tiền cọc phải từ 0 đến tổng giá trị hợp đồng.' });
      }
      changes.TienDatCoc = deposit;
      if (changes.LichThanhToan !== undefined && (!Array.isArray(changes.LichThanhToan) || changes.LichThanhToan.some((p: any) => Number(p.SoTienDuKien || 0) < 0))) {
        return res.status(400).json({ error: 'Lịch thanh toán không hợp lệ.' });
      }
      if (changes.MaHopDong && changes.MaHopDong !== current.DuLieu?.MaHopDong) {
        return res.status(400).json({ error: 'Không được thay đổi mã hợp đồng sau khi tạo.' });
      }
      const nextStatus = changes.TrangThai;
      if (nextStatus && nextStatus !== current.DuLieu?.TrangThai) {
        const allowed = ['Nháp', 'Chờ admin duyệt', 'Đã xác nhận', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
        if (!allowed.includes(nextStatus)) return res.status(400).json({ error: 'Trạng thái hợp đồng không hợp lệ.' });
        if (nextStatus === 'Đã hủy' && !String(changes.LyDoHuy || current.DuLieu?.LyDoHuy || '').trim()) {
          return res.status(400).json({ error: 'Cần ghi lý do hủy hợp đồng.' });
        }
        changes.LichSuTrangThai = [
          ...(Array.isArray(current.DuLieu?.LichSuTrangThai) ? current.DuLieu.LichSuTrangThai : []),
          { TrangThai: nextStatus, ThoiGian: new Date().toISOString(), NguoiThucHien: req.user!.HoTen, GhiChu: changes.LyDoTuChoi || changes.LyDoHuy || '' },
        ];
      }
    }

    if (current.Module === 'NGHI_PHEP') {
      const status = changes.TrangThai;
      if (status && !['Chờ duyệt', 'Đã duyệt', 'Từ chối'].includes(status)) {
        return res.status(400).json({ error: 'Trạng thái đơn nghỉ phép không hợp lệ.' });
      }
      if (status && current.DuLieu?.TrangThai !== 'Chờ duyệt' && status !== current.DuLieu?.TrangThai) {
        return res.status(409).json({ error: 'Đơn nghỉ phép này đã được xử lý, không thể duyệt lại.' });
      }
      if (status && status !== current.DuLieu?.TrangThai) {
        changes.NgayXuLy = new Date().toISOString();
        changes.NguoiXuLy = req.user!.HoTen;
      }
      if (changes.GhiChuAdmin !== undefined) changes.GhiChuAdmin = String(changes.GhiChuAdmin).slice(0, 1000);
    }

    if (current.Module === 'THU_CHI' && changes.TrangThaiDuyet === 'Đã duyệt' && current.DuLieu?.TrangThaiDuyet !== 'Đã duyệt') {
      changes.NgayDuyet = new Date().toISOString();
      changes.NguoiDuyet = req.user!.HoTen;
    }

    const record = dbService.updateQuanLyRecord(req.params.id, changes, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    if (current.Module === 'LICH_CUOI') {
      const merged = { ...current.DuLieu, ...changes };
      const assignedIds = Array.from(new Set([merged.ThoChupID, merged.MakeupID, merged.NguoiPhuTrachID].filter(Boolean).map(String)));
      for (const staffId of assignedIds) dbService.addNotification('Lịch cưới được cập nhật', `${merged.DichVu} – ${merged.KhachHang}, ngày ${merged.Ngay} lúc ${merged.Gio}. Nội dung vừa được điều phối cập nhật.`, 'warning', staffId);
    }
    if (current.Module === 'NGHI_PHEP' && changes.TrangThai && changes.TrangThai !== current.DuLieu?.TrangThai) {
      const approved = changes.TrangThai === 'Đã duyệt';
      dbService.addNotification(
        approved ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép bị từ chối',
        approved
          ? `Đơn nghỉ phép từ ${current.DuLieu?.TuNgay} đến ${current.DuLieu?.DenNgay} đã được duyệt.`
          : `Đơn nghỉ phép từ ${current.DuLieu?.TuNgay} đến ${current.DuLieu?.DenNgay} bị từ chối. ${changes.GhiChuAdmin || ''}`,
        approved ? 'success' : 'warning',
        String(current.DuLieu?.NhanVienID || '')
      );
    }
    return res.json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể cập nhật dữ liệu.' });
  }
});

app.delete('/api/quan-ly/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    return res.json(dbService.deleteQuanLyRecord(req.params.id, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    }));
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể xóa dữ liệu.' });
  }
});

// ==========================================
// // ==========================================
// 4 LUONG (PAYROLL) ROUTES
// ==========================================

app.get('/api/luong', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { thang, trangThai, nhanVienId } = req.query as Record<string, string>;

  // Security Check: Non-admins can only see their own salary records
  const targetNhanVienId = user.Quyen === 'Admin' ? nhanVienId : user.NhanVienID;

  const list = dbService.getLuongList({
    thang,
    trangThai,
    nhanVienId: targetNhanVienId,
  });

  return res.json(list);
});

app.get('/api/luong/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const luong = dbService.findLuongById(req.params.id);

  if (!luong) {
    return res.status(404).json({ error: 'Không tìm thấy bảng lương.' });
  }

  // Security Check: Non-admin can only see own payroll
  if (user.Quyen !== 'Admin' && luong.NhanVienID !== user.NhanVienID) {
    return res.status(403).json({ error: 'Bạn không có quyền xem lương của người khác.' });
  }

  return res.json(luong);
});

// TẠO BẢNG LƯƠNG THÁNG - WITH ANTI-DUPLICATE CHECK
app.post('/api/luong/tao-thang', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { thang } = req.body;
    let targetMonth = thang;

    if (!targetMonth) {
      const now = new Date();
      targetMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }

    const result = dbService.taoBangLuongThang(targetMonth, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });

    return res.json({
      message: `Đã tạo bảng lương cho ${result.createdCount} nhân viên. ${result.skippedCount > 0 ? `Đã bỏ qua ${result.skippedCount} nhân viên vì đã có bảng lương.` : ''}`,
      ...result,
      thang: targetMonth,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Delete an unpaid, unapproved salary row only; preserve approved/paid payroll history.
app.delete('/api/luong/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const result = dbService.deleteLuong(req.params.id, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Update salary detail
app.put('/api/luong/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.updateLuongDetail(req.params.id, req.body, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// DUYỆT LƯƠNG (Chờ duyệt -> Đã duyệt)
app.post('/api/luong/:id/dong-bo-hoa-hong', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.reconcilePendingPayrollCommissions(req.params.id);
    return res.json({ message: 'Đã đồng bộ hoa hồng theo sổ đã duyệt.', luong: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Không thể đồng bộ hoa hồng.' });
  }
});

app.post('/api/luong/:id/duyet', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.duyetLuong(req.params.id, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({
      message: 'Duyệt bảng lương thành công!',
      luong: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// THANH TOÁN LƯƠNG (Đã duyệt -> Đã thanh toán)
app.post('/api/luong/:id/thanh-toan', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.thanhToanLuong(req.params.id, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({
      message: 'Xác nhận thanh toán lương thành công!',
      luong: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. TAM UNG LUONG ROUTES
// ==========================================

app.get('/api/tam-ung', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { thang, nhanVienId } = req.query as Record<string, string>;
  const targetNhanVienId = user.Quyen === 'Admin' ? nhanVienId : user.NhanVienID;
  return res.json(dbService.getTamUngList({ thang, nhanVienId: targetNhanVienId }));
});

app.post('/api/tam-ung/yeu-cau', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.Quyen === 'Admin') return res.status(400).json({ error: 'Admin hãy tạo khoản ứng trực tiếp trong bảng lương.' });
    const created = dbService.createTamUng({ ...req.body, NhanVienID: user.NhanVienID, TrangThai: 'Chờ duyệt' }, { HoTen: user.HoTen, Email: user.Email });
    return res.status(201).json(created);
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

app.post('/api/tam-ung/:id/duyet', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.duyetTamUng(req.params.id, req.body?.approve === true, req.body?.LyDoTuChoi, { HoTen: req.user!.HoTen, Email: req.user!.Email });
    return res.json({ message: updated.TrangThai === 'Đã duyệt' ? 'Đã duyệt yêu cầu ứng lương.' : 'Đã từ chối yêu cầu ứng lương.', tamUng: updated });
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

app.post('/api/tam-ung', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const created = dbService.createTamUng(req.body, { HoTen: req.user!.HoTen, Email: req.user!.Email });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tam-ung/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    dbService.deleteTamUng(req.params.id, { HoTen: req.user!.HoTen, Email: req.user!.Email });
    return res.json({ message: 'Đã xóa khoản tạm ứng.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. HOAHONG (COMMISSION) ROUTES
// ==========================================

app.get('/api/hoahong', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { nhanVienId, trangThai, month } = req.query as Record<string, string>;

  // Security Check: Non-admins can only see their own commissions
  const targetId = user.Quyen === 'Admin' ? nhanVienId : user.NhanVienID;

  const list = dbService.getHoaHongList({
    nhanVienId: targetId,
    trangThai,
    month,
  });

  return res.json(list);
});

app.post('/api/hoahong', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const payload = { ...req.body };
    if (!['HP_DONG_XOAI', 'HP_BINH_LONG', 'HP_LUMA'].includes(String(payload.ChiNhanh || ''))) return res.status(400).json({ error: 'Vui lòng chọn chi nhánh Đồng Xoài, Bình Long hoặc Luma.' });

    // The authenticated server-side account is the only source of truth for
    // employee-submitted claims. Never trust a staff ID cached in the browser:
    // stale tabs/localStorage can otherwise attribute a claim to another person.
    if (user.Quyen !== 'Admin') {
      const submittedEmployeeId = String(payload.NhanVienID || '').trim();
      const authenticatedEmployeeId = String(user.NhanVienID || '').trim();
      if (!authenticatedEmployeeId) {
        return res.status(401).json({
          error: 'Không xác định được mã nhân viên từ phiên đăng nhập. Vui lòng đăng xuất và đăng nhập lại.',
        });
      }
      if (submittedEmployeeId && submittedEmployeeId !== authenticatedEmployeeId) {
        console.warn('[HOAHONG] Replacing stale client employee ID with authenticated identity:', {
          authenticatedEmployeeId,
          submittedEmployeeId,
        });
      }
      payload.NhanVienID = authenticatedEmployeeId;
      payload.TaoBoi = 'Nhân viên';
    } else {
      payload.TaoBoi = payload.TaoBoi || 'Admin';
    }

    const created = dbService.createHoaHong(payload, {
      HoTen: user.HoTen,
      Email: user.Email,
      Quyen: user.Quyen,
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.put('/api/hoahong/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.updateHoaHong(req.params.id, req.body, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({ message: 'Cập nhật phiếu hoa hồng thành công.', hoahong: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/hoahong/:id/duyet', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { dongY } = req.body;
    const updated = dbService.duyetHoaHong(req.params.id, dongY !== false, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({
      message: dongY !== false ? 'Duyệt hoa hồng thành công và đã cộng vào bảng lương.' : 'Đã từ chối hoa hồng.',
      hoahong: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/hoahong/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    dbService.deleteHoaHong(req.params.id, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({ message: 'Xóa bản ghi hoa hồng thành công.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. DASHBOARD & KPIS (THONGKE) & AUDIT
// ==========================================

app.get('/api/thongke', authenticateToken, (req: AuthRequest, res: Response) => {
  dbService.refreshKPIs();
  const raw = dbService.getRawData();
  const user = req.user!;

  if (user.Quyen === 'Admin') {
    return res.json({
      kpis: raw.THONGKE,
      todayChamCong: raw.CHAMCONG.filter((cc) => cc.Ngay === new Date().toISOString().split('T')[0]),
      pendingLuong: raw.LUONG.filter((l) => l.TrangThai === 'Chờ duyệt'),
      paidLuong: raw.LUONG.filter((l) => l.TrangThai === 'Đã thanh toán'),
      // Dashboard needs aggregate commission/payroll figures, not the full
      // commission ledger with receipt photos. Keep the 28MB ledger off the
      // initial dashboard network response.
      approvedCommissionTotal: raw.HOAHONG.reduce((sum, item) =>
        item.TrangThai === 'Đã duyệt' ? sum + (Number(item.SoTienHoaHong) || 0) : sum, 0),
      pendingPayrollTotal: raw.LUONG.reduce((sum, item) =>
        item.TrangThai === 'Chờ duyệt' ? sum + (Number(item.ThucLanh) || 0) : sum, 0),
      automation: automationManager.getStatus(),
    });
  } else {
    // Employee perspective stats
    const myAttendance = raw.CHAMCONG.filter((cc) => cc.NhanVienID === user.NhanVienID);
    const myLuong = raw.LUONG.filter((l) => l.NhanVienID === user.NhanVienID);
    const myHoaHong = raw.HOAHONG.filter((hh) => hh.NhanVienID === user.NhanVienID);

    return res.json({
      tongNgayCong: myAttendance.filter((cc) => cc.CheckIn).length,
      tongHoaHong: myHoaHong.filter((hh) => hh.TrangThai === 'Đã duyệt').reduce((sum, h) => sum + h.SoTienHoaHong, 0),
      luongGanNhat: myLuong[0] || null,
      todayRecord: myAttendance.find((cc) => cc.Ngay === new Date().toISOString().split('T')[0]) || null,
    });
  }
});

app.get('/api/audit-log', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const raw = dbService.getRawData();
  return res.json(raw.AUDIT_LOG);
});

app.get('/api/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const raw = dbService.getRawData();
  // Admin xem toàn bộ thông báo; nhân viên chỉ xem thông báo gắn đúng NhanVienID của mình.
  const list = user.Quyen === 'Admin'
    ? raw.NOTIFICATIONS
    : raw.NOTIFICATIONS.filter((n) => Boolean(n.NhanVienID) && n.NhanVienID === user.NhanVienID);
  return res.json(list);
});

app.put('/api/notifications/mark-read', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const raw = dbService.getRawData();
  raw.NOTIFICATIONS.forEach((n) => {
    // Admin đánh dấu tất cả; nhân viên chỉ đánh dấu các thông báo của chính mình.
    if (user.Quyen === 'Admin' || (Boolean(n.NhanVienID) && n.NhanVienID === user.NhanVienID)) {
      n.DaDoc = true;
    }
  });
  dbService.save();
  return res.json({ message: 'Đã đánh dấu đã đọc' });
});

// ==========================================
// 7. AUTOMATION & CONFIG ROUTES
// ==========================================

app.get('/api/automation/status', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  return res.json(automationManager.getStatus());
});

app.post('/api/automation/run-now', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.body;
    const result = automationManager.runManualMonthlyPayroll(month);
    return res.json({
      message: `Đã chạy automation tạo lương: Tạo mới ${result.createdCount} nhân viên, bỏ qua ${result.skippedCount} nhân viên đã có.`,
      result,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/config', authenticateToken, (_req: AuthRequest, res: Response) => {
  return res.json(dbService.getConfig());
});

app.put('/api/config', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.updateConfig(req.body, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7.5 THEME & VISUAL APP DESIGN ROUTES
// ==========================================

app.get('/api/theme', (_req: Request, res: Response) => {
  return res.json(dbService.getTheme());
});

app.post('/api/theme', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const updated = dbService.updateTheme(req.body);
    dbService.logAudit(
      req.user!.HoTen,
      req.user!.Email,
      'Cập nhật giao diện thiết kế app',
      'Thay đổi nhận diện thương hiệu & màu sắc giao diện trực quan',
      req.ip
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/theme/reset', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const reset = dbService.resetTheme();
    dbService.logAudit(
      req.user!.HoTen,
      req.user!.Email,
      'Khôi phục thiết kế mặc định',
      'Khôi phục giao diện hoàng kim champagne Hanh Pham Bridal ban đầu',
      req.ip
    );
    return res.json(reset);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. BACKUP & EXPORT ROUTES
// ==========================================

app.get('/api/backup/download', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const backup = dbService.backupDatabase();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
  return res.send(JSON.stringify(backup.data, null, 2));
});

app.post('/api/backup/restore', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const incomingData = req.body;
    dbService.restoreDatabase(incomingData, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    return res.json({ message: 'Đã khôi phục cơ sở dữ liệu thành công.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// EXPORT TO CSV WITH UTF-8 BOM
app.get('/api/export/:table', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { table } = req.params;
  const raw = dbService.getRawData();
  const bom = '\uFEFF';
  let csv = '';
  let filename = `HanhPhamBridal_${table}_${new Date().toISOString().split('T')[0]}.csv`;

  if (table === 'nhanvien') {
    csv = ['Mã NV,Họ Tên,Email,Số ĐT,Chức Vụ,Lương Cơ Bản,Ngày Vào Làm,Trạng Thái,Quyền']
      .concat(
        raw.NHANVIEN.map(
          (nv) =>
            `"${nv.NhanVienID}","${nv.TenDangNhap}","${nv.HoTen}","${nv.Email}","${nv.SDT}","${nv.ChucVu}",${nv.LuongCoBan},"${nv.NgayVaoLam}","${nv.TrangThai}","${nv.Quyen}"`
        )
      )
      .join('\n');
  } else if (table === 'chamcong') {
    csv = ['Mã Chấm Công,Mã NV,Họ Tên,Ngày,Giờ Check-in,GPS Check-in,Giờ Check-out,GPS Check-out,Số Giờ Làm,Trạng Thái,Ghi Chú']
      .concat(
        raw.CHAMCONG.map(
          (cc) =>
            `"${cc.ChamCongID}","${cc.NhanVienID}","${cc.HoTen}","${cc.Ngay}","${cc.CheckIn || ''}","${cc.GPSCheckIn || ''}","${cc.CheckOut || ''}","${cc.GPSCheckOut || ''}",${cc.SoGioLam || 0},"${cc.TrangThai}","${cc.GhiChu || ''}"`
        )
      )
      .join('\n');
  } else if (table === 'luong') {
    csv = ['Mã Lương,Mã NV,Họ Tên,Tháng,Lương Cơ Bản,Ngày Công,Số Giờ,Phụ Cấp,Thưởng,Hoa Hồng,Phạt,Tạm Ứng,Tổng Lương,Thực Lãnh,Trạng Thái,Người Duyệt,Người Thanh Toán']
      .concat(
        raw.LUONG.map(
          (l) =>
            `"${l.LuongID}","${l.NhanVienID}","${l.HoTen}","${l.Thang}",${l.LuongCoBan},${l.SoNgayCong},${l.SoGioLam},${l.PhuCap},${l.Thuong},${l.HoaHong},${l.Phat},${l.TamUng},${l.TongLuong},${l.ThucLanh},"${l.TrangThai}","${l.NguoiDuyet || ''}","${l.NguoiThanhToan || ''}"`
        )
      )
      .join('\n');
  } else if (table === 'hoahong') {
    csv = ['Mã Hoa Hồng,Mã NV,Họ Tên,Ngày,Nội Dung Hợp Đồng,Doanh Thu,Tỷ Lệ %,Số Tiền Hoa Hồng,Trạng Thái,Mã Lương']
      .concat(
        raw.HOAHONG.map(
          (hh) =>
            `"${hh.HoaHongID}","${hh.NhanVienID}","${hh.HoTen}","${hh.Ngay}","${hh.NoiDung}",${hh.DoanhThu},${hh.TyLeHoaHong},${hh.SoTienHoaHong},"${hh.TrangThai}","${hh.LuongID || ''}"`
        )
      )
      .join('\n');
  } else {
    return res.status(400).json({ error: 'Loại dữ liệu xuất không hợp lệ' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(bom + csv);
});

// Google Drive OAuth setup. Protect this one-time setup route with a Render secret.
const googleDriveOAuthStates = new Map<string, number>();
function safeSecretEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
app.get('/google-drive/auth', (req: Request, res: Response) => {
  const expected = process.env.GOOGLE_OAUTH_SETUP_SECRET || '';
  if (!expected) return res.status(503).send('Render chưa cấu hình GOOGLE_OAUTH_SETUP_SECRET.');
  const header = String(req.headers.authorization || '');
  console.log('[GOOGLE DRIVE OAUTH] Setup request:', { secretConfigured: Boolean(expected), basicHeaderPresent: Boolean(header) });
  const match = /^Basic\s+(.+)$/i.exec(header);
  let password = '';
  if (match) {
    try { const decoded = Buffer.from(match[1], 'base64').toString('utf8'); const i = decoded.indexOf(':'); password = i >= 0 ? decoded.slice(i + 1) : ''; } catch { password = ''; }
  }
  if (!safeSecretEqual(password, expected)) {
    console.warn('[GOOGLE DRIVE OAUTH] Setup authentication rejected. Check GOOGLE_OAUTH_SETUP_SECRET in Render.');
    res.setHeader('WWW-Authenticate', 'Basic realm="Hanh Pham Google Drive setup", charset="UTF-8"');
    return res.status(401).send('Cần mật khẩu thiết lập OAuth để tiếp tục.');
  }
  console.log('[GOOGLE DRIVE OAUTH] Setup authentication accepted; redirecting to Google consent.');
  const now = Date.now();
  for (const [key, expiry] of googleDriveOAuthStates) if (expiry < now) googleDriveOAuthStates.delete(key);
  const state = randomBytes(32).toString('hex');
  googleDriveOAuthStates.set(state, now + 10 * 60 * 1000);
  return res.redirect(createGoogleDriveAuthorizationUrl(state));
});
app.get('/google-drive/callback', async (req: Request, res: Response) => {
  const state = String(req.query.state || '');
  const expiry = googleDriveOAuthStates.get(state);
  googleDriveOAuthStates.delete(state);
  if (!state || !expiry || expiry < Date.now()) return res.status(400).send('Phiên OAuth không hợp lệ hoặc đã hết hạn. Hãy mở lại /google-drive/auth.');
  if (req.query.error) return res.status(400).send('Bạn đã từ chối hoặc Google không cấp quyền. Hãy mở lại /google-drive/auth.');
  const code = String(req.query.code || '');
  if (!code) return res.status(400).send('Google không trả mã xác thực.');
  try {
    const refreshToken = await exchangeGoogleDriveCode(code);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.type('html').send(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Drive đã kết nối</title><body style="font:16px Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;line-height:1.6"><h2>Đã nhận Refresh Token từ Google</h2><p>Sao chép giá trị bên dưới và lưu vào Render Environment với tên <b>GOOGLE_DRIVE_REFRESH_TOKEN</b>.</p><textarea readonly style="width:100%;height:120px;box-sizing:border-box">${refreshToken}</textarea><p><b>Bảo mật:</b> Không gửi token này cho nhân viên, không đăng lên GitHub.</p><p>Sau khi lưu biến môi trường trên Render, chờ dịch vụ khởi động lại rồi thử tải ảnh sản phẩm.</p></body></html>`);
  } catch (error: any) {
    console.error('[GOOGLE DRIVE OAUTH] Code exchange failed:', error?.message || error);
    return res.status(400).send('Không lấy được Refresh Token. Kiểm tra cấu hình OAuth trên Render và Google Cloud, sau đó thử cấp quyền lại.');
  }
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HANH PHAM BRIDAL] Server is running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  startServer();
}

export default app;
export { app };
