import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { dbService } from './server/db.ts';
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

  const user = dbService.findNhanVienById(payload.id);
  if (!user) {
    return res.status(401).json({ error: 'Người dùng không tồn tại trong hệ thống.' });
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
// ==========================================
// RESET DỮ LIỆU DEMO - CHỈ ADMIN
// ==========================================
app.post(
  '/api/admin/reset-demo-data',
  authenticateToken,
  requireAdmin,
  (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Chưa đăng nhập.',
        });
      }

      const result = dbService.resetDemoData({
        HoTen: req.user.HoTen,
        Email: req.user.Email,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('Reset dữ liệu demo lỗi:', err);

      return res.status(400).json({
        error: err?.message || 'Không thể reset dữ liệu demo.',
      });
    }
  }
);
// ==========================================
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

app.post('/api/nhanvien', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const created = dbService.createNhanVien(req.body, {
      HoTen: req.user!.HoTen,
      Email: req.user!.Email,
    });
    const { MatKhau: _, ...safe } = created;
    return res.status(201).json(safe);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
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

  return res.json(records);
});

app.get('/api/chamcong/today', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const todayStr = new Date().toISOString().split('T')[0];

  if (user.Quyen === 'Admin') {
    const records = dbService.getChamCongList({ date: todayStr });
    return res.json(records);
  } else {
    const records = dbService.getChamCongList({ date: todayStr, nhanVienId: user.NhanVienID });
    return res.json(records[0] || null);
  }
});

app.post('/api/chamcong/checkin', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { anh, gps, ghiChu } = req.body;
    if (!anh) {
      return res.status(400).json({ error: 'Yêu cầu chụp ảnh chân dung khi Check-in.' });
    }
    if (!gps) {
      return res.status(400).json({ error: 'Yêu cầu vị trí GPS khi Check-in.' });
    }

    const record = dbService.checkIn(req.user!, {
      anh,
      gps,
      ghiChu,
    });

    return res.json({
      message: 'Check-in thành công!',
      record,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/chamcong/checkout', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { anh, gps, ghiChu } = req.body;
    if (!anh) {
      return res.status(400).json({ error: 'Yêu cầu chụp ảnh chân dung khi Check-out.' });
    }
    if (!gps) {
      return res.status(400).json({ error: 'Yêu cầu vị trí GPS khi Check-out.' });
    }

    const record = dbService.checkOut(req.user!, {
      anh,
      gps,
      ghiChu,
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
// 4. LUONG (PAYROLL) ROUTES
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
// 5. HOAHONG (COMMISSION) ROUTES
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

    // Security Check: If non-admin, force NhanVienID to be their own ID
    if (user.Quyen !== 'Admin') {
      payload.NhanVienID = user.NhanVienID;
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
  const list = raw.NOTIFICATIONS.filter((n) => !n.NhanVienID || n.NhanVienID === user.NhanVienID);
  return res.json(list);
});

app.put('/api/notifications/mark-read', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const raw = dbService.getRawData();
  raw.NOTIFICATIONS.forEach((n) => {
    if (!n.NhanVienID || n.NhanVienID === user.NhanVienID) {
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
