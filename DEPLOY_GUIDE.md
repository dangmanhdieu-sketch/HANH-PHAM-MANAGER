# HƯỚNG DẪN XUẤT MÃ NGUỒN VÀ TRIỂN KHAI HẠNH PHẠM MANAGER

## 1. XUẤT MÃ NGUỒN (EXPORT CODE)
- Trên giao diện **Google AI Studio Build**:
  - Nhìn lên góc trên cùng bên phải màn hình.
  - Bấm vào nút **Export to GitHub** (hoặc biểu tượng GitHub).
  - Chọn tài khoản GitHub của bạn để AI Studio tự động tạo một Repository mới (ví dụ: `hanh-pham-manager`).
  - Toàn bộ mã nguồn, cấu hình và giao diện sẽ được chuyển sang GitHub của bạn trong vài giây.

---

## 2. CÁCH ĐƯA LÊN VERCEL (HOÀN TOÀN MIỄN PHÍ)

### Bước 1: Đăng nhập Vercel
- Truy cập [vercel.com](https://vercel.com) và bấm **Sign Up** hoặc **Log In** bằng tài khoản **GitHub**.

### Bước 2: Tạo dự án mới (Import Project)
1. Bấm nút **"Add New..."** -> Chọn **"Project"**.
2. Tìm đến kho lưu trữ GitHub của bạn: `hanh-pham-manager` và bấm **"Import"**.

### Bước 3: Cấu hình Vercel
- **Framework Preset**: Chọn `Vite` (hoặc `Other`).
- **Root Directory**: Để trống `./`.
- **Build Command**: `npm run build` (mặc định).
- **Output Directory**: `dist` (mặc định).
- **Environment Variables**:
  - Thêm biến môi trường:
    - `NODE_ENV`: `production`
    - `PORT`: `3000`
- Bấm **"Deploy"**.

Chờ khoảng 1-2 phút, Vercel sẽ cấp cho bạn một đường link chính thức dạng:
👉 `https://hanh-pham-manager.vercel.app` (hoặc tên miền riêng của bạn).

---

## 3. GẮN TÊN MIỀN RIÊNG (NẾU CÓ, VÍ DỤ: quanly.hanhphambridal.vn)
1. Trong trang quản lý dự án trên Vercel, vào mục **Settings** -> **Domains**.
2. Nhập tên miền phụ bạn muốn dùng (VD: `quanly.hanhphambridal.vn`) và bấm **Add**.
3. Vercel sẽ hiện hướng dẫn trỏ bản ghi DNS CNAME:
   - Type: `CNAME`
   - Name: `quanly`
   - Value: `cname.vercel-dns.com`
4. Sau khi trỏ xong, toàn bộ nhân viên sẽ truy cập bằng link của riêng studio bạn.

---

## 4. KHUYẾN NGHỊ THÊM (RENDER HOẶC RAILWAY CHO ỨNG DỤNG CÓ CƠ SỞ DỮ LIỆU)
Vì hệ thống có lưu trữ dữ liệu chấm công, hoa hồng và bảng lương vào file nội bộ:
- **Vercel** là nền tảng Serverless (mỗi lần khởi động lại có thể làm mới bộ nhớ tạm).
- Nếu bạn muốn dữ liệu được lưu vĩnh viễn không bao giờ mất mà không cần cài đặt SQL phức tạp, bạn có thể triển khai lên **[Render.com](https://render.com)** (chọn *Web Service*, chọn repo GitHub, Build Command: `npm run build`, Start Command: `npm start`).
