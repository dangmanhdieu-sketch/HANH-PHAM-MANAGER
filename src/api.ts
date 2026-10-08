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
