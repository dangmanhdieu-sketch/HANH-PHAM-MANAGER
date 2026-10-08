// HANH PHAM BRIDAL - System Types & Interfaces

export type TrangThaiNhanVien = 'Đang Làm' | 'Tạm nghỉ' | 'Nghỉ';
export type QuyenNguoiDung = 'Admin' | 'Nhân viên';
export type TrangThaiChamCong = 'Có mặt' | 'Đi trễ' | 'Về sớm' | 'Nghỉ' | 'Nghỉ phép';
export type TrangThaiLuong = 'Chờ duyệt' | 'Đã duyệt' | 'Đã thanh toán';
export type TrangThaiHoaHong = 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối';
export type LoaiKhoanThuNhap = 'Tiền Show' | 'Hoa Hồng';

export interface NhanVien {
  NhanVienID: string;
   // Tên dùng để đăng nhập hệ thống
  TenDangNhap: string;
  HoTen: string;
  Email: string;
  SDT: string;
  ChucVu: string;
  LuongCoBan: number;
  NgayVaoLam: string;
  TrangThai: TrangThaiNhanVien;
  AnhNhanVien: string;
  Quyen: QuyenNguoiDung;
  MatKhau?: string; // Hashed password
  MatKhauHienThi?: string; // Mật khẩu ban đầu được Admin cấp (để sao chép gửi cho nhân viên)
  SoTaiKhoan?: string; // Số tài khoản ngân hàng
  NganHang?: string; // Tên ngân hàng (Vietcombank, Techcombank, MB Bank...)
  TenChuTaiKhoan?: string; // Tên chủ tài khoản (in hoa không dấu)
  ChiNhanhNganHang?: string; // Chi nhánh ngân hàng
  BiKhoa?: boolean;
  GhiChu?: string;
  TaoLuc?: string;
}

export interface ChamCong {
  ChamCongID: string;
  NhanVienEmail: string;
  NhanVienID: string;
  HoTen: string;
  Ngay: string; // YYYY-MM-DD
  CheckIn?: string; // HH:mm:ss
  AnhCheckIn?: string; // base64 or URL
  GPSCheckIn?: string; // "Lat, Lng (Address)"
  CheckOut?: string; // HH:mm:ss
  AnhCheckOut?: string;
  GPSCheckOut?: string;
  SoGioLam?: number; // Hours (e.g. 8.5)
  TrangThai: TrangThaiChamCong;
  GhiChu?: string;
}

export interface TamUng {
  TamUngID: string;
  NhanVienID: string;
  HoTen: string;
  Ngay: string;
  Thang: string;
  SoTien: number;
  LyDo?: string;
  GhiChu?: string;
  TaoLuc: string;
  TaoBoi: string;
}

export interface Luong {
  LuongID: string;
  NhanVienID: string;
  HoTen: string;
  Thang: string; // MM/YYYY
  LuongCoBan: number;
  SoNgayCong: number;
  SoGioLam: number;
  PhuCap: number;
  Thuong: number;
  HoaHong: number;
  Phat: number;
  TamUng: number;
  TongLuong: number;
  ThucLanh: number;
  TrangThai: TrangThaiLuong;
  GhiChu?: string;
  NgayTao?: string;
  NgayDuyet?: string;
  NguoiDuyet?: string;
  NgayThanhToan?: string;
  NguoiThanhToan?: string;
}

export interface HoaHong {
  HoaHongID: string;
  NhanVienID: string;
  HoTen: string;
  Ngay: string; // YYYY-MM-DD
  NoiDung: string;
  LoaiKhoan?: LoaiKhoanThuNhap; // 'Tiền Show' | 'Hoa Hồng'
  DoanhThu: number;
  TyLeHoaHong: number; // e.g. 5 for 5%
  SoTienHoaHong: number;
  AnhChungTu?: string; // Bill cọc, hợp đồng, hoặc ảnh chụp cô dâu tại tiệc
  TrangThai: TrangThaiHoaHong;
  LuongID?: string;
  NgayDuyet?: string;
  NguoiDuyet?: string;
  GhiChu?: string;
  TaoBoi?: 'Admin' | 'Nhân viên';
}

export interface ThongKeKPI {
  KPI_ID: string;
  TieuDe: string;
  MoTa: string;
  GiaTri: number | string;
  CapNhatLuc: string;
}

export interface AuditLog {
  LogID: string;
  NguoiThucHien: string;
  Email: string;
  HanhDong: string;
  ChiTiet: string;
  IP?: string;
  ThoiGian: string;
}

export interface ThongBao {
  NotificationID: string;
  NhanVienID?: string; // undefined = all or admin
  TieuDe: string;
  NoiDung: string;
  Loai: 'info' | 'success' | 'warning' | 'alert';
  DaDoc: boolean;
  TaoLuc: string;
}

export interface SystemConfig {
  TenStudio: string;
  DiaChi: string;
  Hotline: string;
  KinhDoStudio: number;
  ViDoStudio: number;
  BanKinhChoPhepMet: number;
  GioVaoCaChuan: string; // "08:30"
  GioTanCaChuan: string; // "17:30"
  TuDongTaoLuongNgay: number; // 1
  TuDongTaoLuongGio: string; // "00:05"
  AutomationEnabled: boolean;
  LanChayCuoi?: string;
}

export interface AppDesignTheme {
  brandName: string;
  brandSubtitle: string;
  tagline: string;
  logoType: 'monogram_crest' | 'diamond_tiara' | 'wedding_rings' | 'minimalist_text' | 'custom_url';
  customLogoUrl: string;
  logoSize: 'sm' | 'md' | 'lg' | 'xl';
  primaryColor: string;
  primaryHoverColor: string;
  accentColor: string;
  navbarBgColor: string;
  navbarTextColor: string;
  appBgColor: string;
  cardBorderRadius: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  fontFamily: 'serif' | 'sans' | 'playfair' | 'montserrat';
  buttonStyle: 'rounded' | 'pill' | 'square';
  showBackgroundGlow: boolean;
  cardShadow: 'none' | 'sm' | 'md' | 'lg' | 'glow';
  footerText: string;
}

export interface AuthResponse {
  user: Omit<NhanVien, 'MatKhau'>;
  token: string;
}
