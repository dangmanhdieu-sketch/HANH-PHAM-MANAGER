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
