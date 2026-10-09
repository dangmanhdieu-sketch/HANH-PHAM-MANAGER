import React, { useState } from 'react';
import { User, Shield, Lock, Phone, Mail, Calendar, DollarSign, CheckCircle, CreditCard, Building } from 'lucide-react';
import type { NhanVien } from '../../types';
import { api } from '../../api';
import { AvatarUploadField } from '../../components/AvatarUploadField';

interface MyProfileProps {
  currentUser: NhanVien;
  onRefresh: () => void;
}

export const MyProfile: React.FC<MyProfileProps> = ({ currentUser, onRefresh }) => {
  const [phone, setPhone] = useState(currentUser.SDT);
  const [avatar, setAvatar] = useState(currentUser.AnhNhanVien);

  // Bank fields
  const [soTaiKhoan, setSoTaiKhoan] = useState(currentUser.SoTaiKhoan || '');
  const [nganHang, setNganHang] = useState(currentUser.NganHang || 'Vietcombank');
  const [tenChuTaiKhoan, setTenChuTaiKhoan] = useState(currentUser.TenChuTaiKhoan || currentUser.HoTen.toUpperCase());
  const [chiNhanhNganHang, setChiNhanhNganHang] = useState(currentUser.ChiNhanhNganHang || '');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const bankOptions = [
    'Vietcombank',
    'Techcombank',
    'MB Bank',
    'VietinBank',
    'BIDV',
    'ACB',
    'VPBank',
    'TPBank',
    'Sacombank',
    'HDBank',
    'VIB',
    'OCB',
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.staff.update(currentUser.NhanVienID, {
        SDT: phone,
        AnhNhanVien: avatar,
        SoTaiKhoan: soTaiKhoan,
        NganHang: nganHang,
        TenChuTaiKhoan: tenChuTaiKhoan,
        ChiNhanhNganHang: chiNhanhNganHang,
      });
      setProfileMsg('Cập nhật thông tin và tài khoản ngân hàng thành công!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await api.auth.changePassword(oldPassword, newPassword);
      setPasswordMsg('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7DFD5] shadow-sm">
        <h1 className="text-2xl font-bold font-bridal text-stone-900 flex items-center gap-2">
          <User className="w-6 h-6 text-[#a97d3e]" />
          HỒ SƠ NHÂN SỰ CÁ NHÂN
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Xem thông tin hợp đồng, tài khoản ngân hàng nhận lương/tiền show và bảo mật tài khoản tại Hanh Pham Bridal.
        </p>
      </div>

      <section className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-6 sm:p-8 rounded-3xl border border-[#c5a059]/50 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img src={avatar || currentUser.AnhNhanVien || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'} alt={currentUser.HoTen} className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-2 border-[#dfc79f] shadow-md" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#dfc79f] font-bold">Hồ sơ nhân sự • Hạnh Phạm Manager</p>
            <h2 className="text-2xl sm:text-3xl font-bold font-bridal mt-2">{currentUser.HoTen}</h2>
            <p className="text-sm text-stone-300 mt-1">{currentUser.ChucVu || 'Nhân viên'}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs">Mã NV: {currentUser.NhanVienID}</span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs">{currentUser.Quyen}</span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs">{currentUser.TrangThai || 'Chưa cập nhật trạng thái'}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {[
            ['Email đăng nhập', currentUser.Email],
            ['Số điện thoại', currentUser.SDT],
            ['Ngày vào làm', currentUser.NgayVaoLam],
            ['Lương cơ bản', `${Number(currentUser.LuongCoBan || 0).toLocaleString('vi-VN')} đ`],
            ['Ngân hàng nhận tiền', currentUser.NganHang],
            ['Số tài khoản', currentUser.SoTaiKhoan],
            ['Tên chủ tài khoản', currentUser.TenChuTaiKhoan],
            ['Chi nhánh ngân hàng', currentUser.ChiNhanhNganHang],
            ['Ghi chú nhân sự', currentUser.GhiChu],
          ].filter((item) => item[1]).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] text-stone-400">{label}</p>
              <p className="text-sm font-semibold mt-1 break-words">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card & Bank Info */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7DFD5] shadow-sm space-y-4 text-xs">
          <h2 className="text-base font-bold font-bridal text-stone-900 uppercase">
            Thông Tin Cá Nhân & Tài Khoản Ngân Hàng
          </h2>

          <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
            <img
              src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.HoTen}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#c5a059]"
            />
            <div>
              <p className="font-bold text-stone-900 text-base font-bridal">{currentUser.HoTen}</p>
              <p className="text-xs text-[#a97d3e] font-semibold">{currentUser.ChucVu}</p>
              <span className="font-mono text-[10px] text-stone-400">Mã NV: {currentUser.NhanVienID}</span>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            {profileMsg && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{profileMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-stone-400 mb-1">Email Đăng Nhập (Chỉ xem)</label>
              <input
                type="text"
                disabled
                value={currentUser.Email}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Lương Cơ Bản Theo Hợp Đồng (Chỉ xem)</label>
              <input
                type="text"
                disabled
                value={`${currentUser.LuongCoBan.toLocaleString('vi-VN')} VNĐ`}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg font-mono font-bold text-stone-800 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Số Điện Thoại Liên Hệ</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            {/* Bank account section */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7DFD5] space-y-2.5">
              <span className="font-bold text-stone-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5 text-[#a97d3e]">
                <CreditCard className="w-3.5 h-3.5" />
                Tài Khoản Ngân Hàng Nhận Lương & Show
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-500 mb-0.5">Tên Ngân Hàng</label>
                  <select
                    value={nganHang}
                    onChange={(e) => setNganHang(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                  >
                    {bankOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-500 mb-0.5">Số Tài Khoản</label>
                  <input
                    type="text"
                    value={soTaiKhoan}
                    onChange={(e) => setSoTaiKhoan(e.target.value)}
                    placeholder="VD: 0071000888999"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-stone-500 mb-0.5">Tên Chủ Tài Khoản</label>
                <input
                  type="text"
                  value={tenChuTaiKhoan}
                  onChange={(e) => setTenChuTaiKhoan(e.target.value.toUpperCase())}
                  placeholder="DO MAI LINH"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg uppercase font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-500 mb-0.5">Chi Nhánh</label>
                <input
                  type="text"
                  value={chiNhanhNganHang}
                  onChange={(e) => setChiNhanhNganHang(e.target.value)}
                  placeholder="VD: Chi nhánh TP. Hồ Chí Minh"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <AvatarUploadField
              label="Ảnh Chân Dung Của Bạn (Tải từ điện thoại)"
              value={avatar || ''}
              onChange={(base64) => setAvatar(base64)}
            />

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 bg-stone-900 hover:bg-black text-[#f3dfa2] rounded-xl font-bold uppercase tracking-wider transition shadow-sm"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7DFD5] shadow-sm space-y-4 text-xs">
          <h2 className="text-base font-bold font-bridal text-stone-900 uppercase flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#a97d3e]" />
            Bảo Mật & Đổi Mật Khẩu
          </h2>

          <p className="text-stone-500 leading-relaxed">
            Thay đổi mật khẩu đăng nhập hệ thống nội bộ Hanh Pham Bridal để đảm bảo an toàn tài khoản cá nhân.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3">
            {passwordMsg && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{passwordMsg}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#bf954f]"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 bg-stone-900 hover:bg-black text-[#f3dfa2] rounded-xl font-bold uppercase tracking-wider transition shadow-sm"
            >
              {savingPassword ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>

          {/* Security policy note */}
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7DFD5] text-[11px] text-stone-500 space-y-1">
            <span className="font-semibold text-stone-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#a97d3e]" />
              Chính sách bảo mật:
            </span>
            <p>
              Nhân viên không thể tự thay đổi Quyền hạn (Admin/Nhân viên) hoặc Mức lương cơ bản. Mọi thay đổi về phân quyền và hợp đồng lương chỉ được thực hiện bởi Ban Quản Trị Hanh Pham Bridal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
