import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { api } from '../api';
import type { NhanVien } from '../types';
import { HanhPhamLogo } from '../components/HanhPhamLogo';
import { useTheme } from '../context/ThemeContext';

interface LoginPageProps {
  onLoginSuccess: (user: NhanVien) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
}) => {
  const { previewTheme } = useTheme();

  // ============================================================
  // FORM
  // ============================================================
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // LOGIN
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      /*
       * Backend hiện tại của app đang nhận:
       * api.auth.login(email, password)
       *
       * Vì vậy username được truyền trực tiếp vào tham số
       * đầu tiên. Không thay đổi API backend.
       */
      const res = await api.auth.login(
        username.trim(),
        password
      );

      onLoginSuccess(res.user as NhanVien);
    } catch (err: any) {
      setError(
        err?.message ||
          'Tên đăng nhập hoặc mật khẩu không chính xác.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen
        min-h-[100dvh]
        bg-[#FAF8F5]
        flex
        flex-col
        justify-center
        py-8
        sm:py-12
        px-4
        sm:px-6
        lg:px-8
        relative
        overflow-hidden
      "
      style={{
        paddingTop:
          'max(32px, calc(32px + env(safe-area-inset-top)))',
        paddingBottom:
          'max(32px, calc(32px + env(safe-area-inset-bottom)))',
      }}
    >
      {/* ========================================================
          BACKGROUND LUXURY GLOW
      ======================================================== */}
      <div
        className="
          absolute
          top-0
          left-1/2
          -translate-x-1/2
          w-[700px]
          sm:w-[800px]
          h-[300px]
          sm:h-[350px]
          bg-gradient-to-b
          from-[#f4eee7]
          to-transparent
          rounded-full
          blur-3xl
          opacity-70
          pointer-events-none
        "
      />

      {/* ========================================================
          LOGIN CONTAINER
      ======================================================== */}
      <div
        className="
          w-full
          max-w-md
          mx-auto
          relative
          z-10
        "
      >
        {/* ======================================================
            BRAND
        ====================================================== */}
        <div className="text-center space-y-2 mb-7 sm:mb-8">

          <div className="flex justify-center">
            <HanhPhamLogo
              size="xl"
              variant="gold"
              layout="vertical"
              showText
              subtitle={previewTheme.brandSubtitle}
            />
          </div>

          <p
            className="
              text-[10px]
              sm:text-xs
              uppercase
              tracking-[0.2em]
              text-[#a97d3e]
              font-semibold
              mt-2
            "
          >
            {previewTheme.tagline}
          </p>

        </div>

        {/* ======================================================
            LOGIN CARD
        ====================================================== */}
        <div
          className="
            bg-white
            py-7
            sm:py-8
            px-5
            sm:px-10
            shadow-xl
            rounded-3xl
            border
            border-[#E7DFD5]
          "
        >

          {/* ====================================================
              ERROR
          ==================================================== */}
          {error && (
            <div
              className="
                mb-5
                p-3.5
                bg-rose-50
                border
                border-rose-200
                rounded-xl
                text-xs
                text-rose-700
                flex
                items-start
                gap-2
              "
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

              <span className="leading-relaxed">
                {error}
              </span>
            </div>
          )}

          {/* ====================================================
              FORM
          ==================================================== */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* ==================================================
                USERNAME
            ================================================== */}
            <div>
              <label
                htmlFor="login-username"
                className="
                  block
                  font-semibold
                  text-stone-700
                  text-xs
                  mb-2
                "
              >
                Tên đăng nhập
              </label>

              <div className="relative">

                <User
                  className="
                    w-4
                    h-4
                    text-stone-400
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                  "
                />

                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nhập tên đăng nhập"
                  disabled={loading}
                  className="
                    w-full
                    pl-10
                    pr-3
                    py-3
                    border
                    border-stone-200
                    rounded-xl
                    bg-white
                    text-sm
                    text-stone-900
                    placeholder:text-stone-400
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#bf954f]/30
                    focus:border-[#bf954f]
                    transition
                    disabled:bg-stone-50
                    disabled:cursor-not-allowed
                  "
                />

              </div>
            </div>

            {/* ==================================================
                PASSWORD
            ================================================== */}
            <div>
              <label
                htmlFor="login-password"
                className="
                  block
                  font-semibold
                  text-stone-700
                  text-xs
                  mb-2
                "
              >
                Mật khẩu
              </label>

              <div className="relative">

                <Lock
                  className="
                    w-4
                    h-4
                    text-stone-400
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                  "
                />

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nhập mật khẩu"
                  disabled={loading}
                  className="
                    w-full
                    pl-10
                    pr-11
                    py-3
                    border
                    border-stone-200
                    rounded-xl
                    bg-white
                    text-sm
                    text-stone-900
                    placeholder:text-stone-400
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#bf954f]/30
                    focus:border-[#bf954f]
                    transition
                    disabled:bg-stone-50
                    disabled:cursor-not-allowed
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  disabled={loading}
                  className="
                    absolute
                    right-2
                    top-1/2
                    -translate-y-1/2
                    w-9
                    h-9
                    flex
                    items-center
                    justify-center
                    rounded-lg
                    text-stone-400
                    hover:text-stone-700
                    hover:bg-stone-100
                    transition
                  "
                  aria-label={
                    showPassword
                      ? 'Ẩn mật khẩu'
                      : 'Hiện mật khẩu'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>

              </div>
            </div>

            {/* ==================================================
                LOGIN BUTTON
            ================================================== */}
            <button
              type="submit"
              disabled={
                loading ||
                !username.trim() ||
                !password
              }
              className="
                w-full
                py-3.5
                bg-stone-900
                hover:bg-stone-800
                active:bg-black
                text-white
                rounded-xl
                font-bold
                uppercase
                tracking-wider
                text-xs
                shadow-md
                hover:shadow-lg
                transition
                flex
                items-center
                justify-center
                gap-2
                border
                border-[#c5a059]/40
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <>
                  <span
                    className="
                      w-4
                      h-4
                      border-2
                      border-white/30
                      border-t-white
                      rounded-full
                      animate-spin
                    "
                  />

                  <span>
                    Đang xác thực...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    ĐĂNG NHẬP HỆ THỐNG
                  </span>

                  <ArrowRight className="w-4 h-4 text-[#dfc79f]" />
                </>
              )}
            </button>

          </form>

          {/* ====================================================
              SECURITY INFO
          ==================================================== */}
          <div
            className="
              mt-6
              pt-5
              border-t
              border-stone-100
            "
          >
            <div
              className="
                flex
                items-center
                justify-center
                gap-2
                text-[10px]
                sm:text-xs
                text-stone-400
                text-center
              "
            >
              <ShieldCheck
                className="
                  w-4
                  h-4
                  flex-shrink-0
                  text-[#bf954f]
                "
              />

              <span>
                Hệ thống bảo mật phân quyền backend
              </span>
            </div>

            <p
              className="
                text-center
                text-[9px]
                text-stone-300
                mt-1.5
              "
            >
              Dữ liệu nhân sự và tiền lương được bảo vệ
            </p>
          </div>

        </div>

        {/* ======================================================
            FOOTER
        ====================================================== */}
        <div className="text-center mt-5">
          <p className="text-[9px] text-stone-400 tracking-wide">
            © {new Date().getFullYear()} HẠNH PHẠM BRIDAL
          </p>
        </div>

      </div>
    </div>
  );
};
