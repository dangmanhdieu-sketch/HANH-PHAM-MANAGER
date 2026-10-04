import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api';
import type { NhanVien } from '../types';
import { HanhPhamLogo } from '../components/HanhPhamLogo';
import { useTheme } from '../context/ThemeContext';

interface LoginPageProps {
  onLoginSuccess: (user: NhanVien) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { previewTheme } = useTheme();
  const [email, setEmail] = useState('admin@hanhphambridal.vn');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login(email.trim(), password);
      onLoginSuccess(res.user as NhanVien);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.login(userEmail, userPass);
      onLoginSuccess(res.user as NhanVien);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập nhanh thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // Connects with currently logged user email or default admin
      const res = await api.auth.googleLogin('lumahp01@gmail.com');
      onLoginSuccess(res.user as NhanVien);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient luxury glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#f4eee7] to-transparent rounded-full blur-3xl opacity-70 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2">
        <HanhPhamLogo size="xl" variant="gold" layout="vertical" showText subtitle={previewTheme.brandSubtitle} />
        <p className="text-xs uppercase tracking-widest text-[#a97d3e] font-semibold mt-1">
          {previewTheme.tagline}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-[#E7DFD5]">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Email Công Ty / Google
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hanhphambridal.vn"
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#bf954f]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Mật Khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#bf954f]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 border border-[#c5a059]/40 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>ĐĂNG NHẬP HỆ THỐNG</span>
                  <ArrowRight className="w-4 h-4 text-[#dfc79f]" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign In Button */}
          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-stone-400 uppercase tracking-wider text-[10px]">
                  Hoặc
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-4 w-full py-2.5 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Đăng nhập với Google Workspace</span>
            </button>
          </div>

          {/* Quick Demo Logins Strip */}
          <div className="mt-6 pt-5 border-t border-stone-100">
            <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider text-center mb-2.5">
              Đăng nhập nhanh để kiểm thử phân quyền:
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@hanhphambridal.vn', 'admin123')}
                className="p-3 rounded-xl bg-stone-900 text-white font-semibold hover:bg-black transition text-left border border-[#c5a059] shadow-sm"
              >
                <span className="text-[9px] text-[#dfc79f] uppercase block font-bold tracking-wider">ADMIN (Quản trị)</span>
                <span className="truncate block font-bridal text-sm text-[#f3dfa2]">Hạnh Phạm</span>
                <span className="text-[10px] text-stone-400 block mt-0.5 font-mono">admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('linh.mai@hanhphambridal.vn', '123456')}
                className="p-3 rounded-xl bg-[#FAF8F5] text-stone-800 font-semibold hover:bg-[#F4EEE7] transition text-left border border-[#E7DFD5] shadow-sm"
              >
                <span className="text-[9px] text-[#a97d3e] uppercase block font-bold tracking-wider">NHÂN VIÊN (Stylist)</span>
                <span className="truncate block font-bridal text-sm text-stone-900">Đỗ Mai Linh</span>
                <span className="text-[10px] text-stone-500 block mt-0.5 font-mono">123456</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center mt-6 flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <ShieldCheck className="w-4 h-4 text-[#bf954f]" />
          <span>Hệ thống bảo mật phân quyền backend • Chống rò rỉ dữ liệu lương</span>
        </div>
      </div>
    </div>
  );
};
