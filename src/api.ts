import type {
  NhanVien,
  ChamCong,
  Luong,
  HoaHong,
  ThongKeKPI,
  AuditLog,
  ThongBao,
  SystemConfig,
  AuthResponse,
  AppDesignTheme,
} from './types';

const TOKEN_KEY = 'hanhpham_auth_token';
const USER_KEY = 'hanhpham_auth_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser(): NhanVien | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setAuth(token: string, user: NhanVien) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    authStorage.clear();
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'Yêu cầu thất bại');
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  auth: {
    async login(email: string, password: string): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      authStorage.setAuth(res.token, res.user as NhanVien);
      return res;
    },
    async googleLogin(email: string): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/google-login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      authStorage.setAuth(res.token, res.user as NhanVien);
      return res;
    },
    async getMe(): Promise<{ user: NhanVien }> {
      return request<{ user: NhanVien }>('/api/auth/me');
    },
    async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
      return request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
    },
    logout() {
      authStorage.clear();
    },
  },

  staff: {
    async getAll(): Promise<NhanVien[]> {
      return request<NhanVien[]>('/api/nhanvien');
    },
    async getById(id: string): Promise<NhanVien> {
      return request<NhanVien>(`/api/nhanvien/${id}`);
    },
    async create(data: Partial<NhanVien>): Promise<NhanVien> {
      return request<NhanVien>('/api/nhanvien', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<NhanVien>): Promise<NhanVien> {
      return request<NhanVien>(`/api/nhanvien/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    async delete(id: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/api/nhanvien/${id}`, {
        method: 'DELETE',
      });
    },
    async toggleLock(id: string): Promise<NhanVien> {
      return request<NhanVien>(`/api/nhanvien/${id}/toggle-lock`, {
        method: 'POST',
      });
    },
  },

  attendance: {
    async getAll(params?: { date?: string; month?: string; nhanVienId?: string; trangThai?: string }): Promise<ChamCong[]> {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.month) q.append('month', params.month);
      if (params?.nhanVienId) q.append('nhanVienId', params.nhanVienId);
      if (params?.trangThai) q.append('trangThai', params.trangThai);
      return request<ChamCong[]>(`/api/chamcong?${q.toString()}`);
    },
    async getToday(): Promise<ChamCong | ChamCong[] | null> {
      return request('/api/chamcong/today');
    },
    async checkIn(payload: { anh: string; gps: string; ghiChu?: string }): Promise<{ message: string; record: ChamCong }> {
      return request('/api/chamcong/checkin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async checkOut(payload: { anh: string; gps: string; ghiChu?: string }): Promise<{ message: string; record: ChamCong }> {
      return request('/api/chamcong/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  payroll: {
    async getAll(params?: { thang?: string; nhanVienId?: string; trangThai?: string }): Promise<Luong[]> {
      const q = new URLSearchParams();
      if (params?.thang) q.append('thang', params.thang);
      if (params?.nhanVienId) q.append('nhanVienId', params.nhanVienId);
      if (params?.trangThai) q.append('trangThai', params.trangThai);
      return request<Luong[]>(`/api/luong?${q.toString()}`);
    },
    async getById(id: string): Promise<Luong> {
      return request<Luong>(`/api/luong/${id}`);
    },
    async generateMonth(thang: string): Promise<{
      message: string;
      createdCount: number;
      skippedCount: number;
      createdItems: string[];
      skippedItems: string[];
      thang: string;
    }> {
      return request('/api/luong/tao-thang', {
        method: 'POST',
        body: JSON.stringify({ thang }),
      });
    },
    async updateDetail(id: string, updates: Partial<Luong>): Promise<Luong> {
      return request<Luong>(`/api/luong/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    async approve(id: string): Promise<{ message: string; luong: Luong }> {
      return request(`/api/luong/${id}/duyet`, {
        method: 'POST',
      });
    },
    async pay(id: string): Promise<{ message: string; luong: Luong }> {
      return request(`/api/luong/${id}/thanh-toan`, {
        method: 'POST',
      });
    },
  },

  commission: {
    async getAll(params?: { nhanVienId?: string; trangThai?: string; month?: string }): Promise<HoaHong[]> {
      const q = new URLSearchParams();
      if (params?.nhanVienId) q.append('nhanVienId', params.nhanVienId);
      if (params?.trangThai) q.append('trangThai', params.trangThai);
      if (params?.month) q.append('month', params.month);
      return request<HoaHong[]>(`/api/hoahong?${q.toString()}`);
    },
    async create(data: {
      NhanVienID: string;
      Ngay: string;
      NoiDung: string;
      LoaiKhoan?: string;
      DoanhThu?: number;
      TyLeHoaHong?: number;
      SoTienHoaHong?: number;
      AnhChungTu?: string;
      GhiChu?: string;
      TaoBoi?: string;
    }): Promise<HoaHong> {
      return request<HoaHong>('/api/hoahong', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async approve(id: string, dongY: boolean): Promise<{ message: string; hoahong: HoaHong }> {
      return request(`/api/hoahong/${id}/duyet`, {
        method: 'POST',
        body: JSON.stringify({ dongY }),
      });
    },
    async delete(id: string): Promise<{ message: string }> {
      return request(`/api/hoahong/${id}`, {
        method: 'DELETE',
      });
    },
  },

  dashboard: {
    async getStats(): Promise<any> {
      return request('/api/thongke');
    },
    async getAuditLogs(): Promise<AuditLog[]> {
      return request<AuditLog[]>('/api/audit-log');
    },
    async getNotifications(): Promise<ThongBao[]> {
      return request<ThongBao[]>('/api/notifications');
    },
    async markNotificationsRead(): Promise<{ message: string }> {
      return request('/api/notifications/mark-read', {
        method: 'PUT',
      });
    },
  },

  automation: {
    async getStatus(): Promise<{
      enabled: boolean;
      lastRun: string;
      nextScheduledRun: string;
      schedulePattern: string;
      status: string;
    }> {
      return request('/api/automation/status');
    },
    async triggerNow(month?: string): Promise<{
      message: string;
      result: {
        createdCount: number;
        skippedCount: number;
        createdItems: string[];
        skippedItems: string[];
        month: string;
      };
    }> {
      return request('/api/automation/run-now', {
        method: 'POST',
        body: JSON.stringify({ month }),
      });
    },
  },

   system: {
    getExportUrl(
      type: 'nhanvien' | 'chamcong' | 'luong' | 'hoahong'
    ): string {
      return `/api/export/${type}`;
    },

    // Download a full JSON backup from the protected backend endpoint.
    // This is intentionally handled outside request<T>() because the response is a file.
    async downloadBackup(): Promise<void> {
      const token = authStorage.getToken();

      if (!token) {
        throw new Error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
      }

      const res = await fetch('/api/backup/download', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        authStorage.clear();
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      if (!res.ok) {
        let message = 'Không thể tải bản sao lưu dữ liệu.';
        try {
          const data = await res.json();
          message = data?.error || message;
        } catch {
          // Keep the default message when the server does not return JSON.
        }
        throw new Error(message);
      }

      const blob = await res.blob();

      let filename = `HanhPhamBridal_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const disposition = res.headers.get('content-disposition');

      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const normalMatch = disposition.match(/filename="?([^"]+)"?/i);
        const rawFilename = utf8Match?.[1] || normalMatch?.[1];

        if (rawFilename) {
          try {
            filename = decodeURIComponent(rawFilename);
          } catch {
            filename = rawFilename;
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    },

    async resetDemoData(): Promise<{
      success: boolean;
      message: string;
      backupFile: string;
      remainingAdmin: string;
      nhanVien: number;
      chamCong: number;
      luong: number;
      hoaHong: number;
      notifications: number;
    }> {
      return request('/api/admin/reset-demo-data', {
        method: 'POST',
      });
    },
  },  
  theme: {
    async get(): Promise<AppDesignTheme> {
      return request<AppDesignTheme>('/api/theme');
    },
    async update(theme: Partial<AppDesignTheme>): Promise<AppDesignTheme> {
      return request<AppDesignTheme>('/api/theme', {
        method: 'POST',
        body: JSON.stringify(theme),
      });
    },
    async reset(): Promise<AppDesignTheme> {
      return request<AppDesignTheme>('/api/theme/reset', {
        method: 'POST',
      });
    },
  },
};
